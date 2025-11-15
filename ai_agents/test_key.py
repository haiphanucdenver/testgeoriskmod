import sys
import os
from pathlib import Path
from datetime import datetime

# Ensure repo root is on sys.path so "ai_agents" imports work when running this script directly
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from ai_agents.config import Config

try:
    from openai import OpenAI
except Exception:
    print("Error: 'openai' package not installed. Install with: pip install openai")
    raise


api_key = os.getenv("OPENAI_API_KEY") or Config.OPENAI_API_KEY

print(f"API Key (first 7 chars): {api_key[:7] if api_key else 'MISSING'}")
print(f"API Key (last 4 chars): ...{api_key[-4:] if api_key else 'MISSING'}")

client = OpenAI(api_key=api_key)

try:
    # Try to list models - this will tell us if the key is valid
    models = client.models.list()
    print("✓ API key is valid")
    print(f"✓ You have access to {len(models.data)} models")
except Exception as e:
    print(f"✗ API key issue: {e}")

try:
    response = client.responses.create(
        model="gpt-5",
        input="Say hello to me!"
    )
    print(response.output_text)
    print("✓ Success! Response!")
except Exception as e:
    print(f"✗ Unsuccessful: {e}")




