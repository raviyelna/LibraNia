@echo off
echo Building backend...
call npm run build:backend
if %errorlevel% neq 0 (
    echo Backend build failed!
    pause
    exit /b %errorlevel%
)

echo Fixing ESM imports...
powershell -ExecutionPolicy Bypass -File fix-esm-imports.ps1

echo Starting LibraNia server...
node bin/librania.js start --port 3001
