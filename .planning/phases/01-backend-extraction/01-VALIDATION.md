---
phase: 01
slug: backend-extraction
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1+ |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | BACK-01 | — | N/A | integration | `npm test -- server.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BACK-02 | — | N/A | integration | `npm test -- database.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BACK-03 | — | N/A | integration | `npm test -- file-ops.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BACK-04 | — | N/A | integration | `npm test -- config.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BACK-05 | T-01-01 | API keys encrypted at rest with AES-256-GCM | integration | `npm test -- encryption.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BACK-06 | — | N/A | integration | `npm test -- endpoints.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/server.test.ts` — stubs for BACK-01 (server starts without Electron)
- [x] `tests/database.test.ts` — stubs for BACK-02 (database operations with Node.js paths)
- [x] `tests/file-ops.test.ts` — stubs for BACK-03 (file operations with Node.js fs)
- [x] `tests/config.test.ts` — stubs for BACK-04 (config storage with JSON files)
- [x] `tests/encryption.test.ts` — stubs for BACK-05 (API key encryption with Node.js crypto)
- [x] `tests/endpoints.test.ts` — stubs for BACK-06 (IPC handlers converted to HTTP/WebSocket)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
