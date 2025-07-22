import { useState, useEffect } from 'react'
import { Game } from 'phaser'
import ChatDialog from './ChatDialog'

interface UIOverlayProps {
  gameInstance: Game
}

export default function UIOverlay({ gameInstance }: UIOverlayProps) {
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventory, setInventory] = useState<Array<string | null>>(
    new Array(25).fill(null)
  )
  
  const [chatState, setChatState] = useState<{
    isOpen: boolean
    npcId: number
    personality: string
  }>({
    isOpen: false,
    npcId: -1,
    personality: ''
  })

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

  // Handle keyboard input for hotbar selection
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = parseInt(event.key)
      if (key >= 1 && key <= 5) {
        setSelectedSlot(key - 1)
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

  // Communicate selected slot to game
  useEffect(() => {
    if (gameInstance?.scene?.scenes?.[0]) {
      const scene = gameInstance.scene.scenes[0] as any
      if (scene.setSelectedSlot) {
        scene.setSelectedSlot(selectedSlot)
      }
    }
  }, [selectedSlot, gameInstance])

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
    <>
      <div className="ui-overlay">
        {/* Hotbar */}
        <div className="hotbar">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={`hotbar-slot ${selectedSlot === index ? 'active' : ''}`}
              onClick={() => setSelectedSlot(index)}
            >
              {index + 1}
            </div>
          ))}
        </div>

        {/* Inventory Button */}
        <button
          className="inventory-button"
          onClick={() => setInventoryOpen(!inventoryOpen)}
        >
          Inventory (I)
        </button>

        {/* Inventory Modal */}
        {inventoryOpen && (
          <div className="inventory-modal">
            <div className="inventory-header">Inventory</div>
            <div className="inventory-grid">
              {inventory.map((item, index) => (
                <div key={index} className="inventory-slot">
                  {item || ''}
                </div>
              ))}
            </div>
            <button
              className="close-button"
              onClick={() => setInventoryOpen(false)}
            >
              Close
            </button>
          </div>
        )}

        {/* NPC Interaction Hint */}
        {interactionHint.show && (
          <div
            className="interaction-hint"
            style={{
              left: interactionHint.position.x,
              top: interactionHint.position.y - 40,
              transform: 'translate(-50%, -50%)',
            }}
          >
            Press E to talk
          </div>
        )}
      </div>

      {/* Chat Dialog */}
      <ChatDialog
        isOpen={chatState.isOpen}
        npcId={chatState.npcId}
        personality={chatState.personality}
        onClose={closeChat}
      />

      <style jsx>{`
        .ui-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1000;
        }

        .hotbar {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          pointer-events: auto;
          z-index: 1001;
        }

        .hotbar-slot {
          width: 64px;
          height: 64px;
          background: rgba(0, 0, 0, 0.8);
          border: 2px solid #666;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
        }

        .hotbar-slot:hover {
          background: rgba(64, 64, 64, 0.9);
        }

        .hotbar-slot.active {
          border-color: #ffd700;
          background: rgba(255, 215, 0, 0.3);
        }

        .inventory-button {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          pointer-events: auto;
          z-index: 1001;
        }

        .inventory-button:hover {
          background: rgba(64, 64, 64, 0.9);
        }

        .inventory-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          padding: 20px;
          border-radius: 12px;
          border: 2px solid #666;
          pointer-events: auto;
          z-index: 1002;
        }

        .inventory-header {
          color: white;
          font-size: 18px;
          margin-bottom: 16px;
          text-align: center;
        }

        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .inventory-slot {
          width: 64px;
          height: 64px;
          background: rgba(64, 64, 64, 0.8);
          border: 2px solid #666;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
        }

        .inventory-slot:hover {
          background: rgba(96, 96, 96, 0.8);
        }

        .close-button {
          width: 100%;
          padding: 12px;
          background: rgba(64, 64, 64, 0.8);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .close-button:hover {
          background: rgba(96, 96, 96, 0.8);
        }

        .interaction-hint {
          position: fixed;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          pointer-events: none;
          z-index: 1001;
          white-space: nowrap;
        }
      `}</style>
    </>
  )
} 