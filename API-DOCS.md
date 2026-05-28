# LibraNia API Documentation

## Implemented APIs

### 1. Provider Configuration (`.env` storage)

**Save Provider Config**
```typescript
window.api.providers.setConfig({
  id: 'deepseek' | 'claude' | 'openai',
  apiKey: string,
  model: string,
  baseURL?: string
})
```

**Get Single Provider**
```typescript
window.api.providers.getConfig(providerId: string)
// Returns: { id, apiKey, model, baseURL? } | null
```

**Get All Providers**
```typescript
window.api.providers.getAllConfigs()
// Returns: Array<{ id, apiKey, model, baseURL? }>
```

**Delete Provider**
```typescript
window.api.providers.deleteConfig(providerId: string)
```

---

### 2. AI Chat

**Send Message**
```typescript
window.api.ai.chat({
  conversationId: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
  providerId?: string  // defaults to 'deepseek'
})
// Returns: { success: boolean, content?: string, error?: string }
```

**Get Messages**
```typescript
window.api.ai.getMessages(conversationId: string)
// Returns: { success: boolean, messages?: Array<Message> }
```

---

### 3. Conversations

**Create Conversation**
```typescript
window.api.conversation.create({ title: string })
// Returns: { id, title, created_at, updated_at }
```

**Get All Conversations**
```typescript
window.api.conversation.getAll()
// Returns: Array<Conversation>
```

**Get Single Conversation**
```typescript
window.api.conversation.get(conversationId: string)
```

**Delete Conversation**
```typescript
window.api.conversation.delete(conversationId: string)
```

---

### 4. Notes

**Create Note**
```typescript
window.api.notes.create({
  title: string,
  body: string,
  metadata?: string
})
```

**Update Note**
```typescript
window.api.notes.update({
  id: string,
  title?: string,
  body?: string,
  metadata?: string
})
```

**Get Note**
```typescript
window.api.notes.getById(id: string, includeDeleted?: boolean)
```

**Get All Notes**
```typescript
window.api.notes.getAll()
```

**Delete Note**
```typescript
window.api.notes.delete(id: string, hard: boolean)
```

**Restore Note**
```typescript
window.api.notes.restore(id: string)
```

---

### 5. Search

**Quick Navigation**
```typescript
window.api.search.quickNav(query: string)
```

**Full Text Search**
```typescript
window.api.search.fullText(query: string)
```

**Fuzzy Search**
```typescript
window.api.search.fuzzy(query: string)
```

**Semantic Search**
```typescript
window.api.search.semantic(query: string)
```

---

### 6. Tags

**Get All Tags**
```typescript
window.api.tags.getAll()
```

**Create Tag**
```typescript
window.api.tags.create(name: string)
```

**Delete Tag**
```typescript
window.api.tags.delete(id: string)
```

**Rename Tag**
```typescript
window.api.tags.rename(id: string, name: string)
```

**Add Tags to Note**
```typescript
window.api.tags.addToNote(noteId: string, tagNames: string[])
```

**Remove Tag from Note**
```typescript
window.api.tags.removeFromNote(noteId: string, tagId: string)
```

**Get Tags for Note**
```typescript
window.api.tags.getForNote(noteId: string)
```

**Get Notes by Tag**
```typescript
window.api.tags.getNotesByTag(tagId: string)
```

---

### 7. Graph

**Get Graph Data**
```typescript
window.api.graph.getData()
// Returns: { nodes: Array<Node>, edges: Array<Edge> }
```

---

### 8. Export

**Select Directory**
```typescript
window.api.export.selectDirectory()
```

**Select File**
```typescript
window.api.export.selectFile(defaultName: string)
```

**Export as Markdown**
```typescript
window.api.export.markdown(noteIds: string[], directory: string)
```

**Export as JSON**
```typescript
window.api.export.json(noteIds: string[], filePath: string)
```

---

## Test Status

✅ **Working:**
- Provider config (save/load/delete)
- AI chat with DeepSeek/Claude/OpenAI
- Message persistence
- Provider selection in UI

⚠️ **Needs Testing:**
- Notes CRUD
- Search (all variants)
- Tags
- Graph
- Export

📝 **User Requested:**
- Model selection dropdown
- Newer models support
