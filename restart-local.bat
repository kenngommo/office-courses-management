@echo off
setlocal

cd /d "%~dp0"
set "APP_URL=http://127.0.0.1:8000"
set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [ERROR] Virtual environment not found:
    echo %PYTHON_EXE%
    echo.
    echo Create it first with: python -m venv .venv
    pause
    exit /b 1
)

powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%/api/employees' -TimeoutSec 2 ^| Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
    echo Server is already running at %APP_URL%
    start "" "%APP_URL%"
    exit /b 0
)

echo Starting Courses Management server...
start "Courses Management Server" cmd /k "cd /d ""%~dp0"" && ""%PYTHON_EXE%"" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo Waiting for the server...
for /l %%I in (1,1,20) do (
    powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%/api/employees' -TimeoutSec 2 ^| Out-Null; exit 0 } catch { exit 1 }"
    if not errorlevel 1 goto :ready
    timeout /t 1 /nobreak >nul
)

echo [ERROR] Server did not become ready. Check the server window for details.
pause
exit /b 1

:ready
echo Server is ready: %APP_URL%
start "" "%APP_URL%"
exit /b 0
