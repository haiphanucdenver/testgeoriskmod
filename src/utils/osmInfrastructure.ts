// Utility to fetch infrastructure data from OpenStreetMap using Overpass API

export interface InfrastructurePoint {
  name: string;
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
  icon: string;
  category: string;
  osmId?: string;
  additionalInfo?: Record<string, string>;
}

// Infrastructure categories with their OSM tags and icons
export const INFRASTRUCTURE_CATEGORIES = {
  medical: {
    tags: ['amenity=hospital', 'amenity=clinic', 'amenity=doctors'],
    icon: '🏥',
    label: 'Medical Facilities'
  },
  education: {
    tags: ['amenity=school', 'amenity=university', 'amenity=college', 'amenity=kindergarten'],
    icon: '🏫',
    label: 'Education'
  },
  emergency: {
    tags: ['amenity=fire_station', 'amenity=police'],
    icon: '🚒',
    label: 'Emergency Services'
  },
  utilities: {
    tags: ['power=plant', 'power=substation', 'man_made=water_works', 'man_made=wastewater_plant'],
    icon: '⚡',
    label: 'Utilities'
  },
  government: {
    tags: ['amenity=townhall', 'amenity=courthouse', 'amenity=post_office'],
    icon: '🏛️',
    label: 'Government'
  },
  transportation: {
    tags: ['aeroway=aerodrome', 'railway=station', 'amenity=bus_station'],
    icon: '✈️',
    label: 'Transportation'
  }
};

/**
 * Build Overpass API query for infrastructure within a bounding box
 */
function buildOverpassQuery(
  south: number,
  west: number,
  north: number,
  east: number,
  categories: string[] = Object.keys(INFRASTRUCTURE_CATEGORIES)
): string {
  const bbox = `${south},${west},${north},${east}`;

  let query = '[out:json][timeout:25];\n(\n';

  categories.forEach(categoryKey => {
    const category = INFRASTRUCTURE_CATEGORIES[categoryKey as keyof typeof INFRASTRUCTURE_CATEGORIES];
    if (category) {
      category.tags.forEach(tag => {
        query += `  node[${tag}](${bbox});\n`;
        query += `  way[${tag}](${bbox});\n`;
      });
    }
  });

  query += ');\nout center;';

  return query;
}

/**
 * Parse OSM element to infrastructure point
 */
function parseOSMElement(element: any, categoryKey: string): InfrastructurePoint | null {
  const category = INFRASTRUCTURE_CATEGORIES[categoryKey as keyof typeof INFRASTRUCTURE_CATEGORIES];
  if (!category) return null;

  // Get coordinates
  let lat, lon;
  if (element.lat && element.lon) {
    lat = element.lat;
    lon = element.lon;
  } else if (element.center) {
    lat = element.center.lat;
    lon = element.center.lon;
  } else {
    return null;
  }

  // Get name
  const name = element.tags?.name ||
               element.tags?.['name:en'] ||
               getDefaultName(element.tags, categoryKey);

  // Get type from tags
  const type = element.tags?.amenity ||
               element.tags?.power ||
               element.tags?.man_made ||
               element.tags?.aeroway ||
               element.tags?.railway ||
               categoryKey;

  // Get icon (customize based on specific tags)
  const icon = getIconForElement(element.tags, categoryKey);

  // Additional info
  const additionalInfo: Record<string, string> = {};
  if (element.tags?.operator) additionalInfo.operator = element.tags.operator;
  if (element.tags?.['addr:full']) additionalInfo.address = element.tags['addr:full'];
  if (element.tags?.phone) additionalInfo.phone = element.tags.phone;
  if (element.tags?.website) additionalInfo.website = element.tags.website;
  if (element.tags?.beds) additionalInfo.beds = element.tags.beds;
  if (element.tags?.emergency) additionalInfo.emergency = element.tags.emergency;

  return {
    name,
    type,
    coordinates: [lon, lat],
    icon,
    category: categoryKey,
    osmId: `${element.type}/${element.id}`,
    additionalInfo: Object.keys(additionalInfo).length > 0 ? additionalInfo : undefined
  };
}

/**
 * Get default name based on element type
 */
function getDefaultName(tags: any, categoryKey: string): string {
  if (tags?.amenity === 'hospital') return 'Hospital';
  if (tags?.amenity === 'clinic') return 'Medical Clinic';
  if (tags?.amenity === 'school') return 'School';
  if (tags?.amenity === 'fire_station') return 'Fire Station';
  if (tags?.amenity === 'police') return 'Police Station';
  if (tags?.power === 'plant') return 'Power Plant';
  if (tags?.power === 'substation') return 'Substation';
  if (tags?.man_made === 'water_works') return 'Water Treatment';
  if (tags?.man_made === 'wastewater_plant') return 'Wastewater Plant';

  const category = INFRASTRUCTURE_CATEGORIES[categoryKey as keyof typeof INFRASTRUCTURE_CATEGORIES];
  return category?.label || 'Infrastructure';
}

/**
 * Get appropriate icon based on specific tags
 */
function getIconForElement(tags: any, categoryKey: string): string {
  // Customize icons for specific types
  if (tags?.amenity === 'hospital') return '🏥';
  if (tags?.amenity === 'clinic' || tags?.amenity === 'doctors') return '⚕️';
  if (tags?.amenity === 'school') return '🏫';
  if (tags?.amenity === 'university' || tags?.amenity === 'college') return '🎓';
  if (tags?.amenity === 'fire_station') return '🚒';
  if (tags?.amenity === 'police') return '👮';
  if (tags?.power === 'plant') return '⚡';
  if (tags?.power === 'substation') return '🔌';
  if (tags?.man_made === 'water_works') return '💧';
  if (tags?.man_made === 'wastewater_plant') return '🚰';
  if (tags?.amenity === 'townhall') return '🏛️';
  if (tags?.amenity === 'post_office') return '📮';
  if (tags?.aeroway === 'aerodrome') return '✈️';
  if (tags?.railway === 'station') return '🚂';

  // Fall back to category default
  const category = INFRASTRUCTURE_CATEGORIES[categoryKey as keyof typeof INFRASTRUCTURE_CATEGORIES];
  return category?.icon || '📍';
}

/**
 * Determine category from OSM tags
 */
function getCategoryFromTags(tags: any): string | null {
  for (const [categoryKey, category] of Object.entries(INFRASTRUCTURE_CATEGORIES)) {
    for (const tag of category.tags) {
      const [key, value] = tag.split('=');
      if (tags[key] === value) {
        return categoryKey;
      }
    }
  }
  return null;
}

/**
 * Fetch infrastructure data from OpenStreetMap
 */
export async function fetchOSMInfrastructure(
  center: [number, number], // [longitude, latitude]
  radiusKm: number = 20,
  categories?: string[]
): Promise<InfrastructurePoint[]> {
  // Calculate bounding box from center and radius
  const latOffset = radiusKm / 111; // ~111km per degree latitude
  const lonOffset = radiusKm / (111 * Math.cos(center[1] * Math.PI / 180));

  const south = center[1] - latOffset;
  const north = center[1] + latOffset;
  const west = center[0] - lonOffset;
  const east = center[0] + lonOffset;

  const query = buildOverpassQuery(south, west, north, east, categories);

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

    const infrastructurePoints: InfrastructurePoint[] = [];

    // Parse each element
    data.elements?.forEach((element: any) => {
      const categoryKey = getCategoryFromTags(element.tags);
      if (categoryKey) {
        const point = parseOSMElement(element, categoryKey);
        if (point) {
          infrastructurePoints.push(point);
        }
      }
    });

    console.log(`Fetched ${infrastructurePoints.length} infrastructure points from OSM`);
    return infrastructurePoints;

  } catch (error) {
    console.error('Error fetching OSM infrastructure:', error);
    return [];
  }
}

/**
 * Get infrastructure by category
 */
export function filterByCategory(
  infrastructure: InfrastructurePoint[],
  categories: string[]
): InfrastructurePoint[] {
  return infrastructure.filter(point => categories.includes(point.category));
}
