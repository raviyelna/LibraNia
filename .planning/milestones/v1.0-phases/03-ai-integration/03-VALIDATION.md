---
phase: 3
slug: ai-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1+ |
| **Config file** | `vitest.config.ts` (exists from Phase 1) |
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
| 03-01-01 | 01 | 0 | AI-01 | — | N/A | unit | `npm test -- ai.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | AI-02 | — | N/A | unit | `npm test -- ai.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 0 | AI-03 | — | N/A | unit | `npm test -- ai.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | AI-01 | T-03-01 | API keys encrypted at rest | unit | `npm test -- ai.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | AI-02 | — | N/A | unit | `npm test -- ai.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-06 | 01 | 1 | AI-03 | — | N/A | unit | `npm test -- ai.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 0 | AI-04 | — | N/A | unit | `npm test -- conversations.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | AI-04 | T-03-02 | User input sanitized before storage | unit | `npm test -- conversations.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | AI-04 | — | N/A | unit | `npm test -- conversations.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 0 | AI-05, AI-06 | — | N/A | unit | `npm test -- research.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 1 | AI-05 | T-03-03 | Web search results sanitized | unit | `npm test -- research.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 1 | AI-06 | — | N/A | unit | `npm test -- research.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 0 | AI-07, AI-08 | — | N/A | integration | `npm test -- chat.test.tsx` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 1 | AI-07 | T-03-04 | Citations rendered as plain text | integration | `npm test -- chat.test.tsx` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 1 | AI-08 | — | N/A | integration | `npm test -- chat.test.tsx` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 0 | AI-09 | — | N/A | integration | `npm test -- settings.test.tsx` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 1 | AI-09 | T-03-05 | API keys masked in UI | integration | `npm test -- settings.test.tsx` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 0 | AI-10 | — | N/A | unit | `npm test -- summarize.service.test.ts` | ❌ W0 | ⬜ pending |
| 03-06-02 | 06 | 1 | AI-10 | — | N/A | unit | `npm test -- summarize.service.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `electron/services/__tests__/ai.service.test.ts` — stubs for AI-01, AI-02, AI-03
- [ ] `electron/services/__tests__/conversations.service.test.ts` — stubs for AI-04
- [ ] `electron/services/__tests__/research.service.test.ts` — stubs for AI-05, AI-06
- [ ] `electron/services/__tests__/summarize.service.test.ts` — stubs for AI-10
- [ ] `src/components/__tests__/Chat.test.tsx` — stubs for AI-07, AI-08
- [ ] `src/components/__tests__/AIProviderSettings.test.tsx` — stubs for AI-09

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Streaming tokens display in real-time | AI-07 | Visual timing verification | 1. Ask a question in chat UI<br>2. Observe tokens appearing progressively<br>3. Verify no full-response delay |
| API key validation on save | AI-09 | External API call | 1. Enter invalid API key in settings<br>2. Click Save<br>3. Verify error message appears<br>4. Enter valid key, verify success |
| Web search results relevance | AI-05 | Subjective quality | 1. Ask "What is React?"<br>2. Verify top 5 results are React-related<br>3. Verify no spam/unrelated results |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
