import { eq } from 'drizzle-orm';
import { getORM } from '../database/connection';
import { messages } from '../database/schema';
import { randomUUID } from 'crypto';
export async function createMessage(data) {
    const db = await getORM();
    const message = {
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
export async function getMessagesByConversation(conversationId) {
    const db = await getORM();
    const result = await db
        .select()
        .from(messages)
        .where(eq(messages.conversation_id, conversationId))
        .orderBy(messages.created_at);
    return result;
}
export async function deleteMessage(id) {
    const db = await getORM();
    await db.delete(messages).where(eq(messages.id, id));
}
