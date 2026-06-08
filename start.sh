#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
ROOT_DIR="$(pwd)"
SERVER_PID=""
MCP_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]]; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
  if [[ -n "${MCP_PID}" ]]; then
    kill "${MCP_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [[ ! -d node_modules ]]; then
  echo "Root dependencies are missing. Run: npm install"
  exit 1
fi

if [[ ! -d mcp-server/node_modules ]]; then
  echo "MCP server dependencies are missing. Run: (cd mcp-server && npm install)"
  exit 1
fi

echo "Checking native dependencies..."
node scripts/check-native-modules.js

echo "Checking MCP native dependencies..."
(cd mcp-server && node -e "import('better-sqlite3')")

echo "Building..."
npm run build:package

echo "Building MCP server..."
cd mcp-server
npm run build
cd ..

echo "Starting LibraNia server and MCP server..."
node bin/librania.js start --port 3001 --data-dir "$ROOT_DIR/data" --no-browser &
SERVER_PID=$!

cd mcp-server
LIBRANIA_DATA_DIR="$ROOT_DIR/data" node dist/index.js &
MCP_PID=$!
cd ..

echo "LibraNia server (PID: $SERVER_PID) and MCP server (PID: $MCP_PID) running"
echo "Press Ctrl+C to stop both servers"

wait -n "$SERVER_PID" "$MCP_PID"
