@echo off
cd /d "%~dp0"
start "" /b node server.js
timeout /t 1 /nobreak >nul
start "" http://localhost:3000
echo Talent Seeker esta abierto en http://localhost:3000
echo Cerra esta ventana para detener la aplicacion.
pause
