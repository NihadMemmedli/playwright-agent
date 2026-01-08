#!/bin/bash
# Start Backend and Frontend for Playwright Agent UI

# Clean up on exit
trap "kill 0" EXIT

echo "🚀 Starting Playwright Agent UI..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "   Please start Docker Desktop and try again."
    exit 1
fi

# Start Backend
echo "🐘 Starting Database..."
if ! docker-compose up -d db; then
    echo "❌ Error: Failed to start database container."
    exit 1
fi
export DATABASE_URL=postgresql://postgres:postgres@localhost:5434/playwright_agent

echo "⏳ Waiting for Database to be ready..."
# Wait for 5 seconds to ensure DB is up (simple check)
sleep 5

echo "🐍 Starting Backend API (Port 8001)..."
cd orchestrator
if [ -d "../venv" ]; then
    source ../venv/bin/activate
fi
# Also verify if sqlmodel is installed
if ! python -c "import sqlmodel" 2>/dev/null; then
    echo "❌ Error: sqlmodel not found in python environment."
    echo "   Please run 'make setup' again."
    exit 1
fi
uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload > ../api.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "⚛️ Starting Frontend (Port 3000)..."
cd web
npm run dev > ../web.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "✅ Services started!"
echo "   - API: http://localhost:8001"
echo "   - UI:  http://localhost:3000"
echo ""
echo "📝 Logs are being written to api.log and web.log"
echo "Press Ctrl+C to stop all services."

wait
