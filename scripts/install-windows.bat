@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required but was not found in PATH.
  popd
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is required but was not found in PATH.
  popd
  exit /b 1
)

echo Installing Clawdwatch dependencies...
call npm install
if errorlevel 1 (
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

if not exist ".env" if exist ".env.example" (
  copy /Y ".env.example" ".env" >nul
  echo Created .env from .env.example
)

echo Build check...
call npm run build
if errorlevel 1 (
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

echo Install complete.
echo Start with scripts\start-windows.bat

popd
exit /b 0
