import { Pinecone } from '@pinecone-database/pinecone';

class VectorStore {
  private static instance: VectorStore;
  private pinecone: Pinecone;
  private index: any;
  private readonly indexName = 'multiagent';

  private constructor() {
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

  // Store text in Pinecone with automatic embedding
  public async storeMemory(id: string, text: string, metadata: any = {}) {
    await this.index.upsertRecords([{
      id,
      text,
      npcId: metadata.npcId.toString(),
      round: metadata.round.toString(),
      type: metadata.type,
      sessionId: metadata.sessionId || 'default'
    }]);
  }

  // Query similar memories for a specific NPC and session
  public async querySimilar(text: string, npcId: number, topK: number = 5, sessionId?: string) {
    const filter: any = {
      npcId: npcId.toString()
    };
    
    if (sessionId) {
      filter.sessionId = sessionId;
    }
    
    const results = await this.index.searchRecords({
      query: {
        topK,
        inputs: { text },
        filter
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