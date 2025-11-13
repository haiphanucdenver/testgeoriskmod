"""
DEM Processing Module for GeoRiskMod

This module processes Digital Elevation Models (DEMs) and extracts
terrain analysis values for storage in the database.

Extracts:
- Elevation at grid cell centers
- Slope (degrees)
- Aspect (degrees)
- Profile curvature
- Plan curvature
- Local relief

Storage: Values are stored per grid cell in h_static_data table,
keeping database size minimal (KB instead of GB).
"""

import numpy as np
from osgeo import gdal, gdalconst
from typing import Tuple, Dict, List
import os


class DEMProcessor:
    """Process DEM files and extract terrain analysis values"""

    def __init__(self, dem_path: str):
        """
        Initialize DEM processor

        Args:
            dem_path: Path to DEM GeoTIFF file
        """
        if not os.path.exists(dem_path):
            raise FileNotFoundError(f"DEM file not found: {dem_path}")

        self.dem_path = dem_path
        self.dataset = gdal.Open(dem_path, gdalconst.GA_ReadOnly)

        if self.dataset is None:
            raise ValueError(f"Could not open DEM file: {dem_path}")

        # Get geotransform and projection
        self.geotransform = self.dataset.GetGeoTransform()
        self.projection = self.dataset.GetProjection()

        # Get raster dimensions
        self.cols = self.dataset.RasterXSize
        self.rows = self.dataset.RasterYSize

        # Read elevation data
        band = self.dataset.GetRasterBand(1)
        self.elevation = band.ReadAsArray().astype(np.float32)

        # Get nodata value
        self.nodata = band.GetNoDataValue()
        if self.nodata is not None:
            self.elevation[self.elevation == self.nodata] = np.nan

        # Calculate pixel size
        self.pixel_width = abs(self.geotransform[1])
        self.pixel_height = abs(self.geotransform[5])

    def latlon_to_pixel(self, lat: float, lon: float) -> Tuple[int, int]:
        """
        Convert latitude/longitude to pixel coordinates

        Args:
            lat: Latitude
            lon: Longitude

        Returns:
            (row, col) pixel coordinates
        """
        # Get origin and pixel size from geotransform
        origin_x = self.geotransform[0]
        origin_y = self.geotransform[3]

        # Convert to pixel coordinates
        col = int((lon - origin_x) / self.pixel_width)
        row = int((origin_y - lat) / self.pixel_height)

        return row, col

    def get_elevation_at_point(self, lat: float, lon: float) -> float:
        """
        Get elevation at a specific latitude/longitude point

        Args:
            lat: Latitude
            lon: Longitude

        Returns:
            Elevation in meters (or np.nan if outside bounds or nodata)
        """
        row, col = self.latlon_to_pixel(lat, lon)

        # Check bounds
        if row < 0 or row >= self.rows or col < 0 or col >= self.cols:
            return np.nan

        return float(self.elevation[row, col])

    def calculate_slope(self) -> np.ndarray:
        """
        Calculate slope in degrees using Horn's method

        Returns:
            2D array of slope values in degrees
        """
        # Use Sobel operators for gradient calculation
        gy, gx = np.gradient(self.elevation)

        # Convert to slope in radians then degrees
        # Account for pixel size
        slope_rad = np.arctan(np.sqrt(
            (gx / self.pixel_width)**2 +
            (gy / self.pixel_height)**2
        ))

        slope_deg = np.degrees(slope_rad)

        return slope_deg

    def calculate_aspect(self) -> np.ndarray:
        """
        Calculate aspect (direction of slope) in degrees
        0 = North, 90 = East, 180 = South, 270 = West

        Returns:
            2D array of aspect values in degrees
        """
        gy, gx = np.gradient(self.elevation)

        # Calculate aspect in radians
        aspect_rad = np.arctan2(-gy, gx)

        # Convert to degrees and adjust to geographic convention
        # (0 = North, clockwise)
        aspect_deg = np.degrees(aspect_rad)
        aspect_deg = 90 - aspect_deg
        aspect_deg[aspect_deg < 0] += 360

        # Set flat areas (slope ~0) to -1 (undefined aspect)
        slope = self.calculate_slope()
        aspect_deg[slope < 0.5] = -1

        return aspect_deg

    def calculate_curvature(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate profile and plan curvature

        Profile curvature: curvature in the direction of maximum slope
        Plan curvature: curvature perpendicular to the direction of maximum slope

        Returns:
            (profile_curvature, plan_curvature) tuple of 2D arrays
        """
        # Calculate first derivatives
        gy, gx = np.gradient(self.elevation)

        # Calculate second derivatives
        gyy, _ = np.gradient(gy)
        _, gxx = np.gradient(gx)
        gxy, _ = np.gradient(gx)

        # Normalize by pixel size
        gx = gx / self.pixel_width
        gy = gy / self.pixel_height
        gxx = gxx / (self.pixel_width ** 2)
        gyy = gyy / (self.pixel_height ** 2)
        gxy = gxy / (self.pixel_width * self.pixel_height)

        # Calculate gradient magnitude
        p = gx ** 2 + gy ** 2

        # Avoid division by zero
        p = np.where(p == 0, 1e-10, p)

        # Profile curvature (curvature in direction of slope)
        profile_curv = -(gxx * gx**2 + 2 * gxy * gx * gy + gyy * gy**2) / (p * np.sqrt(p))

        # Plan curvature (curvature perpendicular to slope)
        plan_curv = -(gxx * gy**2 - 2 * gxy * gx * gy + gyy * gx**2) / (p ** 1.5)

        return profile_curv, plan_curv

    def calculate_local_relief(self, window_size: int = 9) -> np.ndarray:
        """
        Calculate local relief (elevation range in neighborhood)

        Args:
            window_size: Size of neighborhood window (must be odd)

        Returns:
            2D array of local relief values in meters
        """
        from scipy.ndimage import generic_filter

        def relief_func(values):
            """Calculate range of values, ignoring NaN"""
            valid = values[~np.isnan(values)]
            if len(valid) == 0:
                return np.nan
            return np.max(valid) - np.min(valid)

        relief = generic_filter(
            self.elevation,
            relief_func,
            size=window_size,
            mode='constant',
            cval=np.nan
        )

        return relief

    def extract_values_at_points(
        self,
        points: List[Tuple[float, float]],
        include_derivatives: bool = True
    ) -> List[Dict[str, float]]:
        """
        Extract terrain values at specific points

        Args:
            points: List of (latitude, longitude) tuples
            include_derivatives: Whether to calculate slope, aspect, curvature

        Returns:
            List of dictionaries containing terrain values for each point
        """
        results = []

        # Pre-calculate derivatives if needed
        if include_derivatives:
            slope = self.calculate_slope()
            aspect = self.calculate_aspect()
            profile_curv, plan_curv = self.calculate_curvature()
            relief = self.calculate_local_relief()

        for lat, lon in points:
            row, col = self.latlon_to_pixel(lat, lon)

            # Check bounds
            if row < 0 or row >= self.rows or col < 0 or col >= self.cols:
                # Outside DEM bounds
                result = {
                    'elevation_m': None,
                    'slope_degrees': None,
                    'slope_aspect_degrees': None,
                    'curvature_profile': None,
                    'curvature_plan': None,
                    'relief_local_m': None,
                }
            else:
                result = {
                    'elevation_m': float(self.elevation[row, col]),
                }

                if include_derivatives:
                    result['slope_degrees'] = float(slope[row, col])
                    result['slope_aspect_degrees'] = float(aspect[row, col])
                    result['curvature_profile'] = float(profile_curv[row, col])
                    result['curvature_plan'] = float(plan_curv[row, col])
                    result['relief_local_m'] = float(relief[row, col])

            results.append(result)

        return results

    def get_metadata(self) -> Dict[str, any]:
        """
        Get DEM metadata

        Returns:
            Dictionary containing DEM metadata
        """
        return {
            'path': self.dem_path,
            'rows': self.rows,
            'cols': self.cols,
            'pixel_width': self.pixel_width,
            'pixel_height': self.pixel_height,
            'projection': self.projection,
            'geotransform': self.geotransform,
            'nodata_value': self.nodata,
            'min_elevation': float(np.nanmin(self.elevation)),
            'max_elevation': float(np.nanmax(self.elevation)),
            'mean_elevation': float(np.nanmean(self.elevation)),
        }

    def close(self):
        """Close the GDAL dataset"""
        self.dataset = None


def process_dem_for_grid(
    dem_path: str,
    grid_cells: List[Dict],
    source_id: int
) -> List[Dict]:
    """
    Process DEM and extract values for all grid cells

    Args:
        dem_path: Path to DEM file
        grid_cells: List of grid cell dictionaries with 'cell_id', 'latitude', 'longitude'
        source_id: ID of the data source

    Returns:
        List of dictionaries ready for insertion into h_static_data table
    """
    processor = DEMProcessor(dem_path)

    # Extract coordinates from grid cells
    points = [(cell['latitude'], cell['longitude']) for cell in grid_cells]

    # Extract all terrain values
    terrain_values = processor.extract_values_at_points(points)

    # Combine with cell IDs and source ID
    results = []
    for cell, values in zip(grid_cells, terrain_values):
        result = {
            'cell_id': cell['cell_id'],
            'source_id': source_id,
            **values
        }
        results.append(result)

    processor.close()

    return results
