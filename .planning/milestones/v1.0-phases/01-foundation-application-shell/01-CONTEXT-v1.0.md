# Phase 1: Foundation & Application Shell - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Desktop app infrastructure with native and web modes. Establishes Electron shell, React UI framework, theme system, navigation structure, and offline capability. Foundation for all subsequent features.

</domain>

<decisions>
## Implementation Decisions

### Desktop Framework
- **D-01:** Use Electron (not Tauri) — mature ecosystem, larger community
- **D-02:** Web-based mode via embedded web server — Electron window loads localhost server
- **D-03:** Use better-sqlite3 for SQLite — native module, fast performance

### UI Framework Stack
- **D-04:** React 19 as UI library — most popular, huge ecosystem
- **D-05:** Context + hooks for state management — built-in React, no extra library
- **D-06:** Tailwind CSS for styling — utility-first, fast prototyping
- **D-07:** Radix UI for component library — headless primitives, accessible, works with Tailwind

### Mode Switching UX
- **D-08:** Mode switching UI in both settings panel and tray menu — easy discovery + quick access
- **D-09:** Store mode preference in local JSON config file — simple persistence
- **D-10:** Mode switching requires app restart — simpler implementation for v1

### Navigation Pattern
- **D-11:** Sidebar navigation as primary pattern — vertical nav on left, common for desktop apps
- **D-12:** Collapsible sidebar — can collapse to icons only, saves space
- **D-13:** React Router for routing — client-side routing

### Theme System
- **D-14:** Hybrid theme approach — CSS custom properties + Tailwind dark mode classes
- **D-15:** Default theme follows system preference — auto-detect OS theme on first launch
- **D-16:** Store theme preference in config file — same file as mode preference

### Window Management
- **D-17:** Persist window size/position — remember between sessions
- **D-18:** Single window only for Phase 1 — simpler, multi-window deferred
- **D-19:** Enforce minimum window size — prevent UI breaking

### Visual Assets
- **D-20:** Use placeholder icon for Phase 1 — custom design deferred
- **D-21:** Tray icon matches app icon — consistent branding
- **D-22:** No splash screen — faster startup

### Error Handling
- **D-23:** React Error Boundaries for render errors — catch component failures
- **D-24:** Both console and file logging — console for dev, file for debugging
- **D-25:** No crash reporting in Phase 1 — add later (Sentry or similar)

### Claude's Discretion
None — all areas had explicit decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research
- `.planning/research/STACK.md` — Technology stack recommendations with versions and rationale
- `.planning/research/ARCHITECTURE.md` — Component boundaries and data flow patterns
- `.planning/research/PITFALLS.md` — Domain-specific anti-patterns to avoid

### Requirements
- `.planning/REQUIREMENTS.md` — APP-01 through APP-05 requirements for this phase
- `.planning/PROJECT.md` — Core value and constraints (local-first, privacy)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
None — greenfield project, no existing code.

### Established Patterns
None — first phase establishes patterns.

### Integration Points
- SQLite database will be used by Phase 2 (Core Knowledge Management) for note storage
- Theme system will be used by all subsequent phases
- Navigation structure will be extended in Phase 2 with actual routes

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for Electron + React setup.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation & Application Shell*
*Context gathered: 2026-05-24*
