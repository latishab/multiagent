import { Pinecone } from '@pinecone-database/pinecone';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ConversationHistory {
  messages: Message[];
  lastUpdated: number;
}

class VectorStore {
  private static instance: VectorStore;
  private conversations: Map<string, ConversationHistory>;
  private pinecone: Pinecone;
  private index: any;
  private readonly indexName = 'multiagent';

  private constructor() {
    this.conversations = new Map();
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });

    // Initialize index with integrated embeddings
    this.index = this.pinecone.index(this.indexName).namespace('memory');
  }

  public static getInstance(): VectorStore {
    if (!VectorStore.instance) {
      VectorStore.instance = new VectorStore();
    }
    return VectorStore.instance;
  }

  public getConversationKey(npcId: number, round: number): string {
    return `npc_${npcId}_round_${round}`;
  }

  public getConversationHistory(npcId: number, round: number): Message[] {
    const key = this.getConversationKey(npcId, round);
    return this.conversations.get(key)?.messages || [];
  }

  public addToConversationHistory(npcId: number, round: number, message: Message) {
    const key = this.getConversationKey(npcId, round);
    const history = this.conversations.get(key) || { messages: [], lastUpdated: Date.now() };
    
    history.messages.push(message);
    history.lastUpdated = Date.now();
    
    this.conversations.set(key, history);

    // Cleanup old conversations after 1 hour
    this.cleanupOldConversations();
  }

  private cleanupOldConversations() {
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const now = Date.now();

    Array.from(this.conversations.entries()).forEach(([key, history]) => {
      if (now - history.lastUpdated > oneHour) {
        this.conversations.delete(key);
      }
    });
  }

  public clearConversationHistory(npcId: number, round: number) {
    const key = this.getConversationKey(npcId, round);
    this.conversations.delete(key);
  }

  // Store text in Pinecone with automatic embedding
  public async storeMemory(id: string, text: string, metadata: any = {}) {
    await this.index.upsertRecords([{
      id,
      text,
      npcId: metadata.npcId.toString(),
      round: metadata.round.toString(),
      type: metadata.type
    }]);
  }

  // Query similar memories for a specific NPC
  public async querySimilar(text: string, npcId: number, topK: number = 5) {
    const results = await this.index.searchRecords({
      query: {
        topK,
        inputs: { text },
        filter: {
          npcId: npcId.toString()
        }
      }
    });
    return results.matches;
  }

  // Delete all memories for a specific NPC
  public async deleteNPCMemories(npcId: number) {
    await this.index.deleteRecords({
      filter: {
        npcId: npcId.toString()
      }
    });
  }
}

export const vectorStore = VectorStore.getInstance(); 