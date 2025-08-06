import { upstashStore } from './upstashStore';
import { vectorStore } from './vectorStore';
import { sessionManager } from './sessionManager';
import { getEffectiveRound, validateConversationParams } from './conversationUtils';
import { supabase, isSupabaseConfigured, ConversationRow } from './supabaseClient';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  metadata?: {
    round: number;
    npcId: number;
    sessionId: string;
    isSustainable?: boolean;
  };
}

export interface ConversationSummary {
  npcId: number;
  npcName: string;
  round: number;
  sessionId: string;
  messageCount: number;
  lastUpdated: number;
  isComplete: boolean;
  detectedOpinion?: {
    opinion: string;
    reasoning: string;
  };
  conversationAnalysis?: {
    isComplete: boolean;
    reason: string;
  };
}

export interface PlayerConversationHistory {
  sessionId: string;
  conversations: ConversationSummary[];
  totalMessages: number;
  lastActivity: number;
  roundsCompleted: {
    round1: boolean;
    round2: boolean;
  };
  spokenNPCs: {
    round1: Set<number>;
    round2: Set<number>;
  };
}

export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  roundsCompleted: {
    round1: number;
    round2: number;
  };
  mostActiveNPCs: Array<{
    npcId: number;
    npcName: string;
    conversationCount: number;
    messageCount: number;
  }>;
}

// ============================================================================
// CONVERSATION STORAGE CLASS
// ============================================================================

class ConversationStorage {
  private static instance: ConversationStorage;

  private constructor() {}

  public static getInstance(): ConversationStorage {
    if (!ConversationStorage.instance) {
      ConversationStorage.instance = new ConversationStorage();
    }
    return ConversationStorage.instance;
  }

  // ============================================================================
  // CORE CONVERSATION MANAGEMENT
  // ============================================================================

  /**
   * Store a new message in the conversation history (Primarily for Upstash/Pinecone now)
   * The main API handler is now responsible for batching turns into Supabase.
   */
  async storeMessage(
    npcId: number,
    round: number,
    message: ConversationMessage,
    sessionId?: string
  ): Promise<void> {
    try {
      const currentSessionId = sessionId || await sessionManager.getSessionId();
      const effectiveRound = getEffectiveRound(npcId, round);
      
      // Add timestamp if not provided
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }

      // Add metadata if not provided
      if (!message.metadata) {
        message.metadata = {
          round: effectiveRound,
          npcId,
          sessionId: currentSessionId
        };
      }

      // Store in Upstash (short-term memory)
      await upstashStore.addToConversationHistory(
        npcId, 
        effectiveRound, 
        {
          role: message.role,
          content: message.content
        }, 
        currentSessionId
      );

      // Store in Pinecone for long-term memory (only user and assistant messages)
      if (message.role !== 'system') {
        const messageId = `${npcId}_${effectiveRound}_${message.timestamp}`;
        await vectorStore.storeMemory(messageId, message.content, {
          npcId: npcId.toString(),
          round: effectiveRound.toString(),
          type: message.role === 'user' ? 'user_message' : 'assistant_response',
          sessionId: currentSessionId,
          timestamp: message.timestamp.toString()
        });
      }

    } catch (error) {
      console.error('Error storing message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a specific NPC and round
   */
  async getConversationHistory(
    npcId: number,
    round: number,
    sessionId?: string
  ): Promise<ConversationMessage[]> {
    try {
      const currentSessionId = sessionId || await sessionManager.getSessionId();
      const effectiveRound = getEffectiveRound(npcId, round);
      
      const history = await upstashStore.getConversationHistory(
        npcId, 
        effectiveRound, 
        currentSessionId
      );

      // Convert to ConversationMessage format
      return history.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: Date.now(), // Upstash doesn't store timestamps, so use current time
        metadata: {
          round: effectiveRound,
          npcId,
          sessionId: currentSessionId
        }
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Get all conversations for a session
   */
  async getAllConversations(sessionId?: string): Promise<PlayerConversationHistory> {
    try {
      const currentSessionId = sessionId || await sessionManager.getSessionId();
      
      // Get all NPCs (1-6 plus main NPC -1)
      const npcIds = [-1, 1, 2, 3, 4, 5, 6];
      const rounds = [1, 2];
      
      const conversations: ConversationSummary[] = [];
      let totalMessages = 0;
      const spokenNPCs = { round1: new Set<number>(), round2: new Set<number>() };
      
      for (const npcId of npcIds) {
        for (const round of rounds) {
          const effectiveRound = getEffectiveRound(npcId, round);
          const history = await upstashStore.getConversationHistory(
            npcId, 
            effectiveRound, 
            currentSessionId
          );
          
          if (history.length > 0) {
            // Get NPC name
            const npcName = this.getNPCName(npcId);
            
            // Check if conversation is complete (has assistant messages)
            const assistantMessages = history.filter((msg: any) => msg.role === 'assistant');
            const isComplete = assistantMessages.length > 0;
            
            // Track spoken NPCs
            if (isComplete && npcId !== -1) {
              if (round === 1) {
                spokenNPCs.round1.add(npcId);
              } else if (round === 2) {
                spokenNPCs.round2.add(npcId);
              }
            }
            
            conversations.push({
              npcId,
              npcName,
              round: effectiveRound,
              sessionId: currentSessionId,
              messageCount: history.length,
              lastUpdated: Date.now(), // Upstash doesn't store timestamps
              isComplete
            });
            
            totalMessages += history.length;
          }
        }
      }
      
      // Determine rounds completed
      const roundsCompleted = {
        round1: spokenNPCs.round1.size >= 6,
        round2: spokenNPCs.round2.size >= 6
      };
      
      return {
        sessionId: currentSessionId,
        conversations,
        totalMessages,
        lastActivity: Date.now(),
        roundsCompleted,
        spokenNPCs
      };
    } catch (error) {
      console.error('Error getting all conversations:', error);
      return {
        sessionId: sessionId || '',
        conversations: [],
        totalMessages: 0,
        lastActivity: Date.now(),
        roundsCompleted: { round1: false, round2: false },
        spokenNPCs: { round1: new Set(), round2: new Set() }
      };
    }
  }

  /**
   * Get conversation statistics for analytics
   */
  async getConversationStats(sessionId?: string): Promise<ConversationStats> {
    try {
      const history = await this.getAllConversations(sessionId);
      
      // Calculate stats
      const totalConversations = history.conversations.length;
      const totalMessages = history.totalMessages;
      const averageMessagesPerConversation = totalConversations > 0 
        ? totalMessages / totalConversations 
        : 0;
      
      // Count rounds completed
      const roundsCompleted = {
        round1: history.roundsCompleted.round1 ? 1 : 0,
        round2: history.roundsCompleted.round2 ? 1 : 0
      };
      
      // Find most active NPCs
      const npcActivity = new Map<number, { npcName: string; conversationCount: number; messageCount: number }>();
      
      history.conversations.forEach(conv => {
        if (conv.npcId !== -1) { // Exclude main NPC from stats
          const existing = npcActivity.get(conv.npcId) || {
            npcName: conv.npcName,
            conversationCount: 0,
            messageCount: 0
          };
          
          existing.conversationCount++;
          existing.messageCount += conv.messageCount;
          npcActivity.set(conv.npcId, existing);
        }
      });
      
      const mostActiveNPCs = Array.from(npcActivity.entries())
        .map(([npcId, data]) => ({
          npcId,
          npcName: data.npcName,
          conversationCount: data.conversationCount,
          messageCount: data.messageCount
        }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 5);
      
      return {
        totalConversations,
        totalMessages,
        averageMessagesPerConversation,
        roundsCompleted,
        mostActiveNPCs
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        averageMessagesPerConversation: 0,
        roundsCompleted: { round1: 0, round2: 0 },
        mostActiveNPCs: []
      };
    }
  }

  /**
   * Clear conversation history for a specific NPC and round
   */
  async clearConversation(
    npcId: number,
    round: number,
    sessionId?: string
  ): Promise<void> {
    try {
      const currentSessionId = sessionId || await sessionManager.getSessionId();
      const effectiveRound = getEffectiveRound(npcId, round);
      
      await upstashStore.clearConversationHistory(
        npcId, 
        effectiveRound, 
        currentSessionId
      );
      
    } catch (error) {
      console.error('Error clearing conversation:', error);
      throw error;
    }
  }

  /**
   * Clear all conversations for a session
   */
  async clearAllConversations(sessionId?: string): Promise<void> {
    try {
      const currentSessionId = sessionId || await sessionManager.getSessionId();
      
      // Get all conversations and clear them
      const history = await this.getAllConversations(currentSessionId);
      
      for (const conversation of history.conversations) {
        await this.clearConversation(
          conversation.npcId,
          conversation.round,
          currentSessionId
        );
      }
      
    } catch (error) {
      console.error('Error clearing all conversations:', error);
      throw error;
    }
  }

  /**
   * Handle new game - clear all conversations and reset session
   */
  async handleNewGame(sessionId?: string): Promise<void> {
    try {
      const currentSessionId = sessionId || await sessionManager.getSessionId();
      await this.clearAllConversations(currentSessionId);
      sessionManager.clearSessionOnly();
    } catch (error) {
      console.error('Error handling new game:', error);
      throw error;
    }
  }

  // ============================================================================
  // CONVERSATION ANALYSIS AND UTILITIES
  // ============================================================================

  /**
   * Check if a conversation is complete based on analysis
   */
  async isConversationComplete(
    npcId: number,
    round: number,
    sessionId?: string
  ): Promise<{ isComplete: boolean; reason: string }> {
    try {
      const history = await this.getConversationHistory(npcId, round, sessionId);
      
      // For The Guide, always consider complete
      if (npcId === -1) {
        return { isComplete: true, reason: 'Main NPC conversation' };
      }
      
      // For regular NPCs, check if they have assistant messages
      const assistantMessages = history.filter(msg => msg.role === 'assistant');
      const isComplete = assistantMessages.length > 0;
      
      return {
        isComplete,
        reason: isComplete 
          ? 'NPC has responded to player' 
          : 'No NPC responses yet'
      };
    } catch (error) {
      console.error('Error checking conversation completeness:', error);
      return { isComplete: false, reason: 'Error checking completeness' };
    }
  }

  /**
   * Get conversation context for AI responses
   */
  async getConversationContext(
    message: string,
    npcId: number,
    sessionId?: string
  ): Promise<string> {
    try {
      const currentSessionId = sessionId || await sessionManager.getSessionId();
      
      // Get similar messages from Pinecone
      const similarMessages = await vectorStore.querySimilar(
        message, 
        npcId, 
        3, 
        currentSessionId
      );
      
      if (similarMessages && similarMessages.length > 0) {
        // Filter out introduction messages
        const filteredMessages = similarMessages.filter((match: any) => 
          !match.text.toLowerCase().includes('i\'m') && 
          !match.text.toLowerCase().includes('i am') &&
          !match.text.toLowerCase().includes('my name is')
        );
        
        if (filteredMessages.length > 0) {
          return `\nRelevant context from previous conversations:\n${
            filteredMessages
              .map((match: any) => match.text)
              .join('\n')
          }`;
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return '';
    }
  }

  /**
   * Export conversation data for analysis
   */
  async exportConversationData(sessionId?: string): Promise<any> {
    try {
      const history = await this.getAllConversations(sessionId);
      const stats = await this.getConversationStats(sessionId);
      
      return {
        sessionId: history.sessionId,
        exportTimestamp: Date.now(),
        conversationHistory: history,
        statistics: stats,
        metadata: {
          totalNPCs: 7, // 6 regular NPCs + 1 main NPC
          maxRounds: 2,
          sessionManager: sessionManager.getSessionInfo()
        }
      };
    } catch (error) {
      console.error('Error exporting conversation data:', error);
      throw error;
    }
  }

  /**
   * Get conversation data from Supabase for research
   */
  async getConversationsFromDatabase(
    sessionId?: string,
    npcId?: number,
    round?: number,
    limit: number = 1000
  ): Promise<ConversationRow[]> {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, cannot retrieve conversation data');
        return [];
      }

      let query = supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      if (npcId !== undefined) {
        query = query.eq('npc_id', npcId);
      }

      if (round !== undefined) {
        query = query.eq('round', round);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching conversations from database:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting conversations from database:', error);
      return [];
    }
  }

  /**
   * Get conversation statistics from database
   */
  async getDatabaseStats(): Promise<any> {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, cannot retrieve database stats');
        return null;
      }

      // Get total conversations
      const { count: totalConversations, error: countError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error getting total conversations:', countError);
        return null;
      }

      // Get unique sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('conversations')
        .select('session_id')
        .order('session_id');

      if (sessionsError) {
        console.error('Error getting sessions:', sessionsError);
        return null;
      }

      const uniqueSessions = new Set(sessions?.map(row => row.session_id) || []);

      // Get conversations by NPC (using a simpler approach)
      const { data: allConversations, error: npcError } = await supabase
        .from('conversations')
        .select('npc_id')
        .order('npc_id');

      if (npcError) {
        console.error('Error getting NPC stats:', npcError);
        return null;
      }

      // Count conversations by NPC
      const npcStats = allConversations?.reduce((acc: any, row) => {
        const npcId = row.npc_id;
        acc[npcId] = (acc[npcId] || 0) + 1;
        return acc;
      }, {}) || {};

      if (npcError) {
        console.error('Error getting NPC stats:', npcError);
        return null;
      }

      return {
        totalConversations,
        uniqueSessions: uniqueSessions.size,
        npcStats: npcStats || [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get NPC name by ID
   */
  private getNPCName(npcId: number): string {
    const npcNames: { [key: number]: string } = {
      [-1]: 'The Guide',
      [1]: 'Mr. Aria',
      [2]: 'Chief Oskar',
      [3]: 'Ms. Moss',
      [4]: 'Mr. Dai',
      [5]: 'Ms. Kira',
      [6]: 'Mrs. Han'
    };
    
    return npcNames[npcId] || `NPC ${npcId}`;
  }

  /**
   * Validate conversation parameters
   */
  validateConversationParams(
    npcId: number,
    round: number,
    sessionId: string
  ): boolean {
    return validateConversationParams(npcId, round, sessionId);
  }

  /**
   * Get effective round for conversation storage
   */
  getEffectiveRound(npcId: number, round: number): number {
    return getEffectiveRound(npcId, round);
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const conversationStorage = ConversationStorage.getInstance(); 