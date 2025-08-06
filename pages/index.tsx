import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { sessionManager } from '../utils/sessionManager'

const GameComponent = dynamic(() => import('../components/GameComponent'), {
  ssr: false
})

const UIOverlay = dynamic(() => import('../components/UIOverlay'), {
  ssr: false
})

const MainMenu = dynamic(() => import('../components/MainMenu'), {
  ssr: false
})

const TypewriterEnding = dynamic(() => import('../components/TypewriterEnding'), {
  ssr: false
})

const AudioManager = dynamic(() => import('../components/AudioManager'), {
  ssr: false
})

type GameState = 'menu' | 'playing' | 'ending';

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [participantId, setParticipantId] = useState<string>('');
  const [endingType, setEndingType] = useState<'good' | 'bad'>('good');

  useEffect(() => {
    // Check if there's an existing session
    const checkExistingSession = async () => {
      const sessionInfo = sessionManager.getSessionInfo();
      console.log('Checking existing session:', sessionInfo);
      if (sessionInfo.participantId) {
        console.log('Found existing participant ID:', sessionInfo.participantId);
        setParticipantId(sessionInfo.participantId);
        setGameState('playing');
      } else {
        console.log('No existing participant ID found, showing main menu');
      }
    };

    checkExistingSession();
  }, []);

  const handleStartGame = (newParticipantId: string) => {
    console.log('Starting game with participant ID:', newParticipantId);
    setParticipantId(newParticipantId);
    setGameState('playing');
  };

  const handleReturnToMenu = () => {
    setGameState('menu');
  };

  const handleShowEnding = (type: 'good' | 'bad') => {
    setEndingType(type);
    setGameState('ending');
  };

  const handleEndingComplete = () => {
    setGameState('menu');
  };

  // Listen for ending events from the game
  useEffect(() => {
    const handleEndingEvent = (event: CustomEvent) => {
      if (event.detail.type === 'ending') {
        handleShowEnding(event.detail.endingType);
      }
    };

    const handleReturnToMainMenu = () => {
      handleReturnToMenu();
    };

    window.addEventListener('game-ending', handleEndingEvent as EventListener);
    window.addEventListener('return-to-main-menu', handleReturnToMainMenu as EventListener);
    
    return () => {
      window.removeEventListener('game-ending', handleEndingEvent as EventListener);
      window.removeEventListener('return-to-main-menu', handleReturnToMainMenu as EventListener);
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {gameState === 'menu' && (
        <MainMenu onStartGame={handleStartGame} />
      )}

      {gameState === 'playing' && (
        <>
          {/* Game Canvas Container */}
          <div className="absolute inset-0" style={{ zIndex: 0 }}>
            <GameComponent />
          </div>

          {/* UI Layer */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
            <UIOverlay gameInstance={null} />
          </div>
        </>
      )}

      {gameState === 'ending' && (
        <TypewriterEnding 
          endingType={endingType} 
          onComplete={handleEndingComplete} 
        />
      )}

      {/* Audio Manager - plays during game and menu */}
      <AudioManager isPlaying={gameState === 'playing' || gameState === 'menu'} />

      <style jsx global>{`
        /* Ensure Phaser canvas doesn't overlap UI */
        canvas {
          z-index: 0 !important;
        }
      `}</style>
    </main>
  )
} 