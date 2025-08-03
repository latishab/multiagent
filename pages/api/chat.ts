import { NextApiRequest, NextApiResponse } from 'next';
import { vectorStore } from '../../utils/vectorStore';
import { NPCData, getSystemPrompt } from '../../utils/prompts';

// Function to detect NPC opinion from AI response
function detectNPCOpinion(response: string, npc: NPCInfo): { opinion: string; reasoning: string } | null {
  const responseLower = response.toLowerCase();
  const sustainableOption = npc.options.sustainable.toLowerCase();
  const unsustainableOption = npc.options.unsustainable.toLowerCase();
  
  // Check for clear opinion indicators
  const opinionIndicators = [
    'i support',
    'i prefer',
    'i recommend',
    'i believe',
    'i think we should',
    'i would choose',
    'i favor',
    'i advocate for',
    'i suggest',
    'i recommend we',
    'we should go with',
    'the better option is',
    'the best choice is',
    'i would go with',
    'i lean toward',
    'i\'m in favor of',
    'i\'m for',
    'i\'m supporting',
    'i\'m choosing',
    'i\'m recommending'
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

// Function to analyze conversation completeness
async function analyzeConversationCompleteness(
  conversationHistory: Message[], 
  npc: NPCInfo, 
  round: number
): Promise<{ isComplete: boolean; reason: string }> {
  const conversationText = conversationHistory
    .filter(msg => msg.role === 'assistant')
    .map(msg => msg.content)
    .join('\n');

  console.log('Analyzing conversation for', npc.name, 'Round', round);
  console.log('Conversation text:', conversationText);
  
  // Debug: Check if key information is present
  const conversationLower = conversationText.toLowerCase();
  const hasName = conversationLower.includes(npc.name.toLowerCase()) || conversationLower.includes('mr.') || conversationLower.includes('ms.') || conversationLower.includes('miss') || conversationLower.includes('chief');
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
  `- NPC should introduce themselves (name, background, profession)
- NPC should explain their system (${npc.system})
- NPC should mention both options: ${npc.options.sustainable} and ${npc.options.unsustainable}
- Conversation should be friendly and informative` :
  `- NPC should clearly state their recommendation between ${npc.options.sustainable} and ${npc.options.unsustainable}
- NPC should explain their reasoning for their choice
- NPC should use recommendation phrases like "I recommend", "I suggest", "I believe we should"`}

FULL CONVERSATION HISTORY:
${conversationText}

IMPORTANT: For Round 1, check the ENTIRE conversation. If the NPC has mentioned their name, their role/profession, their system (${npc.system}), and both options (${npc.options.sustainable} and ${npc.options.unsustainable}) anywhere in the conversation, then the introduction is COMPLETE.

Look through ALL the NPC's responses, not just the latest one. The information can be spread across multiple responses.

Determine if this conversation is COMPLETE (has all required information) or INCOMPLETE (missing key information).

Respond with ONLY: "COMPLETE: [brief reason]" or "INCOMPLETE: [what's missing]"

Example responses for Round 1:
- "COMPLETE: NPC introduced themselves, explained their system, and mentioned both options"
- "COMPLETE: NPC mentioned their name, role, system, and both options across multiple responses"
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

type NPCDatabase = {
  [key: number]: NPCInfo;
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
    const npc = NPCData[npcIdNumber];
    if (!npc) {
      return res.status(400).json({ 
        message: 'Invalid NPC ID', 
        details: `NPC ID ${npcId} (${npcIdNumber}) not found. Available NPCs: ${Object.keys(NPCData).join(', ')}`
      });
    }

    // Get conversation history
    const history = vectorStore.getConversationHistory(npcId, round, sessionId);

    // Add system prompt to history if it's empty
    if (history.length === 0) {
      const systemPrompt = getSystemPrompt(npc, round, isSustainable);
      vectorStore.addToConversationHistory(npcId, round, {
        role: 'system',
        content: systemPrompt
      }, sessionId);
    }

    // Add user message to history
    vectorStore.addToConversationHistory(npcId, round, {
      role: 'user',
      content: message
    }, sessionId);

    // Get updated history
    const updatedHistory = vectorStore.getConversationHistory(npcId, round, sessionId);

    // Store the message in Pinecone
    const messageId = `${npcId}_${round}_${Date.now()}`;
    await vectorStore.storeMemory(messageId, message, {
      npcId: npcId.toString(),
      round: round.toString(),
      type: 'user_message',
      sessionId: sessionId || 'default'
    });

    // Only add context from similar conversations if this is not the first message
    // to avoid repeating introductions
    let contextPrompt = '';
    if (updatedHistory.length > 2) { // More than just system + user message
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

    console.log('Sending request to DeepInfra:', {
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      npcId,
      npcName: npc.name,
      round,
      sessionId: sessionId || 'default',
      message: message.slice(0, 50) + '...',
      hasContext: contextPrompt.length > 0
    });

    const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: updatedHistory,
        temperature: 0.7,
        max_tokens: 80,
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
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid response format from API');
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

    // Add assistant response to history
    vectorStore.addToConversationHistory(npcId, round, {
      role: 'assistant',
      content: aiResponse
    }, sessionId);

    // Analyze conversation completeness AFTER adding the current response
    const finalHistory = vectorStore.getConversationHistory(npcId, round, sessionId);
    const conversationAnalysis = await analyzeConversationCompleteness(finalHistory, npc, round);

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return res.status(200).json({ 
      response: aiResponse,
      detectedOpinion: detectedOpinion,
      conversationAnalysis: conversationAnalysis
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message || 'Unknown error',
      details: error.toString()
    });
  }
} 