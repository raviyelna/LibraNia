---
phase: 4
slug: content-storage-management
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-25
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1+ |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06 | T-04-01 | Path validation prevents traversal | unit | `npm test -- schema.test.ts` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | CONT-01, CONT-02 | — | FTS5 index syncs with content table | unit | `npm test -- fts.test.ts` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 1 | — | T-04-SC | Human verifies package legitimacy | manual | checkpoint:human-verify | N/A | ⬜ pending |
| 04-02-02 | 02 | 1 | — | — | Packages install without errors | integration | `npm test -- --run` | ✅ | ⬜ pending |
| 04-03-01 | 03 | 2 | CONT-01, CONT-02, CONT-03, CONT-04, CONT-05 | T-04-06, T-04-07, T-04-08 | MIME validation, size limits, atomic writes | unit | `npm test -- content.service.test.ts` | ✅ | ⬜ pending |
| 04-03-02 | 03 | 2 | CONT-01, CONT-02 | T-04-09, T-04-10 | Text extraction, thumbnail generation | unit | `npm test -- content.service.test.ts` | ✅ | ⬜ pending |
| 04-04-01 | 04 | 3 | CONT-01, CONT-02, CONT-03, CONT-04, CONT-05 | T-04-11, T-04-12 | IPC handlers validate inputs, secure file access | unit | `npm test -- content.handlers.test.ts` | ✅ | ⬜ pending |
| 04-04-02 | 04 | 3 | CONT-01, CONT-02 | T-04-13 | Streaming progress events work | unit | `npm test -- content.handlers.test.ts` | ✅ | ⬜ pending |
| 04-05-01 | 05 | 4 | CONT-01, CONT-02 | — | File upload UI accepts valid files | unit | `npm test -- ContentUpload.test.tsx` | ✅ | ⬜ pending |
| 04-05-02 | 05 | 4 | CONT-01, CONT-02, CONT-06 | — | Content list displays metadata | unit | `npm test -- ContentList.test.tsx` | ✅ | ⬜ pending |
| 04-05-03 | 05 | 4 | CONT-01, CONT-02 | — | Library route integrates content UI | unit | `npm test -- Library.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- Vitest already configured (Phase 1)
- Test utilities for React components (Phase 2)
- IPC handler test patterns (Phase 3)

No Wave 0 setup needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Package legitimacy verification | — | Security-critical human judgment | Task 04-02-01: Verify npm registry, GitHub repo, download counts, maintainer reputation for sharp, pdf-parse, mammoth, file-type before approving installation |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none needed)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-05-25
