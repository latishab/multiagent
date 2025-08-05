import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCompletionMessages, narrativesToMessages } from '../utils/guideNarratives';

interface TypewriterEndingProps {
  endingType: 'good' | 'bad';
  onComplete: () => void;
}

export default function TypewriterEnding({ endingType, onComplete }: TypewriterEndingProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get the appropriate ending messages based on ending type
  const getEndingMessages = useCallback(() => {
    const completionMessages = getCompletionMessages();
    if (endingType === 'good') {
      return completionMessages.filter(msg => msg.id.startsWith('good_ending'));
    } else {
      return completionMessages.filter(msg => msg.id.startsWith('bad_ending'));
    }
  }, [endingType]);

  const messages = useMemo(() => getEndingMessages(), [getEndingMessages]);
  const currentMessage = messages[currentMessageIndex];
  
  console.log('TypewriterEnding Debug:', {
    endingType,
    messagesCount: messages.length,
    currentMessageIndex,
    currentMessage: currentMessage?.text,
    currentText,
    isTyping
  });

  useEffect(() => {
    if (!currentMessage) {
      console.log('No current message available');
      return;
    }

    console.log('Starting typewriter effect for message:', currentMessage.text);
    let index = 0;
    const typeSpeed = 40; // Slow but steady speed
    let isActive = true; 

    const typeText = () => {
      if (!isActive) return;
      
      if (index < currentMessage.text.length) {
        const newText = currentMessage.text.slice(0, index + 1);
        setCurrentText(newText);
        console.log('Typing:', newText);
        index++;
        setTimeout(typeText, typeSpeed);
      } else {
        setIsTyping(false);
        console.log('Finished typing message');
        // Wait a bit before showing continue button or moving to next message
        setTimeout(() => {
          if (isActive && currentMessageIndex < messages.length - 1) {
            // Add a 2-second delay before starting the next message
            setTimeout(() => {
              if (isActive) {
                setCurrentMessageIndex(prev => prev + 1);
                setCurrentText('');
                setIsTyping(true);
              }
            }, 2000); // 2 second delay between messages
          } else if (isActive) {
            setShowContinueButton(true);
          }
        }, 1000);
      }
    };

    // Add a timeout to prevent getting stuck
    const timeoutId = setTimeout(() => {
      if (isActive) {
        console.log('Typewriter timeout - showing full message');
        setCurrentText(currentMessage.text);
        setIsTyping(false);
      }
    }, 5000); // 5 second timeout

    typeText();

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [currentMessageIndex, currentMessage?.text]); // Only depend on the text content, not the entire message object

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentText]);

  const handleContinue = () => {
    if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(prev => prev + 1);
      setCurrentText('');
      setIsTyping(true);
      setShowContinueButton(false);
    } else {
      onComplete();
    }
  };

  const getEndingTitle = () => {
    switch (endingType) {
      case 'good':
        return 'Good Ending';
      case 'bad':
        return 'Bad Ending';
      default:
        return '';
    }
  };

  return (
    <div className="typewriter-ending">
      {/* Ending Image - Full Screen */}
      <img 
        src={`/assets/Engding/${endingType === 'good' ? 'good ending.jpg' : 'bad ending.jpg'}`}
        alt="Ending Scene"
        className="ending-image"
      />

      {/* Dialogue Overlay - Bottom */}
      <div className="dialogue-overlay">
        <div className="dialogue-content">
          {currentText || currentMessage?.text || 'Loading message...'}
          {isTyping && <span className="cursor">|</span>}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Continue Button - Top Right */}
      {showContinueButton && (
        <div className="continue-section">
          <button className="continue-button" onClick={handleContinue}>
            {currentMessageIndex < messages.length - 1 ? 'Continue' : 'Return to Menu'}
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
        }

        .cursor {
          color: #3b82f6;
          font-weight: bold;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .continue-section {
          position: absolute;
          top: clamp(1rem, 4vw, 2rem);
          right: clamp(1rem, 4vw, 2rem);
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
        }
      `}</style>
    </div>
  );
} 