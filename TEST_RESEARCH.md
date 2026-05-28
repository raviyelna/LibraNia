# Testing /research Command

## Setup
1. Start app: `npm run dev`
2. Open Chat tab
3. Configure AI provider (Settings)

## Test Cases

### Test 1: Basic Research
Input: `/research quantum computing basics`

Expected:
- Status updates: "Executing: search_notes...", "Executing: create_note..."
- New note created in Library
- Note has markdown content
- Tags added

### Test 2: Existing Knowledge
1. Create note: "Quantum Computing Overview"
2. Input: `/research quantum computing`

Expected:
- Finds existing note
- Reads content
- Supplements with new info
- Creates summary note

### Test 3: Image in Note
1. Open note in Library
2. Paste image (Ctrl+V)
3. Switch to Preview mode

Expected:
- Image appears in editor as ![](dataURL)
- Preview shows rendered image

## Debug
Check logs: `tail -f "C:\Users\KHANG\AppData\Roaming\LibraNia\logs\main.log"`

Look for:
- "Tool use iteration"
- "Executing tool: search_notes"
- "Executing tool: create_note"
- "Tool succeeded"
