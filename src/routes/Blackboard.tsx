import { useEffect, useMemo, useState } from 'react';
import { Bot, Check, ChevronDown, ClipboardList, MessageSquareText, Pencil, Plus, Save, Send, Trash2, Users, Wrench, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { blackboardAPI, type BlackboardAgent, type BlackboardSession, type BlackboardTool } from '../api/blackboard';
import { useAIProviders } from '../hooks/useAIProviders';
import { Button } from '../components/ui/Button';

const EMPTY_AGENT: Partial<BlackboardAgent> = {
  name: '',
  description: '',
  systemPrompt: '',
  tools: [],
  customTools: '',
  maxResponseTokens: 2200,
};

const EMPTY_TOOL: Partial<BlackboardTool> = {
  name: '',
  description: '',
  type: 'static',
  inputSchema: '{\n  "type": "object",\n  "properties": {}\n}',
  staticResponse: '',
  httpMethod: 'GET',
  httpUrl: '',
  httpBody: '',
  httpHeaders: [],
  timeoutMs: 10000,
};

const TOOL_OPTIONS = [
  'search_notes',
  'get_note',
  'get_backlinks',
  'get_note_tags',
  'web_search',
  'create_note',
  'add_tags',
  'export_blackboard',
];

const BUILTIN_TOOL_DEFINITIONS: BlackboardTool[] = [
  {
    id: 'builtin:search_notes',
    name: 'search_notes',
    description: 'Search existing notes by keyword across titles and body content.',
    type: 'static',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to find relevant notes' },
      },
      required: ['query'],
    }, null, 2),
    staticResponse: 'Built-in backend tool. Searches the local LibraNia note database.',
    httpMethod: 'GET',
    httpUrl: '',
    httpBody: '',
    httpHeaders: [],
    timeoutMs: 10000,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'builtin:get_note',
    name: 'get_note',
    description: 'Read the full content of a specific note by ID.',
    type: 'static',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'ID of the note to retrieve' },
      },
      required: ['noteId'],
    }, null, 2),
    staticResponse: 'Built-in backend tool. Retrieves a note from the local database.',
    httpMethod: 'GET',
    httpUrl: '',
    httpBody: '',
    httpHeaders: [],
    timeoutMs: 10000,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'builtin:get_backlinks',
    name: 'get_backlinks',
    description: 'Get notes that link to a specific note.',
    type: 'static',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'ID of the note to inspect' },
      },
      required: ['noteId'],
    }, null, 2),
    staticResponse: 'Built-in backend tool. Returns backlinks for a note.',
    httpMethod: 'GET',
    httpUrl: '',
    httpBody: '',
    httpHeaders: [],
    timeoutMs: 10000,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'builtin:get_note_tags',
    name: 'get_note_tags',
    description: 'Get tags associated with a note.',
    type: 'static',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'ID of the note to get tags for' },
      },
      required: ['noteId'],
    }, null, 2),
    staticResponse: 'Built-in backend tool. Returns note tags.',
    httpMethod: 'GET',
    httpUrl: '',
    httpBody: '',
    httpHeaders: [],
    timeoutMs: 10000,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'builtin:web_search',
    name: 'web_search',
    description: 'Search the web when local notes are insufficient or current information is needed.',
    type: 'static',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for web search' },
      },
      required: ['query'],
    }, null, 2),
    staticResponse: 'Built-in backend tool. Uses the configured web search provider during agent runs.',
    httpMethod: 'GET',
    httpUrl: '',
    httpBody: '',
    httpHeaders: [],
    timeoutMs: 10000,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'builtin:create_note',
    name: 'create_note',
    description: 'Create a new Markdown note in LibraNia.',
    type: 'static',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the note' },
        body: { type: 'string', description: 'Body content in Markdown format' },
        imageUrls: { type: 'array', items: { type: 'string' }, description: 'Optional public image URLs to import' },
      },
      required: ['title', 'body'],
    }, null, 2),
    staticResponse: 'Built-in backend tool. Creates a note and updates internal links.',
    httpMethod: 'GET',
    httpUrl: '',
    httpBody: '',
    httpHeaders: [],
    timeoutMs: 10000,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'builtin:add_tags',
    name: 'add_tags',
    description: 'Add tags to an existing note.',
    type: 'static',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'ID of the note to tag' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add' },
      },
      required: ['noteId', 'tags'],
    }, null, 2),
    staticResponse: 'Built-in backend tool. Adds tags to a note.',
    httpMethod: 'GET',
    httpUrl: '',
    httpBody: '',
    httpHeaders: [],
    timeoutMs: 10000,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'builtin:export_blackboard',
    name: 'export_blackboard',
    description: 'Export the active Blackboard session summary to a LibraNia note, Markdown file, or both.',
    type: 'static',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['library_note', 'markdown_file', 'both'],
          description: 'Export destination',
        },
        title: { type: 'string', description: 'Export title' },
        summaryMarkdown: { type: 'string', description: 'Complete Markdown summary of the Blackboard session knowledge' },
      },
      required: ['mode', 'title', 'summaryMarkdown'],
    }, null, 2),
    staticResponse: 'Built-in session tool. Requires an active Blackboard session and is intended for Export Agent use.',
    httpMethod: 'GET',
    httpUrl: '',
    httpBody: '',
    httpHeaders: [],
    timeoutMs: 10000,
    createdAt: '',
    updatedAt: '',
  },
];

const TOOL_CREATOR_PROMPT = `You are a LibraNia Tool Builder Agent. Convert the user's request into one executable Blackboard custom tool.

Return only the fields needed by the Tool Builder UI:

Tool Name:
- Use lowercase snake_case.
- Make it specific and action-oriented.
- Do not use built-in names: search_notes, get_note, get_backlinks, get_note_tags, web_search, create_note, add_tags, export_blackboard.

Type:
- Use "static" when the tool can return a reusable template, checklist, prompt, or deterministic text.
- Use "http" when the tool should call an external API.

Description:
- One sentence explaining when an agent should use this tool.

Input Schema:
- Valid JSON Schema object.
- Include type, properties, descriptions, and required fields.
- Keep inputs explicit. Do not hide required values in free text.

Static Response:
- For static tools, write the response template.
- Use {{field}} placeholders that match the input schema.

HTTP Settings:
- For HTTP tools, provide method, URL, body template, headers, and timeout.
- Use {{field}} placeholders for URL path/query/header values.
- Relative URLs like /api/notes/{{noteId}} call the current local LibraNia server.
- GET and DELETE send no request body.
- POST, PUT, and PATCH send the HTTP Body Template if provided; otherwise they send the full input JSON.

Safety:
- Do not create tools that run local shell commands.
- Do not store secrets in the tool definition if they should be passed at runtime.
- Prefer read-only API calls unless the user explicitly asks for a write action.

Final answer format:
Tool Name:
Type:
Description:
Input Schema:
Static Response:
HTTP Method:
HTTP URL:
HTTP Body Template:
HTTP Headers:
Timeout ms:
Test Input JSON:`;

const LIBRANIA_API_REFERENCE = `Use these endpoint contracts when a custom tool should call LibraNia directly.

Base URL rule:
- Use relative URLs starting with /api.
- Example: /api/notes/{{noteId}}
- Tool Builder resolves this to the current local LibraNia server.

Notes API:

1. List notes
   Method: GET
   URL: /api/notes
   Purpose: Read all active notes.
   Body: none

2. Get one note
   Method: GET
   URL: /api/notes/{{noteId}}
   Purpose: Read a single note by ID.
   Body: none

3. Create note
   Method: POST
   URL: /api/notes
   Purpose: Create a new note. This does NOT get an existing note.
   Body:
   {
     "title": "{{title}}",
     "body": "{{body}}",
     "metadata": "{}",
     "tags": "{{tags}}"
   }

4. Update note
   Method: PUT
   URL: /api/notes/{{noteId}}
   Purpose: Replace/update fields on an existing note.
   Body:
   {
     "title": "{{title}}",
     "body": "{{body}}",
     "metadata": "{}"
   }

5. Soft-delete note
   Method: DELETE
   URL: /api/notes/{{noteId}}
   Purpose: Move a note to trash.
   Body: none

6. Restore deleted note
   Method: POST
   URL: /api/notes/{{noteId}}/restore
   Purpose: Restore a soft-deleted note.
   Body: {}

Search API:

1. Full-text search notes
   Method: POST
   URL: /api/search
   Purpose: Search note title/body text.
   Body:
   {
     "query": "{{query}}"
   }

2. Semantic search notes
   Method: POST
   URL: /api/search/semantic
   Purpose: Semantic-style note search.
   Body:
   {
     "query": "{{query}}"
   }

Tags API:

1. List all tags
   Method: GET
   URL: /api/tags
   Purpose: Read all tags.
   Body: none

2. Create tag
   Method: POST
   URL: /api/tags
   Purpose: Create a tag.
   Body:
   {
     "name": "{{tag}}"
   }

3. Get tags on note
   Method: GET
   URL: /api/tags/note/{{noteId}}
   Purpose: Read tags attached to one note.
   Body: none

4. Add tags to note
   Method: POST
   URL: /api/tags/note/{{noteId}}
   Purpose: Attach tags to an existing note.
   Body:
   {
     "tags": ["{{tag}}"]
   }

5. Remove tag from note
   Method: DELETE
   URL: /api/tags/note/{{noteId}}/{{tagId}}
   Purpose: Detach one tag from one note.
   Body: none

Links and Graph API:

1. Get backlinks
   Method: GET
   URL: /api/notes/{{noteId}}/backlinks
   Purpose: Read notes that link to this note.
   Body: none

2. Get related notes
   Method: GET
   URL: /api/notes/{{noteId}}/related
   Purpose: Read bidirectional graph neighbors for this note.
   Body: none

3. Auto-link note
   Method: POST
   URL: /api/notes/{{noteId}}/auto-link
   Purpose: Ask AI to append new wiki-links to this note.
   Body:
   {
     "provider_id": "{{providerId}}",
     "model": "{{model}}"
   }

4. Get full graph
   Method: GET
   URL: /api/graph
   Purpose: Read all graph nodes and edges.
   Body: none

5. Create graph node
   Method: POST
   URL: /api/graph/nodes
   Purpose: Create a graph node.
   Body:
   {
     "title": "{{title}}",
     "tags": ["{{tag}}"]
   }

6. Update graph node
   Method: PUT
   URL: /api/graph/nodes/{{nodeId}}
   Purpose: Update graph node title/tags.
   Body:
   {
     "title": "{{title}}",
     "tags": ["{{tag}}"]
   }

7. Delete graph node
   Method: DELETE
   URL: /api/graph/nodes/{{nodeId}}
   Purpose: Delete a graph node.
   Body: none

8. Create graph edge
   Method: POST
   URL: /api/graph/edges
   Purpose: Create a relationship between two graph nodes.
   Body:
   {
     "source": "{{sourceNoteId}}",
     "target": "{{targetNoteId}}",
     "type": "related"
   }

9. Delete graph edge
   Method: DELETE
   URL: /api/graph/edges/{{edgeId}}
   Purpose: Delete a graph relationship.
   Body: none

Tool setup rules:
- Choose Type = HTTP for LibraNia API tools.
- GET reads data and has no body.
- POST creates or triggers an action.
- PUT updates an existing resource.
- DELETE removes or soft-deletes a resource.
- Use HTTP Body Template to convert friendly tool input into the exact API payload.
- POST, PUT, and PATCH automatically send JSON when the body template is JSON.
- Prefer built-in tools for normal search/create/tag operations; use HTTP tools for routes not covered by built-ins.`;

export function BlackboardPage() {
  const [tab, setTab] = useState<'board' | 'agents' | 'tools' | 'playground'>('board');
  const [agents, setAgents] = useState<BlackboardAgent[]>([]);
  const [tools, setTools] = useState<BlackboardTool[]>([]);
  const [sessions, setSessions] = useState<BlackboardSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [task, setTask] = useState('');
  const [taskPanelOpen, setTaskPanelOpen] = useState(true);
  const [sessionsPanelOpen, setSessionsPanelOpen] = useState(true);
  const [sessionContextOpen, setSessionContextOpen] = useState(false);
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(true);
  const [openDetailMessageIds, setOpenDetailMessageIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');
  const [editingAgent, setEditingAgent] = useState<Partial<BlackboardAgent>>(EMPTY_AGENT);
  const [editingTool, setEditingTool] = useState<Partial<BlackboardTool>>(EMPTY_TOOL);
  const [playgroundToolId, setPlaygroundToolId] = useState('');
  const [toolTipsOpen, setToolTipsOpen] = useState(true);
  const [libraNiaApiTipsOpen, setLibraNiaApiTipsOpen] = useState(false);
  const [toolTestInput, setToolTestInput] = useState('{}');
  const [toolTestOutput, setToolTestOutput] = useState('');
  const [testingTool, setTestingTool] = useState(false);
  const { providers } = useAIProviders();
  const [providerId, setProviderId] = useState('');
  const [model, setModel] = useState('');

  const selectedSession = useMemo(
    () => selectedSessionId ? sessions.find(session => session.id === selectedSessionId) || null : null,
    [sessions, selectedSessionId]
  );
  const sessionContextMessages = useMemo(
    () => selectedSession?.messages.filter(item => item.role === 'task' || item.role === 'system') || [],
    [selectedSession]
  );
  const chatMessages = useMemo(
    () => selectedSession?.messages.filter(item => item.role !== 'task' && item.role !== 'system') || [],
    [selectedSession]
  );
  const availableToolNames = useMemo(
    () => [...new Set([...TOOL_OPTIONS, ...tools.map(tool => tool.name)])],
    [tools]
  );
  const playgroundTools = useMemo(
    () => [...BUILTIN_TOOL_DEFINITIONS, ...tools],
    [tools]
  );
  const selectedPlaygroundTool = useMemo(
    () => playgroundTools.find(tool => tool.id === playgroundToolId) || playgroundTools[0] || null,
    [playgroundTools, playgroundToolId]
  );
  const isEditingBuiltinTool = typeof editingTool.id === 'string' && editingTool.id.startsWith('builtin:');

  const load = async () => {
    const [nextAgents, nextSessions, nextTools] = await Promise.all([
      blackboardAPI.getAgents(),
      blackboardAPI.getSessions(),
      blackboardAPI.getTools(),
    ]);
    setAgents(nextAgents);
    setSessions(nextSessions);
    setTools(nextTools);
    setSelectedAgentIds((prev) => prev.length > 0 ? prev : nextAgents.filter(agent => agent.id === 'default-librarian').map(agent => agent.id));
  };

  useEffect(() => {
    load().catch(error => {
      console.error('Failed to load Blackboard:', error);
      toast.error('Failed to load Blackboard');
    });
  }, []);

  useEffect(() => {
    const hasRunningSession = sessions.some(session => session.status === 'running') || running || sendingMessage;
    if (!hasRunningSession) return;

    const interval = window.setInterval(() => {
      blackboardAPI.getSessions()
        .then(nextSessions => {
          setSessions(nextSessions);
          if (!selectedSessionId && nextSessions[0]) {
            setSelectedSessionId(nextSessions[0].id);
          }
        })
        .catch(error => console.error('Failed to poll Blackboard sessions:', error));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [sessions, running, sendingMessage, selectedSessionId]);

  useEffect(() => {
    const configured = providers.filter(provider => provider.configured !== false);
    if (!providerId && configured[0]) {
      setProviderId(configured[0].id);
      setModel(configured[0].model || '');
    }
  }, [providers, providerId]);

  useEffect(() => {
    if (!playgroundToolId && playgroundTools[0]) {
      setPlaygroundToolId(playgroundTools[0].id);
    }
  }, [playgroundTools, playgroundToolId]);

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) => prev.includes(id)
      ? prev.filter(agentId => agentId !== id)
      : [...prev, id]);
  };

  const startNewSession = () => {
    setSelectedSessionId(null);
    setEditingSessionId(null);
    setEditingSessionTitle('');
    setMessage('');
    setTask('');
    setTaskPanelOpen(true);
  };

  const runTask = async () => {
    if (!task.trim()) return;
    setRunning(true);
    try {
      const session = await blackboardAPI.assignTask({
        task,
        agentIds: selectedAgentIds,
        providerId: providerId || undefined,
        model: model || undefined,
      });
      setSessions((prev) => [session, ...prev]);
      setSelectedSessionId(session.id);
      setTask('');
      setTaskPanelOpen(false);
      setSessionContextOpen(false);
      toast.success('Blackboard task complete');
    } catch (error) {
      console.error('Blackboard task failed:', error);
      toast.error(error instanceof Error ? error.message : 'Blackboard task failed');
    } finally {
      setRunning(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedSession || !message.trim()) return;
    const outgoing = message.trim();
    setMessage('');
    setSendingMessage(true);
    try {
      const session = await blackboardAPI.sendMessage(selectedSession.id, {
        content: outgoing,
        providerId: providerId || undefined,
        model: model || undefined,
      });
      setSessions((prev) => [session, ...prev.filter(candidate => candidate.id !== session.id)]);
      setSelectedSessionId(session.id);
    } catch (error) {
      console.error('Failed to send Blackboard message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send Blackboard message');
      setMessage(outgoing);
    } finally {
      setSendingMessage(false);
    }
  };

  const startRenameSession = (session: BlackboardSession) => {
    setEditingSessionId(session.id);
    setEditingSessionTitle(session.title);
  };

  const saveSessionTitle = async () => {
    if (!editingSessionId || !editingSessionTitle.trim()) return;
    try {
      const session = await blackboardAPI.renameSession(editingSessionId, editingSessionTitle.trim());
      setSessions((prev) => prev.map(candidate => candidate.id === session.id ? session : candidate));
      setEditingSessionId(null);
      setEditingSessionTitle('');
    } catch (error) {
      toast.error('Failed to rename session');
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await blackboardAPI.deleteSession(id);
      setSessions((prev) => prev.filter(session => session.id !== id));
      if (selectedSessionId === id) setSelectedSessionId(null);
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const saveAgent = async () => {
    try {
      const saved = await blackboardAPI.saveAgent({
        ...editingAgent,
        tools: editingAgent.tools || [],
      });
      setAgents((prev) => {
        const exists = prev.some(agent => agent.id === saved.id);
        return exists ? prev.map(agent => agent.id === saved.id ? saved : agent) : [saved, ...prev];
      });
      setEditingAgent(EMPTY_AGENT);
      toast.success('Agent saved');
    } catch (error) {
      console.error('Failed to save agent:', error);
      toast.error('Failed to save agent');
    }
  };

  const deleteAgent = async (agent: BlackboardAgent) => {
    try {
      await blackboardAPI.deleteAgent(agent.id);
      setAgents((prev) => prev.filter(candidate => candidate.id !== agent.id));
      if (editingAgent.id === agent.id) setEditingAgent(EMPTY_AGENT);
      toast.success('Agent deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete agent');
    }
  };

  const saveTool = async () => {
    try {
      const saved = await blackboardAPI.saveTool(editingTool);
      setTools(prev => prev.some(tool => tool.id === saved.id)
        ? prev.map(tool => tool.id === saved.id ? saved : tool)
        : [saved, ...prev]);
      setEditingTool(saved);
      toast.success('Tool saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save tool');
    }
  };

  const deleteTool = async (tool: BlackboardTool) => {
    try {
      await blackboardAPI.deleteTool(tool.id);
      setTools(prev => prev.filter(candidate => candidate.id !== tool.id));
      setAgents(prev => prev.map(agent => ({ ...agent, tools: agent.tools.filter(toolName => toolName !== tool.name) })));
      if (editingTool.id === tool.id) setEditingTool(EMPTY_TOOL);
      toast.success('Tool deleted');
    } catch (error) {
      toast.error('Failed to delete tool');
    }
  };

  const testTool = async (tool: Partial<BlackboardTool> = editingTool) => {
    if (!tool.id) {
      toast.error('Save the tool before testing');
      return;
    }
    setTestingTool(true);
    try {
      const parsedInput = toolTestInput.trim() ? JSON.parse(toolTestInput) : {};
      const result = await blackboardAPI.executeTool(tool.id, parsedInput);
      setToolTestOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setToolTestOutput(error instanceof Error ? error.message : String(error));
    } finally {
      setTestingTool(false);
    }
  };

  const addToolHeader = () => {
    setEditingTool({
      ...editingTool,
      httpHeaders: [...(editingTool.httpHeaders || []), { name: '', value: '' }],
    });
  };

  const updateToolHeader = (index: number, field: 'name' | 'value', value: string) => {
    const headers = [...(editingTool.httpHeaders || [])];
    headers[index] = { ...(headers[index] || { name: '', value: '' }), [field]: value };
    setEditingTool({ ...editingTool, httpHeaders: headers });
  };

  const removeToolHeader = (index: number) => {
    setEditingTool({
      ...editingTool,
      httpHeaders: (editingTool.httpHeaders || []).filter((_, candidateIndex) => candidateIndex !== index),
    });
  };

  const toggleTool = (tool: string) => {
    const tools = editingAgent.tools || [];
    setEditingAgent({
      ...editingAgent,
      tools: tools.includes(tool) ? tools.filter(candidate => candidate !== tool) : [...tools, tool],
    });
  };

  const getAgentInitials = (name: string) => name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'A';

  const getMessageTone = (role: string, agentName: string) => {
    if (role === 'user') return 'ml-auto bg-primary text-white border-primary';
    if (role === 'task') return 'mx-auto bg-muted/70 border-border text-foreground';
    if (role === 'system' || agentName === 'Blackboard') return 'mx-auto bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/25 dark:text-amber-100 dark:border-amber-800/70';
    return 'mr-auto bg-background border-border text-foreground';
  };

  const toggleMessageDetails = (id: string) => {
    setOpenDetailMessageIds(prev => prev.includes(id)
      ? prev.filter(messageId => messageId !== id)
      : [...prev, id]);
  };

  const markdownComponents = {
    h1: ({ ...props }) => <h1 className="mb-2 text-lg font-semibold" {...props} />,
    h2: ({ ...props }) => <h2 className="mb-2 text-base font-semibold" {...props} />,
    h3: ({ ...props }) => <h3 className="mb-1.5 text-sm font-semibold" {...props} />,
    p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
    ul: ({ ...props }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props} />,
    ol: ({ ...props }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props} />,
    li: ({ ...props }) => <li className="leading-6" {...props} />,
    code: ({ ...props }) => <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]" {...props} />,
    pre: ({ ...props }) => <pre className="mb-2 overflow-x-auto rounded-md bg-muted p-3 text-xs last:mb-0" {...props} />,
    table: ({ ...props }) => <div className="mb-2 overflow-x-auto"><table className="w-full border-collapse text-sm" {...props} /></div>,
    th: ({ ...props }) => <th className="border border-border bg-muted px-2 py-1 text-left font-semibold" {...props} />,
    td: ({ ...props }) => <td className="border border-border px-2 py-1 align-top" {...props} />,
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Blackboard</h1>
            <p className="text-sm text-secondary">Assign work to an active Blackboard agent team and inspect the shared workspace.</p>
          </div>
          <div className="flex rounded-lg border border-border bg-muted/40 p-1">
            <button onClick={() => setTab('board')} className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${tab === 'board' ? 'bg-background text-primary shadow-sm' : 'text-secondary hover:text-foreground'}`}>
              <ClipboardList size={16} />
              Board
            </button>
            <button onClick={() => setTab('agents')} className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${tab === 'agents' ? 'bg-background text-primary shadow-sm' : 'text-secondary hover:text-foreground'}`}>
              <Bot size={16} />
              Agent Management
            </button>
            <button onClick={() => setTab('tools')} className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${tab === 'tools' ? 'bg-background text-primary shadow-sm' : 'text-secondary hover:text-foreground'}`}>
              <Wrench size={16} />
              Tool Builder
            </button>
            <button onClick={() => setTab('playground')} className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${tab === 'playground' ? 'bg-background text-primary shadow-sm' : 'text-secondary hover:text-foreground'}`}>
              <MessageSquareText size={16} />
              Playground
            </button>
          </div>
        </div>
      </header>

      {tab === 'board' ? (
        <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden bg-muted/20 lg:grid-cols-[340px_1fr]">
          <aside className="min-h-0 overflow-y-auto border-r border-border bg-background p-3">
            <section className="mb-3 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => setTaskPanelOpen(open => !open)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md py-1 text-left text-sm font-semibold transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-expanded={taskPanelOpen}
                >
                  <ChevronDown size={16} className={`shrink-0 transition-transform ${taskPanelOpen ? '' : '-rotate-90'}`} />
                  <span className="truncate">Assign task</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {selectedAgentIds.length}
                  </span>
                </button>
                <Button onClick={startNewSession} variant="ghost" size="icon" aria-label="New session">
                  <Plus size={16} />
                </Button>
              </div>

              {taskPanelOpen && (
                <div className="space-y-3 p-3">
                  <label className="sr-only" htmlFor="blackboard-task">New session task</label>
                  <textarea
                    id="blackboard-task"
                    value={task}
                    onChange={event => setTask(event.target.value)}
                    className="min-h-28 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Assign a new task..."
                  />
                  <div className="grid gap-2">
                    <select value={providerId} onChange={event => {
                      setProviderId(event.target.value);
                      setModel(providers.find(provider => provider.id === event.target.value)?.model || '');
                    }} className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                      {providers.filter(provider => provider.configured !== false).map(provider => (
                        <option key={provider.id} value={provider.id}>{provider.name || provider.id}</option>
                      ))}
                    </select>
                    <input value={model} onChange={event => setModel(event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Model" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Users size={16} />
                      Active agents
                    </div>
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {agents.map((agent, index) => {
                        const selected = selectedAgentIds.includes(agent.id);
                        return (
                          <label key={agent.id} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition-colors ${selected ? 'border-primary/40 bg-primary/10' : 'border-border bg-background hover:bg-muted/60'}`}>
                            <input type="checkbox" checked={selected} onChange={() => toggleAgent(agent.id)} className="mt-1" />
                            <span className="flex min-w-0 flex-1 items-start gap-2">
                              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${selected ? 'bg-primary text-white' : 'bg-muted text-secondary'}`}>
                                {selected ? <Check size={13} /> : index + 1}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{agent.name}</span>
                                <span className="line-clamp-2 text-xs text-secondary">{agent.description}</span>
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <Button onClick={() => void runTask()} disabled={running || !task.trim() || selectedAgentIds.length === 0} className="w-full gap-2">
                    <Send size={16} />
                    {running ? 'Running' : 'Assign Task'}
                  </Button>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => setSessionsPanelOpen(open => !open)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-sm font-semibold transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-expanded={sessionsPanelOpen}
                >
                  <ChevronDown size={16} className={`shrink-0 transition-transform ${sessionsPanelOpen ? '' : '-rotate-90'}`} />
                  <span className="truncate">Sessions</span>
                </button>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-secondary">{sessions.length}</span>
              </div>
              {sessionsPanelOpen && (
                <div className="p-2">
                  {sessions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-3 text-sm text-secondary">No blackboard sessions yet.</p>
                  ) : sessions.map(session => (
                    <div key={session.id} className={`group mb-1 rounded-lg border px-3 py-2 text-sm transition-colors ${selectedSession?.id === session.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-transparent hover:border-border hover:bg-muted'}`}>
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={editingSessionTitle}
                            onChange={event => setEditingSessionTitle(event.target.value)}
                            onKeyDown={event => {
                              if (event.key === 'Enter') void saveSessionTitle();
                              if (event.key === 'Escape') setEditingSessionId(null);
                            }}
                            className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                          />
                          <button onClick={() => void saveSessionTitle()} className="cursor-pointer rounded p-1 hover:bg-muted" aria-label="Save title">
                            <Check size={13} />
                          </button>
                          <button onClick={() => setEditingSessionId(null)} className="cursor-pointer rounded p-1 hover:bg-muted" aria-label="Cancel rename">
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <button onClick={() => setSelectedSessionId(session.id)} className="min-w-0 flex-1 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary">
                            <span className="block truncate font-medium">{session.title}</span>
                            <span className="text-xs text-secondary">{session.status} - {session.messages.length} entries</span>
                          </button>
                          <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                            <button onClick={() => startRenameSession(session)} className="cursor-pointer rounded p-1 hover:bg-muted" aria-label="Rename session">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => void deleteSession(session.id)} className="cursor-pointer rounded p-1 text-destructive hover:bg-destructive/10" aria-label="Delete session">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>

          <div className="flex min-h-0 flex-col overflow-hidden">
              <div className="border-b border-border bg-background px-5 py-3">
                {selectedSession ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">{selectedSession.title}</h2>
                        <p className="text-xs text-secondary">{new Date(selectedSession.createdAt).toLocaleString()} - {selectedSession.status}</p>
                      </div>
                      <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-secondary">
                        {selectedSession.messages.filter(item => item.role === 'agent').length} agent turns
                      </span>
                    </div>
                    {(selectedSession.artifacts || []).length > 0 && (
                      <div className="rounded-lg border border-border bg-background">
                        <button
                          type="button"
                          onClick={() => setArtifactPanelOpen(open => !open)}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-expanded={artifactPanelOpen}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <ChevronDown size={15} className={`shrink-0 transition-transform ${artifactPanelOpen ? '' : '-rotate-90'}`} />
                            <ClipboardList size={15} className="shrink-0 text-primary" />
                            <span className="truncate">Shared Blackboard Workspace</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{selectedSession.artifacts.length}</span>
                        </button>
                        {artifactPanelOpen && (
                          <div className="grid max-h-96 gap-2 overflow-y-auto border-t border-border p-3 md:grid-cols-2">
                            {selectedSession.artifacts.map(artifact => (
                              <article key={artifact.id} className="rounded-md border border-border bg-muted/20 p-3">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{artifact.title}</p>
                                    <p className="text-xs text-secondary">{artifact.type} - {artifact.updatedBy}</p>
                                  </div>
                                  <span className="shrink-0 rounded bg-background px-2 py-0.5 text-[10px] text-secondary">
                                    {new Date(artifact.updatedAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {artifact.content}
                                  </ReactMarkdown>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {sessionContextMessages.length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/30">
                        <button
                          type="button"
                          onClick={() => setSessionContextOpen(open => !open)}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-expanded={sessionContextOpen}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <ChevronDown size={15} className={`shrink-0 transition-transform ${sessionContextOpen ? '' : '-rotate-90'}`} />
                            <ClipboardList size={15} className="shrink-0 text-secondary" />
                            <span className="truncate">Assigned task and Blackboard context</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs text-secondary">{sessionContextMessages.length}</span>
                        </button>
                        {sessionContextOpen && (
                          <div className="max-h-72 space-y-2 overflow-y-auto border-t border-border p-3">
                            {sessionContextMessages.map(item => (
                              <article key={item.id} className="rounded-md border border-border bg-background p-3">
                                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-secondary">
                                  <ClipboardList size={13} />
                                  {item.agentName}
                                  <span className="ml-auto font-normal">{item.role}</span>
                                </div>
                                <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {item.content}
                                  </ReactMarkdown>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold">New Blackboard Session</h2>
                    <span className="text-xs text-secondary">Assign a task from the left panel</span>
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                {!selectedSession ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm rounded-lg border border-dashed border-border bg-background p-6 text-center">
                      <ClipboardList className="mx-auto mb-3 text-secondary" size={28} />
                      <p className="text-sm font-medium">No active conversation</p>
                      <p className="mt-1 text-sm text-secondary">Open the assignment panel and send a task to start the agent room.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-5xl space-y-4">
                    {chatMessages.map((message, index) => {
                      const isUser = message.role === 'user';
                      return (
                        <article key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {!isUser && (
                            <div className="relative flex flex-col items-center">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
                                {getAgentInitials(message.agentName)}
                              </div>
                              {index < chatMessages.length - 1 && <div className="mt-2 h-full min-h-6 w-px bg-border" />}
                            </div>
                          )}
                          <div className={`min-w-0 max-w-[min(46rem,88%)] rounded-lg border px-4 py-3 shadow-sm ${getMessageTone(message.role, message.agentName)}`}>
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                              <MessageSquareText size={14} />
                              <span>{message.agentName}</span>
                              <span className="ml-auto font-normal opacity-70">{message.role}</span>
                            </div>
                            <div className="prose prose-sm max-w-none text-current dark:prose-invert">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            {message.details && (
                              <div className="mt-3 border-t border-current/15 pt-2">
                                <button
                                  type="button"
                                  onClick={() => toggleMessageDetails(message.id)}
                                  className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs font-medium opacity-75 transition-colors hover:bg-current/10 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
                                  aria-expanded={openDetailMessageIds.includes(message.id)}
                                >
                                  <ChevronDown size={13} className={`transition-transform ${openDetailMessageIds.includes(message.id) ? '' : '-rotate-90'}`} />
                                  Agent response details
                                </button>
                                {openDetailMessageIds.includes(message.id) && (
                                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-5 text-foreground">
                                    {message.details}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                          {isUser && (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                              You
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSession && (
                <div className="border-t border-border bg-background p-4">
                  <div className="mx-auto flex max-w-5xl gap-2">
                    <input
                      value={message}
                      onChange={event => setMessage(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Join the room. Mention agents with @Librarian, @Reviewer, @Link..."
                      disabled={sendingMessage}
                    />
                    <Button onClick={() => void sendMessage()} disabled={sendingMessage || !message.trim()} size="icon" aria-label="Send message">
                      <Send size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
        </main>
      ) : tab === 'tools' ? (
        <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
          <aside className="min-h-0 overflow-y-auto border-r border-border p-4">
            <Button onClick={() => setEditingTool(EMPTY_TOOL)} className="mb-3 w-full gap-2">
              <Plus size={16} />
              New Tool
            </Button>
            <div className="space-y-2">
              <div>
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-normal text-secondary">Built-in tools</p>
                <div className="space-y-2">
                  {BUILTIN_TOOL_DEFINITIONS.map(tool => (
                    <button key={tool.id} onClick={() => setEditingTool(tool)} className={`w-full cursor-pointer rounded-md border border-border p-3 text-left transition-colors hover:bg-muted ${editingTool.id === tool.id ? 'border-primary bg-primary/5' : ''}`}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">{tool.name}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-normal text-secondary">built-in</span>
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs text-secondary">{tool.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-normal text-secondary">Custom tools</p>
                {tools.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-sm text-secondary">No custom tools yet.</p>
                ) : tools.map(tool => (
                  <button key={tool.id} onClick={() => setEditingTool(tool)} className={`w-full cursor-pointer rounded-md border border-border p-3 text-left transition-colors hover:bg-muted ${editingTool.id === tool.id ? 'border-primary bg-primary/5' : ''}`}>
                    <span className="block text-sm font-medium">{tool.name}</span>
                    <span className="line-clamp-2 text-xs text-secondary">{tool.description || tool.type}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-5">
            <div className="mx-auto max-w-4xl space-y-4">
              <div className="rounded-lg border border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => setToolTipsOpen(open => !open)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-expanded={toolTipsOpen}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown size={15} className={`shrink-0 transition-transform ${toolTipsOpen ? '' : '-rotate-90'}`} />
                    <Wrench size={15} className="shrink-0 text-secondary" />
                    <span className="truncate">Prompt for creating tools from user requests</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs text-secondary">tips</span>
                </button>
              {toolTipsOpen && (
                  <div className="border-t border-border p-3">
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-xs leading-5 text-foreground">
                      {TOOL_CREATOR_PROMPT}
                    </pre>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => setLibraNiaApiTipsOpen(open => !open)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-expanded={libraNiaApiTipsOpen}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown size={15} className={`shrink-0 transition-transform ${libraNiaApiTipsOpen ? '' : '-rotate-90'}`} />
                    <ClipboardList size={15} className="shrink-0 text-secondary" />
                    <span className="truncate">LibraNia API and link request reference</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs text-secondary">local api</span>
                </button>
                {libraNiaApiTipsOpen && (
                  <div className="border-t border-border p-3">
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-xs leading-5 text-foreground">
                      {LIBRANIA_API_REFERENCE}
                    </pre>
                  </div>
                )}
              </div>
              {isEditingBuiltinTool && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/25 dark:text-amber-100">
                  This is a built-in LibraNia tool. You can inspect it here and enable it for agents in Agent Management, but it cannot be edited from Tool Builder.
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                <div>
                  <label className="mb-1 block text-sm font-medium">Tool Name</label>
                  <input disabled={isEditingBuiltinTool} value={editingTool.name || ''} onChange={event => setEditingTool({ ...editingTool, name: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70" placeholder="lookup_hash" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Type</label>
                  <select disabled={isEditingBuiltinTool} value={editingTool.type || 'static'} onChange={event => setEditingTool({ ...editingTool, type: event.target.value as BlackboardTool['type'] })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70">
                    <option value="static">Static</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <input disabled={isEditingBuiltinTool} value={editingTool.description || ''} onChange={event => setEditingTool({ ...editingTool, description: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70" placeholder="Explain when an agent should use this tool." />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Input Schema</label>
                <textarea readOnly={isEditingBuiltinTool} value={editingTool.inputSchema || ''} onChange={event => setEditingTool({ ...editingTool, inputSchema: event.target.value })} className="min-h-40 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary read-only:cursor-default read-only:opacity-80" />
              </div>

              {(editingTool.type || 'static') === 'static' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">Static Response</label>
                  <textarea readOnly={isEditingBuiltinTool} value={editingTool.staticResponse || ''} onChange={event => setEditingTool({ ...editingTool, staticResponse: event.target.value })} className="min-h-40 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary read-only:cursor-default read-only:opacity-80" placeholder="Supports {{field}} template values from test or agent input." />
                </div>
              ) : (
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <div className="grid gap-4 md:grid-cols-[140px_1fr_150px]">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Method</label>
                      <select disabled={isEditingBuiltinTool} value={editingTool.httpMethod || 'GET'} onChange={event => setEditingTool({ ...editingTool, httpMethod: event.target.value as BlackboardTool['httpMethod'] })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">URL</label>
                      <input disabled={isEditingBuiltinTool} value={editingTool.httpUrl || ''} onChange={event => setEditingTool({ ...editingTool, httpUrl: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70" placeholder="https://api.example.com/items/{{id}}" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Timeout ms</label>
                      <input disabled={isEditingBuiltinTool} type="number" value={editingTool.timeoutMs || 10000} onChange={event => setEditingTool({ ...editingTool, timeoutMs: Number(event.target.value) })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">HTTP Body Template</label>
                    <textarea
                      readOnly={isEditingBuiltinTool}
                      value={editingTool.httpBody || ''}
                      onChange={event => setEditingTool({ ...editingTool, httpBody: event.target.value })}
                      className="min-h-36 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary read-only:cursor-default read-only:opacity-80"
                      placeholder={'{\n  "title": "{{title}}",\n  "body": "{{body}}"\n}'}
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Headers</p>
                      <Button type="button" variant="outline" size="sm" onClick={addToolHeader} disabled={isEditingBuiltinTool} className="gap-2">
                        <Plus size={14} />
                        Header
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(editingTool.httpHeaders || []).map((header, index) => (
                        <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_36px]">
                          <input disabled={isEditingBuiltinTool} value={header.name} onChange={event => updateToolHeader(index, 'name', event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70" placeholder="Authorization" />
                          <input disabled={isEditingBuiltinTool} value={header.value} onChange={event => updateToolHeader(index, 'value', event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70" placeholder="Bearer {{apiKey}}" />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeToolHeader(index)} disabled={isEditingBuiltinTool} aria-label="Remove header">
                            <X size={15} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void saveTool()} disabled={isEditingBuiltinTool} className="gap-2">
                  <Save size={16} />
                  Save Tool
                </Button>
                <Button variant="outline" onClick={() => void testTool()} disabled={isEditingBuiltinTool || testingTool || !editingTool.id} className="gap-2">
                  <Send size={16} />
                  {testingTool ? 'Running' : 'Test Saved Tool'}
                </Button>
                {editingTool.id && !isEditingBuiltinTool && (
                  <Button variant="outline" onClick={() => void deleteTool(editingTool as BlackboardTool)} className="gap-2">
                    <Trash2 size={16} />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </section>
        </main>
      ) : tab === 'playground' ? (
        <main className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-lg border border-border p-4">
              <label className="mb-2 block text-sm font-medium">Tool</label>
              <select value={selectedPlaygroundTool?.id || ''} onChange={event => setPlaygroundToolId(event.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {playgroundTools.map(tool => (
                  <option key={tool.id} value={tool.id}>
                    {tool.name}{tool.id.startsWith('builtin:') ? ' (built-in)' : ' (custom)'}
                  </option>
                ))}
              </select>
              {selectedPlaygroundTool && (
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="font-medium">{selectedPlaygroundTool.name}</p>
                    <p className="mt-1 text-secondary">{selectedPlaygroundTool.description || 'No description.'}</p>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-5">{selectedPlaygroundTool.inputSchema}</pre>
                </div>
              )}
            </aside>

            <section className="space-y-4 rounded-lg border border-border p-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Input JSON</label>
                <textarea value={toolTestInput} onChange={event => setToolTestInput(event.target.value)} className="min-h-48 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => selectedPlaygroundTool && void testTool(selectedPlaygroundTool)} disabled={testingTool || !selectedPlaygroundTool} className="gap-2">
                  <Send size={16} />
                  {testingTool ? 'Running' : 'Run Tool'}
                </Button>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Output</label>
                <pre className="min-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-xs leading-5">
                  {toolTestOutput || 'Run a tool to see the response.'}
                </pre>
              </div>
            </section>
          </div>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
          <aside className="min-h-0 overflow-y-auto border-r border-border p-4">
            <Button onClick={() => setEditingAgent(EMPTY_AGENT)} className="mb-3 w-full gap-2">
              <Plus size={16} />
              New Agent
            </Button>
            <div className="space-y-2">
              {agents.map(agent => (
                <button key={agent.id} onClick={() => setEditingAgent(agent)} className={`w-full cursor-pointer rounded-md border border-border p-3 text-left transition-colors hover:bg-muted ${editingAgent.id === agent.id ? 'border-primary bg-primary/5' : ''}`}>
                  <span className="block text-sm font-medium">{agent.name}</span>
                  <span className="line-clamp-2 text-xs text-secondary">{agent.description}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-5">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
                <div>
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <input value={editingAgent.name || ''} onChange={event => setEditingAgent({ ...editingAgent, name: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <input value={editingAgent.description || ''} onChange={event => setEditingAgent({ ...editingAgent, description: event.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Response Budget</label>
                  <input
                    type="number"
                    min={512}
                    max={12000}
                    step={256}
                    value={editingAgent.maxResponseTokens || 2200}
                    onChange={event => setEditingAgent({ ...editingAgent, maxResponseTokens: Number(event.target.value) })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-secondary">Max tokens for this agent response.</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">System Prompt</label>
                <textarea value={editingAgent.systemPrompt || ''} onChange={event => setEditingAgent({ ...editingAgent, systemPrompt: event.target.value })} className="min-h-40 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Tool Calls</p>
                    <p className="text-xs text-secondary">Enable write tools like create_note/add_tags for agents that should save LibraNia notes.</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {availableToolNames.map(tool => {
                    const customTool = tools.some(candidate => candidate.name === tool);
                    const writeTool = ['create_note', 'add_tags', 'export_blackboard'].includes(tool);
                    const enabled = Boolean(editingAgent.tools?.includes(tool));
                    return (
                      <label
                        key={tool}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${enabled ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                      >
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleTool(tool)}
                            className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                          />
                          <span className="truncate font-mono">{tool}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {writeTool && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase tracking-normal text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">write</span>}
                          {customTool && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-normal text-secondary">custom</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Custom Tool Instructions</label>
                <textarea value={editingAgent.customTools || ''} onChange={event => setEditingAgent({ ...editingAgent, customTools: event.target.value })} className="min-h-32 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Describe custom tool behavior, arguments, and expected output." />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => void saveAgent()} className="gap-2">
                  <Save size={16} />
                  Save Agent
                </Button>
                {editingAgent.id && !editingAgent.isDefault && (
                  <Button variant="outline" onClick={() => void deleteAgent(editingAgent as BlackboardAgent)} className="gap-2">
                    <Trash2 size={16} />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
