@echo off
echo Building...
call npm run build:package
if %errorlevel% neq 0 (
    echo Backend build failed!
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
start "LibraNia Server" node bin/librania.js start --port 3001
start "LibraNia MCP Server" cmd /k "cd mcp-server && node dist/index.js"

echo Both servers started in separate windows
echo Close the windows to stop the servers
