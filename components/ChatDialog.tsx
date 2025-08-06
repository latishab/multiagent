import React, { useState, useRef, useEffect } from 'react'
import { sessionManager } from '../utils/sessionManager'
import { NPCNames, NPCOptions, getNPCImage } from '../utils/npcData'

interface ChatDialogProps {
  isOpen: boolean;
  npcId: number;
  personality: string;
  round: number;
  isSustainable?: boolean;
  spokenNPCs?: { round1: Set<number>; round2: Set<number> };
  onClose: () => void;
  onRoundChange: (round: number) => void;
  onStanceChange: (isProSustainable: boolean) => void;
  onConversationComplete?: (npcId: number, round: number, detectedOpinion?: { opinion: string; reasoning: string }, conversationAnalysis?: { isComplete: boolean; reason: string }) => void;
}

interface Message {
  text: string;
  sender: 'player' | 'npc';
}

// List of common titles that shouldn't be split
const titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];

// Helper function to split text into natural conversation chunks
// This groups related sentences together to create more natural-looking chat bubbles
// instead of splitting every sentence into a separate bubble
function splitIntoConversationChunks(text: string): string[] {
  // 1. temporarily replace periods in titles with a placeholder
  let processedText = text;
  titles.forEach(title => {
    processedText = processedText.replace(new RegExp(title, 'g'), title.replace('.', '@@'));
  });

  // 2. Split into sentences first
  const sentences = processedText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.replace(/@@/g, '.'));

  // 3. Much more natural chunking logic
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  // Special cases for very short responses
  if (sentences.length === 1) {
    return [sentences.join(' ')];
  }

  // If total response is short, keep as one chunk
  const totalLength = sentences.join(' ').length;
  if (totalLength < 150) {
    return [sentences.join(' ')];
  }

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const nextSentence = sentences[i + 1];
    
    // Always add the current sentence to the chunk
    currentChunk.push(sentence);
    
    // Calculate current chunk length
    const currentChunkLength = currentChunk.join(' ').length;
    
    // Start a new chunk in these cases:
    const shouldStartNewChunk = 
      // If this is the last sentence
      i === sentences.length - 1 ||
      // If the next sentence is a direct question (not rhetorical)
      (nextSentence.includes('?') && !nextSentence.toLowerCase().includes('you') && !nextSentence.toLowerCase().includes('i')) ||
      // If the next sentence starts a completely new topic (greeting, new introduction)
      nextSentence.toLowerCase().match(/^(hi|hello|hey|good morning|good afternoon|good evening)/) ||
      // If we have 3+ sentences and the next one seems like a new thought
      (currentChunk.length >= 3 && nextSentence.toLowerCase().match(/^(well|now|so|anyway|by the way|speaking of|on that note)/)) ||
      // If current chunk is getting too long (over 200 characters)
      (currentChunkLength > 200 && currentChunk.length >= 2) ||
      // If we have 4+ sentences in current chunk (natural paragraph break)
      currentChunk.length >= 4 ||
      // If next sentence starts with contrast words (new topic)
      nextSentence.toLowerCase().match(/^(but|however|on the other hand|meanwhile|in contrast|alternatively|instead)/);
    
    if (shouldStartNewChunk) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
    }
  }

  // Add any remaining sentences as a chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  // 4. Post-process chunks to merge very short ones
  const finalChunks: string[] = [];
  let currentMergedChunk: string[] = [];

  for (const chunk of chunks) {
    // If chunk is very short (less than 50 chars), try to merge it with the next one
    if (chunk.length < 50 && currentMergedChunk.length === 0) {
      currentMergedChunk.push(chunk);
    } else if (currentMergedChunk.length > 0) {
      // Merge with the previous short chunk
      currentMergedChunk.push(chunk);
      finalChunks.push(currentMergedChunk.join(' '));
      currentMergedChunk = [];
    } else {
      // Normal chunk, add directly
      finalChunks.push(chunk);
    }
  }

  // Add any remaining merged chunk
  if (currentMergedChunk.length > 0) {
    finalChunks.push(currentMergedChunk.join(' '));
  }

  return finalChunks.length > 0 ? finalChunks : chunks;
}

export default function ChatDialog({ 
  isOpen, 
  npcId, 
  personality, 
  round, 
  isSustainable = true,
  spokenNPCs = { round1: new Set(), round2: new Set() },
  onClose,
  onRoundChange,
  onStanceChange,
  onConversationComplete
}: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages when NPC or round changes
  useEffect(() => {
    const loadMessages = async () => {
      // Only load messages if the chat is open
      if (!isOpen) return;
      
      const currentSessionId = await sessionManager.getSessionId();
      setSessionId(currentSessionId);
      
      try {
        // Load conversation history from API
        const response = await fetch(`/api/conversation-history?npcId=${npcId}&round=${round}&sessionId=${currentSessionId}`);
        
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
        } else {
          setMessages([]);
        }
              } catch (error) {
          console.error('Error loading conversation history:', error);
          // Don't let conversation history errors break the chat
          setMessages([]);
        }
    };
    
    loadMessages();
  }, [npcId, round, isOpen]);

  useEffect(() => {
  }, [npcId, personality, round, isSustainable]);

  // Update global chat state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).isChatOpen = isOpen;
    }
  }, [isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Get session ID
    const currentSessionId = await sessionManager.getSessionId();
    
    // Add user message to current conversation
    const newMessages: Message[] = [...messages, { text: userMessage, sender: 'player' }];
    setMessages(newMessages);
    setIsLoading(true);

    const requestData = {
      message: userMessage,
      npcId,
      round,
      isSustainable,
      sessionId: currentSessionId,
      participantId: sessionManager.getSessionInfo().participantId,
      spokenNPCs: {
        round1: Array.from(spokenNPCs.round1),
        round2: Array.from(spokenNPCs.round2)
      }
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to get response from NPC';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
              if (data.response) {
          // Check if opinion was detected
          if (data.detectedOpinion && round === 2) {
            if (onConversationComplete) {
              onConversationComplete(npcId, round, data.detectedOpinion, data.conversationAnalysis);
            }
          }

          // // Log conversation analysis
          // if (data.conversationAnalysis) {
          //   console.log('Conversation analysis:', data.conversationAnalysis);
          //   console.log('Analysis result - isComplete:', data.conversationAnalysis.isComplete);
          //   console.log('Analysis result - reason:', data.conversationAnalysis.reason);
          // }
          
          // Split response into natural conversation chunks and add delay between each
          const chunks = splitIntoConversationChunks(data.response);
          let currentMessages = newMessages;
          
          // Add each chunk as a separate message with a small delay
          for (let i = 0; i < chunks.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
            currentMessages = [...currentMessages, { 
              text: chunks[i], 
              sender: 'npc' 
            }];
            setMessages(currentMessages);
          }

          // Call the conversation complete callback based on conversation analysis
          if (onConversationComplete && data.conversationAnalysis) {
            // For Round 1: Call when introduction is complete
            // For Round 2: Call when opinion is detected (handled above)
            if (round === 1 && data.conversationAnalysis.isComplete) {
              onConversationComplete(npcId, round, undefined, data.conversationAnalysis);
            }
          }
        } else {
          throw new Error('Invalid response format from API');
        }
    } catch (error) {
      console.error('Full error details:', error);
      setError(error instanceof Error ? error.message : String(error));
      
      // Add error message to conversation
      const errorMessages: Message[] = [...newMessages, { 
        text: "I apologize, but I'm having trouble responding right now. Perhaps we could continue our conversation later?", 
        sender: 'npc' 
      }];
      setMessages(errorMessages);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Handle Escape key to close chat
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation of all keyboard events when chat is open
    e.stopPropagation()
    
    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Prevent game from handling keyboard events when chat is open
  useEffect(() => {
    if (isOpen) {
      const preventGameInput = (e: KeyboardEvent) => {
        e.stopPropagation()
      }
      window.addEventListener('keydown', preventGameInput, true)
      return () => window.removeEventListener('keydown', preventGameInput, true)
    }
  }, [isOpen])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Chat Dialog */}
      <div className="chat-dialog" onKeyDown={handleKeyDown}>
        <div className="chat-container">

          {/* Header */}
          <div className="chat-header">
            <div className="header-content">
              <div className="npc-profile">
                <div className="profile-picture">
                  {npcId === -1 ? (
                    // The Guide - use a special icon or default
                    <div className="guide-icon">👤</div>
                  ) : (
                    <img 
                      src={`/assets/characters/${getNPCImage(npcId)}`} 
                      alt={`${NPCNames[npcId] || 'NPC'}`}
                      onError={(e) => {
                        // Fallback to jpeg if png doesn't exist
                        const target = e.target as HTMLImageElement;
                        target.src = `/assets/characters/${getNPCImage(npcId)}`;
                      }}
                    />
                  )}
                </div>
                <div className="npc-info">
                  <h2>{npcId ? NPCNames[npcId] || 'NPC' : 'NPC'}</h2>
                  <span className="npc-system">{NPCOptions[npcId]?.system || 'System'}</span>
                </div>
              </div>
              <button onClick={onClose} className="close-button">✕</button>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-container">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.sender}`}
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  opacity: isLoading && index === messages.length - 1 ? 0.5 : 1
                }}
              >
                <div className="message-content">
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {isLoading && (
              <div className="message npc">
                <div className="message-content typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="chat-input">
            <div className="input-container">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading} className={isLoading ? 'loading' : ''}>
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .chat-dialog {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 700px;
          z-index: 1000;
          pointer-events: auto;
        }

        .chat-container {
          background-color: rgba(17, 24, 39, 0.95);
          border: 2px solid #374151;
          border-radius: 12px;
          box-shadow: 0 8px 16px -2px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .chat-header {
          padding: 16px 20px;
          background-color: rgba(31, 41, 55, 0.95);
          border-bottom: 2px solid #374151;
          flex-shrink: 0;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .npc-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .profile-picture {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #374151;
          background-color: #1f2937;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-picture img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          border-radius: 50%;
        }

        .npc-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .npc-info h2 {
          color: #e5e7eb;
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }

        .npc-system {
          color: #9ca3af;
          font-size: 12px;
          font-style: italic;
        }

        .guide-icon {
          font-size: 24px;
          color: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .chat-header .close-button {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          background: transparent;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 20px;
        }

        .chat-header .close-button:hover {
          color: #e5e7eb;
          background-color: rgba(55, 65, 81, 0.5);
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          scrollbar-width: thin;
          scrollbar-color: #4b5563 #1f2937;
          min-height: 0;
        }

        .messages-container::-webkit-scrollbar {
          width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: #1f2937;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background-color: #4b5563;
          border-radius: 4px;
        }

        .message {
          display: flex;
          margin-bottom: 12px;
          animation: fadeIn 0.3s ease-out forwards;
          opacity: 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message.player {
          justify-content: flex-end;
        }

        .message.npc {
          justify-content: flex-start;
        }

        .message-content {
          max-width: 75%;
          padding: 12px 18px;
          border-radius: 18px;
          color: #ffffff;
          word-break: break-word;
          font-size: 16px;
          line-height: 1.5;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .player .message-content {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border-bottom-right-radius: 6px;
          margin-left: auto;
        }

        .npc .message-content {
          background: linear-gradient(135deg, #4b5563, #374151);
          border-bottom-left-radius: 6px;
          margin-right: auto;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          min-width: 60px;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #ffffff;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
          opacity: 0.6;
        }

        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }

        .chat-input {
          padding: 20px;
          background-color: rgba(31, 41, 55, 0.95);
          border-top: 2px solid #374151;
          flex-shrink: 0;
        }

        .input-container {
          display: flex;
          gap: 12px;
        }

        .input-container input {
          flex: 1;
          padding: 12px 24px;
          background-color: #374151;
          color: #e5e7eb;
          border: 2px solid #4b5563;
          border-radius: 9999px;
          outline: none;
          transition: all 0.2s;
          font-size: 16px;
        }

        .input-container input:focus {
          border-color: #2563eb;
          background-color: #404b5f;
        }

        .input-container input::placeholder {
          color: #9ca3af;
        }

        .input-container input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .input-container button {
          padding: 12px 32px;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 9999px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 16px;
        }

        .input-container button:hover:not(:disabled) {
          background-color: #1d4ed8;
          transform: translateY(-1px);
        }

        .input-container button:disabled {
          background-color: #4b5563;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .input-container button.loading {
          background-color: #4b5563;
        }
      `}</style>
    </>
  )
} 