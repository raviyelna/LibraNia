---
phase: 02
phase_name: Core Knowledge Management
created: 2026-05-25
validation_approach: test-first
---

# Validation Plan: Phase 2 - Core Knowledge Management

**Phase Goal:** Users can create, organize, and search their personal knowledge base with bidirectional linking

**Validation Strategy:** Test-first development with unit tests for services, integration tests for database operations, and E2E tests for UI workflows.

---

## Test Architecture

### Unit Tests (Vitest)
- **Location:** `tests/unit/`
- **Scope:** Pure functions, business logic, parsers
- **Coverage target:** 80%+

### Integration Tests (Vitest + better-sqlite3)
- **Location:** `tests/integration/`
- **Scope:** Database operations, IPC handlers, service layer
- **Setup:** In-memory SQLite database per test suite
- **Coverage target:** All CRUD operations, search queries, link resolution

### E2E Tests (Playwright)
- **Location:** `tests/e2e/`
- **Scope:** Full user workflows in Electron app
- **Coverage target:** All success criteria from ROADMAP.md

---

## Validation Coverage by Requirement

### KNOW-01: Create notes with markdown
**Unit tests:**
- `tests/unit/markdown-parser.test.ts` - Parse markdown, extract frontmatter
- `tests/unit/wiki-link-parser.test.ts` - Extract wiki-links from markdown

**Integration tests:**
- `tests/integration/notes-service.test.ts` - Create note via service, verify database insert
- `tests/integration/ipc-notes.test.ts` - IPC handler `notes:create` returns note ID

**E2E tests:**
- `tests/e2e/create-note.spec.ts` - Click "New Note", type title/body, save, verify note appears in list

### KNOW-02: Edit notes
**Integration tests:**
- `tests/integration/notes-service.test.ts` - Update note, verify updated_at changes
- `tests/integration/note-versions.test.ts` - Edit creates version snapshot

**E2E tests:**
- `tests/e2e/edit-note.spec.ts` - Open note, edit content, save, verify changes persist

### KNOW-03: Delete notes
**Integration tests:**
- `tests/integration/notes-service.test.ts` - Soft delete sets deleted_at, hard delete removes row
- `tests/integration/orphaned-links.test.ts` - Delete note, verify links marked broken

**E2E tests:**
- `tests/e2e/delete-note.spec.ts` - Delete note, confirm dialog, verify removed from list, check trash

### KNOW-04: Full-text search <100ms
**Unit tests:**
- `tests/unit/search-ranking.test.ts` - Custom scoring formula (BM25 * recency * relevance)

**Integration tests:**
- `tests/integration/search-service.test.ts` - Query FTS5 tables, verify results, measure timing
- `tests/integration/search-performance.test.ts` - 1000 notes, search <100ms (performance gate)

**E2E tests:**
- `tests/e2e/search.spec.ts` - Type in search box, verify results appear, click result opens note

### KNOW-05: Wiki-style bidirectional links
**Unit tests:**
- `tests/unit/wiki-link-parser.test.ts` - Parse `[[title]]`, `[[title|alias]]`, case-insensitive

**Integration tests:**
- `tests/integration/links-service.test.ts` - Create link, verify links table insert, resolve target
- `tests/integration/autocomplete.test.ts` - Type `[[`, verify autocomplete suggestions

**E2E tests:**
- `tests/e2e/wiki-links.spec.ts` - Type `[[`, select from dropdown, verify link created, click link navigates

### KNOW-06: Backlinks panel
**Integration tests:**
- `tests/integration/backlinks-service.test.ts` - Query backlinks, verify sorted by relevance

**E2E tests:**
- `tests/e2e/backlinks.spec.ts` - Open note, verify backlinks panel shows linking notes, click backlink navigates

### KNOW-07: Add tags
**Integration tests:**
- `tests/integration/tags-service.test.ts` - Create tag, attach to note, verify junction table

**E2E tests:**
- `tests/e2e/tags.spec.ts` - Type tag in input, autocomplete, add tag, verify tag appears

### KNOW-08: Browse by tag
**Integration tests:**
- `tests/integration/tags-service.test.ts` - Filter notes by tag, verify query results

**E2E tests:**
- `tests/e2e/browse-tags.spec.ts` - Click tag, verify filtered note list, click note opens it

### KNOW-09: SQLite storage
**Integration tests:**
- `tests/integration/database.test.ts` - Database file created, schema applied, migrations run
- `tests/integration/fts-sync.test.ts` - Insert note, verify FTS5 tables updated via triggers

**E2E tests:**
- `tests/e2e/persistence.spec.ts` - Create note, restart app, verify note persists

### KNOW-10: Export markdown/JSON
**Unit tests:**
- `tests/unit/export-markdown.test.ts` - Convert wiki-links, generate YAML frontmatter
- `tests/unit/export-json.test.ts` - Serialize notes to flat JSON array

**Integration tests:**
- `tests/integration/export-service.test.ts` - Export all notes, verify file structure

**E2E tests:**
- `tests/e2e/export.spec.ts` - Click export, select format, verify files created, validate content

---

## Test-First Workflow

### Per-Plan Test Strategy

**Plan 02-01 (Database foundation):**
1. Write integration tests for schema creation
2. Write integration tests for FTS5 setup and triggers
3. Implement database connection and schema
4. Run tests, verify all pass

**Plan 02-02 (Notes CRUD):**
1. Write unit tests for wiki-link parser
2. Write integration tests for notes service (create, read, update, delete, soft delete)
3. Write integration tests for links service (create, resolve, backlinks)
4. Implement services
5. Run tests, verify all pass

**Plan 02-03 (Search):**
1. Write integration tests for search service (exact, stemmed, fuzzy)
2. Write performance test (1000 notes, <100ms)
3. Implement search service
4. Run tests, verify all pass including performance gate

**Plan 02-04 (Tags):**
1. Write integration tests for tags service (create, attach, filter)
2. Implement tags service
3. Run tests, verify all pass

**Plan 02-05 (UI):**
1. Write E2E tests for note creation workflow
2. Write E2E tests for editing, deleting, searching, linking, tagging
3. Implement UI components
4. Run E2E tests, verify all pass

**Plan 02-06 (Export):**
1. Write unit tests for export formatters
2. Write integration tests for export service
3. Write E2E test for export workflow
4. Implement export service
5. Run tests, verify all pass

---

## Performance Gates

### Search Performance (KNOW-04)
- **Requirement:** <100ms response time
- **Test:** `tests/integration/search-performance.test.ts`
- **Setup:** 1000 notes with varied content
- **Assertion:** `expect(searchTime).toBeLessThan(100)`
- **Blocker:** If test fails, execution stops until optimized

### Database Query Performance
- **Requirement:** UI remains responsive during queries
- **Test:** `tests/integration/query-performance.test.ts`
- **Assertions:**
  - List 100 notes: <50ms
  - Load single note with backlinks: <20ms
  - Filter by tag: <30ms

---

## Coverage Thresholds

### Unit Tests
- **Minimum:** 80% line coverage
- **Enforced by:** Vitest coverage reporter
- **Exclusions:** Type definitions, test files, generated code

### Integration Tests
- **Minimum:** All service methods covered
- **Enforced by:** Manual checklist in VERIFICATION.md

### E2E Tests
- **Minimum:** All 6 success criteria covered
- **Enforced by:** Checklist in VERIFICATION.md

---

## Test Data Strategy

### Fixtures
- **Location:** `tests/fixtures/`
- **Contents:**
  - `sample-notes.json` - 10 notes with varied content, links, tags
  - `large-dataset.json` - 1000 notes for performance testing
  - `markdown-samples.md` - Edge cases for markdown parsing

### Database Seeding
- **Helper:** `tests/helpers/seed-database.ts`
- **Usage:** Integration tests call `seedDatabase(fixtures)` before each suite
- **Cleanup:** `afterEach(() => clearDatabase())`

---

## Continuous Validation

### Pre-commit Hook
```bash
npm run test:unit
npm run test:integration
```

### CI Pipeline (future)
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
```

---

## Success Criteria Validation Matrix

| Criterion | Unit | Integration | E2E | Performance |
|-----------|------|-------------|-----|-------------|
| 1. Create notes with markdown | ✓ | ✓ | ✓ | - |
| 2. Edit and delete notes | - | ✓ | ✓ | - |
| 3. Search <100ms | ✓ | ✓ | ✓ | ✓ |
| 4. Bidirectional links | ✓ | ✓ | ✓ | - |
| 5. Tags and browse | - | ✓ | ✓ | - |
| 6. Export markdown/JSON | ✓ | ✓ | ✓ | - |

---

*Validation plan created: 2026-05-25*
*Test-first approach ensures quality gates before execution*
