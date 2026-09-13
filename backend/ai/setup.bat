@echo off
echo ===================================================
echo  Artisans Master AI Pipeline - Setup
echo ===================================================
echo.

echo [1/3] Checking Python version...
python --version
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.9+ from https://python.org
    pause
    exit /b 1
)

echo.
echo [2/3] Upgrading pip...
python -m pip install --upgrade pip

echo.
echo [3/3] Installing Master AI pipeline dependencies...
echo (FastAPI, Uvicorn, rembg, OpenCV, Real-ESRGAN, faster-whisper, Claude/OpenAI, SerpApi, pandas)
echo This may take several minutes on initial download...
echo.

pip install -r requirements.txt

echo.
echo ===================================================
echo  Setup Complete!
echo ===================================================
echo.
echo  Master AI Services ready:
echo  - Service 1: AI Photo Enhancer (rembg + OpenCV CLAHE + Real-ESRGAN)
echo  - Service 2: Voice Auto-Cataloger (faster-whisper + Claude/GPT-4o-mini)
echo  - Service 3: Dynamic Pricing Assistant (SerpApi + pandas fair-margin)
echo.
echo  FastAPI Server:
echo    Run start_fastapi.bat to launch AI server on port 8000
echo    Interactive API docs: http://localhost:8000/docs
echo.
echo  API Keys (set in backend/.env):
echo    OPENAI_API_KEY=... OR ANTHROPIC_API_KEY=...
echo    SERPAPI_API_KEY=...
echo.
pause
