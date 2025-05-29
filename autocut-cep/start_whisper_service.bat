@echo off
REM Start AutoCut Whisper Service on Windows

echo Starting AutoCut Whisper Service...
echo.
echo This service needs to run while using AutoCut in Premiere Pro
echo Press Ctrl+C to stop the service
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Start the Python service
python "%SCRIPT_DIR%python\whisper_service.py" --port 8888 --host localhost --model base

pause