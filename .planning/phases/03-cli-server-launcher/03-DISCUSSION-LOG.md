# Phase 3: CLI & Server Launcher - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 03-CLI & Server Launcher
**Areas discussed:** CLI command structure, Browser launch behavior, Server lifecycle management, Configuration & data paths

---

## CLI Command Structure

### Question 1: Command structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single command: librania start | Simple, matches user expectation from ROADMAP ('librania start'). Can add subcommands later if needed. | ✓ |
| Subcommands: librania <start\|stop\|status> | More structured, supports future commands (stop/status/logs). Slightly more complex for v1. | |
| Zero-arg: librania (no subcommand) | Minimal, just 'librania' launches server. Shortest command but less explicit. | |

**User's choice:** Single command: librania start (Recommended)
**Notes:** None

### Question 2: Flags

| Option | Description | Selected |
|--------|-------------|----------|
| --port, --no-browser, --data-dir | Standard pattern for server CLIs. Covers common use cases without bloat. | ✓ |
| Minimal flags, prefer env vars | Minimal flags, rely on env vars (LIBRANIA_PORT, LIBRANIA_DATA_DIR) for customization. | |
| Extended flags for power users | Comprehensive flags including --log-level, --host, --cors-origin, --config-file. | |

**User's choice:** --port, --no-browser, --data-dir (Recommended)
**Notes:** None

### Question 3: CLI framework

| Option | Description | Selected |
|--------|-------------|----------|
| commander.js | Standard CLI library with arg parsing, help text, version command. Mature, 50M+ weekly downloads. | ✓ |
| yargs | Lightweight alternative, simpler API. 10M+ weekly downloads, smaller bundle. | |
| Manual parsing (no library) | Minimal, manual parsing with process.argv. No dependencies but more code to write. | |

**User's choice:** commander.js (Recommended)
**Notes:** None

### Question 4: Executable structure

| Option | Description | Selected |
|--------|-------------|----------|
| #!/usr/bin/env node shebang | Standard npm bin pattern. Works cross-platform, npm handles shebang. | ✓ |
| Compiled binary (pkg/nexe) | Compile TypeScript CLI to native binary with pkg or nexe. Larger bundle, no Node.js required. | |
| TypeScript via tsx | Keep as TypeScript, run via tsx. Simpler but requires tsx installed. | |

**User's choice:** #!/usr/bin/env node shebang (Recommended)
**Notes:** None

---

## Browser Launch Behavior

### Question 1: Auto-open behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-open by default | Standard behavior for local dev servers. User can disable with --no-browser flag. | ✓ |
| Manual open (opt-in with --browser) | Safer, user explicitly opts in with --browser flag. More typing for common case. | |
| Prompt on first launch | Ask on first launch, remember preference. More complex, adds config state. | |

**User's choice:** Auto-open by default (Recommended)
**Notes:** None

### Question 2: Browser opening mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| open package | Cross-platform npm package. Handles OS-specific browser commands. 20M+ weekly downloads. | ✓ |
| Manual OS detection | Manual commands per OS (xdg-open/start/open). More code, handles edge cases yourself. | |
| child_process.spawn | Node.js child_process with platform checks. No dependency but more complex. | |

**User's choice:** open package (Recommended)
**Notes:** None

### Question 3: Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Wait for server ready | Wait for server to be ready before opening browser. Prevents 'connection refused' errors. | ✓ |
| Open immediately | Open immediately after server.listen() call. Faster but may race with server startup. | |
| Fixed delay (500ms) | Wait fixed time (e.g., 500ms) before opening. Simple but arbitrary delay. | |

**User's choice:** Wait for server ready (Recommended)
**Notes:** None

### Question 4: Failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Log warning, continue | Log warning, continue running. User can manually open browser. Non-blocking. | ✓ |
| Exit with error | Exit with error. Forces user to fix browser issue or use --no-browser. | |
| Retry with backoff | Retry 2-3 times with delay. More resilient but adds complexity. | |

**User's choice:** Log warning, continue (Recommended)
**Notes:** None

---

## Server Lifecycle Management

### Question 1: Run mode

| Option | Description | Selected |
|--------|-------------|----------|
| Ctrl+C only (foreground) | Simple, standard for foreground processes. User keeps terminal open, Ctrl+C stops server. | ✓ |
| Daemon mode with PID file | Background daemon with PID file. Supports 'librania stop'. More complex, needs process management. | |
| Both foreground and daemon | Both modes: default foreground, --daemon flag for background. Most flexible but adds complexity. | |

**User's choice:** Ctrl+C only (foreground) (Recommended)
**Notes:** None

### Question 2: Shutdown behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Close connections gracefully | Close HTTP server, close Socket.IO connections, flush logs. Standard graceful shutdown. | ✓ |
| Save state before exit | Also save in-progress state (pending AI requests, unsaved data). More complex. | |
| Immediate exit (process.exit) | Immediate exit, no cleanup. Fastest but may leave connections hanging. | |

**User's choice:** Close connections gracefully (Recommended)
**Notes:** None

### Question 3: Startup output

| Option | Description | Selected |
|--------|-------------|----------|
| Log startup message | Standard startup message with URL. Clean, informative. | ✓ |
| ASCII art banner | ASCII art banner + startup info. More visual, fun for CLI tools. | |
| Minimal (URL only) | Minimal output, just URL. Quieter for scripting. | |

**User's choice:** Log startup message (Recommended)
**Notes:** None

### Question 4: Port conflict handling

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-increment port (try 5 ports) | Server already handles port conflicts (tries port+1). Extend to try up to 5 ports. | ✓ |
| Exit with error | Exit with error immediately. User must manually specify different port. | |
| Kill existing process | Kill existing process on port, then start. Dangerous, could kill unrelated services. | |

**User's choice:** Auto-increment port (try 5 ports) (Recommended)
**Notes:** None

---

## Configuration & Data Paths

### Question 1: Default data location

| Option | Description | Selected |
|--------|-------------|----------|
| XDG/AppData standard paths | Follows XDG Base Directory spec on Linux, AppData on Windows. Standard for cross-platform apps. | |
| Home directory (~/.librania) | Simple, works everywhere. Less standard but easier to find. | |
| Current directory (./data) | Current working directory. Portable but clutters user's workspace. | ✓ |

**User's choice:** Current directory (./data)
**Notes:** User chose current directory over XDG/AppData standard

### Question 2: Configuration precedence

| Option | Description | Selected |
|--------|-------------|----------|
| --data-dir > env var > ./data | Flags override env vars, env vars override defaults. Standard precedence for CLIs. | ✓ |
| Env var only (LIBRANIA_DATA_DIR) | Only env vars, no flag override. Simpler but less flexible. | |
| Flag only (--data-dir) | Only flags, no env var support. More explicit but less flexible for scripting. | |

**User's choice:** --data-dir > env var > ./data (Recommended)
**Notes:** None

### Question 3: Directory organization

| Option | Description | Selected |
|--------|-------------|----------|
| Separate data/ and config/ dirs | Separate data (database, uploads) from config (settings.json). Clean separation, easier backups. | ✓ |
| Single directory (all files together) | Everything in one directory. Simpler structure but harder to backup selectively. | |
| Multiple subdirectories by type | Split by type: database/, uploads/, config/, logs/. Most organized but more complex. | |

**User's choice:** Separate data/ and config/ dirs (Recommended)
**Notes:** None

### Question 4: Missing directory handling

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-create on startup | Create directories automatically on first launch. User-friendly, no manual setup. | ✓ |
| Require init command | Require user to run 'librania init' first. More explicit but extra step. | |
| Exit if missing | Exit with error if directories missing. Forces user awareness but less convenient. | |

**User's choice:** Auto-create on startup (Recommended)
**Notes:** None

---

## Claude's Discretion

None — all areas had explicit user decisions.

## Deferred Ideas

None — discussion stayed within phase scope.
