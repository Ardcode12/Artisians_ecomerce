@echo off
title Artisans Marketplace Backend
echo ============================================================
echo   Starting Artisans FastAPI Server on http://localhost:5000
echo   Database: Local SQLite on-device
echo ============================================================
cd /d "%~dp0"
python start_server.py
pause
