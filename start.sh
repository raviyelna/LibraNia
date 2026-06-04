#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo "Checking native dependencies..."
node scripts/check-native-modules.js

echo "Building..."
npm run build:package

echo "Building MCP server..."
cd mcp-server
npm run build
cd ..

echo "Starting LibraNia server and MCP server..."
node bin/librania.js start --port 3001 &
SERVER_PID=$!

cd mcp-server
LIBRANIA_DATA_DIR="$OLDPWD/data" node dist/index.js &
MCP_PID=$!
cd ..

echo "LibraNia server (PID: $SERVER_PID) and MCP server (PID: $MCP_PID) running"
echo "Press Ctrl+C to stop both servers"

trap "kill $SERVER_PID $MCP_PID 2>/dev/null; exit" INT TERM

wait
