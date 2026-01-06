#!/bin/bash
# Start Backend and Frontend for Playwright Agent UI

# Clean up on exit
trap "kill 0" EXIT

echo "🚀 Starting Playwright Agent UI..."

# Start Backend
echo "🐍 Starting Backend API (Port 8001)..."
cd orchestrator
if [ -d "venv" ]; then
    source venv/bin/activate
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
