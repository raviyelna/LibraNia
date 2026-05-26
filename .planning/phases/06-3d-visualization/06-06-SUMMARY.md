---
phase: 06-3d-visualization
plan: 06
subsystem: content-management
tags: [bugfix, file-validation, text-files, gap-closure]
requirements: [CONT-01]
dependency_graph:
  requires: [04-03-content-service]
  provides: [text-file-upload-support]
  affects: [content-creation, note-editing]
tech_stack:
  added: []
  patterns: [extension-based-fallback, two-stage-validation]
key_files:
  created: []
  modified:
    - electron/services/content.service.ts
    - tests/content.service.test.ts
decisions:
  - decision: Extension-based fallback as secondary validation method
    rationale: Text files (.txt, .md) have no magic bytes, causing fileTypeFromBuffer to return undefined. Extension check provides safe fallback while preserving magic bytes as primary security layer.
    impact: Enables text file uploads without compromising security
    date: 2026-05-26
metrics:
  duration_seconds: 231
  tasks_completed: 1
  files_modified: 2
  tests_added: 0
  tests_fixed: 2
  completed_date: 2026-05-26T17:26:33Z
---

# Phase 06 Plan 06: Text File Upload Validation Fix

**One-liner:** Extension-based fallback for text file validation when magic bytes detection fails

## Overview

Fixed content:create crash for text files by adding extension-based MIME type detection as a fallback when magic bytes validation returns undefined. Text files (.txt, .md) lack magic bytes signatures, causing the original validation to reject them. The fix implements a two-stage validation: magic bytes (primary) → extension mapping (fallback).

## What Was Built

### Task 1: Add Extension-Based Fallback to validateFileType

**Status:** ✓ Complete

**Changes:**
- Modified `validateFileType` function signature to accept `filePath` parameter
- Added extension-to-MIME mapping for `.txt` (text/plain) and `.md` (text/markdown)
- Implemented two-stage validation logic:
  1. Primary: magic bytes via fileTypeFromBuffer
  2. Fallback: extension-based detection when magic bytes fail
- Updated `createContent` to pass filePath to validateFileType
- Fixed test mocks to use `PDFParse` named export instead of default export

**Files Modified:**
- `electron/services/content.service.ts`: Added extension fallback logic
- `tests/content.service.test.ts`: Fixed PDFParse mock to match named export

**Commit:** c0ab634

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PDFParse mock in tests**
- **Found during:** Task 1 verification
- **Issue:** Test mocked `pdfParse` default export, but service imports `PDFParse` named export, causing "Cannot read properties of undefined (reading 'text')" error
- **Fix:** Updated test to import and mock `PDFParse` named export, changed `vi.mocked(pdfParse)` to `vi.mocked(PDFParse)`
- **Files modified:** tests/content.service.test.ts
- **Commit:** c0ab634 (same commit)

**2. [Rule 3 - Blocking] Rebuilt better-sqlite3 native module**
- **Found during:** Task 1 verification
- **Issue:** better-sqlite3 compiled against Node.js v20 (MODULE_VERSION 123), current Node.js v22 requires MODULE_VERSION 127
- **Fix:** Ran `npm rebuild better-sqlite3` to recompile for current Node.js version
- **Files modified:** node_modules/better-sqlite3/build/Release/better_sqlite3.node
- **Commit:** Not committed (native module rebuild)

## Verification Results

All content service tests passing (22/22):
- validateFileType tests: 6/6 passed
- validateFileSize tests: 3/3 passed
- writeFileAtomic tests: 2/2 passed
- createContent tests: 3/3 passed
- getContentById tests: 2/2 passed
- updateContent tests: 2/2 passed
- deleteContent tests: 2/2 passed
- getAllContent tests: 2/2 passed

## Known Stubs

None - implementation is complete.

## Threat Surface Scan

No new security-relevant surface introduced. Extension-based fallback is secondary to magic bytes validation, maintaining security posture:
- Binary files still validated via magic bytes (primary method)
- Extension check only applies when magic bytes return undefined (text files)
- Extension mapping limited to allowed MIME types in ALLOWED_MIME_TYPES
- Malicious files with spoofed extensions still caught by magic bytes

## Self-Check

### Created Files
None - this was a bugfix to existing functionality.

### Modified Files
- [x] FOUND: electron/services/content.service.ts
- [x] FOUND: tests/content.service.test.ts

### Commits
- [x] FOUND: c0ab634 - fix(06-06): add extension-based fallback for text file validation

## Self-Check: PASSED

All files and commits verified successfully.
