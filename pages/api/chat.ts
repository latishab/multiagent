import { NextApiRequest, NextApiResponse } from 'next';
import { vectorStore } from '../../utils/vectorStore';
import { upstashStore } from '../../utils/upstashStore';
import { NPCData, getSystemPrompt } from '../../utils/prompts';

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
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Cleans up incomplete responses by removing trailing incomplete sentences
 */
function cleanIncompleteResponse(response: string): string {
  let cleanedResponse = response.trim();
  
  // If the response ends with incomplete words (like "what's on your"), clean it up
  if (cleanedResponse && !cleanedResponse.match(/[.!?]$/)) {
    // Find the last complete sentence
    const sentences = cleanedResponse.split(/(?<=[.!?])\s+/);
    
    if (sentences.length > 1) {
      // Keep all complete sentences
      cleanedResponse = sentences.slice(0, -1).join(' ').trim();
    } else {
      // If there's only one sentence and it's incomplete, try to complete it naturally
      const words = cleanedResponse.split(' ');
      if (words.length > 2) {
        // Remove the last incomplete word and add a period
        words.pop();
        cleanedResponse = words.join(' ') + '.';
      } else {
        // If it's very short, just add a period
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
  
  // Check for clear opinion indicators
  const opinionIndicators = [
    'i support', 'i prefer', 'i recommend', 'i believe', 'i think we should',
    'i would choose', 'i favor', 'i advocate for', 'i suggest', 'i recommend we',
    'we should go with', 'the better option is', 'the best choice is',
    'i would go with', 'i lean toward', 'i\'m in favor of', 'i\'m for',
    'i\'m supporting', 'i\'m choosing', 'i\'m recommending'
  ];
  
  // Check if response contains opinion indicators
  const hasOpinionIndicator = opinionIndicators.some(indicator => 
    responseLower.includes(indicator)
  );
  
  if (!hasOpinionIndicator) {
    return null;
  }
  
  // Determine which option they support
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
  
  // Simple fallback-based responses
  if (round === 1 && round1Complete) {
    return {
      response: "Great! You've learned about all the systems. Now let's move to Round 2 where you'll discover what each specialist thinks about their options.",
      shouldAdvanceRound: true
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

  console.log('Analyzing conversation for', npc.name, 'Round', round);
  console.log('Conversation text:', conversationText);
  
  // Debug: Check if key information is present
  const conversationLower = conversationText.toLowerCase();
  const hasName = conversationLower.includes(npc.name.toLowerCase()) || 
                  conversationLower.includes('mr.') || 
                  conversationLower.includes('ms.') || 
                  conversationLower.includes('miss') || 
                  conversationLower.includes('chief');
  const hasSystem = conversationLower.includes(npc.system.toLowerCase());
  const hasSustainable = conversationLower.includes(npc.options.sustainable.toLowerCase());
  const hasUnsustainable = conversationLower.includes(npc.options.unsustainable.toLowerCase());
  
  console.log('Debug - Information found:', {
    hasName,
    hasSystem,
    hasSustainable,
    hasUnsustainable,
    name: npc.name,
    system: npc.system,
    sustainable: npc.options.sustainable,
    unsustainable: npc.options.unsustainable
  });

  const analysisPrompt = `Analyze this FULL conversation with ${npc.name} (${npc.career}) about the ${npc.system} system.

Round ${round} Requirements:
${round === 1 ? 
  `- NPC should explain their system (${npc.system})
- NPC should mention both options: ${npc.options.sustainable} and ${npc.options.unsustainable}
- NPC should explain what at least ONE option does (how it works, what it means)
- Conversation should be friendly and informative
- CRITICAL: NPC should NOT give recommendations or opinions in Round 1` :
  `- NPC should clearly state their recommendation between ${npc.options.sustainable} and ${npc.options.unsustainable}
- NPC should explain their reasoning for their choice
- NPC should use recommendation phrases like "I recommend", "I suggest", "I believe we should"`}

FULL CONVERSATION HISTORY:
${conversationText}

IMPORTANT: For Round 1, check the ENTIRE conversation. The conversation is COMPLETE if:
1. NPC has explained their system (${npc.system})
2. NPC has mentioned both options (${npc.options.sustainable} and ${npc.options.unsustainable})
3. NPC has explained what at least ONE of the options actually does (not just mentioned the name)

CRITICAL: If the NPC gave a recommendation in Round 1 (which they shouldn't), still mark the conversation as COMPLETE since the player cannot undo this. The important thing is that the player learned about the system and options.

Look through ALL the NPC's responses, not just the latest one. The information can be spread across multiple responses.

Determine if this conversation is COMPLETE (has all required information) or INCOMPLETE (missing key information).

Respond with ONLY: "COMPLETE: [brief reason]" or "INCOMPLETE: [what's missing]"

Example responses for Round 1:
- "COMPLETE: NPC explained their system, mentioned both options, and explained what Modular Eco-Pods do"
- "COMPLETE: NPC explained their system, both options, and described how Smart Concrete Complex works"
- "COMPLETE: NPC explained system and options, but also gave a recommendation (conversation is still complete)"
- "INCOMPLETE: NPC mentioned both options but didn't explain what either option actually does"
- "INCOMPLETE: NPC didn't mention the ${npc.options.unsustainable} option"
- "INCOMPLETE: NPC didn't explain their system"

Example responses for Round 2:
- "COMPLETE: NPC clearly recommended ${npc.options.sustainable} with good reasoning"
- "INCOMPLETE: NPC hasn't made a clear recommendation yet"`;

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
      console.error('Analysis API call failed');
      return { isComplete: false, reason: 'Analysis failed' };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content?.trim();
    
    if (!analysis) {
      return { isComplete: false, reason: 'No analysis response' };
    }

    const isComplete = analysis.startsWith('COMPLETE:');
    const reason = analysis.includes(':') ? analysis.split(':')[1]?.trim() || 'Unknown' : analysis;

    console.log('Analysis result for', npc.name, ':', { isComplete, reason, analysis });

    return { isComplete, reason };
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return { isComplete: false, reason: 'Analysis error' };
  }
}

// ============================================================================
// CONVERSATION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Handles conversation history management and system prompt setup
 */
async function setupConversationHistory(npcId: number, round: number, sessionId: string, npc: NPCInfo, isSustainable: boolean): Promise<void> {
  const history = await upstashStore.getConversationHistory(npcId, round, sessionId);

  // Add system prompt to history if it's empty
  if (history.length === 0) {
    const systemPrompt = getSystemPrompt(npc, round, isSustainable);
    await upstashStore.addToConversationHistory(npcId, round, {
      role: 'system',
      content: systemPrompt
    }, sessionId);
  } else {
    // Check if there's already a system message in the history
    const hasSystemMessage = history.some((msg: any) => msg.role === 'system');
    if (!hasSystemMessage) {
      const systemPrompt = getSystemPrompt(npc, round, isSustainable);
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
  
  // Only add context from similar conversations if this is not the first message
  if (updatedHistory.length > 2) { // More than just system + user message
    // Use Pinecone for long-term memory (semantic search)
    const similarMessages = await vectorStore.querySimilar(message, npcId, 2, sessionId) as PineconeMatch[];
    
    if (similarMessages && similarMessages.length > 0) {
      // Filter out introduction-related messages to avoid repetition
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

    // Add context to the last system message if it exists
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
  // Use round 1 for The Guide to preserve conversation across rounds
  const effectiveRound = 1;
  
  // Get conversation history from Upstash (short-term memory)
  const history = await upstashStore.getConversationHistory(-1, effectiveRound, sessionId);
  
  // Add user message to Upstash (short-term memory)
  await upstashStore.addToConversationHistory(-1, effectiveRound, {
    role: 'user',
    content: message
  }, sessionId);
  
  // Analyze conversation with LLM
  const analysis = await analyzeGuideConversation(message, round, history, spokenNPCs);
  
  // Add assistant response to Upstash (short-term memory)
  await upstashStore.addToConversationHistory(-1, effectiveRound, {
    role: 'assistant',
    content: analysis.response
  }, sessionId);
  
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
  isSustainable: boolean
): Promise<any> {
  // Setup conversation history (Redis for short-term memory)
  await setupConversationHistory(npcId, round, sessionId, npc, isSustainable);

  // Add user message to Upstash (short-term memory)
  await upstashStore.addToConversationHistory(npcId, round, {
    role: 'user',
    content: message
  }, sessionId);

  // Get updated history from Upstash (short-term memory)
  const updatedHistory = await upstashStore.getConversationHistory(npcId, round, sessionId);

  // Store the message in Pinecone
  const messageId = `${npcId}_${round}_${Date.now()}`;
  await vectorStore.storeMemory(messageId, message, {
    npcId: npcId.toString(),
    round: round.toString(),
    type: 'user_message',
    sessionId: sessionId || 'default'
  });

  // Add conversation context
  const contextPrompt = await addConversationContext(updatedHistory, message, npcId, sessionId);

  // Log the request
  console.log('Sending request to DeepInfra:', {
    model: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
    npcId,
    npcName: npc.name,
    round,
    sessionId: sessionId || 'default',
    message: message.slice(0, 50) + '...',
    hasContext: contextPrompt.length > 0,
    historyLength: updatedHistory.length,
    historyMessages: updatedHistory.map(msg => ({ role: msg.role, content: msg.content.slice(0, 100) + '...' }))
  });

  // Get AI response
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
    throw new Error(errorData.error?.message || 'Failed to get response from DeepInfra');
  }

  const data = await response.json();
  let aiResponse = data.choices?.[0]?.message?.content;
  
  if (!aiResponse) {
    console.error('Invalid API response format:', data);
    throw new Error('Invalid response format from API');
  }

  // Clean up incomplete responses
  const originalResponse = aiResponse;
  aiResponse = cleanIncompleteResponse(aiResponse);
  
  if (originalResponse !== aiResponse) {
    console.log('Cleaned incomplete response:', {
      original: originalResponse,
      cleaned: aiResponse
    });
  }

  // Detect if NPC revealed their opinion (only in round 2)
  let detectedOpinion = null;
  if (round === 2) {
    detectedOpinion = detectNPCOpinion(aiResponse, npc);
  }

  // Store the AI response in Pinecone
  const responseId = `${npcId}_${round}_${Date.now()}_response`;
  await vectorStore.storeMemory(responseId, aiResponse, {
    npcId: npcId.toString(),
    round: round.toString(),
    type: 'assistant_response',
    sessionId: sessionId || 'default'
  });

  // Add assistant response to Upstash (short-term memory)
  await upstashStore.addToConversationHistory(npcId, round, {
    role: 'assistant',
    content: aiResponse
  }, sessionId);

  // Analyze conversation completeness AFTER adding the current response
  const finalHistory = await upstashStore.getConversationHistory(npcId, round, sessionId);
  const conversationAnalysis = await analyzeConversationCompleteness(finalHistory, npc, round);

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
  console.log('Chat API called:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });

  // Handle CORS preflight requests
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

  // Check for required environment variables
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
    const { message, npcId, round, isSustainable = true, sessionId } = req.body;

    if (!message || !npcId || !round) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Convert string npcId to number for NPCData lookup
    const npcIdNumber = parseInt(npcId as string);
    
    // Special handling for main NPC (The Guide)
    if (npcIdNumber === -1) {
      const spokenNPCs = req.body.spokenNPCs || { round1: new Set(), round2: new Set() };
      const result = await handleGuideConversation(message, round, sessionId, spokenNPCs);
      
      // Set CORS headers for the response
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return res.status(200).json(result);
    }
    
    // Handle regular NPCs
    const npc = NPCData[npcIdNumber];
    if (!npc) {
      return res.status(400).json({ 
        message: 'Invalid NPC ID', 
        details: `NPC ID ${npcId} (${npcIdNumber}) not found. Available NPCs: ${Object.keys(NPCData).join(', ')}`
      });
    }

    const result = await handleRegularNPCConversation(message, npcId, round, sessionId, npc, isSustainable);

    // Set CORS headers for the response
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