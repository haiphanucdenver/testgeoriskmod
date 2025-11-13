#!/bin/bash

# GEORISKMOD - Development Server Startup Script
# This script starts both the backend and frontend servers

echo "🚀 Starting GEORISKMOD Development Servers..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with your configuration."
    echo "See API_SETUP_GUIDE.md for instructions."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if virtual environment exists
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "📦 No virtual environment found. Creating one..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Install Python dependencies if needed
echo "📦 Checking Python dependencies..."
pip install -q fastapi uvicorn pydantic python-multipart psycopg2-binary python-dotenv

# Start backend server in background
echo ""
echo "🐍 Starting Backend Server (FastAPI)..."
python api_server.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend server started (PID: $BACKEND_PID)"
    echo "   📚 API Docs: http://localhost:8000/docs"
    echo "   🏥 Health Check: http://localhost:8000/api/health"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

# Install Node dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing Node dependencies..."
    npm install
fi

# Start frontend server
echo ""
echo "⚛️  Starting Frontend Server (Vite)..."
echo "   🌐 App: http://localhost:5173"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Both servers are running!"
echo "  Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start frontend (this will block)
npm run dev

# Cleanup: Kill backend when frontend stops
echo ""
echo "🛑 Stopping servers..."
kill $BACKEND_PID 2>/dev/null
echo "✅ Servers stopped"

