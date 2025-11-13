"""
Grid Generation Utility for GeoRiskMod

Creates regular grids over study areas for spatial risk computation.
"""

import numpy as np
from typing import List, Dict, Tuple
import math


def create_grid_cells(
    center_lat: float,
    center_lon: float,
    extent_km: float,
    rows: int,
    cols: int
) -> List[Dict]:
    """
    Create a regular grid of cells around a center point

    Args:
        center_lat: Center latitude
        center_lon: Center longitude
        extent_km: Total extent in kilometers (both N-S and E-W)
        rows: Number of rows
        cols: Number of columns

    Returns:
        List of grid cell dictionaries with cell_id, latitude, longitude, row_index, col_index
    """
    # Calculate cell size in degrees (approximate)
    # At mid-latitudes: 1 degree latitude ≈ 111 km
    # 1 degree longitude varies with latitude
    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * math.cos(math.radians(center_lat))

    cell_size_lat = extent_km / rows / km_per_deg_lat
    cell_size_lon = extent_km / cols / km_per_deg_lon

    # Calculate grid bounds
    half_extent_lat = (rows / 2) * cell_size_lat
    half_extent_lon = (cols / 2) * cell_size_lon

    min_lat = center_lat - half_extent_lat
    max_lat = center_lat + half_extent_lat
    min_lon = center_lon - half_extent_lon
    max_lon = center_lon + half_extent_lon

    # Generate grid cells
    grid_cells = []
    cell_id = 1

    for row in range(rows):
        for col in range(cols):
            # Calculate cell center
            lat = min_lat + (row + 0.5) * cell_size_lat
            lon = min_lon + (col + 0.5) * cell_size_lon

            grid_cells.append({
                'cell_id': cell_id,
                'row_index': row,
                'col_index': col,
                'latitude': lat,
                'longitude': lon,
            })
            cell_id += 1

    return grid_cells


def create_grid_from_bounds(
    min_lat: float,
    max_lat: float,
    min_lon: float,
    max_lon: float,
    resolution_m: float
) -> List[Dict]:
    """
    Create a regular grid within specified bounds at a given resolution

    Args:
        min_lat: Minimum latitude
        max_lat: Maximum latitude
        min_lon: Minimum longitude
        max_lon: Maximum longitude
        resolution_m: Cell resolution in meters

    Returns:
        List of grid cell dictionaries
    """
    center_lat = (min_lat + max_lat) / 2
    center_lon = (min_lon + max_lon) / 2

    # Calculate grid dimensions
    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * math.cos(math.radians(center_lat))

    lat_extent = (max_lat - min_lat) * km_per_deg_lat * 1000  # in meters
    lon_extent = (max_lon - min_lon) * km_per_deg_lon * 1000  # in meters

    rows = int(lat_extent / resolution_m)
    cols = int(lon_extent / resolution_m)

    # Calculate cell size in degrees
    cell_size_lat = (max_lat - min_lat) / rows
    cell_size_lon = (max_lon - min_lon) / cols

    # Generate grid cells
    grid_cells = []
    cell_id = 1

    for row in range(rows):
        for col in range(cols):
            # Calculate cell center
            lat = min_lat + (row + 0.5) * cell_size_lat
            lon = min_lon + (col + 0.5) * cell_size_lon

            grid_cells.append({
                'cell_id': cell_id,
                'row_index': row,
                'col_index': col,
                'latitude': lat,
                'longitude': lon,
            })
            cell_id += 1

    return grid_cells


def get_default_grid(center_lat: float, center_lon: float) -> List[Dict]:
    """
    Get a default 80x80 grid (6,400 cells) covering a 10km x 10km area

    Args:
        center_lat: Center latitude
        center_lon: Center longitude

    Returns:
        List of grid cell dictionaries
    """
    return create_grid_cells(
        center_lat=center_lat,
        center_lon=center_lon,
        extent_km=10.0,  # 10km x 10km area
        rows=80,
        cols=80
    )
