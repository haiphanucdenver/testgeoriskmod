#!/bin/bash

# Borromean Risk - Local Lore AI Agents Setup Script

echo "=================================================="
echo "Borromean Risk - Local Lore AI Agents Setup"
echo "=================================================="
echo ""

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Create virtual environment
echo ""
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "✓ Virtual environment created"
echo ""
echo "🔧 Activating virtual environment..."

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

echo "✓ Virtual environment activated"

# Upgrade pip
echo ""
echo "⬆️  Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
echo "✓ Pip upgraded"

# Install requirements
echo ""
echo "📥 Installing dependencies..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your OpenAI API key!"
    echo "   Open .env and set: OPENAI_API_KEY=your_key_here"
else
    echo ""
    echo "ℹ️  .env file already exists"
fi

# Create upload directory
echo ""
echo "📁 Creating upload directory..."
mkdir -p uploads
echo "✓ Upload directory created"

# Summary
echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Add your OpenAI API key to .env file"
echo "2. Activate venv: source venv/bin/activate  (or venv\\Scripts\\activate on Windows)"
echo "3. Start the API: python api.py"
echo "4. Visit: http://localhost:8000/docs"
echo ""
echo "For testing:"
echo "  python extraction_agent.py"
echo "  python research_agent.py"
echo ""
echo "=================================================="
