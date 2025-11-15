-- =====================================================
-- DATA_SOURCES Table
-- =====================================================
-- This table tracks data sources for H, L, and V factors
-- Supports both file uploads and API connections

CREATE TABLE IF NOT EXISTS data_sources (
    source_id SERIAL PRIMARY KEY,
    item_id VARCHAR(255) NOT NULL UNIQUE,
    source_name VARCHAR(500) NOT NULL,
    description TEXT,
    source_type VARCHAR(100) NOT NULL, -- 'file' or 'api'
    factor_category VARCHAR(1) NOT NULL CHECK (factor_category IN ('H', 'L', 'V')),
    status VARCHAR(50) NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'uploaded', 'connected')),

    -- File-based source fields
    file_format VARCHAR(100), -- e.g., 'GeoJSON', 'Shapefile', 'CSV', 'GeoTIFF'
    file_type VARCHAR(100), -- e.g., 'vector', 'raster'
    file_path TEXT,

    -- API-based source fields
    api_endpoint TEXT,
    api_service VARCHAR(255), -- e.g., 'USGS', 'OpenTopography', 'Custom'

    -- Version tracking
    current_version INTEGER DEFAULT 1,

    -- Metadata
    last_updated TIMESTAMP,
    uploaded_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_data_sources_item_id ON data_sources(item_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_factor_category ON data_sources(factor_category);
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(status);
CREATE INDEX IF NOT EXISTS idx_data_sources_source_type ON data_sources(source_type);

-- Add comments
COMMENT ON TABLE data_sources IS 'Tracks data sources for H (Hazard), L (Local Lore), and V (Vulnerability) factors';
COMMENT ON COLUMN data_sources.item_id IS 'Unique identifier for the data source (e.g., h-factor-dem)';
COMMENT ON COLUMN data_sources.factor_category IS 'Factor category: H (Hazard/Event), L (Local Lore), V (Vulnerability)';
COMMENT ON COLUMN data_sources.status IS 'Current status of the data source';

-- Insert default data sources for the application
INSERT INTO data_sources (item_id, source_name, description, source_type, factor_category, status, file_format, file_type)
VALUES
    -- H-Factor (Event/Hazard) data sources
    ('h-factor-dem', 'Digital Elevation Model', 'High-resolution DEM for slope and curvature analysis', 'file', 'H', 'missing', 'GeoTIFF', 'raster'),
    ('h-factor-geology', 'Geological Map', 'Lithology and geological formations data', 'file', 'H', 'missing', 'Shapefile', 'vector'),
    ('h-factor-landcover', 'Land Cover Map', 'Land use and vegetation coverage', 'file', 'H', 'missing', 'GeoTIFF', 'raster'),
    ('h-factor-rainfall', 'Rainfall Data', 'Historical precipitation records', 'api', 'H', 'missing', NULL, NULL),
    ('h-factor-seismic', 'Seismic Activity', 'Earthquake and ground motion data', 'api', 'H', 'missing', NULL, NULL),

    -- L-Factor (Local Lore) data sources
    ('l-factor-stories', 'Historical Stories', 'Local narratives and historical accounts', 'database', 'L', 'connected', NULL, NULL),
    ('l-factor-newspapers', 'Newspaper Archives', 'Historical newspaper records of events', 'api', 'L', 'missing', NULL, NULL),
    ('l-factor-oral', 'Oral Traditions', 'Community oral history recordings', 'file', 'L', 'missing', 'JSON', 'structured'),

    -- V-Factor (Vulnerability) data sources
    ('v-factor-buildings', 'Building Footprints', 'Infrastructure and building locations', 'file', 'V', 'missing', 'Shapefile', 'vector'),
    ('v-factor-population', 'Population Density', 'Population distribution data', 'file', 'V', 'missing', 'GeoTIFF', 'raster'),
    ('v-factor-roads', 'Road Network', 'Transportation infrastructure', 'api', 'V', 'missing', NULL, NULL),
    ('v-factor-critical', 'Critical Facilities', 'Hospitals, schools, emergency facilities', 'file', 'V', 'missing', 'GeoJSON', 'vector')
ON CONFLICT (item_id) DO NOTHING;
