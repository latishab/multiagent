import { useEffect, useRef } from 'react'
import { Game } from 'phaser'
import { gameConfig } from '../game/gameConfig'

export default function GameComponent() {
  const gameRef = useRef<Game | null>(null)

  useEffect(() => {
    if (!gameRef.current) {
      const config = {
        ...gameConfig,
        parent: 'game-container'
      }

      gameRef.current = new Game(config)
      // Create a global reference to access the game instance
      ;(window as any).game = gameRef.current
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  return <div id="game-container" className="absolute inset-0" />
} 