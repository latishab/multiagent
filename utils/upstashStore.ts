import { Redis } from '@upstash/redis';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ConversationHistory {
  messages: Message[];
  lastUpdated: number;
}

class UpstashStore {
  private static instance: UpstashStore;
  private client: Redis;

  private constructor() {
    this.client = new Redis({
      url: process.env.KV_REST_API_URL || '',
      token: process.env.KV_REST_API_TOKEN || ''
    });
  }

  public static getInstance(): UpstashStore {
    if (!UpstashStore.instance) {
      UpstashStore.instance = new UpstashStore();
    }
    return UpstashStore.instance;
  }

  public getConversationKey(npcId: number, round: number, sessionId?: string): string {
    // Special handling for The Guide (npcId: -1) - preserve conversation across rounds
    if (npcId === -1) {
      if (sessionId) {
        return `guide_session_${sessionId}`;
      }
      return 'guide';
    }
    
    if (sessionId) {
      return `npc_${npcId}_round_${round}_session_${sessionId}`;
    }
    return `npc_${npcId}_round_${round}`;
  }

  public async getConversationHistory(npcId: number, round: number, sessionId?: string): Promise<Message[]> {
    const key = this.getConversationKey(npcId, round, sessionId);
    
    try {
      const history = await this.client.get<ConversationHistory>(key);
      const messages = history?.messages || [];
      
      console.log('Getting conversation history from Upstash:', {
        key,
        npcId,
        round,
        sessionId,
        messageCount: messages.length,
        messages: messages.map(msg => ({ role: msg.role, content: msg.content.slice(0, 50) + '...' }))
      });
      
      return messages;
    } catch (error) {
      console.error('Error getting conversation history from Upstash:', error);
      return [];
    }
  }

  public async addToConversationHistory(npcId: number, round: number, message: Message, sessionId?: string): Promise<void> {
    const key = this.getConversationKey(npcId, round, sessionId);
    
    try {
      // Get existing history
      const existingHistory = await this.client.get<ConversationHistory>(key) || { messages: [], lastUpdated: Date.now() };
      
      // Add new message
      existingHistory.messages.push(message);
      existingHistory.lastUpdated = Date.now();
      
      // Save back to Upstash
      await this.client.set(key, existingHistory);

      console.log('Added to conversation history in Upstash:', {
        key,
        npcId,
        round,
        sessionId,
        messageRole: message.role,
        messageContent: message.content.slice(0, 50) + '...',
        totalMessages: existingHistory.messages.length,
        isGuide: npcId === -1
      });
    } catch (error) {
      console.error('Error adding to conversation history in Upstash:', error);
    }
  }

  public async clearConversationHistory(npcId: number, round: number, sessionId?: string): Promise<void> {
    const key = this.getConversationKey(npcId, round, sessionId);
    
    try {
      await this.client.del(key);
      console.log('Cleared conversation history in Upstash:', { key, npcId, round, sessionId });
    } catch (error) {
      console.error('Error clearing conversation history in Upstash:', error);
    }
  }
}

export const upstashStore = UpstashStore.getInstance(); 