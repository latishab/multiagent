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
  
  // Fixed display durations per message group (no audio)
  const displayDurations = useMemo(() => ({
    good: [3000, 3000, 3000],
    medium: [3000, 3000, 3000],
    bad: [3000, 3000, 3000]
  }), []);

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
  const currentDurations = useMemo(() => displayDurations[activeEndingType], [displayDurations, activeEndingType]);

  // Main effect for playing the message sequence (no audio)
  useEffect(() => {
    if (!currentMessage || isSequenceFinished) return;

    setIsVisible(true);

    const duration = currentDurations[currentMessageIndex] || 3000;
    const timeoutId = setTimeout(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        if (currentMessageIndex < messages.length - 1) {
          setCurrentMessageIndex(prev => prev + 1);
        } else {
          setIsSequenceFinished(true);
        }
      }, 500);
    }, duration);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentMessageIndex, activeEndingType, messages.length, currentMessage, isSequenceFinished, currentDurations]); 

  const handleViewAlternateEnding = () => {
    setActiveEndingType('good'); // Switch to the good ending
    setCurrentMessageIndex(0);    // Reset to the first message
    setIsSequenceFinished(false); // Hide the buttons and restart the sequence
  };

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
      <img 
        src={`/assets/Engding/${activeEndingType === 'good' ? 'good ending.jpg' : activeEndingType === 'medium' ? 'medium.jpg' : 'bad ending.jpg'}`}
        alt="Ending Scene"
        className="ending-image"
      />

      <div className="dialogue-overlay">
        <div className={`dialogue-content ${isVisible ? 'fade-in' : 'fade-out'}`}>
          {currentMessage?.text || ''}
        </div>
      </div>

      {isSequenceFinished && (
        <div className="continue-section">
          {/* If the initial ending was bad, show the choice */}
          {endingType === 'bad' && activeEndingType === 'bad' && (
            <button className="continue-button alternate" onClick={handleViewAlternateEnding}>
              View a Different Outcome
            </button>
          )}
          {/* Always show the main menu button at the very end */}
          <button className="continue-button" onClick={onComplete}>
            Return to Main Menu
          </button>
        </div>
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
          background: rgba(0, 0, 0, 0.8);
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

        .continue-section {
          position: absolute;
          bottom: calc(clamp(120px, 25vh, 200px) + 2rem); /* Position above the dialogue box */
          right: clamp(1rem, 4vw, 2rem);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: flex-end;
          animation: fadeInButtons 1s ease-in-out;
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
        
        .continue-button.alternate {
          background: linear-gradient(135deg, #16a34a, #15803d); /* Green for alternate outcome */
        }

        .continue-button.alternate:hover {
          background: linear-gradient(135deg, #15803d, #166534);
          box-shadow: 0 6px 20px rgba(22, 163, 74, 0.4);
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
        }
      `}</style>
    </div>
  );
} 