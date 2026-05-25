---
phase: 04-content-storage-management
plan: 01
subsystem: database
tags: [sqlite, drizzle-orm, fts5, better-sqlite3, full-text-search]

# Dependency graph
requires:
  - phase: 02-core-knowledge-management
    provides: Database schema patterns (UUID PKs, JSON metadata, FTS5 search, tags system)
provides:
  - content table with 14 columns for document/image metadata storage
  - content_tags junction table for tagging content
  - content_fts FTS5 virtual table for full-text search on documents
  - Foreign key relationships to notes and messages tables
affects: [04-02-content-file-operations, 04-03-content-api-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: 
    - "FTS5 UPDATE trigger pattern: use 'delete' command followed by INSERT for external content tables"
    - "confidence_score stored as integer (0-100) instead of real (0.0-1.0) for SQLite compatibility"

key-files:
  created: 
    - tests/content.schema.test.ts
    - tests/content.fts.test.ts
  modified: 
    - electron/database/schema.ts
    - electron/database/fts.ts
    - electron/database/connection.ts

key-decisions:
  - "Used FTS5 'delete' command in UPDATE trigger instead of direct UPDATE (proper FTS5 external content pattern)"
  - "Stored confidence_score as integer (0-100) instead of real for better SQLite compatibility"

patterns-established:
  - "FTS5 external content tables: use content='table_name' and content_rowid='rowid' options"
  - "FTS5 UPDATE triggers: INSERT INTO fts(fts, rowid, ...) VALUES('delete', old.rowid, ...) followed by INSERT"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06]

# Metrics
duration: 2min 26sec
completed: 2026-05-25
---

# Phase 4 Plan 1: Database Schema Extension Summary

**SQLite schema extended with content/content_tags tables and FTS5 full-text search for document text indexing**

## Performance

- **Duration:** 2 minutes 26 seconds
- **Started:** 2026-05-25T14:47:01Z
- **Completed:** 2026-05-25T14:49:27Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended database schema with content table (14 columns) for storing document/image metadata
- Created content_tags junction table for many-to-many tagging relationships
- Implemented FTS5 virtual table (content_fts) for full-text search on document text
- Established foreign key relationships: note_id (SET NULL), message_id (CASCADE)
- All 10 tests passing (5 schema validation + 5 FTS5 search tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend database schema with content and content_tags tables** - `7a0591c` (feat)
2. **Task 2: Create FTS5 virtual table for document text search** - `5a2a6b2` (feat)

## Files Created/Modified
- `electron/database/schema.ts` - Added content and contentTags table definitions with Drizzle ORM
- `electron/database/fts.ts` - Added setupContentFTS5 function with triggers for INSERT/UPDATE/DELETE
- `electron/database/connection.ts` - Integrated content table creation and setupContentFTS5 call
- `tests/content.schema.test.ts` - Schema validation tests (14 columns, foreign keys, composite PK)
- `tests/content.fts.test.ts` - FTS5 search tests (triggers, BM25 ranking)

## Decisions Made

**1. FTS5 UPDATE trigger pattern**
- Used FTS5 'delete' command followed by INSERT instead of direct UPDATE statement
- Rationale: FTS5 external content tables (content='content') don't support direct UPDATE operations
- Pattern: `INSERT INTO content_fts(content_fts, rowid, ...) VALUES('delete', old.rowid, ...)` then `INSERT INTO content_fts(rowid, ...) VALUES(new.rowid, ...)`

**2. confidence_score as integer instead of real**
- Stored as integer (0-100 range) instead of real (0.0-1.0 range)
- Rationale: Better SQLite compatibility and avoids floating-point precision issues
- Application layer can convert to percentage when needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed FTS5 UPDATE trigger causing database corruption**
- **Found during:** Task 2 (FTS5 tests execution)
- **Issue:** Initial UPDATE trigger used DELETE + INSERT pattern which caused "database disk image is malformed" error in SQLite FTS5
- **Fix:** Changed to proper FTS5 external content pattern using 'delete' command: `INSERT INTO content_fts(content_fts, rowid, ...) VALUES('delete', old.rowid, ...)` followed by INSERT
- **Files modified:** electron/database/fts.ts
- **Verification:** All 5 FTS5 tests passing, UPDATE operations work correctly
- **Committed in:** 5a2a6b2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix was necessary for FTS5 correctness. No scope creep.

## Issues Encountered

**FTS5 UPDATE trigger pattern discovery**
- Initial implementation used standard SQL UPDATE statement which doesn't work with FTS5 external content tables
- Discovered proper pattern from SQLite FTS5 documentation: use special 'delete' command followed by INSERT
- Resolution: Updated trigger to use correct FTS5 pattern, all tests now pass

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Database schema foundation complete. Ready for:
- **Phase 4 Plan 2:** File operations (upload, thumbnail generation, text extraction)
- **Phase 4 Plan 3:** Content service API and IPC handlers

**Blockers:** None

**Notes:**
- Content table integrated into database initialization (connection.ts)
- setupContentFTS5 called after setupFTS5 in init sequence
- Foreign key relationships validated: note_id (SET NULL preserves orphaned content), message_id (CASCADE deletes AI-generated content with message)
- FTS5 search uses porter stemming with unicode61 tokenizer (matches notes_fts pattern)

## Self-Check: PASSED

All commits verified:
- 7a0591c: Task 1 commit exists
- 5a2a6b2: Task 2 commit exists

All files verified:
- tests/content.schema.test.ts: created
- tests/content.fts.test.ts: created
- electron/database/schema.ts: modified
- electron/database/fts.ts: modified
- electron/database/connection.ts: modified

---
*Phase: 04-content-storage-management*
*Completed: 2026-05-25*
