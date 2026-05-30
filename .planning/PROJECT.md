---
project: LibraNia
version: v3.0
status: active
created: 2026-05-30
last_updated: 2026-05-30
---

# LibraNia

## What This Is

LibraNia is a personal knowledge management system that visualizes information as an interconnected neural network. Users can ask questions, and the AI (Claude, GPT, or DeepSeek) researches topics using both web search and model knowledge, then stores verified answers with rich context (text, diagrams, images, graph views) in a local library. Knowledge nodes auto-link based on semantic relationships and display as an interactive 3D neural visualization.

**Core Value:** Answers must be verified by multiple AI models before storage — ensuring knowledge in the library is cross-validated and trustworthy.

## Current Milestone: v3.0 Modern UI Redesign

**Goal:** Rebuild the UI with modern design patterns, improved UX, and website-quality polish

**Target features:**
- Modern, clean interface design (contemporary web aesthetics)
- Improved navigation and information architecture
- Enhanced visual hierarchy and typography
- Responsive layouts optimized for different screen sizes
- Smooth animations and transitions
- Better accessibility (WCAG 2.1 AA compliance)
- Polished component library with consistent design system

## Context

### Existing Implementation (V2)
- Node.js CLI backend with Express + Socket.IO
- React 19 frontend with basic routing (Home, Chat, Library, Settings)
- 3D graph visualization using react-force-graph-3d
- SQLite database with better-sqlite3
- AI integration: Claude, OpenAI, DeepSeek APIs
- Basic UI components: Chat interface, Graph view, Note editor, Content upload

### Technical Constraints
- **Storage**: Local-first — all data stored on user's machine (SQLite for metadata, filesystem for documents/images)
- **AI providers**: Must support Claude CLI, OpenAI API, and DeepSeek API with configurable endpoints
- **Visualization**: 3D graph rendering requires WebGL-capable framework (Three.js or similar)
- **Performance**: Graph visualization must handle 1000+ nodes without lag

### Stack (Existing)
- **Backend**: Node.js 18+, Express 5.x, Socket.IO 4.x, TypeScript 5.7+
- **Frontend**: React 19.x, Vite 8.x, Tailwind CSS 4.x
- **Database**: SQLite (better-sqlite3 12.6+), Drizzle ORM 0.36+
- **3D Visualization**: Three.js r172+, react-force-graph-3d 1.24+
- **UI Components**: Radix UI, shadcn/ui patterns
- **State**: Zustand 5.x (planned), TanStack Query 5.x (planned)

## Active Requirements

Requirements will be defined during milestone planning.

## Validated Requirements

None yet — first milestone.

## Out of Scope

To be determined during requirements gathering.

## Key Decisions

None yet — first milestone.

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

*Last updated: 2026-05-30 — Milestone v3.0 started*
