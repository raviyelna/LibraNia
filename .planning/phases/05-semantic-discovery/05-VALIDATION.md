---
phase: 05
slug: semantic-discovery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 700ms (embedding generation 500ms + search 100ms + auto-link 200ms)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | SEM-01, SEM-05 | — | N/A | unit | `npx vitest run electron/database/schema.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | SEM-01 | T-05-01 | Package integrity verified before installation | manual | Human verification checkpoint | N/A | ⬜ pending |
| 05-02-02 | 02 | 1 | SEM-01 | T-05-02 | Binary signature verified, dimension check prevents tampering | unit | `npx vitest run electron/database/vec.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | SEM-01 | T-05-03 | Binary download requires manual action | manual | Human action checkpoint | N/A | ⬜ pending |
| 05-03-01 | 03 | 2 | SEM-01 | T-05-04 | Input validation prevents injection, dimension check prevents tampering | unit | `npx vitest run electron/services/embeddings.service.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | SEM-02 | T-05-05 | Dimension validation prevents malformed vectors, SQL parameterization prevents injection | unit | `npx vitest run electron/database/vec.test.ts` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 3 | SEM-02 | — | N/A | unit | `npx vitest run electron/services/notes.service.test.ts` | ✅ | ⬜ pending |
| 05-04-02 | 04 | 3 | SEM-03 | T-05-06 | Similarity threshold prevents false positives, top-5 limit prevents DoS | unit | `npx vitest run electron/services/links.service.test.ts` | ✅ | ⬜ pending |
| 05-04-03 | 04 | 3 | SEM-02 | — | N/A | unit | `npx vitest run electron/services/search.service.test.ts` | ✅ | ⬜ pending |
| 05-05-01 | 05 | 4 | SEM-02 | — | N/A | unit | `npx vitest run src/hooks/useSearch.test.ts` | ✅ | ⬜ pending |
| 05-05-02 | 05 | 4 | SEM-04 | — | N/A | unit | `npx vitest run src/hooks/useSemanticLinks.test.ts` | ❌ W0 | ⬜ pending |
| 05-05-03 | 05 | 4 | SEM-04 | — | N/A | unit | `npx vitest run src/components/Notes/RelatedPanel.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `electron/database/schema.test.ts` — stubs for embeddings table schema validation
- [ ] `electron/database/vec.test.ts` — stubs for sqlite-vec extension loading and vector search
- [ ] `electron/services/embeddings.service.test.ts` — stubs for embedding generation and model loading
- [ ] `src/hooks/useSemanticLinks.test.ts` — stubs for semantic links hook
- [ ] `src/components/Notes/RelatedPanel.test.tsx` — stubs for related concepts panel component

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Package legitimacy verification | SEM-01 | Human judgment required for npm registry verification | Verify @xenova/transformers on npm registry, check download count, last publish date, GitHub stars |
| sqlite-vec binary download | SEM-01 | Requires external download and manual placement | Download vec0.dll/vec0.so/vec0.dylib from GitHub releases, place in electron/database/extensions/ |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 700ms
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
