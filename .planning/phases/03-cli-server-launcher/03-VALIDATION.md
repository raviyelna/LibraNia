---
phase: 03
slug: cli-server-launcher
created: 2026-05-29
status: active
---

# Phase 3: CLI & Server Launcher - Validation Strategy

## Overview

This phase creates a CLI entry point that launches the server and opens a browser. Validation focuses on cross-platform CLI behavior, process lifecycle management, and user-facing error handling.

## Validation Dimensions

### 1. Command Execution
- `librania start` launches server on default port 3000
- `librania start --port 8080` launches on custom port
- `librania start --no-browser` launches without opening browser
- `librania start --data-dir /custom/path` uses custom data directory
- `librania --version` prints version and exits
- `librania --help` prints usage and exits

### 2. Browser Launch
- Browser opens automatically after server ready (default behavior)
- Browser opens to correct URL (http://localhost:{port})
- `--no-browser` flag prevents browser launch
- Browser launch failure logs warning but doesn't crash server
- Server continues running if browser fails to open

### 3. Port Conflict Handling
- Server tries up to 5 ports if default is busy (3000, 3001, 3002, 3003, 3004)
- Startup message shows actual port used
- Browser opens to actual port (not default if conflict)
- Server exits with error if all 5 ports busy

### 4. Graceful Shutdown
- Ctrl+C (SIGINT) triggers graceful shutdown
- Shutdown closes HTTP server
- Shutdown closes Socket.IO connections
- Shutdown completes within 5 seconds (timeout fallback)
- Process exits with code 0 on clean shutdown

### 5. Cross-Platform Compatibility
- CLI works on Linux (Ubuntu/Arch tested)
- CLI works on Windows 10/11 (cmd and PowerShell tested)
- Shebang `#!/usr/bin/env node` works on Linux
- npm creates .cmd wrapper for Windows
- Path separators use `path.join()` (no hardcoded `/` or `\`)

### 6. Data Directory Management
- Default `./data` directory created if missing
- Custom `--data-dir` flag overrides default
- `LIBRANIA_DATA_DIR` env var overrides default
- Flag takes precedence over env var
- Server receives correct data directory path

### 7. Error Handling
- Invalid port (non-numeric, out of range) shows error and exits
- Invalid data directory path shows error and exits
- Server startup failure shows error and exits
- All errors print to stderr (not stdout)
- Exit codes: 0 = success, 1 = error

### 8. User Experience
- Startup message is clean and informative (no ASCII art)
- Startup message includes URL to open
- Help text is clear and concise
- Version matches package.json
- No unnecessary log spam during normal operation

## Test Strategy

### Unit Tests
- commander.js argument parsing (valid/invalid inputs)
- Port conflict retry logic (mock server.listen)
- Data directory precedence (flag > env > default)
- Graceful shutdown handler (mock SIGINT)

### Integration Tests
- End-to-end CLI execution (spawn process, verify output)
- Browser launch (mock `open` package, verify called with correct URL)
- Server startup (verify HTTP server listening)
- Shutdown (send SIGINT, verify process exits cleanly)

### Manual Tests
- Run on Linux and Windows
- Test all CLI flags
- Test port conflicts (start multiple instances)
- Test Ctrl+C shutdown
- Test browser launch (verify correct browser opens)

## Success Criteria

All validation dimensions pass:
- ✓ Command execution works with all flags
- ✓ Browser launches automatically (unless --no-browser)
- ✓ Port conflict handling tries 5 ports
- ✓ Graceful shutdown completes within 5 seconds
- ✓ CLI works on Linux and Windows
- ✓ Data directory management respects precedence
- ✓ Error handling is clear and exits with correct codes
- ✓ User experience is clean and informative

## Validation Architecture

### Test Pyramid
- **Unit tests (60%)**: Argument parsing, port retry logic, precedence rules
- **Integration tests (30%)**: End-to-end CLI execution, server startup, shutdown
- **Manual tests (10%)**: Cross-platform verification, browser launch, user experience

### Test Tools
- **Vitest**: Unit and integration tests
- **execa**: Spawn CLI process for integration tests
- **get-port**: Mock port conflicts for retry logic tests
- **Manual**: Cross-platform verification on Linux and Windows

### Coverage Targets
- **Code coverage**: 80%+ for bin/librania.js
- **Requirement coverage**: 100% (all CLI-01 through CLI-06)
- **Platform coverage**: Linux and Windows tested
- **Error path coverage**: All error conditions tested

---

*Validation strategy for Phase 3: CLI & Server Launcher*
*Created: 2026-05-29*
