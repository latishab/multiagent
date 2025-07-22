import { useEffect, useRef } from 'react'
import { Game } from 'phaser'
import { gameConfig } from '../game/gameConfig'

export default function GameComponent() {
  const gameRef = useRef<Game | null>(null)

  useEffect(() => {
    if (!gameRef.current) {
      const config = {
        ...gameConfig,
        parent: 'game-container',
        dom: {
          createContainer: true
        }
      }

      const game = new Game(config)
      gameRef.current = game
      ;(window as any).game = game
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
        delete (window as any).game
      }
    }
  }, [])

  return (
    <div 
      id="game-container" 
      className="w-full h-full"
      style={{
        position: 'relative',
        zIndex: 0
      }}
    />
  )
} 