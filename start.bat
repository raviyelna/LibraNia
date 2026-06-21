@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%CD%"

call :EnsureRootDependencies
if %errorlevel% neq 0 (
    echo Root dependency setup failed!
    pause
    exit /b !errorlevel!
)

call :EnsureMcpDependencies
if %errorlevel% neq 0 (
    echo MCP dependency setup failed!
    pause
    exit /b !errorlevel!
)

echo Building...
call npm run build:package
if %errorlevel% neq 0 (
    echo Package build failed!
    pause
    exit /b !errorlevel!
)

echo Fixing ESM imports...
powershell -ExecutionPolicy Bypass -File fix-esm-imports.ps1

echo Building MCP server...
cd mcp-server
call npm run build
if %errorlevel% neq 0 (
    echo MCP build failed!
    pause
    exit /b !errorlevel!
)
cd ..

echo Starting LibraNia server and MCP server...
echo Press Ctrl+C once to stop both servers.
node scripts\start-supervisor.js
exit /b !errorlevel!

:EnsureRootDependencies
echo Syncing root dependencies...
call npm install --include=optional --no-audit --no-fund
if errorlevel 1 (
    echo Root dependency sync failed. Cleaning and reinstalling...
    if exist node_modules rmdir /s /q node_modules
    if exist node_modules (
        echo Failed to remove node_modules. Stop Windows and WSL Node processes that use this checkout, then try again.
        exit /b 1
    )
    call npm install --include=optional
    if errorlevel 1 exit /b !errorlevel!
)

if not exist node_modules (
    echo Root dependencies are missing. Installing...
    call npm install
    if errorlevel 1 exit /b !errorlevel!
)
if not exist node_modules\better-sqlite3 (
    echo Root dependencies are incomplete. Installing...
    call npm install
    if errorlevel 1 exit /b !errorlevel!
)
if not exist node_modules\sharp (
    echo Root dependencies are incomplete. Installing...
    call npm install
    if errorlevel 1 exit /b !errorlevel!
)
if not exist node_modules\typescript\bin\tsc (
    echo Root dependencies are incomplete. Installing...
    call npm install
    if errorlevel 1 exit /b !errorlevel!
)
if not exist node_modules\vite\bin\vite.js (
    echo Root dependencies are incomplete. Installing...
    call npm install
    if errorlevel 1 exit /b !errorlevel!
)

echo Checking native dependencies...
node scripts\check-native-modules.js
if %errorlevel% equ 0 exit /b 0

echo Root dependencies are not usable on this OS. Rebuilding native modules...
call npm rebuild better-sqlite3 sharp
if not errorlevel 1 (
    node scripts\check-native-modules.js
    if !errorlevel! equ 0 exit /b 0
)

echo Rebuild failed. Cleaning and reinstalling root dependencies...
if exist node_modules rmdir /s /q node_modules
if exist node_modules (
    echo Failed to remove node_modules. Stop other Node processes and try again.
    exit /b 1
)
call npm install
if errorlevel 1 exit /b !errorlevel!
node scripts\check-native-modules.js
exit /b !errorlevel!

:EnsureMcpDependencies
echo Syncing MCP server dependencies...
pushd mcp-server
call npm install --no-audit --no-fund
set "INSTALL_RESULT=!errorlevel!"
popd
if not "!INSTALL_RESULT!"=="0" (
    echo MCP dependency sync failed. Cleaning and reinstalling...
    if exist mcp-server\node_modules rmdir /s /q mcp-server\node_modules
    if exist mcp-server\node_modules (
        echo Failed to remove mcp-server\node_modules. Stop Windows and WSL Node processes that use this checkout, then try again.
        exit /b 1
    )
    pushd mcp-server
    call npm install
    set "INSTALL_RESULT=!errorlevel!"
    popd
    if not "!INSTALL_RESULT!"=="0" exit /b !INSTALL_RESULT!
)

if not exist mcp-server\node_modules (
    echo MCP server dependencies are missing. Installing...
    pushd mcp-server
    call npm install
    set "INSTALL_RESULT=!errorlevel!"
    popd
    if not "!INSTALL_RESULT!"=="0" exit /b !INSTALL_RESULT!
)
if not exist mcp-server\node_modules\better-sqlite3 (
    echo MCP server dependencies are incomplete. Installing...
    pushd mcp-server
    call npm install
    set "INSTALL_RESULT=!errorlevel!"
    popd
    if not "!INSTALL_RESULT!"=="0" exit /b !INSTALL_RESULT!
)
if not exist mcp-server\node_modules\typescript\bin\tsc (
    echo MCP server dependencies are incomplete. Installing...
    pushd mcp-server
    call npm install
    set "INSTALL_RESULT=!errorlevel!"
    popd
    if not "!INSTALL_RESULT!"=="0" exit /b !INSTALL_RESULT!
)

echo Checking MCP native dependencies...
pushd mcp-server
node -e "const { default: Database } = await import('better-sqlite3'); const db = new Database(':memory:'); db.prepare('select 1').get(); db.close();"
set "MCP_CHECK_RESULT=!errorlevel!"
popd
if "!MCP_CHECK_RESULT!"=="0" exit /b 0

echo MCP dependencies are not usable on this OS. Rebuilding native modules...
pushd mcp-server
call npm rebuild better-sqlite3
set "REBUILD_RESULT=!errorlevel!"
if "!REBUILD_RESULT!"=="0" (
    node -e "const { default: Database } = await import('better-sqlite3'); const db = new Database(':memory:'); db.prepare('select 1').get(); db.close();"
    set "REBUILD_RESULT=!errorlevel!"
)
popd
if "!REBUILD_RESULT!"=="0" exit /b 0

echo Rebuild failed. Cleaning and reinstalling MCP dependencies...
if exist mcp-server\node_modules rmdir /s /q mcp-server\node_modules
if exist mcp-server\node_modules (
    echo Failed to remove mcp-server\node_modules. Stop other Node processes and try again.
    exit /b 1
)
pushd mcp-server
call npm install
set "INSTALL_RESULT=!errorlevel!"
if "!INSTALL_RESULT!"=="0" (
    node -e "const { default: Database } = await import('better-sqlite3'); const db = new Database(':memory:'); db.prepare('select 1').get(); db.close();"
    set "INSTALL_RESULT=!errorlevel!"
)
popd
exit /b !INSTALL_RESULT!
