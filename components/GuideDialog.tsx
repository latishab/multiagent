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
  onOpenPDA?: () => void;
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
  onConversationComplete,
  onOpenPDA
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
      setIsLoading(true);

      const currentSessionId = await sessionManager.getSessionId();
      setSessionId(currentSessionId);
      
      try {
        // --- 1. Load Existing History ---
        let existingMessages: Message[] = [];
        const response = await fetch(`/api/conversation-history?npcId=-1&round=${round}&sessionId=${currentSessionId}`);
        
        if (response.ok) {
          const data = await response.json();
          existingMessages = data.messages || [];
        } 

        // --- 2. Determine which initial messages are needed based on game state ---
        let messagesToDisplay = [...existingMessages]; // Start with what we have
        let needsDBUpdate = false;
        let shouldAdvanceRound = false;
        let shouldAdvanceToRound1 = false;

        // State A: First time ever opening the dialog (check if initial messages exist)
        const initialMessages = narrativesToMessages(getInitialGuideMessages());
        const firstInitialMessage = initialMessages[0]?.text;
        const hasInitialMessages = existingMessages.some(
          (msg) => msg.text === firstInitialMessage
        );
        
        if ((round === 0 || round === 1) && !hasInitialMessages) {
          // Add to the messages to be displayed
          messagesToDisplay.push(...initialMessages);
          needsDBUpdate = true;
          shouldAdvanceToRound1 = true;
        
        // We check this condition BEFORE checking for the start of Round 2.
        } else if (round === 2 && spokenNPCs.round2.size >= 6) {
          const decisionPhaseMessages = narrativesToMessages(getDecisionPhaseMessages());
          const initialDecisionMessage = decisionPhaseMessages[0]?.text;

          const initialDecisionMessageAlreadyExists = existingMessages.some(
            (msg) => msg.text === initialDecisionMessage
          );

          if (!initialDecisionMessageAlreadyExists) {
            messagesToDisplay.push(...decisionPhaseMessages);
            needsDBUpdate = true;
          }

        // State C: Player has completed Round 1 and is now starting Round 2
        } else if ((round === 1 || round === 2) && spokenNPCs.round1.size >= 6 && spokenNPCs.round2.size < 6) {
          const round2IntroMessages = narrativesToMessages(getRoundAdvancementMessages());
          const initialRound2Message = round2IntroMessages[0]?.text;

          // Check if the Round 2 intro messages have ALREADY been added
          const initialRound2MessageAlreadyExists = existingMessages.some(
            (msg) => msg.text === initialRound2Message
          );

          if (!initialRound2MessageAlreadyExists) {
            messagesToDisplay.push(...round2IntroMessages);
            needsDBUpdate = true;
            // Don't auto-advance - let the player see the "Mission: Advance to Round 2" prompt
            // shouldAdvanceRound = true; 
          }
        }

        // --- 3. Update the database if new messages were added ---
        let newMessages: Message[] = [];
        if (needsDBUpdate) {
          newMessages = messagesToDisplay.slice(existingMessages.length);

          for (const msg of newMessages) {
            await fetch('/api/store-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: msg.text,
                npcId: -1,
                round: round, 
                sessionId: currentSessionId,
                role: 'assistant'
              })
            });
          }
        }

        // --- 4. Set the final state for the UI ---
        // If we have new messages to add, display them one by one with delays
        if (needsDBUpdate && newMessages.length > 0) {
          let currentMessages = existingMessages;
          
          for (let i = 0; i < newMessages.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 800)); // Delay between messages
            currentMessages = [...currentMessages, newMessages[i]];
            setMessages(currentMessages);
          }
          
          // Only mark guide as spoken if this is the initial intro (not Round 2 advancement)
          if (onConversationComplete && shouldAdvanceToRound1) {
            onConversationComplete(-1, 1, undefined, { isComplete: true, reason: 'Guide intro delivered' });
          }

          // Advance the round after messages are displayed 
          if (shouldAdvanceToRound1) {
            await new Promise(resolve => setTimeout(resolve, 500));
            onRoundChange(1);
          }
          // Only advance to Round 2 if explicitly triggered by player interaction
          if (shouldAdvanceRound) {
            await new Promise(resolve => setTimeout(resolve, 500)); 
            onRoundChange(2);
          }
          
          if (round === 1 && spokenNPCs.round1.size >= 6 && newMessages.length > 0) {
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage && lastMessage.text.includes("Ready to continue?")) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to let user read
              if (onConversationComplete) {
                onConversationComplete(-1, 1, undefined, { isComplete: true, reason: 'Round 2 intro delivered' });
              }
              onRoundChange(2);
            }
          }
        } else {
          setMessages(messagesToDisplay);

          // If initial intro already existed, only mark guide as spoken if we're not in Round 2 advancement state
          if ((round === 0 || round === 1) && hasInitialMessages && !(spokenNPCs.round1.size >= 6)) {
            if (onConversationComplete) {
              onConversationComplete(-1, 1, undefined, { isComplete: true, reason: 'Guide intro already present' });
            }
          }
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
    
    // Check if this is the decision phase and user typed "continue"
    if (round === 2 && spokenNPCs.round2.size >= 6 && userMessage.toLowerCase() === 'continue' && onOpenPDA) {
      onOpenPDA();
      return;
    }
    
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
          participantId: sessionManager.getSessionInfo().participantId,
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
          onRoundChange(2);
        } else if (data.conversationAnalysis?.shouldOpenPDA && round === 2) {
          if (typeof window !== 'undefined' && (window as any).triggerEndingPhase) {
            (window as any).triggerEndingPhase();
          }
        }
        
        // Add response to local state
        setMessages(prev => [...prev, { text: data.response, sender: 'npc' }]);
        
        // Call conversation complete callback. For Round 2 intro completion, explicitly mark guide as spoken
        if (onConversationComplete && data.conversationAnalysis) {
          const isRound2Advancement = round === 1 && spokenNPCs.round1.size >= 6;
          if (!isRound2Advancement) {
            onConversationComplete(-1, round, undefined, data.conversationAnalysis);
          } else if (isRound2Advancement && (data.response?.includes("Ready to continue?") || data.response?.includes("Now let's move to Round 2"))) {
            onConversationComplete(-1, 1, undefined, { isComplete: true, reason: 'Round 2 intro delivered' });
          }
        }
        
        // Auto-advance to Round 2 after Michael finishes the Round 2 intro
        if (round === 1 && spokenNPCs.round1.size >= 6 && data.response && 
            data.response.includes("Ready to continue?")) {
          setTimeout(() => {
            onRoundChange(2);
          }, 1000); // Small delay to let the user read the message
        }
      }
    } catch (error) {
      console.error('LLM response failed in GuideDialog:', error instanceof Error ? error.message : String(error));
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
                  <img 
                    src="/assets/characters/tourguide.png" 
                    alt="Michael" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      objectPosition: 'center top',
                      borderRadius: '50%',
                      border: '2px solid #374151'
                    }} 
                  />
                </div>
                <div className="npc-info">
                  <h2>Michael</h2>
                  <span className="npc-system">Global Recovery Authority</span>
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