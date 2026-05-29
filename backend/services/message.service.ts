/**
 * Message service - handles message CRUD operations
 */

import { eq } from 'drizzle-orm';
import { getORM } from '../database/connection.js';
import { messages } from '../database/schema.js';
import { randomUUID } from 'crypto';

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider_id?: string;
  model?: string;
  created_at: Date;
}

export async function createMessage(data: {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider_id?: string;
  model?: string;
}): Promise<Message> {
  const db = await getORM();

  const message: Message = {
    id: randomUUID(),
    conversation_id: data.conversation_id,
    role: data.role,
    content: data.content,
    provider_id: data.provider_id,
    model: data.model,
    created_at: new Date(),
  };

  await db.insert(messages).values(message);

  return message;
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const db = await getORM();

  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(messages.created_at);

  return result as Message[];
}

export async function deleteMessage(id: string): Promise<void> {
  const db = await getORM();
  await db.delete(messages).where(eq(messages.id, id));
}
