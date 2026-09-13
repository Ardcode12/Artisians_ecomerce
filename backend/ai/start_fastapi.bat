@echo off
echo ===================================================
echo  Artisans Master AI Pipeline - FastAPI Server
echo ===================================================
echo.

cd /d "%~dp0"
set FASTAPI_PORT=8000

if exist ".venv\Scripts\activate.bat" (
    echo Activating Python virtual environment...
    call .venv\Scripts\activate.bat
)

echo Checking Python environment...
python -c "import fastapi, uvicorn" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] FastAPI or Uvicorn not installed. Running setup.bat first...
    call setup.bat
)

echo.
echo Starting FastAPI AI server on http://127.0.0.1:8000 ...
echo Swagger UI docs available at: http://127.0.0.1:8000/docs
echo.
python main.py
pause
