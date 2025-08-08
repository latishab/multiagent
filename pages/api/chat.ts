import { NextApiRequest, NextApiResponse } from 'next';
import { vectorStore } from '../../utils/vectorStore';
import { upstashStore } from '../../utils/upstashStore';
import { NPCData, getSystemPrompt } from '../../utils/prompts';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';
import { generateNPCPreferences } from '../../utils/npcData';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NPCOptions {
  sustainable: string;
  unsustainable: string;
}

interface NPCInfo {
  name: string;
  career: string;
  system: string;
  personality: string;
  communicationStyle: string;
  workPhilosophy: string;
  options: NPCOptions;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PineconeMatch {
  id: string;
  score: number;
  text: string;
  metadata: {
    npcId: string;
    round: string;
    type: 'user_message' | 'assistant_response';
    npcPreference?: 'sustainable' | 'unsustainable';
    participantId?: string;
  };
}

interface ConversationAnalysis {
  isComplete: boolean;
  reason: string;
}

interface GuideAnalysis {
  response: string;
  shouldAdvanceRound?: boolean;
  shouldOpenPDA?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Stores a conversation turn (user + assistant messages) in Supabase
 */
async function storeConversationTurn(
  sessionId: string,
  npcId: number,
  round: number,
  turnMessages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>,
  participantId?: string
) {
  if (!isSupabaseConfigured()) return;

  // Get NPC's preference from cached preferences if participantId is available
  let npcPreference: 'sustainable' | 'unsustainable' | null = null;
  if (participantId && npcId > 0) { // Skip for The Guide (npcId: -1)
    try {
      const preferences = generateNPCPreferences(participantId); // This uses cached preferences
      npcPreference = preferences[npcId] || null;
    } catch (error) {
      console.error('Error getting NPC preferences from cache:', error);
    }
  }

  // Add metadata to each message
  const messagesWithMetadata = turnMessages.map(msg => ({
    ...msg,
    metadata: {
      npcId,
      round,
      sessionId,
      npcPreference,
      participantId
    }
  }));

  try {
    await storeConversationTurnFallback(sessionId, npcId, round, messagesWithMetadata, participantId);
  } catch (e) {
    console.error('Exception in storeConversationTurn:', e);
  }
}

/**
 * Fallback method for storing conversation turns when RPC is not available
 */
async function storeConversationTurnFallback(
  sessionId: string,
  npcId: number,
  round: number,
  turnMessages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number; metadata?: any }>,
  participantId?: string
) {
  try {
    const { data: existingConversation, error: fetchError } = await supabase
      .from('conversations')
      .select('messages')
      .eq('session_id', sessionId)
      .eq('npc_id', npcId)
      .eq('round', round)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing conversation:', fetchError);
      return;
    }

    if (existingConversation) {
      const updatedMessages = [...(existingConversation.messages || []), ...turnMessages];
      
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
          participant_id: participantId || null
        })
        .eq('session_id', sessionId)
        .eq('npc_id', npcId)
        .eq('round', round);

      if (updateError) {
        console.error('Error updating conversation:', updateError);
      } 
    } else {
      const { error: insertError } = await supabase
        .from('conversations')
        .insert({
          session_id: sessionId,
          participant_id: participantId || null,
          npc_id: npcId,
          round: round,
          messages: turnMessages
        });

      if (insertError) {
        console.error('Error inserting new conversation:', insertError);
      } 
    }
  } catch (e) {
    console.error('Exception in storeConversationTurnFallback:', e);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Cleans up incomplete responses by removing trailing incomplete sentences
 */
function cleanIncompleteResponse(response: string): string {
  let cleanedResponse = response.trim();
  
  if (cleanedResponse && !cleanedResponse.match(/[.!?]$/)) {
    const sentences = cleanedResponse.split(/(?<=[.!?])\s+/);
    
    if (sentences.length > 1) {
      cleanedResponse = sentences.slice(0, -1).join(' ').trim();
    } else {
      const words = cleanedResponse.split(' ');
      if (words.length > 2) {
        words.pop();
        cleanedResponse = words.join(' ') + '.';
      } else {
        cleanedResponse += '.';
      }
    }
  }
  
  return cleanedResponse;
}

/**
 * Detects if an NPC has revealed their opinion in Round 2
 */
function detectNPCOpinion(response: string, npc: NPCInfo): { opinion: string; reasoning: string } | null {
  const responseLower = response.toLowerCase();
  const sustainableOption = npc.options.sustainable.toLowerCase();
  const unsustainableOption = npc.options.unsustainable.toLowerCase();
  
  const opinionIndicators = [
    'i support', 'i prefer', 'i recommend', 'i believe', 'i think we should',
    'i would choose', 'i favor', 'i advocate for', 'i suggest', 'i recommend we',
    'we should go with', 'the better option is', 'the best choice is',
    'i would go with', 'i lean toward', 'i\'m in favor of', 'i\'m for',
    'i\'m supporting', 'i\'m choosing', 'i\'m recommending'
  ];
  
  const hasOpinionIndicator = opinionIndicators.some(indicator => 
    responseLower.includes(indicator)
  );
  
  if (!hasOpinionIndicator) {
    return null;
  }
  
  const supportsSustainable = responseLower.includes(sustainableOption);
  const supportsUnsustainable = responseLower.includes(unsustainableOption);
  
  if (supportsSustainable && !supportsUnsustainable) {
    return {
      opinion: npc.options.sustainable,
      reasoning: response
    };
  } else if (supportsUnsustainable && !supportsSustainable) {
    return {
      opinion: npc.options.unsustainable,
      reasoning: response
    };
  }
  
  return null;
}

// ============================================================================
// CONVERSATION ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyzes conversation context and progress for The Guide NPC
 */
async function analyzeGuideConversation(
  message: string, 
  round: number, 
  conversationHistory: Message[],
  spokenNPCs: { round1: number[]; round2: number[] }
): Promise<GuideAnalysis> {
  
  const round1Complete = spokenNPCs.round1.length === 6;
  const round2Complete = spokenNPCs.round2.length === 6;
  
  if (round === 1 && round1Complete) {
    return {
      response: "Great! You've learned about all the systems. Now let's move to Round 2 where you'll discover what each specialist thinks about their options.",
      shouldAdvanceRound: false  
    };
  } else if (round === 2 && round2Complete) {
    return {
      response: "Perfect! You've gathered all the information you need. Now it's time to make your final decisions. Check your PDA to review all systems and make your choices.",
      shouldOpenPDA: true
    };
  } else if (round === 2 && !round2Complete) {
    return {
      response: "You're making good progress in Round 2! Continue talking to the specialists to get their recommendations. You need to consult all 6 specialists before making final decisions."
    };
  } else if (round === 1 && !round1Complete) {
    return {
      response: "Perfect! I can see you're ready to begin your mission. The 6 specialists are waiting for you throughout the facility. Each one will teach you about their system and the available options. Once you've learned from all of them, come back and I'll help you move to the next phase. Good luck!"
    };
  } else {
    return {
      response: "Welcome! I'm Michael, your guide for this recovery mission. You'll need to consult with all 6 specialists in the facility to learn about their systems and the available options. Each specialist has valuable knowledge that will help you make informed decisions. Once you've spoken with everyone, come back and I'll help you move forward. You can start by approaching any of the specialists you see in the facility."
    };
  }
}

/**
 * Analyzes conversation completeness for regular NPCs
 */
async function analyzeConversationCompleteness(
  conversationHistory: Message[], 
  npc: NPCInfo, 
  round: number
): Promise<ConversationAnalysis> {
  const conversationText = conversationHistory
    .filter(msg => msg.role === 'assistant')
    .map(msg => msg.content)
    .join('\n');
  
  const conversationLower = conversationText.toLowerCase();
  const hasName = conversationLower.includes(npc.name.toLowerCase()) || 
                  conversationLower.includes('mr.') || 
                  conversationLower.includes('ms.') || 
                  conversationLower.includes('miss') || 
                  conversationLower.includes('chief');
  const hasSystem = conversationLower.includes(npc.system.toLowerCase());
  const hasSustainable = conversationLower.includes(npc.options.sustainable.toLowerCase());
  const hasUnsustainable = conversationLower.includes(npc.options.unsustainable.toLowerCase());

  const round1Block = `Round 1 Requirements:
- NPC should explain their system (${npc.system})
- NPC should mention both options: ${npc.options.sustainable} and ${npc.options.unsustainable}
- NPC should explain what at least ONE option does (how it works, what it means)
- Conversation should be friendly and informative
- CRITICAL: NPC should NOT give recommendations or opinions in Round 1

IMPORTANT (Round 1):
- The conversation is COMPLETE if:
  1) NPC explained their system (${npc.system})
  2) NPC mentioned both options (${npc.options.sustainable} and ${npc.options.unsustainable})
  3) NPC explained what at least ONE option actually does
- If the NPC gave a recommendation in Round 1 (which they shouldn't), still mark the conversation as COMPLETE if the player learned the system and options.

Examples (Round 1):
- "COMPLETE: NPC explained system, mentioned both options, and explained how ${npc.options.sustainable} works"
- "INCOMPLETE: NPC didn't mention ${npc.options.unsustainable}"
- "INCOMPLETE: NPC mentioned options but didn't explain what either does"`;

  const round2Block = `Round 2 Requirements:
- NPC must clearly state a recommendation between ${npc.options.sustainable} and ${npc.options.unsustainable}
- NPC should give at least one concrete reason for their choice

IMPORTANT (Round 2):
- The conversation is COMPLETE if a clear recommendation is present with some reasoning (even brief)
- The recommendation may be for either option; avoid bias toward ${npc.options.sustainable}
- If the recommendation is ambiguous or missing, mark as INCOMPLETE

Examples (Round 2):
- "COMPLETE: NPC recommended ${npc.options.unsustainable} with reasoning about jobs and tax revenue"
- "COMPLETE: NPC recommended ${npc.options.sustainable} due to long-term resilience"
- "INCOMPLETE: NPC discussed trade-offs but did not clearly choose an option"`;

  const analysisPrompt = `Analyze this FULL conversation with ${npc.name} (${npc.career}) about the ${npc.system} system.

${round === 1 ? round1Block : round2Block}

FULL CONVERSATION HISTORY:
${conversationText}

Look through ALL the NPC's responses, not just the latest one. The information can be spread across multiple responses.

Respond with ONLY: "COMPLETE: [brief reason]" or "INCOMPLETE: [what's missing]"`;

  try {
    const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.1,
        max_tokens: 100,
        top_p: 1
      })
    });

    if (!response.ok) {
    console.error('LLM Analysis API call failed:', {
      status: response.status,
      statusText: response.statusText
    });
      return { isComplete: false, reason: 'Analysis failed' };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content?.trim();
    
    if (!analysis) {
      console.error('LLM Analysis API returned empty response');
      return { isComplete: false, reason: 'No analysis response' };
    }

    const isComplete = analysis.startsWith('COMPLETE:');
    const reason = analysis.includes(':') ? analysis.split(':')[1]?.trim() || 'Unknown' : analysis;

    console.log('Analysis result for', npc.name, ':', { isComplete, reason, analysis });

    return { isComplete, reason };
  } catch (error) {
    console.error('LLM Analysis API error:', error instanceof Error ? error.message : String(error));
    return { isComplete: false, reason: 'Analysis error' };
  }
}

// ============================================================================
// CONVERSATION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Handles conversation history management and system prompt setup
 */
async function setupConversationHistory(npcId: number, round: number, sessionId: string, npc: NPCInfo, isSustainable: boolean, participantId?: string): Promise<void> {
  const history = await upstashStore.getConversationHistory(npcId, round, sessionId);

  if (history.length === 0) {
    const systemPrompt = getSystemPrompt(npc, round, isSustainable, participantId);
    await upstashStore.addToConversationHistory(npcId, round, {
      role: 'system',
      content: systemPrompt
    }, sessionId);
  } else {
    const hasSystemMessage = history.some((msg: any) => msg.role === 'system');
    if (!hasSystemMessage) {
      const systemPrompt = getSystemPrompt(npc, round, isSustainable, participantId);
      await upstashStore.addToConversationHistory(npcId, round, {
        role: 'system',
        content: systemPrompt
      }, sessionId);
    }
  }
}

/**
 * Adds context from similar conversations to enhance NPC responses
 */
async function addConversationContext(
  updatedHistory: Message[], 
  message: string, 
  npcId: number, 
  sessionId: string
): Promise<string> {
  let contextPrompt = '';
  
  if (updatedHistory.length > 2) {
    const similarMessages = await vectorStore.querySimilar(message, npcId, 2, sessionId) as PineconeMatch[];
    
    if (similarMessages && similarMessages.length > 0) {
      const filteredMessages = similarMessages.filter(match => 
        !match.text.toLowerCase().includes('i\'m') && 
        !match.text.toLowerCase().includes('i am') &&
        !match.text.toLowerCase().includes('my name is') &&
        !match.text.toLowerCase().includes('i\'m in charge') &&
        !match.text.toLowerCase().includes('i oversee')
      );
      
      if (filteredMessages.length > 0) {
        contextPrompt = `\nRelevant context from your previous conversations:\n${
          filteredMessages
            .map((match: PineconeMatch) => match.text)
            .join('\n')
        }`;
      }
    }

    const systemMessages = updatedHistory.filter((msg: Message) => msg.role === 'system');
    const lastSystemMessage = systemMessages[systemMessages.length - 1];
    if (lastSystemMessage && contextPrompt) {
      lastSystemMessage.content += contextPrompt;
    }
  }
  
  return contextPrompt;
}

/**
 * Handles The Guide NPC conversation logic
 */
async function handleGuideConversation(
  message: string,
  round: number,
  sessionId: string,
  spokenNPCs: { round1: number[]; round2: number[] }
): Promise<any> {
  const effectiveRound = round;
  const history = await upstashStore.getConversationHistory(-1, effectiveRound, sessionId);
  await upstashStore.addToConversationHistory(-1, effectiveRound, { role: 'user', content: message }, sessionId);

  const analysis = await analyzeGuideConversation(message, round, history, spokenNPCs);
  
  await upstashStore.addToConversationHistory(-1, effectiveRound, { role: 'assistant', content: analysis.response }, sessionId);

  await storeConversationTurn(sessionId, -1, effectiveRound, [
    { role: 'user', content: message, timestamp: Date.now() },
    { role: 'assistant', content: analysis.response, timestamp: Date.now() }
  ], undefined); // The Guide doesn't have preferences

  return {
    response: analysis.response,
    detectedOpinion: null,
    conversationAnalysis: {
      isComplete: true,
      reason: 'Main NPC response',
      shouldAdvanceRound: analysis.shouldAdvanceRound,
      shouldOpenPDA: analysis.shouldOpenPDA
    }
  };
}

/**
 * Handles regular NPC conversation logic
 */
async function handleRegularNPCConversation(
  message: string,
  npcId: number,
  round: number,
  sessionId: string,
  npc: NPCInfo,
  isSustainable: boolean,
  participantId?: string
): Promise<any> {
  await setupConversationHistory(npcId, round, sessionId, npc, isSustainable, participantId);
  await upstashStore.addToConversationHistory(npcId, round, { role: 'user', content: message }, sessionId);
  
  const updatedHistory = await upstashStore.getConversationHistory(npcId, round, sessionId);

  const messageId = `${npcId}_${round}_${Date.now()}`;
  
  // Get NPC's preference from cached preferences for vector store metadata
  let npcPreference: 'sustainable' | 'unsustainable' | null = null;
  if (participantId && npcId > 0) {
    try {
      const preferences = generateNPCPreferences(participantId); // This uses cached preferences
      npcPreference = preferences[npcId] || null;
    } catch (error) {
      console.error('Error getting NPC preferences from cache for vector store:', error);
    }
  }
  
  await vectorStore.storeMemory(messageId, message, {
    npcId: npcId.toString(),
    round: round.toString(),
    type: 'user_message',
    sessionId: sessionId || 'default',
    npcPreference: npcPreference || undefined,
    participantId: participantId || undefined
  });

  const contextPrompt = await addConversationContext(updatedHistory, message, npcId, sessionId);

  const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
      messages: updatedHistory,
      temperature: 0.7,
      max_tokens: 200,
      top_p: 1,
      frequency_penalty: 0.5,
      presence_penalty: 0.5
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('LLM API call failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData.error?.message || 'Unknown error'
    });
    throw new Error(errorData.error?.message || 'Failed to get response from DeepInfra');
  }

  const data = await response.json();
  let aiResponse = data.choices?.[0]?.message?.content;
  
  if (!aiResponse) {
    console.error('LLM API returned invalid response format');
    throw new Error('Invalid response format from API');
  }

  const originalResponse = aiResponse;
  aiResponse = cleanIncompleteResponse(aiResponse);

  let detectedOpinion = null;
  if (round === 2) {
    detectedOpinion = detectNPCOpinion(aiResponse, npc);
  }

  const responseId = `${npcId}_${round}_${Date.now()}_response`;
  await vectorStore.storeMemory(responseId, aiResponse, {
    npcId: npcId.toString(),
    round: round.toString(),
    type: 'assistant_response',
    sessionId: sessionId || 'default',
    npcPreference: npcPreference || undefined,
    participantId: participantId || undefined
  });

  await upstashStore.addToConversationHistory(npcId, round, { role: 'assistant', content: aiResponse }, sessionId);

  await storeConversationTurn(sessionId, npcId, round, [
      { role: 'user', content: message, timestamp: Date.now() },
      { role: 'assistant', content: aiResponse, timestamp: Date.now() }
  ], participantId);

  const finalHistory = await upstashStore.getConversationHistory(npcId, round, sessionId);
  let conversationAnalysis = await analyzeConversationCompleteness(finalHistory, npc, round);

  // If we detected a clear recommendation in Round 2 but the analysis
  // incorrectly marked it as incomplete, override to COMPLETE.
  if (round === 2 && detectedOpinion && !conversationAnalysis.isComplete) {
    conversationAnalysis = {
      isComplete: true,
      reason: `NPC clearly recommended ${detectedOpinion.opinion}`
    };
  }

  return {
    response: aiResponse,
    detectedOpinion: detectedOpinion,
    conversationAnalysis: conversationAnalysis
  };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!process.env.DEEPINFRA_API_KEY) {
    console.error('Missing DEEPINFRA_API_KEY environment variable');
    return res.status(500).json({ 
      message: 'Server configuration error: Missing API key',
      error: 'DEEPINFRA_API_KEY not configured'
    });
  }

  if (!process.env.PINECONE_API_KEY) {
    console.error('Missing PINECONE_API_KEY environment variable');
    return res.status(500).json({ 
      message: 'Server configuration error: Missing API key',
      error: 'PINECONE_API_KEY not configured'
    });
  }

  try {
    const { message, npcId, round, isSustainable = true, sessionId, participantId } = req.body;

    if (!message || !npcId || !round) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const npcIdNumber = parseInt(npcId as string);
    
    if (npcIdNumber === -1) {
      const spokenNPCs = req.body.spokenNPCs || { round1: new Set(), round2: new Set() };
      const result = await handleGuideConversation(message, round, sessionId, spokenNPCs);
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return res.status(200).json(result);
    }
    
    const npc = NPCData[npcIdNumber];
    if (!npc) {
      return res.status(400).json({ 
        message: 'Invalid NPC ID', 
        details: `NPC ID ${npcId} (${npcIdNumber}) not found. Available NPCs: ${Object.keys(NPCData).join(', ')}`
      });
    }

    const result = await handleRegularNPCConversation(message, npcId, round, sessionId, npc, isSustainable, participantId);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message || 'Unknown error',
      details: error.toString()
    });
  }
} 