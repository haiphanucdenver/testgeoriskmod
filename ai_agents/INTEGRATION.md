# Frontend Integration Guide

This guide explains how to integrate the Local Lore AI Agents API with your React/TypeScript frontend.

## 📋 Prerequisites

1. AI Agents API running on `http://localhost:8000`
2. React/TypeScript project set up
3. Basic understanding of fetch API or axios

## 🔧 Setup

### 1. Install Dependencies (Optional)

```bash
# If you want to use axios instead of fetch
npm install axios

# For TypeScript types
npm install --save-dev @types/node
```

### 2. Create API Service

Create `src/services/loreApi.ts`:

```typescript
// src/services/loreApi.ts

const API_BASE_URL = import.meta.env.VITE_LORE_API_URL || 'http://localhost:8000';

// Types (matching your existing database schema)
export interface LocalLoreExtraction {
  event_narrative: string;
  place_name: string;
  event_date: string | null;
  years_ago: number | null;
  event_date_uncertainty_years: number;
  source_type: 'scientific' | 'official' | 'historical' | 'newspaper' | 
                'field_notes' | 'indigenous' | 'oral_tradition' | 'eyewitness' | 'unknown';
  source_title: string | null;
  source_author: string | null;
  source_url: string | null;
  distance_to_report: number | null;
  recent_score: number;
  credibility_score: number;
  spatial_score: number;
  l_score: number;
  confidence_band: number;
  extraction_timestamp: string;
}

export interface ResearchResult {
  location: string;
  hazard_type: string | null;
  findings: LocalLoreExtraction[];
  summary: string;
  confidence: number;
  sources_count: number;
  research_timestamp: string;
}

export interface ExtractionRequest {
  text?: string;
  file_path?: string;
  location_context?: string;
  current_date?: string;
}

export interface ResearchQuery {
  location: string;
  hazard_type?: 'debris_flow' | 'landslide' | 'rockfall' | 'lava_flow';
  time_range_years?: number;
  include_indigenous_knowledge?: boolean;
  max_sources?: number;
}

class LoreApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Extract local lore from text
   */
  async extractFromText(
    text: string,
    locationContext?: string
  ): Promise<LocalLoreExtraction[]> {
    const response = await fetch(`${this.baseUrl}/api/extract/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        location_context: locationContext,
        current_date: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Extraction failed');
    }

    return response.json();
  }

  /**
   * Extract local lore from uploaded file
   */
  async extractFromFile(
    file: File,
    locationContext?: string
  ): Promise<LocalLoreExtraction[]> {
    const formData = new FormData();
    formData.append('file', file);
    if (locationContext) {
      formData.append('location_context', locationContext);
    }

    const response = await fetch(`${this.baseUrl}/api/extract/file`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'File extraction failed');
    }

    return response.json();
  }

  /**
   * Conduct deep research on a location
   */
  async conductResearch(query: ResearchQuery): Promise<ResearchResult> {
    const response = await fetch(`${this.baseUrl}/api/research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Research failed');
    }

    return response.json();
  }

  /**
   * Get health status
   */
  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  /**
   * Get supported file formats
   */
  async getSupportedFormats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/supported-formats`);
    return response.json();
  }
}

// Export singleton instance
export const loreApi = new LoreApiService();
```

### 3. Add Environment Variable

Create or update `.env.local`:

```env
VITE_LORE_API_URL=http://localhost:8000
```

## 🎨 React Components

### Text Extraction Component

```typescript
// src/components/TextExtractor.tsx
import { useState } from 'react';
import { loreApi, LocalLoreExtraction } from '../services/loreApi';

export function TextExtractor() {
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LocalLoreExtraction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const extracted = await loreApi.extractFromText(text, location || undefined);
      setResults(extracted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-extractor">
      <h2>Extract Local Lore from Text</h2>
      
      <div className="form-group">
        <label>Location Context (optional)</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Armero, Colombia"
        />
      </div>

      <div className="form-group">
        <label>Historical Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Paste historical text about mass movements..."
        />
      </div>

      <button onClick={handleExtract} disabled={loading}>
        {loading ? 'Extracting...' : 'Extract Lore'}
      </button>

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <div className="results">
          <h3>Extracted Events: {results.length}</h3>
          {results.map((lore, idx) => (
            <div key={idx} className="lore-card">
              <h4>{lore.place_name}</h4>
              <p>{lore.event_narrative}</p>
              <div className="scores">
                <span>L-Score: {lore.l_score.toFixed(3)}</span>
                <span>Recent: {lore.recent_score.toFixed(2)}</span>
                <span>Credibility: {lore.credibility_score.toFixed(2)}</span>
                <span>Spatial: {lore.spatial_score.toFixed(2)}</span>
              </div>
              <div className="metadata">
                <small>Source: {lore.source_type}</small>
                {lore.event_date && <small>Date: {lore.event_date}</small>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File Upload Component

```typescript
// src/components/FileUploader.tsx
import { useState, useRef } from 'react';
import { loreApi, LocalLoreExtraction } from '../services/loreApi';

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LocalLoreExtraction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const extracted = await loreApi.extractFromFile(file, location || undefined);
      setResults(extracted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      <h2>Extract from Document</h2>
      
      <div className="form-group">
        <label>Location Context (optional)</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Colombia, Tolima"
        />
      </div>

      <div className="form-group">
        <label>Document File</label>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.docx,.doc,.txt,.md"
        />
        {file && <small>Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)</small>}
      </div>

      <button onClick={handleUpload} disabled={loading || !file}>
        {loading ? 'Processing...' : 'Extract from File'}
      </button>

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <div className="results">
          <h3>Found {results.length} Events</h3>
          {/* Render results similar to TextExtractor */}
        </div>
      )}
    </div>
  );
}
```

### Deep Research Component

```typescript
// src/components/ResearchTool.tsx
import { useState } from 'react';
import { loreApi, ResearchQuery, ResearchResult } from '../services/loreApi';

export function ResearchTool() {
  const [location, setLocation] = useState('');
  const [hazardType, setHazardType] = useState<string>('');
  const [timeRange, setTimeRange] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResearch = async () => {
    if (!location.trim()) {
      setError('Please enter a location');
      return;
    }

    setLoading(true);
    setError(null);

    const query: ResearchQuery = {
      location,
      time_range_years: timeRange,
      include_indigenous_knowledge: true,
      max_sources: 10,
    };

    if (hazardType) {
      query.hazard_type = hazardType as any;
    }

    try {
      const research = await loreApi.conductResearch(query);
      setResult(research);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="research-tool">
      <h2>Deep Research on Location</h2>
      
      <div className="form-group">
        <label>Location *</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Armero, Colombia"
          required
        />
      </div>

      <div className="form-group">
        <label>Hazard Type (optional)</label>
        <select value={hazardType} onChange={(e) => setHazardType(e.target.value)}>
          <option value="">All types</option>
          <option value="debris_flow">Debris Flow</option>
          <option value="landslide">Landslide</option>
          <option value="rockfall">Rockfall</option>
          <option value="lava_flow">Lava Flow</option>
        </select>
      </div>

      <div className="form-group">
        <label>Time Range: {timeRange} years</label>
        <input
          type="range"
          min="10"
          max="200"
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
        />
      </div>

      <button onClick={handleResearch} disabled={loading}>
        {loading ? 'Researching... (30-60s)' : 'Start Research'}
      </button>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="research-results">
          <h3>Research Results for {result.location}</h3>
          <div className="summary">
            <p><strong>Found:</strong> {result.sources_count} events</p>
            <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(0)}%</p>
            <p><strong>Summary:</strong> {result.summary}</p>
          </div>

          <h4>Top Events (by L-Score)</h4>
          {result.findings
            .sort((a, b) => (b.l_score || 0) - (a.l_score || 0))
            .slice(0, 10)
            .map((lore, idx) => (
              <div key={idx} className="lore-card">
                <h5>{idx + 1}. {lore.place_name}</h5>
                <p>{lore.event_narrative}</p>
                <div className="scores">
                  <span className="l-score">L: {lore.l_score.toFixed(3)}</span>
                  <span>R: {lore.recent_score.toFixed(2)}</span>
                  <span>C: {lore.credibility_score.toFixed(2)}</span>
                  <span>S: {lore.spatial_score.toFixed(2)}</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
```

## 💾 Save to Database

After extraction, save to your existing database:

```typescript
// src/services/database.ts
import { LocalLoreExtraction } from './loreApi';

export async function saveLocalLoreToDatabase(
  lore: LocalLoreExtraction,
  locationId: string
): Promise<void> {
  // Use your existing database API
  await fetch('/api/local_lore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location_id: locationId,
      lore_narrative: lore.event_narrative,
      place_name: lore.place_name,
      event_date: lore.event_date,
      years_ago: lore.years_ago,
      event_date_uncertainty_year: lore.event_date_uncertainty_years,
      source_type: lore.source_type,
      source_title: lore.source_title,
      source_author: lore.source_author,
      source_url: lore.source_url,
      distance_to_report: lore.distance_to_report,
      recent: lore.recent_score,
      credibility: lore.credibility_score,
      spatial: lore.spatial_score,
      credibility_score: lore.credibility_score,
      l_score: lore.l_score,
      confidence_band: lore.confidence_band,
    }),
  });
}
```

## 🎨 CSS Styling

```css
/* Add to your stylesheet */
.text-extractor,
.file-uploader,
.research-tool {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #0056b3;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  padding: 1rem;
  background: #fee;
  color: #c33;
  border-radius: 4px;
  margin-top: 1rem;
}

.lore-card {
  border: 1px solid #ddd;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
}

.scores {
  display: flex;
  gap: 1rem;
  margin: 0.5rem 0;
}

.scores span {
  background: #f0f0f0;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.9rem;
}

.l-score {
  background: #007bff !important;
  color: white;
  font-weight: bold;
}
```

## 🚀 Usage in Your App

```typescript
// src/App.tsx or your router
import { TextExtractor } from './components/TextExtractor';
import { FileUploader } from './components/FileUploader';
import { ResearchTool } from './components/ResearchTool';

function App() {
  return (
    <div className="app">
      <h1>Local Lore AI Tools</h1>
      
      <TextExtractor />
      <FileUploader />
      <ResearchTool />
    </div>
  );
}
```

## ✅ Checklist

- [ ] AI Agents API running on port 8000
- [ ] Environment variable set in `.env.local`
- [ ] API service created in `src/services/loreApi.ts`
- [ ] Components created and imported
- [ ] CSS styling added
- [ ] Test the connection with health check
- [ ] Integration with your existing database ready

## 🐛 Troubleshooting

**CORS errors?**
- Ensure API is running with CORS enabled
- Check `allow_origins` in `api.py`

**API not responding?**
- Check API is running: `http://localhost:8000/health`
- Verify `.env.local` has correct URL

**TypeScript errors?**
- Ensure types match between frontend and backend
- Check `models.py` and TypeScript interfaces align

---

**Need help?** Open an issue or check the main README.md
