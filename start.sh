#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
ROOT_DIR="$(pwd)"
LOG_DIR="$ROOT_DIR/test-logs"
LOG_FILE="$LOG_DIR/librania-start.log"
PID_FILE="$LOG_DIR/librania-supervisor.pid"

check_mcp_native_dependencies() {
  (cd mcp-server && node -e "const { default: Database } = await import('better-sqlite3'); const db = new Database(':memory:'); db.prepare('select 1').get(); db.close();")
}

clean_install_root_dependencies() {
  echo "Root dependencies are not usable on this OS. Rebuilding native modules..."
  if npm rebuild better-sqlite3 sharp && node scripts/check-native-modules.js; then
    return
  fi

  echo "Rebuild failed. Cleaning and reinstalling root dependencies..."
  if ! rm -rf node_modules; then
    echo "Failed to remove node_modules."
    echo "If this checkout is under /mnt, stop Windows Node processes or use a Linux-native checkout under your WSL home directory."
    exit 1
  fi
  npm install
  node scripts/check-native-modules.js
}

clean_install_mcp_dependencies() {
  echo "MCP dependencies are not usable on this OS. Rebuilding native modules..."
  if (cd mcp-server && npm rebuild better-sqlite3) && check_mcp_native_dependencies; then
    return
  fi

  echo "Rebuild failed. Cleaning and reinstalling MCP dependencies..."
  if ! rm -rf mcp-server/node_modules; then
    echo "Failed to remove mcp-server/node_modules."
    echo "If this checkout is under /mnt, stop Windows Node processes or use a Linux-native checkout under your WSL home directory."
    exit 1
  fi
  (cd mcp-server && npm install)
  check_mcp_native_dependencies
}

ensure_root_dependencies() {
  if [[ ! -d node_modules ]]; then
    echo "Root dependencies are missing. Installing..."
    npm install
  fi

  echo "Checking native dependencies..."
  if node scripts/check-native-modules.js; then
    return
  fi

  clean_install_root_dependencies
}

ensure_mcp_dependencies() {
  if [[ ! -d mcp-server/node_modules ]]; then
    echo "MCP server dependencies are missing. Installing..."
    (cd mcp-server && npm install)
  fi

  echo "Checking MCP native dependencies..."
  if check_mcp_native_dependencies; then
    return
  fi

  clean_install_mcp_dependencies
}

ensure_root_dependencies
ensure_mcp_dependencies

echo "Building..."
node node_modules/vite/bin/vite.js build
node node_modules/typescript/bin/tsc -p tsconfig.backend.json --noEmitOnError false
node scripts/fix-esm-imports.js

echo "Building MCP server..."
(cd mcp-server && node node_modules/typescript/bin/tsc)

echo "Starting LibraNia server and MCP server..."
mkdir -p "$LOG_DIR"
nohup node scripts/start-supervisor.js > "$LOG_FILE" 2>&1 &
SUPERVISOR_PID=$!
echo "$SUPERVISOR_PID" > "$PID_FILE"

SERVER_URL=""
for _ in {1..30}; do
  if ! kill -0 "$SUPERVISOR_PID" 2>/dev/null; then
    echo "LibraNia failed to start. Last log lines:"
    tail -n 40 "$LOG_FILE" 2>/dev/null || true
    exit 1
  fi

  SERVER_URL="$(grep -Eo 'http://localhost:[0-9]+' "$LOG_FILE" 2>/dev/null | tail -n 1 || true)"
  if [[ -n "$SERVER_URL" ]]; then
    break
  fi

  sleep 1
done

echo "LibraNia supervisor running in background (PID: $SUPERVISOR_PID)"
if [[ -n "$SERVER_URL" ]]; then
  echo "URL: $SERVER_URL"
else
  echo "URL: http://localhost:3001"
  echo "Server is still starting; check logs if the URL is not reachable yet."
fi
echo "Logs: $LOG_FILE"
echo "PID file: $PID_FILE"
