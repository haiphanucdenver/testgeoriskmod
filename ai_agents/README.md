# Borromean Risk - Local Lore AI Agents

AI-powered extraction and research agents for analyzing historical mass movement events and calculating Local Lore (L) scores for the Borromean Risk Assessment framework.

## 🎯 Overview

This system provides two main AI agents:

1. **Document Extraction Agent**: Extracts structured Local Lore data from documents (PDFs, DOCX, TXT)
2. **Deep Research Agent**: Conducts comprehensive research about a location's mass movement history

Both agents use OpenAI's reasoning models to intelligently extract and synthesize information, then calculate L-scores using the formula:

```
L = 0.35*L1 + 0.40*L2 + 0.25*L3

Where:
- L1 = Recent score (how recent the event was)
- L2 = Credibility score (source reliability) 
- L3 = Spatial score (distance relevance)
```

## 📋 Features

- ✅ Extract historical event data from documents
- ✅ Deep research using OpenAI reasoning models
- ✅ Automatic L-score calculation (Recent, Credibility, Spatial)
- ✅ Support for multiple file formats (PDF, DOCX, TXT, MD)
- ✅ RESTful API for easy integration
- ✅ Configurable scoring weights and thresholds
- ✅ Indigenous/local knowledge integration
- ✅ Uncertainty quantification

## 🚀 Quick Start

### 1. Installation

```bash
# Navigate to the AI agents directory
cd ai_agents

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-...
```

### 3. Run the API Server

```bash
python api.py
```

The server will start on `http://localhost:8000`

- 📚 API Documentation: http://localhost:8000/docs
- 🔍 Interactive API: http://localhost:8000/redoc

## 📖 API Usage

### Extract from Text

```bash
curl -X POST "http://localhost:8000/api/extract/text" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "In 1985, Armero was destroyed by a lahar from Nevado del Ruiz volcano...",
    "location_context": "Colombia, Tolima Department"
  }'
```

### Extract from File

```bash
curl -X POST "http://localhost:8000/api/extract/file" \
  -F "file=@historical_records.pdf" \
  -F "location_context=Armero, Colombia"
```

### Conduct Deep Research

```bash
curl -X POST "http://localhost:8000/api/research" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Armero, Colombia",
    "hazard_type": "debris_flow",
    "time_range_years": 100,
    "include_indigenous_knowledge": true,
    "max_sources": 10
  }'
```

## 🔧 Python Usage

### Document Extraction

```python
from extraction_agent import DocumentExtractionAgent
from models import ExtractionRequest

agent = DocumentExtractionAgent()

request = ExtractionRequest(
    text="Your historical text here...",
    location_context="Location name"
)

results = agent.extract_from_text_sync(request)

for lore in results:
    print(f"Event: {lore.place_name}")
    print(f"L-Score: {lore.l_score:.3f}")
    print(f"  - Recent: {lore.recent_score:.3f}")
    print(f"  - Credibility: {lore.credibility_score:.3f}")
    print(f"  - Spatial: {lore.spatial_score:.3f}")
```

### Deep Research

```python
from research_agent import DeepResearchAgent
from models import ResearchQuery, HazardType

agent = DeepResearchAgent()

query = ResearchQuery(
    location="Armero, Colombia",
    hazard_type=HazardType.DEBRIS_FLOW,
    time_range_years=100,
    include_indigenous_knowledge=True
)

result = agent.conduct_research_sync(query)

print(f"Found {result.sources_count} events")
print(f"Summary: {result.summary}")

for finding in result.findings:
    print(f"\nEvent: {finding.place_name}")
    print(f"Date: {finding.event_date}")
    print(f"L-Score: {finding.l_score:.3f}")
```

## 📁 Project Structure

```
ai_agents/
├── api.py                  # FastAPI server
├── config.py              # Configuration
├── models.py              # Pydantic data models
├── extraction_agent.py    # Document extraction agent
├── research_agent.py      # Deep research agent
├── lore_calculator.py     # L-score calculation
├── file_processor.py      # File handling utilities
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
└── README.md             # This file
```

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | (required) |
| `OPENAI_MODEL` | Model for extraction | `o1-preview` |
| `OPENAI_RESEARCH_MODEL` | Model for research | `gpt-4-turbo-preview` |
| `API_HOST` | API server host | `0.0.0.0` |
| `API_PORT` | API server port | `8000` |
| `UPLOAD_DIR` | Upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max file size (bytes) | `10485760` (10MB) |

## 📊 L-Score Calculation

### Formula
```
L = w1*L1 + w2*L2 + w3*L3

Default weights:
- w1 = 0.35 (Recent)
- w2 = 0.40 (Credibility)
- w3 = 0.25 (Spatial)
```

### Components

**L1 - Recent Score** (Recency)
- Uses exponential decay
- More recent events → higher scores
- Penalized by date uncertainty

**L2 - Credibility Score** (Source Reliability)
- Based on source type:
  - Scientific: 1.0
  - Official: 0.9
  - Historical: 0.8
  - Newspaper: 0.7
  - Indigenous: 0.6
  - Oral tradition: 0.5
- Bonuses for author, URL, corroboration

**L3 - Spatial Score** (Distance Relevance)
- Gaussian decay with distance
- Closer events → higher scores
- Default: 0.5 if distance unknown

## 🎨 Frontend Integration

### TypeScript/React Example

```typescript
// types.ts
export interface LocalLoreExtraction {
  event_narrative: string;
  place_name: string;
  event_date: string | null;
  years_ago: number | null;
  source_type: string;
  l_score: number;
  recent_score: number;
  credibility_score: number;
  spatial_score: number;
}

// api.ts
export async function extractFromText(
  text: string,
  locationContext?: string
): Promise<LocalLoreExtraction[]> {
  const response = await fetch('http://localhost:8000/api/extract/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      location_context: locationContext
    })
  });
  
  if (!response.ok) throw new Error('Extraction failed');
  return response.json();
}

export async function conductResearch(
  location: string,
  hazardType?: string
): Promise<ResearchResult> {
  const response = await fetch('http://localhost:8000/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      hazard_type: hazardType,
      time_range_years: 100,
      include_indigenous_knowledge: true
    })
  });
  
  if (!response.ok) throw new Error('Research failed');
  return response.json();
}

// component.tsx
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('location_context', 'Colombia');
  
  const response = await fetch('http://localhost:8000/api/extract/file', {
    method: 'POST',
    body: formData
  });
  
  const results = await response.json();
  setLoreData(results);
};
```

## 🧪 Testing

### Test Document Extraction

```bash
# Create a test file
echo "In 1985, Armero was destroyed by a massive lahar..." > test.txt

# Test extraction
python extraction_agent.py
```

### Test Deep Research

```bash
python research_agent.py
```

### Test File Processing

```bash
python file_processor.py path/to/document.pdf
```

### Test API

```bash
# Start server
python api.py

# In another terminal, test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/supported-formats
```

## 🔍 Advanced Usage

### Custom Scoring Weights

```python
from lore_calculator import LoreScoreCalculator

# Custom weights
calculator = LoreScoreCalculator(weights={
    "recent": 0.40,      # Increase recency importance
    "credibility": 0.35,
    "spatial": 0.25
})

lore = calculator.update_lore_with_scores(lore_data)
```

### Batch Processing

```python
from research_agent import DeepResearchAgent

agent = DeepResearchAgent()

locations = ["Armero, Colombia", "Nevado del Ruiz", "Tolima Region"]
results = await agent.multi_location_research(locations)

for location, result in results.items():
    print(f"{location}: {result.sources_count} events found")
```

## 📈 Performance

- **Extraction Agent**: ~5-15 seconds per document (depends on length)
- **Research Agent**: ~30-60 seconds per location
- **Supported file size**: Up to 10MB
- **Batch research**: Up to 10 locations simultaneously

## 🛡️ Security

- API keys stored in environment variables
- File uploads validated and sanitized
- Size limits enforced
- CORS configured for frontend domains
- No sensitive data logged

## 🐛 Troubleshooting

### "OpenAI API key not found"
- Ensure `.env` file exists with `OPENAI_API_KEY=...`
- Check the key is valid and has sufficient credits

### "Failed to parse JSON response"
- Model may have returned non-JSON
- Check OpenAI API status
- Try reducing text length

### "Unsupported file type"
- Only PDF, DOCX, TXT, MD are supported
- Check file extension is correct

### "File too large"
- Max size is 10MB by default
- Increase `MAX_FILE_SIZE` in config if needed

## 📚 References

- [Technical Risk Framework (Portilla, 2022)](https://github.com/yourusername/mass-movements)
- [Borromean Risk Assessment Documentation](./docs/)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file

## 👥 Authors

- Modesto Portilla Gamboa (Technical Risk Framework)
- Development Team (AI Implementation)

## 📧 Support

For questions or issues:
- Open an issue on GitHub
- Email: support@example.com
- Documentation: https://docs.example.com

---

**Built with ❤️ for safer communities**
