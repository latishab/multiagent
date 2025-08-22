import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getCompletionMessages } from '../utils/guideNarratives';

interface TypewriterEndingProps {
  endingType: 'good' | 'medium' | 'bad';
  onComplete: () => void;
}

export default function TypewriterEnding({ endingType, onComplete }: TypewriterEndingProps) {
  const [activeEndingType, setActiveEndingType] = useState<'good' | 'medium' | 'bad'>(endingType);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isSequenceFinished, setIsSequenceFinished] = useState(false);
  const [showGameTitle, setShowGameTitle] = useState(false);
  const [fadeOutEnding, setFadeOutEnding] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);

  const getEndingMessages = useCallback(() => {
    const completionMessages = getCompletionMessages();
    if (activeEndingType === 'good') {
      return completionMessages.filter(msg => msg.id.startsWith('good_ending'));
    }
    if (activeEndingType === 'medium') {
      return completionMessages.filter(msg => msg.id.startsWith('medium_ending'));
    }
    return completionMessages.filter(msg => msg.id.startsWith('bad_ending'));
  }, [activeEndingType]);

  const messages = useMemo(() => getEndingMessages(), [getEndingMessages]);
  const currentMessage = messages[currentMessageIndex];

  // Show first message immediately, then wait for input
  useEffect(() => {
    if (!currentMessage || isSequenceFinished) return;

    setWaitingForInput(false); // Reset waiting state
    setIsVisible(true);
    // After message appears, wait for input
    setTimeout(() => {
      setWaitingForInput(true);
    }, 500);
  }, [currentMessageIndex, activeEndingType, messages.length, currentMessage, isSequenceFinished]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && waitingForInput && !isSequenceFinished) {
        setWaitingForInput(false);
        setIsVisible(false);
        
        setTimeout(() => {
          if (currentMessageIndex < messages.length - 1) {
            setCurrentMessageIndex(prev => prev + 1);
          } else {
            setIsSequenceFinished(true);
          }
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [waitingForInput, currentMessageIndex, messages.length, isSequenceFinished]);

  // Handle crossfade transition when sequence finishes
  useEffect(() => {
    if (isSequenceFinished) {
      // Start fade out of ending content
      setFadeOutEnding(true);
      
      // After fade out, show game title
      setTimeout(() => {
        setShowGameTitle(true);
      }, 1000); // 1 second crossfade
    }
  }, [isSequenceFinished]); 

  const getEndingTitle = () => {
    switch (activeEndingType) {
      case 'good':
        return 'Good Ending';
      case 'medium':
        return 'More To Be Done';
      case 'bad':
        return 'Bad Ending';
      default:
        return '';
    }
  };

  return (
    <div className="typewriter-ending">
      {/* Ending scene content with crossfade */}
      <div className={`ending-content ${fadeOutEnding ? 'fade-out-ending' : ''}`}>
        <img 
          src={`/assets/ending/${activeEndingType === 'good' ? 'good ending.jpg' : activeEndingType === 'medium' ? 'medium.jpg' : 'bad ending.jpg'}`}
          alt="Ending Scene"
          className="ending-image"
        />

        <div className="dialogue-overlay">
          <div className={`dialogue-content ${isVisible ? 'fade-in' : 'fade-out'}`}>
            {currentMessage?.text || ''}
          </div>
          {waitingForInput && !isSequenceFinished && (
            <div className="continue-hint">
              Press <span className="key-hint">Enter</span> to continue
            </div>
          )}
        </div>
      </div>

      {/* Game title section with crossfade */}
      {showGameTitle && (
        <>
          <div className="game-title-section fade-in-title">
            <img 
              src="/assets/ending/earthseed-transparent.png" 
              alt="Earthseed"
              className="game-title-image"
            />
            <h1 className="game-title-text">Earthseed</h1>
            <h2 className="game-subtitle-text">Future is still up to us</h2>
          </div>
          <div className="continue-section">
            {/* Always show the main menu button at the very end */}
            <button className="continue-button" onClick={onComplete}>
              Return to Main Menu
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        .typewriter-ending {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #000000;
          z-index: 10000;
          overflow: hidden;
        }

        .ending-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 1;
          transition: opacity 1s ease-in-out;
        }

        .ending-content.fade-out-ending {
          opacity: 0;
        }

        .ending-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          max-height: 80vh;
          padding-top: clamp(2rem, 6vw, 4rem);
        }

        .dialogue-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 1);
          padding: clamp(1rem, 4vw, 2rem);
          color: white;
          font-size: clamp(1rem, 3vw, 1.25rem);
          line-height: 1.6;
          text-align: left;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          height: clamp(120px, 25vh, 200px);
          overflow-y: auto;
        }

        .dialogue-content {
          max-width: clamp(400px, 80vw, 800px);
          margin: 0 auto;
          text-align: left;
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
        }

        .dialogue-content.fade-in {
          opacity: 1;
        }

        .dialogue-content.fade-out {
          opacity: 0;
        }

        .continue-hint {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          color: rgba(255, 255, 255, 0.8);
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          animation: pulseHint 2s ease-in-out infinite;
          background: rgba(0, 0, 0, 0.6);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .key-hint {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: bold;
          color: #ffffff;
          margin: 0 0.25rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        @keyframes pulseHint {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        .game-title-section {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          z-index: 10;
        }

        .fade-in-title {
          animation: fadeInTitle 2s ease-in-out;
        }

        .game-title-image {
          max-width: clamp(300px, 60vw, 600px);
          height: auto;
          filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))
                  drop-shadow(0 0 40px rgba(255, 255, 255, 0.6))
                  drop-shadow(0 0 60px rgba(255, 255, 255, 0.4));
          margin-bottom: clamp(-1rem, -2vw, -0.5rem);
        }

        .game-title-text {
          font-size: clamp(2rem, 6vw, 4rem);
          font-weight: bold;
          color: #ffffff;
          text-shadow: 
            0 0 20px rgba(255, 255, 255, 0.8),
            0 0 40px rgba(255, 255, 255, 0.6),
            0 0 60px rgba(255, 255, 255, 0.4);
          margin: 0;
          letter-spacing: 0.1em;
          font-family: 'serif', Georgia, 'Times New Roman', serif;
          transform: translateY(clamp(-1rem, -3vw, -2rem));
        }

        .game-subtitle-text {
          font-size: clamp(1rem, 2.5vw, 1.5rem);
          font-weight: normal;
          color: #ffffff;
          text-shadow: 
            0 0 10px rgba(255, 255, 255, 0.6),
            0 0 20px rgba(255, 255, 255, 0.4);
          margin: clamp(-0.5rem, -0.5vw, -0.25rem) 0 0 0;
          letter-spacing: 0.05em;
          font-family: 'serif', Georgia, 'Times New Roman', serif;
          font-style: italic;
          opacity: 0.9;
        }

        @keyframes fadeInTitle {
          0% { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(0.8);
          }
          50% {
            opacity: 0.7;
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .continue-section {
          position: absolute;
          bottom: calc(clamp(120px, 25vh, 200px) + 2rem); /* Position above the dialogue box */
          right: clamp(1rem, 4vw, 2rem);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: flex-end;
          animation: fadeInButtons 3s ease-in-out;
        }

        @keyframes fadeInButtons {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .continue-button {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white !important;
          border: none;
          padding: clamp(0.75rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem);
          font-size: clamp(0.875rem, 2vw, 1rem);
          font-weight: bold;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .continue-button:hover {
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
          color: white !important;
        }

        .continue-button:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .dialogue-overlay {
            padding: 1rem;
          }

          .dialogue-content {
            font-size: clamp(0.875rem, 2.5vw, 1rem);
          }

          .continue-button {
            padding: 0.5rem 1rem;
            font-size: 0.75rem;
          }

          .game-title-image {
            max-width: clamp(250px, 80vw, 400px);
            margin-bottom: clamp(-0.75rem, -1vw, -0.5rem);
          }

          .game-title-text {
            font-size: clamp(1.5rem, 8vw, 3rem);
            letter-spacing: 0.05em;
            transform: translateY(clamp(-0.75rem, -2vw, -1rem));
          }

          .game-subtitle-text {
            font-size: clamp(0.75rem, 3vw, 1.25rem);
            margin: clamp(-0.75rem, -0.75vw, -0.5rem) 0 0 0;
          }

          .game-title-section {
            top: 45%;
          }

          .continue-hint {
            bottom: 0.5rem;
            right: 0.5rem;
            font-size: clamp(0.625rem, 2.5vw, 0.75rem);
            padding: 0.375rem 0.75rem;
          }

          .key-hint {
            padding: 0.125rem 0.375rem;
            margin: 0 0.125rem;
          }
        }
      `}</style>
    </div>
  );
} 