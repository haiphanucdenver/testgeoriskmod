# Quick Reference Card - Local Lore AI Agents

## 🚀 Quick Start Commands

```bash
# Setup
cd ai_agents
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add OPENAI_API_KEY

# Start Server
python api.py

# Test System
python test_system.py          # Basic tests
python test_system.py --full   # Full tests with API
```

## 🔗 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/extract/text` | POST | Extract from text |
| `/api/extract/file` | POST | Extract from file |
| `/api/research` | POST | Deep research |
| `/api/supported-formats` | GET | Get supported formats |
| `/api/config` | GET | Get configuration |
| `/docs` | GET | API documentation |

## 📝 API Examples

### Extract from Text
```bash
curl -X POST http://localhost:8000/api/extract/text \
  -H "Content-Type: application/json" \
  -d '{"text":"Historical text here...","location_context":"Colombia"}'
```

### Extract from File
```bash
curl -X POST http://localhost:8000/api/extract/file \
  -F "file=@document.pdf" \
  -F "location_context=Colombia"
```

### Research Location
```bash
curl -X POST http://localhost:8000/api/research \
  -H "Content-Type: application/json" \
  -d '{"location":"Armero, Colombia","time_range_years":100}'
```

## 📊 L-Score Formula

```
L = 0.35×Recent + 0.40×Credibility + 0.25×Spatial

Where:
• Recent (L1): Recency of event (0-1)
• Credibility (L2): Source reliability (0-1)
• Spatial (L3): Distance relevance (0-1)
```

### Source Credibility Scores
| Source Type | Score |
|-------------|-------|
| Scientific | 1.0 |
| Official | 0.9 |
| Historical | 0.8 |
| Newspaper | 0.7 |
| Field Notes | 0.7 |
| Indigenous | 0.6 |
| Oral Tradition | 0.5 |

## 🎨 React Integration (Quick)

```typescript
// 1. Create API service
// src/services/loreApi.ts
export const loreApi = {
  async extractFromText(text: string, location?: string) {
    const res = await fetch('http://localhost:8000/api/extract/text', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text, location_context: location})
    });
    return res.json();
  },
  
  async conductResearch(location: string) {
    const res = await fetch('http://localhost:8000/api/research', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({location, time_range_years: 100})
    });
    return res.json();
  }
};

// 2. Use in component
const results = await loreApi.extractFromText(text, "Colombia");
```

## 🗂️ File Support

| Extension | Supported |
|-----------|-----------|
| .pdf | ✅ |
| .docx | ✅ |
| .doc | ✅ |
| .txt | ✅ |
| .md | ✅ |

Max file size: **10MB** (configurable in `config.py`)

## 🔧 Configuration Quick Edit

```python
# config.py

# Change scoring weights
LORE_WEIGHTS = {
    "recent": 0.35,      # Adjust these
    "credibility": 0.40,
    "spatial": 0.25
}

# Change file size limit
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Change API port
API_PORT = 8000
```

## 📊 Database Mapping

```
AI Output Field         →  Database Column
─────────────────────      ──────────────────
event_narrative         →  lore_narrative
place_name              →  event_location_name
event_date              →  event_date
years_ago               →  years_ago
source_type             →  source_type
source_title            →  source_title
source_url              →  source_url
recent_score            →  recent
credibility_score       →  credibility
spatial_score           →  spatial
l_score                 →  l_score
confidence_band         →  confidence_band
```

## 🐛 Troubleshooting Checklist

- [ ] Virtual environment activated?
- [ ] `.env` file exists with API key?
- [ ] Server running on port 8000?
- [ ] CORS allows your frontend URL?
- [ ] OpenAI API key valid with credits?
- [ ] File under 10MB?
- [ ] Correct file format?

## 🔍 Health Check

```bash
# Check if server is running
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-...",
  "openai_configured": true,
  "models": {...}
}
```

## 📁 Project Structure

```
ai_agents/
├── api.py                 ← Start here
├── config.py              ← Configuration
├── models.py              ← Data models
├── extraction_agent.py    ← Extract from docs
├── research_agent.py      ← Deep research
├── lore_calculator.py     ← L-score calc
├── file_processor.py      ← File handling
├── requirements.txt       ← Dependencies
└── .env                   ← API key (create this!)
```

## ⚡ Performance

| Operation | Time |
|-----------|------|
| Text extraction | 5-15s |
| File extraction | 10-30s |
| Deep research | 30-60s |
| L-score calculation | <1s |

## 🔐 Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
OPENAI_MODEL=o1-preview
OPENAI_RESEARCH_MODEL=gpt-4-turbo-preview
API_PORT=8000
MAX_FILE_SIZE=10485760
```

## 📚 Documentation Links

- Main Guide: `README.md`
- Frontend Integration: `INTEGRATION.md`
- Complete Workflow: `COMPLETE_GUIDE.md`
- API Docs: http://localhost:8000/docs

## 🆘 Quick Fixes

**Server won't start**
```bash
source venv/bin/activate
pip install -r requirements.txt
python api.py
```

**"Module not found"**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**"API key not found"**
```bash
# Check .env file exists and has:
OPENAI_API_KEY=sk-your-key-here
```

**CORS error**
```python
# In api.py, add your frontend URL:
allow_origins=["http://localhost:3000", "http://your-url"]
```

## 💡 Tips

1. **Test extraction on short text first** before large documents
2. **Save API results** to avoid re-processing
3. **Review and curate** AI extractions before saving to database
4. **Start with recent history** (50 years) in research
5. **Use location context** for better extraction accuracy

---

**Keep this card handy!** 📌

Visit http://localhost:8000/docs for interactive API documentation.
