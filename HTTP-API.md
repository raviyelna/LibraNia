# LibraNia HTTP REST API

Base URL: `http://localhost:3000` (when web server running)

## Authentication
Currently no authentication. All endpoints are open.

---

## Provider Configuration

### Get All Providers
```http
GET /api/providers
```

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "id": "deepseek",
      "apiKey": "sk-...",
      "model": "deepseek-chat",
      "baseURL": "https://api.deepseek.com"
    }
  ]
}
```

### Get Single Provider
```http
GET /api/providers/:id
```

**Response:**
```json
{
  "success": true,
  "config": {
    "id": "deepseek",
    "apiKey": "sk-...",
    "model": "deepseek-chat",
    "baseURL": "https://api.deepseek.com"
  }
}
```

### Create/Update Provider
```http
POST /api/providers
Content-Type: application/json

{
  "id": "deepseek",
  "apiKey": "sk-...",
  "model": "deepseek-chat",
  "baseURL": "https://api.deepseek.com"
}
```

**Response:**
```json
{
  "success": true
}
```

### Delete Provider
```http
DELETE /api/providers/:id
```

**Response:**
```json
{
  "success": true
}
```

---

## Conversations

### Get All Conversations
```http
GET /api/conversations
```

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "uuid",
      "title": "My Conversation",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Create Conversation
```http
POST /api/conversations
Content-Type: application/json

{
  "title": "New Conversation"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "uuid",
    "title": "New Conversation",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### Get Single Conversation
```http
GET /api/conversations/:id
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "uuid",
    "title": "My Conversation",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### Delete Conversation
```http
DELETE /api/conversations/:id
```

**Response:**
```json
{
  "success": true
}
```

---

## Messages

### Get Messages for Conversation
```http
GET /api/conversations/:id/messages
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "role": "user",
      "content": "Hello",
      "provider_id": null,
      "model": null,
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "role": "assistant",
      "content": "Hi there!",
      "provider_id": "deepseek",
      "model": "deepseek-chat",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## AI Chat

### Send Chat Message
```http
POST /api/chat
Content-Type: application/json

{
  "conversationId": "uuid",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "providerId": "deepseek",
  "model": "deepseek-chat"
}
```

**Parameters:**
- `conversationId` (required): Conversation UUID
- `messages` (required): Array of message objects with `role` and `content`
- `providerId` (optional): Provider ID (defaults to "deepseek")
- `model` (optional): Model ID (defaults to provider's configured model)

**Response:**
```json
{
  "success": true,
  "content": "Hi there! How can I help you?"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Example Usage

### JavaScript/Fetch
```javascript
// Create conversation
const conv = await fetch('http://localhost:3000/api/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Test Chat' })
}).then(r => r.json());

// Send message
const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: conv.conversation.id,
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
    providerId: 'deepseek',
    model: 'deepseek-chat'
  })
}).then(r => r.json());

console.log(response.content);
```

### cURL
```bash
# Create conversation
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat"}'

# Send message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId":"uuid-here",
    "messages":[{"role":"user","content":"Hello!"}],
    "providerId":"deepseek"
  }'
```

---

## Error Codes

- `400` - Bad Request (missing required fields)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

All errors return:
```json
{
  "success": false,
  "error": "Error message"
}
```
