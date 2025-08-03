import React, { useState, useRef, useEffect } from 'react'
import { sessionManager } from '../utils/sessionManager'
import { getInitialGuideMessages, getRoundAdvancementMessages, getDecisionPhaseMessages, narrativesToMessages } from '../utils/guideNarratives'

interface GuideDialogProps {
  isOpen: boolean;
  round: number;
  spokenNPCs: { round1: Set<number>; round2: Set<number> };
  onClose: () => void;
  onRoundChange: (round: number) => void;
  onConversationComplete?: (npcId: number, round: number, detectedOpinion?: { opinion: string; reasoning: string }, conversationAnalysis?: { isComplete: boolean; reason: string }) => void;
}

interface Message {
  text: string;
  sender: 'player' | 'npc';
}

export default function GuideDialog({ 
  isOpen, 
  round, 
  spokenNPCs,
  onClose,
  onRoundChange,
  onConversationComplete
}: GuideDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversation history and handle initial messages
  useEffect(() => {
    const loadMessagesAndHandleInitial = async () => {
      if (!isOpen) return;
      
        const currentSessionId = await sessionManager.getSessionId();
        setSessionId(currentSessionId);
        
        try {
          // First, load existing conversation history
          const response = await fetch(`/api/conversation-history?npcId=-1&round=1&sessionId=${currentSessionId}`);
          
          let existingMessages: any[] = [];
          if (response.ok) {
            const data = await response.json();
            existingMessages = data.messages;
          }
          
          // If we have any messages, just use them (preserve existing conversation)
          if (existingMessages.length > 0) {
            setMessages(existingMessages);
            return;
          }
          
          // Only add initial messages if we have no existing conversation
          setIsLoading(true);
          
          let guideNarratives;
          if (round === 1 && spokenNPCs.round1.size === 0) {
            guideNarratives = getInitialGuideMessages();
          } else if (round === 1 && spokenNPCs.round1.size >= 6) {
            guideNarratives = getRoundAdvancementMessages();
          } else if (round === 2 && spokenNPCs.round2.size >= 6) {
            guideNarratives = getDecisionPhaseMessages();
          } else if (round === 2 && spokenNPCs.round2.size === 0 && spokenNPCs.round1.size >= 6) {
            guideNarratives = getRoundAdvancementMessages();
          } else {
            // No initial messages needed
            setMessages([]);
            return;
          }
          
          const initialMessages = narrativesToMessages(guideNarratives);
          
          // Store initial messages one by one with delays (like ChatDialog.tsx)
          for (let i = 0; i < initialMessages.length; i++) {
            // Add message to UI immediately (like ChatDialog.tsx)
            setMessages(prev => [...prev, initialMessages[i]]);
            
            // Store message
            await fetch('/api/store-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: initialMessages[i].text,
                npcId: -1,
                round: 1,
                sessionId: currentSessionId,
                role: 'assistant'
              })
            });
            
            // Add delay between messages (like ChatDialog.tsx)
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error('Error loading guide conversation history:', error);
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
    };
    
    loadMessagesAndHandleInitial();
  }, [isOpen, round, spokenNPCs.round1.size, spokenNPCs.round2.size]);

  // Focus input when dialog opens
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
    
    const currentSessionId = await sessionManager.getSessionId();
    
    // Add user message to local state immediately
    const newMessages: Message[] = [...messages, { text: userMessage, sender: 'player' }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          npcId: -1,
          round: round,
          isSustainable: true,
          sessionId: currentSessionId,
          spokenNPCs: {
            round1: Array.from(spokenNPCs.round1),
            round2: Array.from(spokenNPCs.round2)
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Guide');
      }

      const data = await response.json();
      
      if (data.response) {
        // Handle round advancement
        if (data.conversationAnalysis?.shouldAdvanceRound && round === 1) {
          console.log('Guide: Advancing to Round 2');
          onRoundChange(2);
        } else if (data.conversationAnalysis?.shouldOpenPDA && round === 2) {
          console.log('Guide: Triggering ending phase');
          if (typeof window !== 'undefined' && (window as any).triggerEndingPhase) {
            (window as any).triggerEndingPhase();
          }
        }
        
        // Add response to local state
        setMessages(prev => [...prev, { text: data.response, sender: 'npc' }]);
        
        // Call conversation complete callback
        if (onConversationComplete && data.conversationAnalysis) {
          onConversationComplete(-1, round, undefined, data.conversationAnalysis);
        }
      }
    } catch (error) {
      console.error('Error in guide chat:', error);
      setError(error instanceof Error ? error.message : String(error));
      setMessages(prev => [...prev, { 
        text: "I apologize, but I'm having trouble responding right now.", 
        sender: 'npc' 
      }]);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="chat-dialog" onKeyDown={handleKeyDown}>
        <div className="chat-container">
          {/* Header */}
          <div className="chat-header">
            <div className="header-content">
              <div className="npc-profile">
                <div className="profile-picture">
                  <div className="guide-icon">👤</div>
                </div>
                <div className="npc-info">
                  <h2>The Guide</h2>
                  <span className="npc-system">City Planning</span>
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
  );
} 