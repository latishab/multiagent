import { useState, useEffect } from 'react'
import { Game } from 'phaser'
import ChatDialog from './ChatDialog'

interface UIOverlayProps {
  gameInstance: Game | null
}

export default function UIOverlay({ gameInstance: initialGameInstance }: UIOverlayProps) {
  const [gameInstance, setGameInstance] = useState<Game | null>(initialGameInstance)
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventory, setInventory] = useState<Array<string | null>>(
    new Array(25).fill(null)
  )
  
  const [chatState, setChatState] = useState<{
    isOpen: boolean
    npcId: number
    personality: string
    round: number
    isSustainable: boolean
  }>({
    isOpen: false,
    npcId: -1,
    personality: '',
    round: 1,
    isSustainable: true
  })

  // Function to be called from the game to open chat
  const openChat = (npcId: number, personality: string) => {
    setChatState({
      isOpen: true,
      npcId,
      personality,
      round: chatState.round,
      isSustainable: chatState.isSustainable
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

  // Handle round changes
  const handleRoundChange = (round: number) => {
    setChatState(prev => ({
      ...prev,
      round,
      // Reset messages when changing rounds
      messages: []
    }))
  }

  // Handle stance changes
  const handleStanceChange = (isProSustainable: boolean) => {
    setChatState(prev => ({
      ...prev,
      isSustainable: isProSustainable,
      // Reset messages when changing stance
      messages: []
    }))
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
    const game = gameInstance || (window as any).game
    if (game?.scene?.scenes?.[0]) {
      const scene = game.scene.scenes[0] as any
      if (scene.setSelectedSlot) {
        scene.setSelectedSlot(selectedSlot)
      }
    }
  }, [selectedSlot, gameInstance])

  // Expose functions to the window object
  useEffect(() => {
    ;(window as any).openChat = openChat
    return () => {
      delete (window as any).openChat
    }
  }, [])

  // Ensure openChat is always available
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (typeof (window as any).openChat !== 'function') {
        ;(window as any).openChat = openChat
      }
    }, 1000)
    return () => clearInterval(checkInterval)
  }, [])

  // Handle game instance updates
  useEffect(() => {
    if (!gameInstance) {
      console.log('Looking for game instance in window...')
      const game = (window as any).game
      if (game) {
        console.log('Found game instance, updating state')
        setGameInstance(game)
      } else {
        console.log('No game instance found in window')
      }
    }
  }, [gameInstance])

  return (
    <>
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

      {/* Chat Dialog */}
      <ChatDialog
        isOpen={chatState.isOpen}
        npcId={chatState.npcId}
        personality={chatState.personality}
        round={chatState.round}
        isSustainable={chatState.isSustainable}
        onClose={closeChat}
        onRoundChange={handleRoundChange}
        onStanceChange={handleStanceChange}
      />

      <style jsx>{`
        .hotbar {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          pointer-events: auto;
          z-index: 200;
        }

        .hotbar-slot {
          width: 50px;
          height: 50px;
          background-color: rgba(0, 0, 0, 0.7);
          border: 2px solid #666;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .hotbar-slot:hover {
          border-color: #999;
          background-color: rgba(0, 0, 0, 0.8);
        }

        .hotbar-slot.active {
          border-color: #ffd700;
          background-color: rgba(0, 0, 0, 0.9);
        }

        .inventory-button {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 8px 16px;
          background-color: rgba(0, 0, 0, 0.7);
          border: 2px solid #666;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          pointer-events: auto;
          z-index: 200;
        }

        .inventory-button:hover {
          border-color: #999;
          background-color: rgba(0, 0, 0, 0.8);
        }

        .inventory-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          background-color: rgba(0, 0, 0, 0.9);
          border: 2px solid #666;
          padding: 20px;
          pointer-events: auto;
          z-index: 300;
        }

        .inventory-header {
          color: white;
          font-size: 24px;
          margin-bottom: 20px;
          text-align: center;
        }

        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .inventory-slot {
          aspect-ratio: 1;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid #666;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
        }

        .inventory-slot:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .close-button {
          display: block;
          width: 100%;
          padding: 10px;
          background-color: #666;
          border: none;
          color: white;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .close-button:hover {
          background-color: #999;
        }
      `}</style>
    </>
  )
} 