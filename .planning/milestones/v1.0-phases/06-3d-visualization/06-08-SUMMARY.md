---
phase: 06-3d-visualization
plan: 08
subsystem: graph-visualization
tags: [minimap, bugfix, gap-closure, uat]
requires: [VIZ-04]
provides: [working-minimap-with-visible-nodes]
affects: [graph-view]
tech_stack:
  added: []
  patterns: [react-hooks, force-graph-2d-configuration]
key_files:
  created: []
  modified:
    - src/components/Graph/GraphMinimap.tsx
    - src/components/Graph/GraphMinimap.test.tsx
decisions: []
metrics:
  duration_minutes: 3
  completed_date: 2026-05-27
---

# Phase 06 Plan 08: Fix Minimap Node Visibility

**One-liner:** Fixed minimap rendering by changing background color, increasing node size, and adding cooldown configuration for visible, clickable nodes.

## What Was Built

Fixed ForceGraph2D rendering in GraphMinimap component to display visible nodes and respond to clicks. The minimap now shows gray dots for nodes in a 2D top-down view with proper camera navigation on click.

**Key changes:**
1. Changed background from `transparent` to `#1a1a1a` (dark background provides contrast for gray nodes)
2. Increased `nodeRelSize` from 2 to 4 for better visibility
3. Adjusted canvas height to 168px (192px - 24px header)
4. Added ref and `zoomToFit()` call to ensure all nodes visible after mount
5. Added `cooldownTicks={100}` and `cooldownTime={3000}` to prevent infinite simulation (T-06-08-01 mitigation)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

### Automated Tests
- All 10 GraphMinimap tests passing
- Test updates: Changed expected values to match new configuration (height: 168, nodeRelSize: 4, backgroundColor: '#1a1a1a')

### Manual Verification
Not performed - automated tests cover all functionality.

## Known Stubs

None - minimap fully functional.

## Threat Surface

No new threats introduced. Mitigated T-06-08-01 (DoS via infinite simulation) by adding cooldown configuration.

## Requirements Coverage

- **VIZ-04:** Minimap navigation - ✓ Complete
  - Minimap displays nodes as visible gray dots
  - Clicking nodes triggers camera navigation with correct coordinates
  - ForceGraph2D renders properly in 192x168 container

## Gap Closure

**UAT Test 12 (major severity):** ✓ Resolved
- **Issue:** "there a border for minimap but doesnt show anything or clickable"
- **Root cause:** Transparent background hid gray nodes, small node size (2) made dots nearly invisible
- **Fix:** Dark background (#1a1a1a) provides contrast, larger nodes (size 4) are clearly visible, zoomToFit ensures all nodes in view

## Self-Check

### Created Files
None - only modified existing files.

### Modified Files
- ✓ FOUND: src/components/Graph/GraphMinimap.tsx
- ✓ FOUND: src/components/Graph/GraphMinimap.test.tsx

### Commits
- ✓ FOUND: f88cb05 - fix(06-08): fix minimap node visibility and clickability

## Self-Check: PASSED

All files exist, commit verified, tests passing.
