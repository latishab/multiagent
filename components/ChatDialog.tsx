import React, { useState, useRef, useEffect } from 'react'
import { sessionManager } from '../utils/sessionManager'

interface ChatDialogProps {
  isOpen: boolean;
  npcId: number;
  personality: string;
  round: number;
  isSustainable?: boolean;
  onClose: () => void;
  onRoundChange: (round: number) => void;
  onStanceChange: (isProSustainable: boolean) => void;
  onConversationComplete?: (npcId: number, round: number, detectedOpinion?: { opinion: string; reasoning: string }) => void;
}

interface Message {
  text: string;
  sender: 'player' | 'npc';
}

const NPCNames: { [key: number]: string } = {
  1: 'Mrs. Aria',
  2: 'Chief Oskar',
  3: 'Mr. Moss',
  4: 'Miss Dai',
  5: 'Ms. Kira',
  6: 'Mr. Han'
}

const NPCOptions: { [key: number]: { sustainable: string; unsustainable: string; system: string } } = {
  1: { 
    sustainable: 'Constructed Wetlands', 
    unsustainable: 'Chemical Filtration Tanks',
    system: 'Water Cycle'
  },
  2: { 
    sustainable: 'Local Solar Microgrids', 
    unsustainable: 'Gas Power Hub',
    system: 'Energy Grid'
  },
  3: { 
    sustainable: 'Biofuel Cooperative', 
    unsustainable: 'Diesel Supply Contracts',
    system: 'Fuel Acquisition'
  },
  4: { 
    sustainable: 'Urban Agriculture Zones', 
    unsustainable: 'Industrial Expansion',
    system: 'Land Use'
  },
  5: { 
    sustainable: 'Public Shared Reservoir', 
    unsustainable: 'Tiered Access Contracts',
    system: 'Water Distribution'
  },
  6: { 
    sustainable: 'Modular Eco-Pods', 
    unsustainable: 'Smart Concrete Complex',
    system: 'Housing & Shelter'
  }
}

// List of common titles that shouldn't be split
const titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];

// Helper function to split text into sentences while preserving titles
function splitIntoSentences(text: string): string[] {
  // 1. temporarily replace periods in titles with a placeholder
  let processedText = text;
  titles.forEach(title => {
    processedText = processedText.replace(new RegExp(title, 'g'), title.replace('.', '@@'));
  });

  // 2. split on sentence boundaries
  const sentences = processedText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.replace(/@@/g, '.'));

  return sentences;
}

export default function ChatDialog({ 
  isOpen, 
  npcId, 
  personality, 
  round, 
  isSustainable = true,
  onClose,
  onRoundChange,
  onStanceChange,
  onConversationComplete
}: ChatDialogProps) {
  // Keep message history per NPC and round
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [hasMeaningfulConversation, setHasMeaningfulConversation] = useState(false);
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
          console.log('Loading messages for:', {
            npcId,
            npcName: NPCNames[npcId],
            round,
            sessionId: currentSessionId,
            messageCount: data.messages.length,
            historyLength: data.historyLength
          });
          
          setMessages(data.messages);
          // If there are existing messages, mark as having meaningful conversation
          setHasMeaningfulConversation(data.messages.length > 0);
        } else {
          console.log('No conversation history found, starting fresh');
          setMessages([]);
          setHasMeaningfulConversation(false);
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
        // Don't let conversation history errors break the chat
        setMessages([]);
        setHasMeaningfulConversation(false);
      }
    };
    
    loadMessages();
  }, [npcId, round, isOpen]);

  // Log NPC info when props change
  useEffect(() => {
    console.log('ChatDialog props updated:', {
      npcId,
      npcName: NPCNames[npcId],
      personality,
      round,
      isSustainable
    });
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

    // Mark that meaningful conversation has occurred
    if (!hasMeaningfulConversation) {
      setHasMeaningfulConversation(true);
    }

    setIsLoading(true);

    const requestData = {
      message: userMessage,
      npcId,
      round,
      isSustainable,
      sessionId: currentSessionId
    };

    console.log('Sending chat request:', requestData);

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
      console.log('API Success Response:', data);

      if (data.response) {
        // Check if opinion was detected
        if (data.detectedOpinion && round === 2) {
          console.log('Opinion detected:', data.detectedOpinion);
          // Update ballot with detected opinion
          if (onConversationComplete) {
            onConversationComplete(npcId, round, data.detectedOpinion);
          }
        }
        // Split response into sentences and add delay between each
        const sentences = splitIntoSentences(data.response);
        let currentMessages = newMessages;
        
        // Add each sentence as a separate message with a small delay
        for (let i = 0; i < sentences.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          currentMessages = [...currentMessages, { 
            text: sentences[i], 
            sender: 'npc' 
          }];
          setMessages(currentMessages);
        }

        // Call the conversation complete callback if this is the first meaningful exchange
        if (hasMeaningfulConversation && onConversationComplete) {
          onConversationComplete(npcId, round);
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
          {/* Round Indicator */}
          <div className="round-indicator">
            <div className="round-info">
              <span className="round-number">Round {round}</span>
              <span className="round-desc">
                {round === 1 ? 'Introduction' : 'Options Discussion'}
              </span>
            </div>
          </div>

          {/* Purpose Statement */}
          {messages.length === 0 && (
            <div className="purpose-statement">
              <div className="purpose-content">
                <h3>Your Mission</h3>
                <p>
                  {round === 1 ? 
                    `Find out about ${NPCNames[npcId]}'s role in the ${NPCOptions[npcId]?.system} system and learn about the pros and cons of building ${NPCOptions[npcId]?.sustainable} vs ${NPCOptions[npcId]?.unsustainable}.` :
                    `Discover ${NPCNames[npcId]}'s opinion on whether to choose ${NPCOptions[npcId]?.sustainable} (sustainable) or ${NPCOptions[npcId]?.unsustainable} (economic) for the ${NPCOptions[npcId]?.system}.`
                  }
                </p>
                <div className="purpose-details">
                  {round === 1 ? (
                    <span>Round 1: Introduction - Learn about their system and the available options</span>
                  ) : (
                    <span>Round 2: Decision - Find out which option they support and why</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="chat-header">
            <h2>Chat with {npcId ? NPCNames[npcId] || 'NPC' : 'NPC'}</h2>
            <button onClick={onClose} className="close-button">✕</button>
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

        .round-indicator {
          background-color: rgba(17, 24, 39, 0.95);
          border-bottom: 2px solid #374151;
          padding: 10px 20px;
          flex-shrink: 0;
        }

        .round-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .round-number {
          color: #e5e7eb;
          font-size: 16px;
          font-weight: bold;
        }

        .round-desc {
          color: #9ca3af;
          font-size: 12px;
        }

        .purpose-statement {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.15));
          border-bottom: 2px solid #374151;
          padding: 16px 20px;
          flex-shrink: 0;
        }

        .purpose-content {
          text-align: center;
        }

        .purpose-content h3 {
          color: #3b82f6;
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 8px 0;
        }

        .purpose-content p {
          color: #e5e7eb;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 8px 0;
        }

        .purpose-details {
          color: #9ca3af;
          font-size: 12px;
          font-style: italic;
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background-color: rgba(31, 41, 55, 0.95);
          border-bottom: 2px solid #374151;
          flex-shrink: 0;
        }

        .chat-header h2 {
          color: #e5e7eb;
          font-size: 22px;
          font-weight: bold;
          margin: 0;
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
          margin-bottom: 4px;
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
          max-width: 80%;
          padding: 8px 16px;
          border-radius: 16px;
          color: #ffffff;
          word-break: break-word;
          font-size: 16px;
          line-height: 1.5;
        }

        .player .message-content {
          background-color: #2563eb;
          border-bottom-right-radius: 4px;
        }

        .npc .message-content {
          background-color: #4b5563;
          border-bottom-left-radius: 4px;
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