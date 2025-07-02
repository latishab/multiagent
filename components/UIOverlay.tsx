import { useState, useEffect } from 'react'
import { Game } from 'phaser'

interface UIOverlayProps {
  gameInstance: Game
}

export default function UIOverlay({ gameInstance }: UIOverlayProps) {
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventory, setInventory] = useState<Array<string | null>>(
    new Array(25).fill(null)
  )

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

  return (
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
    </div>
  )
} 