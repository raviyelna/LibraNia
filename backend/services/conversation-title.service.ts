import { AIService } from './ai/ai.service.js';
import { getORM } from '../database/connection.js';
import { conversations } from '../database/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Auto-generate conversation title from first user message
 * Uses AI to create concise 3-5 word summary
 */
export async function autoGenerateTitle(
  conversationId: string,
  firstUserMessage: string,
  providerId: string = 'deepseek'
): Promise<void> {
  try {
    const aiService = new AIService();
    const provider = await aiService.getProvider(providerId);

    // Generate title using AI
    const response = await provider.generateResponse(
      [
        {
          role: 'user',
          content: `Generate a concise 3-5 word title for a conversation that starts with: "${firstUserMessage.substring(0, 200)}". Reply with ONLY the title, no quotes or punctuation.`,
        },
      ],
      {
        model: 'deepseek-chat',
        maxTokens: 20,
        temperature: 0.7,
      },
      () => {} // No streaming callback needed
    );

    const title = response.trim().replace(/^["']|["']$/g, ''); // Remove quotes

    // Update conversation title
    const db = getORM();
    await db
      .update(conversations)
      .set({ title, updated_at: new Date() })
      .where(eq(conversations.id, conversationId));

    console.log(`[Auto-Title] Generated title for ${conversationId}: ${title}`);
  } catch (error) {
    console.error('[Auto-Title] Failed to generate title:', error);
    // Don't throw - title generation is non-critical
  }
}
