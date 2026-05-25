---
phase: 02
plan: 06
subsystem: export
tags: [export, markdown, json, yaml, data-portability]
dependency_graph:
  requires: [02-02, 02-04, 02-05]
  provides: [export-markdown, export-json, data-portability]
  affects: [notes-service, tags-service]
tech_stack:
  added: [gray-matter@4.0.3]
  patterns: [yaml-frontmatter, wiki-link-conversion, electron-dialog-api]
key_files:
  created:
    - electron/services/export.service.ts
    - electron/ipc/export.handlers.ts
    - src/components/Export/ExportDialog.tsx
    - tests/export.test.ts
  modified:
    - package.json
    - electron/main.ts
    - electron/preload.ts
    - src/vite-env.d.ts
    - src/routes/Library.tsx
decisions:
  - id: D-06-01
    choice: Use gray-matter for YAML frontmatter
    rationale: Standard package (10M+ weekly downloads), handles multiline strings and arrays correctly
  - id: D-06-02
    choice: Convert wiki-links to standard markdown [title](id.md)
    rationale: Preserves link structure in exported files, compatible with other markdown tools
  - id: D-06-03
    choice: Preserve broken links as plain text
    rationale: Maintains context without creating invalid markdown links
  - id: D-06-04
    choice: JSON export includes all relationships (tags, links, backlinks)
    rationale: Complete data export for backup/migration, enables full restore
  - id: D-06-05
    choice: Use Electron dialog API for path selection
    rationale: Native OS dialogs, secure path validation, prevents path traversal
metrics:
  duration: 9 min
  tasks_completed: 5
  tests_added: 11
  files_created: 4
  files_modified: 5
  commits: 4
completed: 2026-05-25T03:17:04Z
---

# Phase 2 Plan 6: Export Functionality Summary

**One-liner:** Note export to markdown (YAML frontmatter, wiki-link conversion) and JSON (full relationships) with Electron dialog integration

## What Was Built

### Export Service (electron/services/export.service.ts)
- **exportNotesToMarkdown**: Exports notes to individual .md files with YAML frontmatter
  - Converts [[wiki-links]] to standard markdown [title](id.md)
  - Preserves broken links as plain text
  - Includes metadata: id, title, tags, created, updated timestamps
- **exportNotesToJSON**: Exports notes to single JSON file with all fields and relationships
  - Includes tags array (tag names)
  - Includes links array (outgoing link target IDs)
  - Includes backlinks array (incoming link source IDs)
  - Includes metadata as parsed JSON object

### IPC Handlers (electron/ipc/export.handlers.ts)
- **export:selectDirectory**: Opens Electron dialog for directory selection
- **export:selectFile**: Opens Electron dialog for file save with JSON filter
- **export:markdown**: Exports notes to markdown files in selected directory
- **export:json**: Exports notes to JSON file at selected path
- All handlers wrapped in try-catch with error logging

### Export Dialog UI (src/components/Export/ExportDialog.tsx)
- Format selection: Markdown or JSON
- Scope selection: Current note, All notes, By tag, Selected notes
- Conditional inputs:
  - Tag dropdown when scope is "By tag"
  - Multi-select note list when scope is "Selected notes"
- Export button with loading state
- Success/error message display with color-coded styling
- Export button added to Library sidebar

### Test Coverage (tests/export.test.ts)
- 11 tests covering markdown and JSON export
- Tests verify YAML frontmatter structure
- Tests verify wiki-link conversion (standard and aliased)
- Tests verify broken link preservation
- Tests verify JSON structure with all fields and relationships
- All tests passing with proper database cleanup

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface Scan

No new security-relevant surface introduced beyond what was documented in the plan's threat model. All mitigations implemented:
- **T-02-18 (Path traversal)**: Mitigated via Electron dialog API for path selection
- **T-02-19 (Arbitrary file read)**: Mitigated - only exports notes from database, never reads arbitrary files
- **T-02-20 (DoS via large export)**: Mitigated - exports notes one at a time (streaming), not all in memory

## Known Stubs

None - all functionality fully implemented and wired.

## Key Technical Decisions

### D-06-01: gray-matter for YAML frontmatter
**Context:** Need to generate markdown files with YAML frontmatter for metadata.

**Options considered:**
1. Manual string concatenation with `---` delimiters
2. gray-matter library
3. js-yaml library

**Decision:** Use gray-matter (option 2)

**Rationale:**
- Standard package in markdown tooling (10M+ weekly downloads, 9+ years old)
- Handles edge cases: multiline strings, arrays, special characters, escaping
- Provides both stringify and parse (useful for future import feature)
- Simpler API than js-yaml for this use case

### D-06-02: Wiki-link conversion to standard markdown
**Context:** Exported markdown files should be compatible with other markdown tools.

**Options considered:**
1. Keep [[wiki-link]] syntax (Obsidian-compatible)
2. Convert to standard markdown [title](id.md)
3. Convert to HTML links

**Decision:** Convert to standard markdown (option 2)

**Rationale:**
- Preserves link structure in exported files
- Compatible with most markdown tools (GitHub, VS Code, etc.)
- Uses note ID as filename for stable references
- Maintains alias support: [[title|alias]] → [alias](id.md)

### D-06-03: Broken link preservation
**Context:** Notes may contain links to deleted or non-existent notes.

**Options considered:**
1. Remove broken links entirely
2. Keep [[broken-link]] syntax
3. Convert to plain text

**Decision:** Convert to plain text (option 3)

**Rationale:**
- Maintains context (user can see what was linked)
- Doesn't create invalid markdown links
- Doesn't require special syntax explanation in exported files
- User can manually fix or remove in exported files

### D-06-04: JSON export includes all relationships
**Context:** JSON export should enable full backup and migration.

**Options considered:**
1. Export only note content (title, body)
2. Export content + tags
3. Export content + tags + links + backlinks

**Decision:** Export all relationships (option 3)

**Rationale:**
- Enables complete data export for backup
- Supports future import/restore feature
- Allows migration to other tools with full graph structure
- Minimal overhead (links already in database)

### D-06-05: Electron dialog API for path selection
**Context:** Need secure way for users to select export paths.

**Options considered:**
1. Text input for path (user types path)
2. Electron dialog API
3. Custom file browser UI

**Decision:** Use Electron dialog API (option 2)

**Rationale:**
- Native OS dialogs (familiar UX)
- Built-in path validation (prevents path traversal)
- Handles permissions correctly
- No need to implement custom file browser
- Consistent with desktop app patterns

## Performance Notes

- Export processes notes one at a time (streaming) to avoid memory issues
- Wiki-link conversion uses reverse iteration to preserve string indices
- Database queries use indexes on note titles for fast lookups
- No performance issues observed with test data (11 tests complete in ~200ms)

## Integration Points

### Upstream Dependencies
- **notes.service.ts**: getNoteById for fetching note data
- **tags.service.ts**: getNoteTags for fetching note tags
- **links.service.ts**: parseWikiLinks for wiki-link parsing

### Downstream Consumers
- **Library.tsx**: Export button triggers ExportDialog
- **ExportDialog.tsx**: Calls window.api.export methods

## Testing Strategy

### Unit Tests (tests/export.test.ts)
- Markdown export: file creation, YAML frontmatter, wiki-link conversion
- JSON export: file creation, all fields, relationships
- Edge cases: broken links, aliases, multiple notes
- Database cleanup: proper isolation between tests

### Manual Testing Checklist
- [ ] Export single note to markdown
- [ ] Export all notes to markdown
- [ ] Export notes by tag
- [ ] Export to JSON
- [ ] Verify wiki-links converted correctly
- [ ] Verify broken links preserved as plain text
- [ ] Verify tags in YAML frontmatter
- [ ] Verify links and backlinks in JSON
- [ ] Verify Electron dialog opens for path selection
- [ ] Verify success message shows export count

## Future Enhancements

Potential improvements for future phases:
1. **Import functionality**: Reverse of export (read markdown/JSON, create notes)
2. **Export templates**: User-defined markdown templates
3. **Batch export progress**: Progress bar for large exports
4. **Export scheduling**: Automatic periodic backups
5. **Export filters**: Export only notes modified after date
6. **Export compression**: ZIP archive for markdown exports

## Self-Check: PASSED

### Created Files Verification
```bash
✓ electron/services/export.service.ts exists (149 lines)
✓ electron/ipc/export.handlers.ts exists (79 lines)
✓ src/components/Export/ExportDialog.tsx exists (249 lines)
✓ tests/export.test.ts exists (230 lines)
```

### Commits Verification
```bash
✓ 55f8da1: chore(02-06): install gray-matter for YAML frontmatter
✓ 084c60f: test(02-06): add failing tests for markdown and JSON export
✓ 1dfc8ed: feat(02-06): add IPC handlers for export with Electron dialog integration
✓ e38be27: feat(02-06): create ExportDialog UI component
```

### Test Suite Verification
```bash
✓ All 11 export tests passing
✓ Test coverage: markdown export (6 tests), JSON export (5 tests)
✓ No test failures or warnings
```

## Completion Checklist

- [x] Task 1: Install gray-matter for YAML frontmatter
- [x] Task 2: Create markdown export service with YAML frontmatter
- [x] Task 3: Create JSON export service with relationships
- [x] Task 4: Create IPC handlers with Electron dialog integration
- [x] Task 5: Create ExportDialog UI component
- [x] All tests passing (11/11)
- [x] TypeScript compilation successful
- [x] No linting errors
- [x] SUMMARY.md created
- [x] All commits follow conventional commit format

---

**Plan Status:** ✓ Complete
**Requirements Fulfilled:** KNOW-10 (User can export notes to markdown/JSON format)
**Next Plan:** Phase 2 complete - proceed to Phase 3 (AI Integration)
