import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Conversation storage to database will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Types for conversation data
export interface ConversationRow {
  id?: number;
  session_id: string;
  participant_id?: string;
  npc_id: number;
  round: number;
  message_data: {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: number;
    metadata?: {
      round: number;
      npcId: number;
      sessionId: string;
      npcPreference?: 'sustainable' | 'unsustainable';
      participantId?: string;
    };
  };
  created_at?: string;
  updated_at?: string;
}

// Helper function to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey);
} 