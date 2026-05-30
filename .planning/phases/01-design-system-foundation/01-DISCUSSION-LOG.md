# Phase 1: Design System Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 1-Design System Foundation
**Areas discussed:** Color palette & neon accents, Animation style

---

## Color palette & neon accents

### Question 1: Neon color scheme

| Option | Description | Selected |
|--------|-------------|----------|
| Blue/Cyan/Purple | Electric blue (#3B82F6 → #60A5FA), cyan accents (#06B6D4), purple highlights (#A855F7). Classic cyberpunk, high contrast | ✓ |
| Green/Lime/Teal | Neon green (#10B981), lime accents (#84CC16), teal highlights (#14B8A6). Matrix-inspired, tech feel | |
| Pink/Purple/Orange | Hot pink (#EC4899), electric purple (#A855F7), orange accents (#F97316). Vaporwave aesthetic, bold | |

**User's choice:** Blue/Cyan/Purple (Recommended)

### Question 2: Glow intensity

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle glow | Soft glow on interactive elements (buttons, cards, inputs). box-shadow with blur 8-12px, opacity 0.3-0.5. Subtle but noticeable | ✓ |
| Intense glow | Strong glow on hover/focus. box-shadow blur 16-24px, opacity 0.6-0.8. High-intensity cyberpunk | |
| Minimal (no glow) | No glow effects, rely on color/border changes only. Cleaner, less distracting | |

**User's choice:** Subtle glow (Recommended)

### Question 3: Background color

| Option | Description | Selected |
|--------|-------------|----------|
| True black | Pure black (#000000) with subtle grid overlay. Maximum contrast, OLED-friendly, classic terminal feel | |
| Dark slate | Dark slate (#0F172A current) with slight blue tint. Softer on eyes, modern dark mode standard | ✓ |
| Dark blue/purple | Very dark blue (#0A0E27) with purple undertones. Matches neon purple accents, cohesive futuristic look | |

**User's choice:** Dark slate (Recommended)

### Question 4: Semantic colors

| Option | Description | Selected |
|--------|-------------|----------|
| Neon semantic colors | Success: cyan (#06B6D4), Warning: orange (#F97316), Error: hot pink (#EC4899). Matches neon palette, unconventional but cohesive | |
| Traditional semantic | Success: green (#10B981), Warning: yellow (#FBBF24), Error: red (#EF4444). Standard semantic colors, familiar to users | ✓ |
| You decide | Let Claude pick based on accessibility and contrast requirements | |

**User's choice:** Traditional semantic (Recommended)

---

## Animation style

### Question 1: Transition speed

| Option | Description | Selected |
|--------|-------------|----------|
| Fast (150-200ms) | 150-200ms for most interactions. Quick, responsive feel. Standard for modern web apps | ✓ |
| Medium (250-350ms) | 250-350ms for interactions. More noticeable, deliberate feel. Emphasizes the animation | |
| Very fast (<100ms) | 100ms or less. Instant feel, minimal animation. Performance-focused | |

**User's choice:** Fast (150-200ms) (Recommended)

### Question 2: Easing curve

| Option | Description | Selected |
|--------|-------------|----------|
| Ease-in-out | cubic-bezier(0.4, 0, 0.2, 1) — smooth acceleration/deceleration. Material Design standard, feels natural | ✓ |
| Spring/bounce | cubic-bezier(0.16, 1, 0.3, 1) — bouncy, playful. Adds personality, more noticeable | |
| Linear (robotic) | linear — constant speed. Mechanical, robotic feel. Matches futuristic aesthetic | |

**User's choice:** Ease-in-out (Recommended)

### Question 3: Micro-interaction intensity

| Option | Description | Selected |
|--------|-------------|----------|
| Moderate micro-interactions | Glow pulse on hover, fade-in on mount, slide-in for panels/modals. Enhances UX without overwhelming | ✓ |
| Rich micro-interactions | Extensive: ripple effects, particle trails, animated backgrounds, loading shimmer. Full futuristic experience | |
| Minimal micro-interactions | Minimal: basic fade/slide only. Focus on content, reduce motion for accessibility | |

**User's choice:** Moderate micro-interactions (Recommended)

### Question 4: Reduced motion support

| Option | Description | Selected |
|--------|-------------|----------|
| Full reduced-motion support | Respect prefers-reduced-motion: disable animations, use instant transitions. WCAG AAA compliance | ✓ |
| Partial reduced-motion | Partial: keep essential animations (loading, state changes), remove decorative ones | |
| You decide | Let Claude decide based on accessibility requirements | |

**User's choice:** Full reduced-motion support (Recommended)

---

## Claude's Discretion

- Typography system (fonts, size scale, weight hierarchy) — not discussed, open to standard approaches
- Spacing system (4px/8px base grid) — not discussed, use industry standard

## Deferred Ideas

None — discussion stayed within phase scope
