# Phase 1: Design System Foundation - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish dark/futuristic design system with colors, typography, spacing, and animations. Define design tokens in Tailwind CSS 4.x configuration, implement responsive breakpoints, and ensure WCAG 2.1 AA accessibility compliance.

</domain>

<decisions>
## Implementation Decisions

### Color Palette & Neon Accents
- **D-01:** Neon color scheme: Blue/Cyan/Purple palette (electric blue #3B82F6 → #60A5FA, cyan accents #06B6D4, purple highlights #A855F7)
- **D-02:** Glow effects: Subtle glow on interactive elements (box-shadow blur 8-12px, opacity 0.3-0.5)
- **D-03:** Background: Dark slate (#0F172A) with slight blue tint (current color, keep it)
- **D-04:** Semantic colors: Traditional (success: green #10B981, warning: yellow #FBBF24, error: red #EF4444)

### Animation Style
- **D-05:** Transition speed: Fast (150-200ms) for interactive elements
- **D-06:** Easing curve: cubic-bezier(0.4, 0, 0.2, 1) — ease-in-out, Material Design standard
- **D-07:** Micro-interactions: Moderate (glow pulse on hover, fade-in on mount, slide-in for panels/modals)
- **D-08:** Reduced motion: Full prefers-reduced-motion support (disable animations, instant transitions for WCAG AAA)

### Claude's Discretion
- Typography system: Choose modern sans-serif fonts, size scale, and weight hierarchy (not discussed — open to standard approaches)
- Spacing system: Define 4px or 8px base grid and apply consistently (not discussed — use industry standard)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/index.css`: Tailwind CSS 4.x with `@theme` directive already configured — extend this for design tokens
- `src/components/ui/Button.tsx`: Existing Button component with 3 variants (default, ghost, outline) — update with neon colors and glow effects
- `src/contexts/ThemeContext.tsx`: Theme toggle system (light/dark/system) already implemented — integrate with new color palette
- `src/types/theme.ts`: Theme types defined — may need extension for accent color customization

### Established Patterns
- Tailwind CSS 4.x uses `@theme` directive in CSS files (not tailwind.config.js) — all design tokens go in `src/index.css`
- Color variables use RGB format: `--color-name: R G B` then `rgb(var(--color-name))` in classes
- Dark mode via `.dark` class on root element (not media query)

### Integration Points
- All existing components use Tailwind utility classes — new design tokens will automatically apply
- ThemeContext manages theme state — no changes needed, just update color definitions
- Button component is the foundation for interactive elements — update it first as reference implementation

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for typography and spacing systems.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Design System Foundation*
*Context gathered: 2026-05-30*
