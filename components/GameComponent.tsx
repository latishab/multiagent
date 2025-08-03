import { useEffect, useRef, useState } from 'react'
import { Game } from 'phaser'
import { gameConfig } from '../game/gameConfig'

export default function GameComponent() {
  const gameRef = useRef<Game | null>(null)
  const [gameError, setGameError] = useState<string | null>(null)

  useEffect(() => {
    if (!gameRef.current) {
      try {
        const config = {
          ...gameConfig,
          parent: 'game-container',
          dom: {
            createContainer: true
          },
          callbacks: {
            ...gameConfig.callbacks,
            preBoot: (game: any) => {
              // Call original preBoot if it exists
              if (gameConfig.callbacks?.preBoot) {
                gameConfig.callbacks.preBoot(game)
              }
              
              // Add additional error handling
              try {
                if (game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
                  const gl = game.renderer.gl;
                  if (gl) {
                    gl.getExtension('WEBGL_debug_renderer_info');
                    
                    // Add error handling for WebGL context
                    const canvas = gl.canvas;
                    if (canvas) {
                      canvas.addEventListener('webglcontextlost', (event: any) => {
                        console.error('WebGL context lost:', event);
                        setGameError('WebGL context lost. Please refresh the page.');
                        event.preventDefault();
                      });
                      
                      canvas.addEventListener('webglcontextrestored', () => {
                        console.log('WebGL context restored');
                        setGameError(null);
                      });
                    }
                  }
                }
              } catch (error) {
                console.error('Error in preBoot callback:', error);
                setGameError('Failed to initialize WebGL. Please refresh the page.');
              }
            }
          }
        }

        const game = new Game(config)
        gameRef.current = game
        ;(window as any).game = game
      } catch (error) {
        console.error('Failed to create game:', error)
        setGameError('Failed to start the game. Please refresh the page.')
      }
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
        delete (window as any).game
      }
    }
  }, [])

  if (gameError) {
    return (
      <div className="game-error w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Game Error</h2>
          <p className="mb-6">{gameError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

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