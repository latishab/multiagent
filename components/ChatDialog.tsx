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

      const data = await response.json()
      setMessages(prev => [...prev, { text: data.response, sender: 'npc' }])
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { text: 'Sorry, I had trouble responding.', sender: 'npc' }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Chat with NPC</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg ${
                message.sender === 'player'
                  ? 'bg-blue-100 ml-auto'
                  : 'bg-gray-100'
              } max-w-[80%]`}
            >
              {message.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 rounded ${
              isLoading
                ? 'bg-gray-300'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
} 