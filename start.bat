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
if not exist "%ROOT%\test-logs" mkdir "%ROOT%\test-logs"
start /B "LibraNia MCP Server" cmd /c "set LIBRANIA_DATA_DIR=%ROOT%\data&& cd /d "%ROOT%\mcp-server" && node dist/index.js > "%ROOT%\test-logs\mcp-server.log" 2>&1"

echo MCP server started in the background. Logs: test-logs\mcp-server.log
echo Starting LibraNia server in this window. Press Ctrl+C to stop it.
node bin/librania.js start --port 3001
