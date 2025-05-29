@echo off
REM AutoCut CEP Plugin Installer for Windows

echo Installing AutoCut CEP Plugin for Adobe Premiere Pro...
echo.

REM Get user's extensions directory
set CEP_EXTENSIONS_DIR=%USERPROFILE%\AppData\Roaming\Adobe\CEP\extensions

REM Create extensions directory if it doesn't exist
if not exist "%CEP_EXTENSIONS_DIR%" (
    mkdir "%CEP_EXTENSIONS_DIR%"
)

REM Create AutoCut directory
set PLUGIN_DIR=%CEP_EXTENSIONS_DIR%\com.autocut.panel
if exist "%PLUGIN_DIR%" (
    echo Removing existing AutoCut installation...
    rmdir /s /q "%PLUGIN_DIR%"
)

echo Creating plugin directory: %PLUGIN_DIR%
mkdir "%PLUGIN_DIR%"

REM Copy plugin files
echo Copying plugin files...
xcopy /s /e /y "%~dp0CSXS" "%PLUGIN_DIR%\CSXS\"
xcopy /s /e /y "%~dp0css" "%PLUGIN_DIR%\css\"
xcopy /s /e /y "%~dp0js" "%PLUGIN_DIR%\js\"
xcopy /s /e /y "%~dp0jsx" "%PLUGIN_DIR%\jsx\"
copy /y "%~dp0index.html" "%PLUGIN_DIR%\"

REM Install Python dependencies
echo.
echo Installing Python dependencies for Whisper service...
pip install -r "%~dp0python\requirements.txt"

REM Copy Python service
set PYTHON_DIR=%PLUGIN_DIR%\python
mkdir "%PYTHON_DIR%"
copy /y "%~dp0python\*.py" "%PYTHON_DIR%\"
copy /y "%~dp0python\requirements.txt" "%PYTHON_DIR%\"

REM Enable CEP debugging (required for development)
echo.
echo Enabling CEP debugging...
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f

echo.
echo Installation complete!
echo.
echo To use AutoCut:
echo 1. Restart Adobe Premiere Pro
echo 2. Go to Window ^> Extensions ^> AutoCut - Silence Detection
echo 3. Run the Whisper service by executing: start_whisper_service.bat
echo.
echo Note: Make sure Python is installed and accessible from command line.
echo.
pause