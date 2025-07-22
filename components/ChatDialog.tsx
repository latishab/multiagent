import React, { useState, useRef, useEffect } from 'react'

interface ChatDialogProps {
  isOpen: boolean
  npcId: number
  personality: string
  onClose: () => void
}

export default function ChatDialog({ isOpen, npcId, personality, onClose }: ChatDialogProps) {
  const [messages, setMessages] = useState<Array<{ text: string, sender: 'player' | 'npc' }>>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update global chat state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).isChatOpen = isOpen
    }
  }, [isOpen])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setMessages(prev => [...prev, { text: userMessage, sender: 'player' }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          npcId,
          npcPersonality: personality,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response from NPC')
      }

      const data = await response.json()
      if (data.response) {
        setMessages(prev => [...prev, { text: data.response, sender: 'npc' }])
      } else {
        throw new Error('Invalid response format from API')
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        text: "I apologize, but I'm having trouble responding right now. Perhaps we could continue our conversation later?", 
        sender: 'npc' 
      }])
      console.error('Chat error:', error.message)
    } finally {
      setIsLoading(false)
      // Refocus input after sending message
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

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
            <h2>Chat with NPC</h2>
            <button onClick={onClose} className="close-button">✕</button>
          </div>

          {/* Messages */}
          <div className="messages-container">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.sender}`}>
                <div className="message-content">
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
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
          gap: 16px;
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
        }

        .message.player {
          justify-content: flex-end;
        }

        .message.npc {
          justify-content: flex-start;
        }

        .message-content {
          max-width: 80%;
          padding: 12px 20px;
          border-radius: 20px;
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