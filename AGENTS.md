# LibraNia Research Protocol

This repository is connected to the local LibraNia knowledge library through the `librania` MCP server.

When doing research, investigation, explanation, planning, comparison, or looking up information:

1. Search LibraNia first with `mcp__librania.search_notes`.
2. Read relevant existing notes with `mcp__librania.get_note` before using external sources.
3. Use web search only when the library is missing, shallow, outdated, or the user asks for current/latest information.
4. If web search is used, write useful new knowledge back to LibraNia before relying on it in the final answer:
   - Create a new note with `mcp__librania.create_note`, or
   - Update an existing note with `mcp__librania.update_note`.
5. Add useful tags with `mcp__librania.add_tags`.
6. Link related notes in Markdown with `[[Exact Note Title]]` wiki-links.
7. In the final response, mention which LibraNia notes were used or created.

Do not treat web research as complete until useful findings have been saved back to LibraNia, unless the user explicitly says not to write to the library.
