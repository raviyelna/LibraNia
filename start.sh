#!/bin/bash
set -e

echo "Building backend..."
npm run build:backend

echo "Fixing ESM imports..."
powershell -ExecutionPolicy Bypass -File fix-esm-imports.ps1 || ./fix-esm-imports.ps1

echo "Starting LibraNia server..."
node bin/librania.js start --port 3001
