@echo off
setlocal

REM Serve the static files from the repository directory on port 8000.
pushd "%~dp0"

python -m http.server 8000

popd
endlocal
