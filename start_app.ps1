# Script de lancement automatique DDoS Guard (Port 8080)
Write-Host "🚀 Démarrage du système de détection DDoS..." -ForegroundColor Cyan

# Lancer le Backend dans un nouveau terminal (Port 9000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn main:app --host 127.0.0.1 --port 9000 --reload"

# Lancer le Frontend dans un nouveau terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

# Lancer la Sonde Temps Réel (Acquiert les droits Administrateur automatiquement)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\lenovo\Desktop\ProjetUIT2026\ProjetDdoos\backend'; python live_sniffer.py" -Verb RunAs

Write-Host "✅ Serveurs lancés !" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5100"
Write-Host "📡 API (9000): http://localhost:9000"
Write-Host "🛡️ Capteur Scapy Live lancé dans une nouvelle fenêtre !"
