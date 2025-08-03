import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import MainScene from '../game/scenes/MainScene'

export default function Game() {
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      backgroundColor: '#000000',
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%'
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: MainScene
    }

    gameRef.current = new Phaser.Game(config)

    // Create a global reference to access the game instance
    ;(window as any).game = gameRef.current

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  return <div id="game-container" className="absolute inset-0" />
} 