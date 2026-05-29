# Phase 1: Foundation & Application Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 1-Foundation & Application Shell
**Areas discussed:** Desktop framework, UI framework stack, Mode switching UX, Navigation pattern, Theme system, Window management, Visual assets, Error handling

---

## Desktop Framework

### Question 1: Which desktop framework should we use?

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri 2.0 | Smaller bundles (3-10MB vs 120MB), lower memory, better security. Research recommends this. (Recommended) | |
| Electron | Mature ecosystem, more plugins, larger community. Heavier but proven. | ✓ |
| You decide | Let me decide | |

**User's choice:** Electron
**Notes:** Chose mature ecosystem over smaller bundle size.

### Question 2: How should web-based mode work with Electron?

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded web server | Electron window loads localhost server — simpler architecture | ✓ |
| Standalone web app | Separate web build, deploy independently — more flexible | |
| You decide | Let me decide | |

**User's choice:** Embedded web server
**Notes:** Simpler architecture preferred for v1.

### Question 3: Which SQLite library for Electron?

| Option | Description | Selected |
|--------|-------------|----------|
| better-sqlite3 | Native module, fast but needs compilation per platform | ✓ |
| sql.js | WASM-based, works everywhere but slower | |
| You decide | Let me decide | |

**User's choice:** better-sqlite3
**Notes:** Performance prioritized over portability.

---

## UI Framework Stack

### Question 1: Which UI library?

| Option | Description | Selected |
|--------|-------------|----------|
| React | Most popular, huge ecosystem, research recommends React 19. (Recommended) | ✓ |
| Vue | Lighter, simpler reactivity model | |
| Svelte | Smallest bundle, compile-time optimization | |
| You decide | Let me decide | |

**User's choice:** React
**Notes:** Standard choice, aligns with research recommendation.

### Question 2: State management approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Context + hooks | Built-in React hooks, no extra library. Simple for small-medium apps. (Recommended) | ✓ |
| Redux Toolkit | Powerful but adds complexity and boilerplate | |
| Zustand | Lightweight atomic state, growing popularity | |
| You decide | Let me decide | |

**User's choice:** Context + hooks
**Notes:** Keep it simple, avoid extra dependencies.

### Question 3: Styling approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind CSS | Utility-first CSS, fast prototyping, research recommends. (Recommended) | ✓ |
| styled-components | CSS-in-JS, component-scoped styles | |
| CSS Modules | Traditional CSS modules | |
| You decide | Let me decide | |

**User's choice:** Tailwind CSS
**Notes:** Aligns with research, fast prototyping.

### Question 4: Component library?

| Option | Description | Selected |
|--------|-------------|----------|
| Radix UI | Headless UI primitives, accessible, works great with Tailwind. Research recommends. (Recommended) | ✓ |
| Material-UI | Full component library, opinionated design | |
| Custom components | Build from scratch, full control | |
| You decide | Let me decide | |

**User's choice:** Radix UI
**Notes:** Headless primitives work well with Tailwind, accessible by default.

---

## Mode Switching UX

### Question 1: Where should mode switching UI live?

| Option | Description | Selected |
|--------|-------------|----------|
| Settings panel | Visible toggle in app UI, easy to discover. (Recommended) | |
| Tray menu | Quick access from system tray, always available | |
| Both | Both settings panel and tray menu | ✓ |
| You decide | Let me decide | |

**User's choice:** Both
**Notes:** Maximize discoverability and convenience.

### Question 2: Where should mode preference be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Local config file | JSON config file in app data directory. (Recommended) | ✓ |
| SQLite database | Store in SQLite with other app data | |
| electron-store | Electron store (wrapper around JSON) | |
| You decide | Let me decide | |

**User's choice:** Local config file
**Notes:** Simple JSON config, no extra dependencies.

### Question 3: Should mode switching require app restart?

| Option | Description | Selected |
|--------|-------------|----------|
| Restart required | Restart app to apply mode change, simpler implementation. (Recommended) | ✓ |
| Live switching | Hot-swap without restart, more complex | |
| You decide | Let me decide | |

**User's choice:** Restart required
**Notes:** Simpler for v1, can enhance later.

---

## Navigation Pattern

### Question 1: Primary navigation pattern?

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar navigation | Vertical nav on left, common for desktop apps. (Recommended) | ✓ |
| Top navigation | Horizontal nav at top, web-style | |
| Command palette | Keyboard-driven command interface | |
| You decide | Let me decide | |

**User's choice:** Sidebar navigation
**Notes:** Standard desktop app pattern.

### Question 2: Should sidebar be collapsible?

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible | Sidebar can collapse to icons only, saves space. (Recommended) | ✓ |
| Fixed width | Always visible at full width | |
| You decide | Let me decide | |

**User's choice:** Collapsible
**Notes:** Space-saving, user control.

### Question 3: Routing approach for navigation?

| Option | Description | Selected |
|--------|-------------|----------|
| React Router | React Router for client-side routing. (Recommended) | ✓ |
| State-based routing | Simpler, just show/hide components based on state | |
| You decide | Let me decide | |

**User's choice:** React Router
**Notes:** Standard routing solution for React apps.

---

## Theme System

### Question 1: How should theme switching work?

| Option | Description | Selected |
|--------|-------------|----------|
| CSS custom properties | CSS variables for colors, swap on theme change. (Recommended) | |
| Tailwind dark mode | Tailwind dark: variant, class-based switching | |
| Hybrid approach | Both — CSS vars + Tailwind dark classes | ✓ |
| You decide | Let me decide | |

**User's choice:** Hybrid approach
**Notes:** Combine CSS variables with Tailwind dark mode for flexibility.

### Question 2: Default theme on first launch?

| Option | Description | Selected |
|--------|-------------|----------|
| System preference | Follow OS theme preference automatically. (Recommended) | ✓ |
| Light mode | Always start in light mode | |
| Dark mode | Always start in dark mode | |
| You decide | Let me decide | |

**User's choice:** System preference
**Notes:** Respect user's OS preference.

### Question 3: Where should theme preference be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Config file | Store in same config file as mode preference. (Recommended) | ✓ |
| localStorage | localStorage in renderer process | |
| You decide | Let me decide | |

**User's choice:** Config file
**Notes:** Centralize preferences in one config file.

---

## Window Management

### Question 1: Should window size/position be remembered?

| Option | Description | Selected |
|--------|-------------|----------|
| Persist state | Remember size/position between sessions. (Recommended) | ✓ |
| Default always | Always open at default size/position | |
| You decide | Let me decide | |

**User's choice:** Persist state
**Notes:** Better UX, remember user's layout.

### Question 2: Multi-window support in Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Single window | Single window only, simpler for v1. (Recommended) | ✓ |
| Multiple windows | Support multiple windows, more complex | |
| You decide | Let me decide | |

**User's choice:** Single window
**Notes:** Keep Phase 1 simple, defer multi-window.

### Question 3: Should there be minimum window size?

| Option | Description | Selected |
|--------|-------------|----------|
| Enforce minimum | Set minimum window dimensions to prevent UI breaking. (Recommended) | ✓ |
| No minimum | No restrictions, fully resizable | |
| You decide | Let me decide | |

**User's choice:** Enforce minimum
**Notes:** Prevent UI breaking at small sizes.

---

## Visual Assets

### Question 1: App icon approach for Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Custom design | Design custom icon for LibraNia branding | |
| Placeholder | Use placeholder/generic icon for now. (Recommended) | ✓ |
| You decide | Let me decide | |

**User's choice:** Placeholder
**Notes:** Focus on functionality first, design later.

### Question 2: System tray icon approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Match app icon | Same as app icon, consistent branding. (Recommended) | ✓ |
| Separate design | Separate monochrome icon for system tray | |
| You decide | Let me decide | |

**User's choice:** Match app icon
**Notes:** Consistent branding, simpler.

### Question 3: Splash screen for Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| No splash screen | Skip splash screen, faster startup. (Recommended) | ✓ |
| Add splash screen | Show splash while app loads | |
| You decide | Let me decide | |

**User's choice:** No splash screen
**Notes:** Faster startup, less complexity.

---

## Error Handling

### Question 1: Error boundary strategy?

| Option | Description | Selected |
|--------|-------------|----------|
| Error boundaries | React Error Boundaries to catch render errors. (Recommended) | ✓ |
| Global only | Global error handler only | |
| You decide | Let me decide | |

**User's choice:** Error boundaries
**Notes:** Catch component-level errors gracefully.

### Question 2: Logging approach for Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Console only | Console logging only, simple for v1. (Recommended) | |
| File logging | File-based logging with rotation | |
| Both | Both console and file logs | ✓ |
| You decide | Let me decide | |

**User's choice:** Both
**Notes:** Console for dev, file for debugging production issues.

### Question 3: Crash reporting in Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| No crash reporting | Skip crash reporting for v1, add later. (Recommended) | ✓ |
| Add crash reporting | Integrate Sentry or similar service | |
| You decide | Let me decide | |

**User's choice:** No crash reporting
**Notes:** Defer to later phase, keep Phase 1 simple.

---

## Claude's Discretion

None — all areas had explicit user decisions.

## Deferred Ideas

None — discussion stayed within phase scope.
