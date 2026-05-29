# Phase 5: Cross-Platform Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 05-cross-platform-validation
**Areas discussed:** Testing approach, Native dependency handling, Path edge cases, Error reporting

---

## Testing Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Manual testing on physical/VM machines | Test on real Ubuntu 22.04/24.04 and Windows 10/11 machines. Catches real-world issues but slower iteration. | ✓ |
| Automated CI testing | GitHub Actions matrix (ubuntu-latest, windows-latest). Fast feedback but may miss distro-specific issues. | |
| Manual first, then automate (Recommended) | Manual testing first to find issues, then add CI for regression prevention. | |

**User's choice:** Manual testing on physical/VM machines
**Notes:** Prioritize catching real-world issues over fast iteration. CI can be added later for regression testing.

### Linux Distributions

| Option | Description | Selected |
|--------|-------------|----------|
| Ubuntu 22.04 LTS | LTS release, most common, stable package versions | ✓ |
| Ubuntu 24.04 LTS | Latest LTS, newer toolchain | |
| Arch Linux | Rolling release, bleeding edge, tests latest Node.js/build tools | |
| RHEL/CentOS/Fedora | Enterprise standard, conservative packages | |

**User's choice:** Ubuntu 22.04 LTS
**Notes:** Focus on most common distribution. Single distro keeps scope manageable.

### Windows Versions and Shells

| Option | Description | Selected |
|--------|-------------|----------|
| Windows 10 | Still widely used in enterprise, older PowerShell | ✓ |
| Windows 11 | Latest consumer/enterprise version, modern PowerShell | |
| cmd.exe | Legacy command prompt, limited Unicode support | ✓ |
| PowerShell | Modern shell, better scripting, UTF-8 support | |

**User's choice:** Windows 10 + cmd.exe
**Notes:** Test legacy shell for widest compatibility. Windows 10 still dominant in enterprise.

---

## Native Dependency Handling

### Build Tools Missing

| Option | Description | Selected |
|--------|-------------|----------|
| Fail with helpful error message (Recommended) | Show clear error with install instructions (apt install build-essential / Visual Studio Build Tools link). User installs, then retries. | ✓ |
| Download pre-built binaries as fallback | Detect missing tools, attempt to download pre-built binaries from GitHub releases. Fallback to error if unavailable. | |
| Ship pre-built binaries in package | Bundle pre-compiled binaries for common platforms in npm package. Larger package but works without build tools. | |

**User's choice:** Fail with helpful error message (Recommended)
**Notes:** Clear error with actionable instructions better than silent fallback. Standard npm pattern.

### Rebuild Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Automatic rebuild, fail on error (current) | postinstall runs npm rebuild automatically. If it fails, installation fails with error. | ✓ |
| Automatic rebuild, warn on failure | postinstall runs rebuild, logs warning on failure, continues. User can manually rebuild later. | |
| Manual rebuild via CLI command | Skip postinstall rebuild. User runs 'librania doctor' command to check/rebuild native deps. | |

**User's choice:** Automatic rebuild, fail on error (current)
**Notes:** Keep current behavior. Fail fast with clear error better than partial install.

---

## Path Edge Cases

### Path Types to Test

| Option | Description | Selected |
|--------|-------------|----------|
| Windows drive letters | C:\Users\Name\data, D:\projects\librania — absolute Windows paths with drive letters | ✓ |
| Paths with spaces | C:\Program Files\LibraNia — paths with spaces, requires proper quoting | ✓ |
| Unix home directory (~) | ~/librania, ~/.config/librania — Unix home directory expansion | ✓ |
| Windows env vars (%VAR%) | %USERPROFILE%\librania — Windows environment variable expansion | ✓ |

**User's choice:** All four path types
**Notes:** Comprehensive path testing ensures robustness across common user scenarios.

### Path Separator Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Enforce path.join() everywhere (Recommended) | Always use path.join(), path.resolve(). Never string concatenation with / or \\. | ✓ |
| Allow forward slashes (Node.js normalizes) | Allow forward slashes in code, Node.js normalizes automatically on Windows. | |
| Explicit path.sep usage | Detect platform and use correct separator (path.sep). More explicit but verbose. | |

**User's choice:** Enforce path.join() everywhere (Recommended)
**Notes:** Most robust approach. Audit existing code for violations.

---

## Error Reporting

### Platform-Specific Failures

| Option | Description | Selected |
|--------|-------------|----------|
| Structured error with context (Recommended) | Show error message with platform, Node version, missing dependency. Link to troubleshooting doc. | ✓ |
| Include diagnostic output in error | Run diagnostic checks (node -v, npm -v, gcc --version, python --version), show results in error. | |
| Separate 'doctor' command for diagnostics | Show error, suggest running 'librania doctor' command that runs diagnostics and shows fix steps. | |

**User's choice:** Structured error with context (Recommended)
**Notes:** Balance between helpful context and not overwhelming user. Link to docs for deeper troubleshooting.

### sqlite-vec Extension

| Option | Description | Selected |
|--------|-------------|----------|
| Bundle extensions, fail on unsupported platform (current) | Ship vec0.dll and vec0.so in package. Load based on process.platform. Fail if platform unsupported. | ✓ |
| Graceful degradation (disable semantic search) | Try to load extension, catch error, disable semantic search features if missing. App still works without it. | |
| Download extension on first run | Download platform-specific extension on first run from GitHub releases. Cache in user data dir. | |

**User's choice:** Bundle extensions, fail on unsupported platform (current)
**Notes:** Keep current behavior. Semantic search is core feature, not optional.

---

## Claude's Discretion

None — all areas had explicit decisions.

## Deferred Ideas

None — discussion stayed within phase scope.
