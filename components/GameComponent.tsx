import { useEffect, useRef, useState } from 'react'
import { Game } from 'phaser'
import { gameConfig } from '../game/gameConfig'
import UIOverlay from './UIOverlay'

export default function GameComponent() {
  const gameRef = useRef<HTMLDivElement>(null)
  const phaserGameRef = useRef<Game | null>(null)
  const [gameInstance, setGameInstance] = useState<Game | null>(null)

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      const config = {
        ...gameConfig,
        parent: gameRef.current,
      }
      
      const game = new Game(config)
      phaserGameRef.current = game
      setGameInstance(game)
      
      // Create a global reference to access the game instance
      ;(window as any).game = game
    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true)
        phaserGameRef.current = null
      }
    }
  }, [])

  return (
    <div className="game-container">
      <div ref={gameRef} />
      {gameInstance && <UIOverlay gameInstance={gameInstance} />}
    </div>
  )
} 