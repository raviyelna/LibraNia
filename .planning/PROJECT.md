# LibraNia

## What This Is

LibraNia is a personal knowledge management system that visualizes information as an interconnected neural network. Users can ask questions, and the AI (Claude, GPT, or DeepSeek) researches topics using both web search and model knowledge, then stores verified answers with rich context (text, diagrams, images, graph views) in a local library. Knowledge nodes auto-link based on semantic relationships and display as an interactive 3D neural visualization.

## Core Value

Answers must be verified by multiple AI models before storage — ensuring knowledge in the library is cross-validated and trustworthy.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can configure AI provider (Claude CLI, GPT, DeepSeek) with model selection, API key, and base URL
- [ ] User can ask questions through desktop app interface
- [ ] AI researches topics using web search and model knowledge
- [ ] AI generates answers with text, citations, diagrams, and images
- [ ] Multi-model verification runs before answer is stored
- [ ] Verified answers stored in local library (SQLite + files)
- [ ] Knowledge nodes auto-link based on semantic relationships
- [ ] 3D neural network visualization shows knowledge graph
- [ ] User can manually add documents/notes to library
- [ ] User can view answer with graph showing related concepts
- [ ] Desktop app can run as native application or web-based mode

### Out of Scope

- Cloud storage — local-first architecture
- Real-time collaboration — single-user focus
- Mobile apps — desktop-first for v1
- Video content processing — text/image focus for v1

## Context

**Target user:** Knowledge workers, researchers, students who want a personal knowledge base that grows smarter over time.

**Key insight:** Most knowledge tools are either manual (Obsidian, Notion) or AI-only (ChatGPT). LibraNia combines both — user-curated content + AI research, with multi-model verification ensuring quality.

**Technical environment:** Desktop application (Electron or Tauri) with local storage, supporting multiple AI providers through configurable API endpoints.

## Constraints

- **Storage**: Local-first — all data stored on user's machine (SQLite for metadata, filesystem for documents/images)
- **AI providers**: Must support Claude CLI, OpenAI API, and DeepSeek API with configurable endpoints
- **Visualization**: 3D graph rendering requires WebGL-capable framework (Three.js or similar)
- **Performance**: Graph visualization must handle 1000+ nodes without lag

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Multi-model verification | Cross-validation prevents hallucinations and ensures quality | — Pending |
| Local storage only | Privacy-first, no cloud dependencies, user owns data | — Pending |
| Desktop app with web mode | Native performance + web flexibility | — Pending |
| Auto-linking via semantic analysis | Reduces manual work, discovers non-obvious connections | — Pending |

## Milestones

### v1.0 - AI-Powered Knowledge Management (COMPLETE)
**Status:** Complete (2026-05-27)
**Goal:** Desktop app with AI chat, knowledge management, semantic search, 3D visualization
**Outcome:** All 6 phases complete, 41/41 requirements fulfilled

### v2.0 - Cross-Platform Web Architecture (ACTIVE)
**Status:** Planning (started 2026-05-29)
**Goal:** Transform from Electron desktop to cross-platform CLI + web server accessible via browser
**Key Changes:**
- Remove Electron, migrate to Node.js backend + web frontend
- Single CLI command (`librania start`) launches server + opens browser
- Works identically on Linux and Windows
- All v1 features accessible via web UI

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-29 after v2 milestone initialization*
