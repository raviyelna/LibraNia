import { eq, desc } from 'drizzle-orm';
import { conversations, messages, citations } from '../database/schema.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema.js';

export interface CreateConversationInput {
  title: string; // Auto-generated from first 50 chars per D-11
}

export interface AddMessageInput {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider_id?: string; // 'claude', 'openai', 'deepseek' per D-06
  model?: string; // Model name per D-23
}

export interface Citation {
  message_id: string;
  url: string;
  title: string;
  snippet: string;
  position: number; // [1], [2], [3] per D-16
}

export interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider_id: string | null;
  model: string | null;
  created_at: Date;
  citations?: Citation[];
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

/**
 * Create a new conversation
 * @param data Conversation data (title)
 * @param db Drizzle ORM instance
 * @returns Created conversation with id and timestamps
 */
export async function createConversation(
  data: CreateConversationInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Conversation> {
  const now = new Date();
  const id = crypto.randomUUID();

  const [conversation] = await db
    .insert(conversations)
    .values({
      id,
      title: data.title,
      created_at: now,
      updated_at: now,
    })
    .returning();

  return conversation as Conversation;
}

/**
 * Add a message to a conversation
 * @param data Message data (conversation_id, role, content, provider metadata)
 * @param db Drizzle ORM instance
 * @returns Created message with id and timestamp
 */
export async function addMessage(
  data: AddMessageInput,
  db: BetterSQLite3Database<typeof schema>
): Promise<Message> {
  const now = new Date();
  const id = crypto.randomUUID();

  const [message] = await db
    .insert(messages)
    .values({
      id,
      conversation_id: data.conversation_id,
      role: data.role,
      content: data.content,
      provider_id: data.provider_id || null,
      model: data.model || null,
      created_at: now,
    })
    .returning();

  // Update conversation updated_at timestamp
  await db
    .update(conversations)
    .set({ updated_at: now })
    .where(eq(conversations.id, data.conversation_id));

  return message as Message;
}

/**
 * Add citations to a message
 * @param citationData Array of citation objects
 * @param db Drizzle ORM instance
 * @returns Array of created citations
 */
export async function addCitations(
  citationData: Citation[],
  db: BetterSQLite3Database<typeof schema>
): Promise<Citation[]> {
  if (citationData.length === 0) return [];

  const now = new Date();

  const citationsWithIds = citationData.map((citation) => ({
    id: crypto.randomUUID(),
    message_id: citation.message_id,
    url: citation.url,
    title: citation.title,
    snippet: citation.snippet,
    position: citation.position,
    created_at: now,
  }));

  const inserted = await db
    .insert(citations)
    .values(citationsWithIds)
    .returning();

  return inserted as Citation[];
}

/**
 * Get a conversation by ID with all messages and citations
 * @param id Conversation ID
 * @param db Drizzle ORM instance
 * @returns Conversation with messages and citations, or null if not found
 */
export async function getConversation(
  id: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<ConversationWithMessages | null> {
  // Get conversation
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conversation) return null;

  // Get all messages for this conversation
  const conversationMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, id))
    .orderBy(messages.created_at);

  // Get all citations for these messages
  const messageIds = conversationMessages.map((m) => m.id);
  let allCitations: any[] = [];

  if (messageIds.length > 0) {
    // Query citations for all messages
    allCitations = await db
      .select()
      .from(citations)
      .where(eq(citations.message_id, messageIds[0]));

    // If multiple messages, query for each (Drizzle doesn't support IN with array directly)
    for (let i = 1; i < messageIds.length; i++) {
      const moreCitations = await db
        .select()
        .from(citations)
        .where(eq(citations.message_id, messageIds[i]));
      allCitations.push(...moreCitations);
    }
  }

  // Group citations by message_id
  const citationsByMessage = new Map<string, Citation[]>();
  for (const citation of allCitations) {
    if (!citationsByMessage.has(citation.message_id)) {
      citationsByMessage.set(citation.message_id, []);
    }
    citationsByMessage.get(citation.message_id)!.push(citation as Citation);
  }

  // Attach citations to messages
  const messagesWithCitations: Message[] = conversationMessages.map((msg) => ({
    ...msg,
    citations: citationsByMessage.get(msg.id) || [],
  })) as Message[];

  return {
    ...conversation,
    messages: messagesWithCitations,
  } as ConversationWithMessages;
}

/**
 * Get all conversations (without messages for list view performance)
 * @param db Drizzle ORM instance
 * @returns Array of conversations ordered by updated_at DESC
 */
export async function getAllConversations(
  db: BetterSQLite3Database<typeof schema>
): Promise<Conversation[]> {
  const allConversations = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updated_at));

  return allConversations as Conversation[];
}

/**
 * Delete a conversation (cascades to messages and citations)
 * @param id Conversation ID
 * @param db Drizzle ORM instance
 * @returns void
 */
export async function deleteConversation(
  id: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<void> {
  await db.delete(conversations).where(eq(conversations.id, id));
}

/**
 * Update conversation title
 * @param id Conversation ID
 * @param title New title
 * @param db Drizzle ORM instance
 * @returns Updated conversation
 */
export async function updateConversationTitle(
  id: string,
  title: string,
  db: BetterSQLite3Database<typeof schema>
): Promise<Conversation> {
  const now = new Date();

  const [updated] = await db
    .update(conversations)
    .set({
      title,
      updated_at: now,
    })
    .where(eq(conversations.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Conversation with id ${id} not found`);
  }

  return updated as Conversation;
}
