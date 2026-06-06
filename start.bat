@echo off
setlocal
set "ROOT=%CD%"
echo Building...
call npm run build:package
if %errorlevel% neq 0 (
    echo Package build failed!
    pause
    exit /b %errorlevel%
)

echo Fixing ESM imports...
powershell -ExecutionPolicy Bypass -File fix-esm-imports.ps1

echo Building MCP server...
cd mcp-server
call npm run build
if %errorlevel% neq 0 (
    echo MCP build failed!
    pause
    exit /b %errorlevel%
)
cd ..

echo Starting LibraNia server and MCP server...
echo Press Ctrl+C once to stop both servers.
node scripts\start-supervisor.js
