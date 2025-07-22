import React, { useState, useEffect } from 'react'
import ChatDialog from './ChatDialog'

export default function UIOverlay() {
  const [chatState, setChatState] = useState<{
    isOpen: boolean
    npcId: number
    personality: string
  }>({
    isOpen: false,
    npcId: -1,
    personality: ''
  })

  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventory, setInventory] = useState<Array<string | null>>(new Array(25).fill(null))
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [interactionHint, setInteractionHint] = useState<{
    show: boolean
    npcId: number
    position: { x: number, y: number }
  }>({
    show: false,
    npcId: -1,
    position: { x: 0, y: 0 }
  })

  // Function to be called from the game to open chat
  const openChat = (npcId: number, personality: string) => {
    setChatState({
      isOpen: true,
      npcId,
      personality
    })
  }

  // Function to close chat
  const closeChat = () => {
    setChatState(prev => ({
      ...prev,
      isOpen: false
    }))
    // Notify the game that chat is closed
    window.dispatchEvent(new CustomEvent('chatClosed', { detail: { npcId: chatState.npcId } }))
  }

  // Handle keyboard input for hotbar selection and inventory
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = parseInt(event.key)
      if (key >= 1 && key <= 5) {
        setSelectedSlot(key - 1)
        // Update game's selected slot
        const game = (window as any).game
        const mainScene = game?.scene?.getScene('MainScene')
        if (mainScene) {
          mainScene.setSelectedSlot(key - 1)
        }
      }
      if (event.key === 'i' || event.key === 'I') {
        setInventoryOpen(!inventoryOpen)
      }
      if (event.key === 'Escape') {
        setInventoryOpen(false)
        closeChat()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [inventoryOpen])

  // Add inventory update listener
  useEffect(() => {
    const handleInventoryUpdate = (event: CustomEvent) => {
      const { slot, item } = event.detail
      setInventory(prev => {
        const newInventory = [...prev]
        newInventory[slot] = item
        return newInventory
      })
    }

    window.addEventListener('inventoryUpdate', handleInventoryUpdate as EventListener)
    return () => {
      window.removeEventListener('inventoryUpdate', handleInventoryUpdate as EventListener)
    }
  }, [])

  // Expose functions to the window object
  useEffect(() => {
    (window as any).openChat = openChat;
    (window as any).showInteractionHint = (npcId: number, x: number, y: number) => {
      setInteractionHint({ show: true, npcId, position: { x, y } })
    };
    (window as any).hideInteractionHint = () => {
      setInteractionHint(prev => ({ ...prev, show: false }))
    }

    return () => {
      delete (window as any).openChat
      delete (window as any).showInteractionHint
      delete (window as any).hideInteractionHint
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Hotbar */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 pointer-events-auto z-50">
        {[1, 2, 3, 4, 5].map((slot) => (
          <div
            key={slot}
            onClick={() => {
              setSelectedSlot(slot - 1)
              const game = (window as any).game
              const mainScene = game?.scene?.getScene('MainScene')
              if (mainScene) {
                mainScene.setSelectedSlot(slot - 1)
              }
            }}
            className={`w-16 h-16 bg-gray-800 bg-opacity-75 border-2 ${
              selectedSlot === slot - 1 ? 'border-yellow-500' : 'border-gray-600'
            } text-white rounded flex items-center justify-center hover:bg-gray-700 cursor-pointer shadow-lg`}
          >
            {inventory[slot - 1] || slot}
          </div>
        ))}
      </div>

      {/* Inventory Button */}
      <button
        className="absolute top-4 right-4 px-4 py-2 bg-gray-800 bg-opacity-75 text-white rounded hover:bg-gray-700 pointer-events-auto z-50"
        onClick={() => setInventoryOpen(!inventoryOpen)}
      >
        Inventory (I)
      </button>

      {/* Inventory Modal */}
      {inventoryOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-auto z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <div className="text-white mb-4 text-xl">Inventory</div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {inventory.map((item, index) => (
                <div
                  key={index}
                  className="w-16 h-16 bg-gray-700 border-2 border-gray-600 rounded flex items-center justify-center text-white cursor-pointer hover:bg-gray-600"
                  onClick={() => {
                    // Handle inventory slot click
                  }}
                >
                  {item || ''}
                </div>
              ))}
            </div>
            <button
              className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              onClick={() => setInventoryOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* NPC Interaction Hint */}
      {interactionHint.show && (
        <div
          className="absolute text-white bg-black bg-opacity-75 px-3 py-1 rounded pointer-events-none z-50"
          style={{
            left: interactionHint.position.x,
            top: interactionHint.position.y - 40,
            transform: 'translate(-50%, -50%)'
          }}
        >
          Press E to talk
        </div>
      )}

      {/* Chat Dialog */}
      <div className="pointer-events-auto">
        <ChatDialog
          isOpen={chatState.isOpen}
          npcId={chatState.npcId}
          personality={chatState.personality}
          onClose={closeChat}
        />
      </div>
    </div>
  )
} 