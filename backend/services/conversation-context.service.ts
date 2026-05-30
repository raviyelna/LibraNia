import { AIService } from './ai/ai.service.js';
import { getORM } from '../database/connection.js';
import { conversations } from '../database/schema.js';
import { eq } from 'drizzle-orm';
import { getMessagesByConversation } from './message.service.js';

/**
 * Generate context summary for conversation continuity
 * Hidden from user, used by LLM to understand conversation context
 */
export async function generateContextSummary(
  conversationId: string,
  providerId: string = 'deepseek'
): Promise<void> {
  try {
    const messages = await getMessagesByConversation(conversationId);

    // Only generate summary if conversation has at least 2 messages
    if (messages.length < 2) return;

    // Get last 6 messages for context (3 exchanges)
    const recentMessages = messages.slice(-6);
    const conversationText = recentMessages
      .map(m => `${m.role}: ${m.content.substring(0, 500)}`)
      .join('\n\n');

    const aiService = new AIService();
    const provider = await aiService.getProvider(providerId);

    // Generate summary
    const summary = await provider.generateResponse(
      [
        {
          role: 'user',
          content: `Summarize this conversation in 2-3 sentences. Focus on: main topic, key concepts discussed, and current direction. Be concise and factual.\n\nConversation:\n${conversationText}`,
        },
      ],
      {
        model: 'deepseek-chat',
        maxTokens: 150,
        temperature: 0.3,
      },
      () => {} // No streaming
    );

    // Update conversation with summary
    const db = getORM();
    await db
      .update(conversations)
      .set({
        context_summary: summary.trim(),
        updated_at: new Date()
      })
      .where(eq(conversations.id, conversationId));

    console.log(`[Context] Generated summary for ${conversationId}: ${summary.substring(0, 100)}...`);
  } catch (error) {
    console.error('[Context] Failed to generate summary:', error);
    // Don't throw - summary generation is non-critical
  }
}

/**
 * Get context summary for conversation
 */
export async function getContextSummary(conversationId: string): Promise<string | null> {
  try {
    const db = getORM();
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    return conv?.context_summary || null;
  } catch (error) {
    console.error('[Context] Failed to get summary:', error);
    return null;
  }
}
