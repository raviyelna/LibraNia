---
name: librania-research
description: "Research workflow with LibraNia knowledge base integration. Auto-searches LibraNia before web, saves findings back. Use when: user asks research questions, needs information gathering, wants to learn about topics, requests documentation lookup, or says 'research X', 'find info about Y', 'what is Z', 'look up A'."
---

# LibraNia Research Workflow

Intelligent research that builds knowledge over time by searching LibraNia first, falling back to web when needed, and saving findings.

## When to Use

Trigger this skill when user requests:
- Research questions: "What is X?", "How does Y work?", "Explain Z"
- Information gathering: "Find info about...", "Look up...", "Research..."
- Documentation: "Show me docs for...", "What's the API for..."
- Learning: "Teach me...", "I want to learn about..."
- Comparison: "Compare X vs Y", "What's the difference between..."

**Do NOT use for:**
- Code implementation (use normal workflow)
- File operations (use Read/Write tools)
- Debugging (use systematic-debugging skill)
- Planning (use brainstorming/writing-plans skills)

## Workflow

### Step 1: Search LibraNia First

```
Agent spawn with prompt:
"Search LibraNia knowledge base for: {query}

Use mcp__librania__search_notes tool with query: {query}

Evaluate results:
- If 3+ relevant notes with substantial content → sufficient, use as primary source
- If 1-2 notes with partial info → note what's missing, proceed to web search
- If 0 notes or irrelevant → proceed to web search

Return findings with note IDs and titles."
```

### Step 2: Web Search (if needed)

```
If LibraNia insufficient:

Agent continues:
"LibraNia has partial/no info. Searching web for: {specific_gaps}

Use WebSearch tool to find:
- {gap_1}
- {gap_2}
- {gap_3}

Gather comprehensive information."
```

### Step 3: Save to LibraNia

```
After web research:

Agent:
"Creating note in LibraNia with findings.

1. Search for related notes to link:
   mcp__librania__search_notes for related topics

2. Create note:
   mcp__librania__create_note with:
   - title: Clear, descriptive (e.g., 'Docker Security Best Practices')
   - body: Markdown with:
     * Summary section
     * Key points with sources
     * [[Note Title]] links to related notes found in step 1
     * Code examples if applicable
   - tags: 3-5 relevant tags

3. Return note ID and title"
```

### Step 4: Return Answer

```
Agent returns to main thread:

"Answer: {consolidated_answer}

Sources:
- LibraNia notes: {note_titles_with_ids}
- Web sources: {urls}
- New note created: {new_note_title} (ID: {note_id})"
```

## Implementation

### Agent Prompt Template

```
You are a research agent with access to LibraNia knowledge base.

Research query: {user_query}

Follow this workflow:

1. SEARCH LIBRANIA FIRST
   - Use mcp__librania__search_notes("{query}")
   - Evaluate: Do results answer the query sufficiently?
   - If YES: Extract answer from notes, cite note IDs
   - If NO/PARTIAL: Note what's missing, proceed to step 2

2. WEB SEARCH (if needed)
   - Use WebSearch for specific gaps identified
   - Gather comprehensive information
   - Note all source URLs

3. SAVE FINDINGS
   - Search for related notes: mcp__librania__search_notes for related topics
   - Create note: mcp__librania__create_note with:
     * Clear title
     * Markdown body with sources
     * [[Note Title]] links to related notes
     * Relevant tags
   - Return note ID

4. RETURN CONSOLIDATED ANSWER
   Format:
   """
   {answer_text}

   Sources:
   - LibraNia: {note_titles}
   - Web: {urls}
   - New note: {title} (ID: {id})
   """

Be thorough but concise. Focus on answering the query.
```

## Example Execution

**User:** "What are Docker security best practices?"

**Main thread spawns Agent:**

```
Agent (research):
1. mcp__librania__search_notes("Docker security")
   → Found 2 notes: "Docker Basics", "Container Networking"
   → Partial info, missing: image scanning, secrets management, runtime security

2. WebSearch("Docker image scanning security")
   WebSearch("Docker secrets management")
   WebSearch("Docker runtime security best practices")
   → Gathered comprehensive info

3. mcp__librania__search_notes("Docker") to find related notes
   → Found: "Docker Basics", "Container Networking", "Kubernetes Security"

4. mcp__librania__create_note:
   title: "Docker Security Best Practices"
   body: """
   # Docker Security Best Practices

   ## Image Security
   - Use official base images
   - Scan images with Trivy/Snyk
   - Multi-stage builds to reduce attack surface

   ## Secrets Management
   - Never hardcode secrets in Dockerfile
   - Use Docker secrets or external vaults
   - Rotate credentials regularly

   ## Runtime Security
   - Run containers as non-root user
   - Use read-only filesystems where possible
   - Limit container capabilities

   Related: [[Docker Basics]], [[Container Networking]], [[Kubernetes Security]]

   Sources:
   - https://docs.docker.com/engine/security/
   - https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
   """
   tags: ["docker", "security", "devops", "containers"]
   → Note created: ID abc123

5. Return:
   """
   Docker security best practices:

   **Image Security:** Use official images, scan with Trivy/Snyk, multi-stage builds
   **Secrets:** Never hardcode, use Docker secrets/vaults, rotate regularly
   **Runtime:** Non-root user, read-only FS, limit capabilities

   Sources:
   - LibraNia: "Docker Basics", "Container Networking"
   - Web: docs.docker.com/engine/security, OWASP Docker Security
   - New note: "Docker Security Best Practices" (ID: abc123)
   """
```

**Main thread receives answer and presents to user.**

## Tool Requirements

Agent must have access to:
- `mcp__librania__search_notes` - search knowledge base
- `mcp__librania__get_note` - read full note content
- `mcp__librania__create_note` - save findings
- `mcp__librania__add_tags` - tag notes
- `WebSearch` - fallback web search

## Error Handling

**LibraNia DB not found:**
```
Skip LibraNia search, proceed directly to web search.
Log: "LibraNia not available, using web search only"
```

**Web search fails:**
```
Return LibraNia results only with note:
"Limited to existing knowledge base. Web search unavailable."
```

**Note creation fails:**
```
Return answer with sources, log error:
"Answer provided but failed to save to LibraNia: {error}"
```

## Configuration

**Agent spawn parameters:**
```javascript
{
  subagent_type: "general-purpose",
  description: "Research with LibraNia integration",
  prompt: `${RESEARCH_PROMPT_TEMPLATE}`,
  run_in_background: false  // Wait for results
}
```

**MCP server must be configured** in Claude Code CLI or Codex settings.

## Testing

**Test 1: LibraNia has answer**
```
User: "What is React?"
Expected: Agent finds existing note, returns answer, no web search, no new note
```

**Test 2: LibraNia partial**
```
User: "What are React hooks?"
Expected: Agent finds React note, searches web for hooks, creates new note, returns combined answer
```

**Test 3: LibraNia empty**
```
User: "What is Zig programming language?"
Expected: Agent finds nothing, searches web, creates note, returns answer
```

**Test 4: Related notes linking**
```
User: "Docker networking modes"
Expected: New note links to [[Docker Basics]], [[Container Networking]]
```

## Integration with Other Skills

**Works with:**
- `brainstorming` - research before design decisions
- `systematic-debugging` - research error messages/stack traces
- `test-driven-development` - research testing patterns

**Conflicts with:**
- None (research is orthogonal to other workflows)

## Performance

**Typical execution:**
- LibraNia search: 100-500ms
- Web search: 2-5s
- Note creation: 200-800ms
- Total: 3-6s for full workflow

**Optimization:**
- Parallel web searches for multiple gaps
- Cache LibraNia search results within Agent session
- Batch related note searches

## Maintenance

**Update when:**
- MCP tool signatures change
- LibraNia DB schema changes
- New research sources added (beyond web search)

**Monitor:**
- Note creation success rate
- Web search fallback frequency
- Related note linking accuracy
