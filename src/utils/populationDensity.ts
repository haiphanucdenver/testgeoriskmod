// Utility to fetch population density data from OpenStreetMap

export interface PopulationPoint {
  name: string;
  population: number;
  coordinates: [number, number]; // [longitude, latitude]
  placeType: string; // city, town, village, etc.
}

/**
 * Build Overpass API query for populated places within a bounding box
 */
function buildPopulationQuery(
  south: number,
  west: number,
  north: number,
  east: number
): string {
  const bbox = `${south},${west},${north},${east}`;

  // Query for places with population data
  const query = `
[out:json][timeout:25];
(
  node["place"="city"]["population"](${bbox});
  node["place"="town"]["population"](${bbox});
  node["place"="village"]["population"](${bbox});
  node["place"="suburb"]["population"](${bbox});
  node["place"="hamlet"]["population"](${bbox});
  node["place"="neighbourhood"]["population"](${bbox});
);
out body;
`;

  return query;
}

/**
 * Parse OSM element to population point
 */
function parsePopulationElement(element: any): PopulationPoint | null {
  if (!element.lat || !element.lon) return null;
  if (!element.tags?.population) return null;

  // Parse population value (can be a number or string)
  const populationStr = element.tags.population.toString().replace(/[,\s]/g, '');
  const population = parseInt(populationStr, 10);

  if (isNaN(population) || population <= 0) return null;

  const name = element.tags.name || element.tags['name:en'] || 'Unknown';
  const placeType = element.tags.place || 'unknown';

  return {
    name,
    population,
    coordinates: [element.lon, element.lat],
    placeType
  };
}

/**
 * Fetch population density data from OpenStreetMap
 */
export async function fetchPopulationDensity(
  center: [number, number], // [longitude, latitude]
  radiusKm: number = 50 // Larger radius for population data
): Promise<PopulationPoint[]> {
  // Calculate bounding box from center and radius
  const latOffset = radiusKm / 111; // ~111km per degree latitude
  const lonOffset = radiusKm / (111 * Math.cos(center[1] * Math.PI / 180));

  const south = center[1] - latOffset;
  const north = center[1] + latOffset;
  const west = center[0] - lonOffset;
  const east = center[0] + lonOffset;

  const query = buildPopulationQuery(south, west, north, east);

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    const populationPoints: PopulationPoint[] = [];

    // Parse each element
    data.elements?.forEach((element: any) => {
      const point = parsePopulationElement(element);
      if (point) {
        populationPoints.push(point);
      }
    });

    console.log(`Fetched ${populationPoints.length} population points from OSM`);

    // Log total population
    const totalPopulation = populationPoints.reduce((sum, p) => sum + p.population, 0);
    console.log(`Total population in area: ${totalPopulation.toLocaleString()}`);

    return populationPoints;

  } catch (error) {
    console.error('Error fetching population density:', error);
    return [];
  }
}

/**
 * Generate GeoJSON for population heatmap
 */
export function generatePopulationGeoJSON(populationPoints: PopulationPoint[]): any {
  return {
    type: 'FeatureCollection',
    features: populationPoints.map(point => ({
      type: 'Feature',
      properties: {
        population: point.population,
        name: point.name,
        placeType: point.placeType,
        // Calculate density weight (logarithmic scale for better visualization)
        weight: Math.log10(point.population + 1)
      },
      geometry: {
        type: 'Point',
        coordinates: point.coordinates
      }
    }))
  };
}

/**
 * Get population statistics for display
 */
export function getPopulationStats(populationPoints: PopulationPoint[]) {
  if (populationPoints.length === 0) {
    return {
      total: 0,
      average: 0,
      max: 0,
      min: 0,
      cities: 0,
      towns: 0,
      villages: 0
    };
  }

  const populations = populationPoints.map(p => p.population);
  const total = populations.reduce((sum, p) => sum + p, 0);
  const average = Math.round(total / populations.length);
  const max = Math.max(...populations);
  const min = Math.min(...populations);

  const cities = populationPoints.filter(p => p.placeType === 'city').length;
  const towns = populationPoints.filter(p => p.placeType === 'town').length;
  const villages = populationPoints.filter(p =>
    p.placeType === 'village' || p.placeType === 'hamlet'
  ).length;

  return {
    total,
    average,
    max,
    min,
    cities,
    towns,
    villages
  };
}
