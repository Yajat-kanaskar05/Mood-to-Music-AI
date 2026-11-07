# Mood-to-Music AI — Start All 3 Services
$ROOT = $PSScriptRoot

Write-Host "`n🎵 Starting Mood-to-Music AI Microservices Architecture...`n" -ForegroundColor Cyan

# 1. Start Python FastAPI ML Microservice (Port 8000)
Write-Host "[1/3] Launching Python ML Engine on Port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT'; .\venv\Scripts\python.exe ml_service/main.py"

# 2. Start Node.js Express API Gateway (Port 4000)
Write-Host "[2/3] Launching Node.js API Gateway on Port 4000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\backend-node'; npm run dev"

# 3. Start React Frontend (Port 3000)
Write-Host "[3/3] Launching React Vite Frontend on Port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; npm run dev"

Write-Host "`n🚀 All services initiated!" -ForegroundColor Green
Write-Host "   • Web App UI:       http://localhost:3000" -ForegroundColor White
Write-Host "   • Node.js Gateway:  http://localhost:4000/health" -ForegroundColor White
Write-Host "   • Python FastAPI:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "`nOpen your browser at http://localhost:3000 to test recommendations.`n" -ForegroundColor Cyan
