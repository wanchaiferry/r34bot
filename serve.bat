@echo off
setlocal

REM Serve the static files from the repository directory on port 8000.
pushd "%~dp0"

python server.py %*

popd
endlocal
