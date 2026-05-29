import { eq, desc } from 'drizzle-orm';
import { conversations, messages, citations } from '../database/schema.js';
export async function createConversation(data, db) {
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
    return conversation;
}
export async function addMessage(data, db) {
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
    await db
        .update(conversations)
        .set({ updated_at: now })
        .where(eq(conversations.id, data.conversation_id));
    return message;
}
export async function addCitations(citationData, db) {
    if (citationData.length === 0)
        return [];
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
    return inserted;
}
export async function getConversation(id, db) {
    const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);
    if (!conversation)
        return null;
    const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversation_id, id))
        .orderBy(messages.created_at);
    const messageIds = conversationMessages.map((m) => m.id);
    let allCitations = [];
    if (messageIds.length > 0) {
        allCitations = await db
            .select()
            .from(citations)
            .where(eq(citations.message_id, messageIds[0]));
        for (let i = 1; i < messageIds.length; i++) {
            const moreCitations = await db
                .select()
                .from(citations)
                .where(eq(citations.message_id, messageIds[i]));
            allCitations.push(...moreCitations);
        }
    }
    const citationsByMessage = new Map();
    for (const citation of allCitations) {
        if (!citationsByMessage.has(citation.message_id)) {
            citationsByMessage.set(citation.message_id, []);
        }
        citationsByMessage.get(citation.message_id).push(citation);
    }
    const messagesWithCitations = conversationMessages.map((msg) => ({
        ...msg,
        citations: citationsByMessage.get(msg.id) || [],
    }));
    return {
        ...conversation,
        messages: messagesWithCitations,
    };
}
export async function getAllConversations(db) {
    const allConversations = await db
        .select()
        .from(conversations)
        .orderBy(desc(conversations.updated_at));
    return allConversations;
}
export async function deleteConversation(id, db) {
    await db.delete(conversations).where(eq(conversations.id, id));
}
export async function updateConversationTitle(id, title, db) {
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
    return updated;
}
