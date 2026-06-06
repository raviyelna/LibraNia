# LibraNia Research Protocol

This project uses the `librania` MCP server as the user's local knowledge library.

For any research, investigation, explanation, planning, comparison, or lookup task:

1. Search the library first using `search_notes`.
2. Read relevant existing notes with `get_note`.
3. Only use web search when the library is missing, incomplete, outdated, or the user asks for current/latest information.
4. If web search is used, save useful findings back to LibraNia before using them in the final answer:
   - Use `create_note` for durable new knowledge.
   - Use `update_note` when improving an existing note.
5. Add tags with `add_tags`.
6. Use `[[Exact Note Title]]` wiki-links to connect related notes.
7. Tell the user which notes were used, created, or updated.

Do not finish a research answer based on web findings without first writing useful knowledge back to LibraNia, unless the user explicitly says not to save anything.
