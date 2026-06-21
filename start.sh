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

root_dependencies_missing() {
  [[ ! -d node_modules ]] ||
    [[ ! -d node_modules/better-sqlite3 ]] ||
    [[ ! -d node_modules/sharp ]] ||
    [[ ! -f node_modules/typescript/bin/tsc ]] ||
    [[ ! -f node_modules/vite/bin/vite.js ]]
}

mcp_dependencies_missing() {
  [[ ! -d mcp-server/node_modules ]] ||
    [[ ! -d mcp-server/node_modules/better-sqlite3 ]] ||
    [[ ! -f mcp-server/node_modules/typescript/bin/tsc ]]
}

sync_root_dependencies() {
  echo "Syncing root dependencies..."
  if npm install --include=optional --no-audit --no-fund; then
    return
  fi

  echo "Root dependency sync failed. Cleaning and reinstalling..."
  if ! rm -rf node_modules; then
    echo "Failed to remove node_modules."
    echo "Stop Windows and WSL Node processes that use this checkout, then try again."
    exit 1
  fi
  npm install --include=optional
}

sync_mcp_dependencies() {
  echo "Syncing MCP server dependencies..."
  if (cd mcp-server && npm install --no-audit --no-fund); then
    return
  fi

  echo "MCP dependency sync failed. Cleaning and reinstalling..."
  if ! rm -rf mcp-server/node_modules; then
    echo "Failed to remove mcp-server/node_modules."
    echo "Stop Windows and WSL Node processes that use this checkout, then try again."
    exit 1
  fi
  (cd mcp-server && npm install)
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
  sync_root_dependencies

  if root_dependencies_missing; then
    echo "Root dependencies are missing or incomplete. Installing..."
    npm install
  fi

  echo "Checking native dependencies..."
  if node scripts/check-native-modules.js; then
    return
  fi

  clean_install_root_dependencies
}

ensure_mcp_dependencies() {
  sync_mcp_dependencies

  if mcp_dependencies_missing; then
    echo "MCP server dependencies are missing or incomplete. Installing..."
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
  echo "URL: http://localhost:${LIBRANIA_PORT:-3001}"
  echo "Server is still starting; check logs if the URL is not reachable yet."
fi
echo "Logs: $LOG_FILE"
echo "PID file: $PID_FILE"
