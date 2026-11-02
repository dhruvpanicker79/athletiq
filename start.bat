@echo off
rem One-click launcher for ATHLETIQ (uses the bundled portable Node in .tools if Node isn't installed)
set "ROOT=%~dp0"
if exist "%ROOT%.tools\node-v22.11.0-win-x64\node.exe" set "PATH=%ROOT%.tools\node-v22.11.0-win-x64;%PATH%"

where node >nul 2>nul || (echo Node.js not found. Install it from https://nodejs.org & pause & exit /b 1)

if not exist "%ROOT%server\node_modules" (pushd "%ROOT%server" & call npm install & popd)
if not exist "%ROOT%client\node_modules" (pushd "%ROOT%client" & call npm install & popd)
if not exist "%ROOT%server\.env" copy "%ROOT%server\.env.example" "%ROOT%server\.env" >nul

start "ATHLETIQ API (port 5050)" /d "%ROOT%server" cmd /k node index.js
start "ATHLETIQ Web (port 5173)" /d "%ROOT%client" cmd /k npm run dev
timeout /t 6 /nobreak >nul
start "" http://localhost:5173
