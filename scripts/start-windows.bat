@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."

set "CLAWDWATCH_COMMAND=%~1"
if "%CLAWDWATCH_COMMAND%"=="" set "CLAWDWATCH_COMMAND=watch"
if not "%~1"=="" shift

set "FORWARD_ARGS="
:collect_args
if "%~1"=="" goto run_command
set "FORWARD_ARGS=%FORWARD_ARGS% %~1"
shift
goto collect_args

:run_command
echo Running Clawdwatch command: %CLAWDWATCH_COMMAND%
call npm run %CLAWDWATCH_COMMAND% --%FORWARD_ARGS%
set "EXIT_CODE=%ERRORLEVEL%"

popd
exit /b %EXIT_CODE%
