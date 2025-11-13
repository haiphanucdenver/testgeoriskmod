/**
 * API Service for GEORISKMOD Frontend
 * Handles all communication with the backend REST API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

// ===== HEALTH CHECK =====

export const healthCheck = () => fetchAPI('/api/health');

// ===== LOCATION API =====

export interface Location {
  location_id?: number;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  region?: string;
}

export const locationAPI = {
  /**
   * Get all locations
   */
  getAll: () => fetchAPI<{ count: number; locations: Location[] }>('/api/locations'),
  
  /**
   * Get a specific location by ID
   */
  getById: (id: number) => fetchAPI<Location>(`/api/locations/${id}`),
  
  /**
   * Create a new location
   */
  create: (location: Omit<Location, 'location_id'>) => 
    fetchAPI<{ location_id: number; message: string; data: Location }>('/api/locations', {
      method: 'POST',
      body: JSON.stringify(location),
    }),
  
  /**
   * Delete a location
   */
  delete: (id: number) => 
    fetchAPI<{ message: string }>(`/api/locations/${id}`, {
      method: 'DELETE',
    }),
};

// ===== EVENT API =====

export interface Event {
  event_id?: number;
  location_id: number;
  hazard_type: string;
  date_observed: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
}

export const eventAPI = {
  /**
   * Get all events
   */
  getAll: () => fetchAPI<{ count: number; events: Event[] }>('/api/events'),
  
  /**
   * Create a new event
   */
  create: (event: Omit<Event, 'event_id'>) => 
    fetchAPI<{ event_id: number; message: string }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),
};

// ===== VULNERABILITY API =====

export interface Vulnerability {
  vulnerability_id?: number;
  location_id: number;
  asset_type: string;
  num_buildings: number;
  location_name?: string;
}

export const vulnerabilityAPI = {
  /**
   * Get all vulnerability records
   */
  getAll: () => fetchAPI<{ count: number; vulnerabilities: Vulnerability[] }>('/api/vulnerabilities'),
  
  /**
   * Create a new vulnerability record
   */
  create: (vuln: Omit<Vulnerability, 'vulnerability_id'>) => 
    fetchAPI<{ vulnerability_id: number; message: string }>('/api/vulnerabilities', {
      method: 'POST',
      body: JSON.stringify(vuln),
    }),
};

// ===== LOCAL LORE API =====

export interface LocalLore {
  lore_id?: number;
  location_id: number;
  lore_narrative: string;
  location_name?: string;
}

export const localLoreAPI = {
  /**
   * Get all local lore records
   */
  getAll: () => fetchAPI<{ count: number; lore: LocalLore[] }>('/api/local-lore'),
  
  /**
   * Create a new local lore record
   */
  create: (lore: Omit<LocalLore, 'lore_id'>) => 
    fetchAPI<{ lore_id: number; message: string }>('/api/local-lore', {
      method: 'POST',
      body: JSON.stringify(lore),
    }),
};

// ===== HISTORICAL EVENTS API =====

export interface HistoricalEvent {
  id: string;
  location_id?: number;
  eventType: string;
  date: string;
  location: string;
  description: string;
  source: string;
  credibility: 'eyewitness' | 'instrumented' | 'oral-tradition' | 'newspaper' | 'expert';
  spatialAccuracy: 'exact' | 'approximate' | 'general-area';
  created_at?: string;
}

export const historicalEventAPI = {
  /**
   * Get all historical events
   */
  getAll: () => fetchAPI<{ count: number; events: HistoricalEvent[] }>('/api/historical-events'),
  
  /**
   * Create a new historical event
   */
  create: (event: Omit<HistoricalEvent, 'id' | 'created_at'>) => 
    fetchAPI<{ id: number; message: string; data: any }>('/api/historical-events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),
  
  /**
   * Update an existing historical event
   */
  update: (id: string, event: Omit<HistoricalEvent, 'id' | 'created_at'>) => 
    fetchAPI<{ id: number; message: string; data: any }>(`/api/historical-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    }),
  
  /**
   * Delete a historical event
   */
  delete: (id: string) => 
    fetchAPI<{ message: string }>(`/api/historical-events/${id}`, {
      method: 'DELETE',
    }),
};

// ===== RISK API =====

export interface Risk {
  risk_id?: number;
  location_id: number;
  title: string;
  description: string;
  h_score: number;
  l_score: number;
  v_score: number;
  overall_score?: number;
  event_id: number;
  vulnerability_id: number;
  lore_id: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}

export const riskAPI = {
  /**
   * Get all risk assessments
   */
  getAll: () => fetchAPI<{ count: number; risks: Risk[] }>('/api/risks'),
  
  /**
   * Get a specific risk assessment by ID
   */
  getById: (id: number) => fetchAPI<Risk>(`/api/risks/${id}`),
  
  /**
   * Create a new risk assessment
   */
  create: (risk: Omit<Risk, 'risk_id' | 'overall_score' | 'created_at'>) => 
    fetchAPI<{ risk_id: number; overall_score: number; message: string }>('/api/risks', {
      method: 'POST',
      body: JSON.stringify(risk),
    }),
  
  /**
   * Delete a risk assessment
   */
  delete: (id: number) => 
    fetchAPI<{ message: string }>(`/api/risks/${id}`, {
      method: 'DELETE',
    }),
};

// ===== STATISTICS API =====

export interface Statistics {
  locations: number;
  events: number;
  risks: number;
  historical_events: number;
  vulnerabilities: number;
  average_risk_score: number;
}

export const statisticsAPI = {
  /**
   * Get overall system statistics
   */
  get: () => fetchAPI<Statistics>('/api/statistics'),
};

// ===== DATA SOURCES API =====

export interface DataSource {
  source_id: number;
  item_id: string;
  source_name: string;
  description?: string;
  source_type: string;
  factor_category: 'H' | 'L' | 'V';
  status: 'missing' | 'uploaded' | 'connected';
  file_format?: string;
  file_type?: string;
  file_path?: string;
  api_endpoint?: string;
  api_service?: string;
  current_version?: number;
  last_updated?: string;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DataSourceVersion {
  version_id: number;
  source_id: number;
  version_number: number;
  version_date: string;
  file_name?: string;
  file_size_bytes?: number;
  checksum?: string;
  file_path?: string;
  changes_description?: string;
  uploaded_by?: string;
}

export interface DataSourceUpdateData {
  status?: 'missing' | 'uploaded' | 'connected';
  current_version?: number;
  last_updated?: string;
  file_path?: string;
  uploaded_by?: string;
}

export const dataSourceAPI = {
  /**
   * Get all data sources
   */
  getAll: () => fetchAPI<{ count: number; data_sources: DataSource[] }>('/api/data-sources'),

  /**
   * Get a specific data source by item_id
   */
  getByItemId: (itemId: string) => fetchAPI<DataSource>(`/api/data-sources/${itemId}`),

  /**
   * Update a data source
   */
  update: (itemId: string, data: DataSourceUpdateData) =>
    fetchAPI<{ message: string; data: DataSource }>(`/api/data-sources/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Get all versions for a data source
   */
  getVersions: (itemId: string) =>
    fetchAPI<{ count: number; versions: DataSourceVersion[] }>(`/api/data-sources/${itemId}/versions`),

  /**
   * Upload a file for a data source
   */
  uploadFile: async (file: File, itemId: string, uploadedBy: string = 'user') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('item_id', itemId);
    formData.append('uploaded_by', uploadedBy);

    const url = `${API_BASE_URL}/api/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header - browser will set it with boundary
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Process a DEM file (extract terrain values to database)
   */
  processDEM: (itemId: string, centerLat: number, centerLon: number, extentKm: number = 10, rows: number = 80, cols: number = 80) =>
    fetchAPI(`/api/process-dem/${itemId}`, {
      method: 'POST',
      body: JSON.stringify({
        center_lat: centerLat,
        center_lon: centerLon,
        extent_km: extentKm,
        rows: rows,
        cols: cols,
      }),
    }),
};

// ===== AI-DRIVEN LORE COLLECTION API =====

export interface LoreStory {
  story_id: number;
  area_id?: number;
  title: string;
  story_text?: string;
  file_path?: string;
  scenario_type: 'user_story' | 'ai_discovered' | 'observation_based';
  latitude?: number;
  longitude?: number;
  location_description?: string;
  location_radius_m?: number;
  observation_sight?: string;
  observation_sound?: string;
  observation_datetime?: string;
  ai_status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';
  ai_processed_at?: string;
  ai_error_message?: string;
  ai_event_date?: string;
  ai_event_type?: string;
  ai_recency_score?: number;
  ai_spatial_relevance?: number;
  ai_credibility_score?: number;
  ai_confidence?: number;
  ai_summary?: string;
  ai_extracted_locations?: any;
  created_at: string;
  created_by: string;
  last_modified: string;
  modified_by?: string;
}

export interface SubmitStoryRequest {
  area_id?: number;
  title: string;
  story_text?: string;
  file_path?: string;
  latitude?: number;
  longitude?: number;
  location_description?: string;
  created_by?: string;
}

export interface SubmitObservationRequest {
  area_id?: number;
  title: string;
  latitude: number;
  longitude: number;
  location_description?: string;
  observation_sight?: string;
  observation_sound?: string;
  observation_datetime?: string;
  created_by?: string;
}

export interface DiscoverLoreRequest {
  area_id?: number;
  latitude: number;
  longitude: number;
  location_radius_m?: number;
  created_by?: string;
}

export const loreAPI = {
  /**
   * Scenario 1: Submit a user story/lore for AI analysis
   */
  submitStory: (data: SubmitStoryRequest) =>
    fetchAPI<{
      story_id: number;
      job_id: number;
      message: string;
      ai_status: string;
      ai_results?: any;
    }>('/api/lore/submit-story', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Scenario 2: AI discovers lore at a given location
   */
  discoverAtLocation: (data: DiscoverLoreRequest) =>
    fetchAPI<{
      message: string;
      story_ids: number[];
      location: { latitude: number; longitude: number; radius_m: number };
      ai_results: any;
    }>('/api/lore/discover-at-location', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Scenario 3: Submit an observation for AI search
   */
  submitObservation: (data: SubmitObservationRequest) =>
    fetchAPI<{
      story_id: number;
      job_id: number;
      message: string;
      ai_status: string;
      ai_results?: any;
    }>('/api/lore/submit-observation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Get all lore stories with optional filters
   */
  getStories: (filters?: {
    area_id?: number;
    scenario_type?: string;
    ai_status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.area_id) params.append('area_id', filters.area_id.toString());
    if (filters?.scenario_type) params.append('scenario_type', filters.scenario_type);
    if (filters?.ai_status) params.append('ai_status', filters.ai_status);

    const queryString = params.toString();
    return fetchAPI<{ count: number; stories: LoreStory[] }>(
      `/api/lore/stories${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get AI job queue status
   */
  getAIJobs: (status?: string) => {
    const queryString = status ? `?status=${status}` : '';
    return fetchAPI<{ count: number; jobs: any[] }>(`/api/lore/ai-jobs${queryString}`);
  },
};

// ===== ERROR HANDLING UTILITIES =====

/**
 * Helper function to display user-friendly error messages
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Check if the API is reachable
 */
export async function checkAPIConnection(): Promise<boolean> {
  try {
    await healthCheck();
    return true;
  } catch (error) {
    console.error('API connection failed:', error);
    return false;
  }
}

export default {
  healthCheck,
  locationAPI,
  eventAPI,
  vulnerabilityAPI,
  localLoreAPI,
  historicalEventAPI,
  riskAPI,
  statisticsAPI,
  dataSourceAPI,
  loreAPI,
  getErrorMessage,
  checkAPIConnection,
};

