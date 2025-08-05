import React, { useState, useEffect, useRef } from 'react';
import { getCompletionMessages, narrativesToMessages } from '../utils/guideNarratives';

interface TypewriterEndingProps {
  endingType: 'good' | 'bad' | 'medium';
  onComplete: () => void;
}

export default function TypewriterEnding({ endingType, onComplete }: TypewriterEndingProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get the appropriate ending messages based on ending type
  const getEndingMessages = () => {
    const completionMessages = getCompletionMessages();
    if (endingType === 'good') {
      return completionMessages.filter(msg => msg.id.startsWith('good_ending'));
    } else if (endingType === 'bad') {
      return completionMessages.filter(msg => msg.id.startsWith('bad_ending'));
    } else {
      // For medium ending, we'll create a custom message
      return [
        {
          id: 'medium_ending_1',
          text: "You've taken a balanced approach to the recovery mission. Some systems will thrive while others may struggle. The facility's future remains uncertain, but you've shown that compromise is possible even in the most challenging circumstances.",
          context: 'completion' as const,
          phase: 'final' as const
        },
        {
          id: 'medium_ending_2',
          text: "Your choices reflect the complexity of rebuilding after centuries of neglect. Not every system can be optimized, and sometimes the best we can do is find a middle ground that prevents total collapse while acknowledging our limitations.",
          context: 'completion' as const,
          phase: 'final' as const
        },
        {
          id: 'medium_ending_3',
          text: "The path forward will be challenging, but you've given us a chance. Thank you for your efforts, Commander. The work continues.",
          context: 'completion' as const,
          phase: 'final' as const
        }
      ];
    }
  };

  const messages = getEndingMessages();
  const currentMessage = messages[currentMessageIndex];

  useEffect(() => {
    if (!currentMessage) return;

    let index = 0;
    const typeSpeed = 30; // milliseconds per character

    const typeText = () => {
      if (index < currentMessage.text.length) {
        setCurrentText(currentMessage.text.slice(0, index + 1));
        index++;
        setTimeout(typeText, typeSpeed);
      } else {
        setIsTyping(false);
        // Wait a bit before showing continue button or moving to next message
        setTimeout(() => {
          if (currentMessageIndex < messages.length - 1) {
            setCurrentMessageIndex(prev => prev + 1);
            setCurrentText('');
            setIsTyping(true);
          } else {
            setShowContinueButton(true);
          }
        }, 1000);
      }
    };

    typeText();
  }, [currentMessageIndex, currentMessage, messages.length]);

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
      case 'medium':
        return 'Neutral Ending';
      default:
        return '';
    }
  };

  return (
    <div className="typewriter-ending">
      <div className="ending-container">
        <div className="ending-header">
          <div className="michael-profile">
            <img 
              src="/assets/characters/tourguide.png" 
              alt="Michael" 
              className="michael-avatar"
            />
            <div className="michael-info">
              <h3 className="michael-name">Michael</h3>
              <span className="michael-title">Global Recovery Authority</span>
            </div>
          </div>
          <h1 className="ending-title">{getEndingTitle()}</h1>
        </div>

        <div className="message-container">
          <div className="message-content">
            {currentText}
            {isTyping && <span className="cursor">|</span>}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {showContinueButton && (
          <div className="continue-section">
            <button className="continue-button" onClick={handleContinue}>
              {currentMessageIndex < messages.length - 1 ? 'Continue' : 'Return to Menu'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .typewriter-ending {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95));
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: clamp(1rem, 4vw, 2rem);
        }

        .ending-container {
          background: rgba(17, 24, 39, 0.95);
          border: 2px solid #374151;
          border-radius: 16px;
          padding: clamp(1.5rem, 4vw, 3rem);
          max-width: clamp(400px, 80vw, 800px);
          width: 100%;
          max-height: clamp(300px, 70vh, 600px);
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
        }

        .ending-header {
          text-align: center;
          margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
        }

        .michael-profile {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(0.75rem, 2vw, 1rem);
          margin-bottom: clamp(1rem, 3vw, 1.5rem);
        }

        .michael-avatar {
          width: clamp(3rem, 8vw, 4rem);
          height: clamp(3rem, 8vw, 4rem);
          border-radius: 50%;
          object-fit: cover;
          object-position: center top;
          border: 2px solid #374151;
        }

        .michael-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }

        .michael-name {
          color: #3b82f6;
          font-size: clamp(1rem, 3vw, 1.25rem);
          font-weight: bold;
          margin: 0;
        }

        .michael-title {
          color: #9ca3af;
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          font-style: italic;
        }

        .ending-title {
          color: #f9fafb;
          font-size: clamp(1.5rem, 5vw, 2.5rem);
          font-weight: bold;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .message-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: clamp(120px, 30vh, 200px);
        }

        .message-content {
          color: #e5e7eb;
          font-size: clamp(1rem, 3vw, 1.25rem);
          line-height: 1.6;
          text-align: center;
          padding: clamp(1rem, 3vw, 1.5rem);
          background: rgba(31, 41, 55, 0.5);
          border-radius: 12px;
          border: 1px solid #374151;
          position: relative;
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
          display: flex;
          justify-content: center;
          margin-top: clamp(1rem, 3vw, 1.5rem);
        }

        .continue-button {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white !important;
          border: none;
          padding: clamp(1rem, 3vw, 1.5rem) clamp(2rem, 6vw, 3rem);
          font-size: clamp(1rem, 2.5vw, 1.125rem);
          font-weight: bold;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          text-transform: uppercase;
          letter-spacing: 1px;
          min-width: clamp(120px, 25vw, 200px);
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
          .ending-container {
            margin: 1rem;
            padding: 1.5rem;
          }

          .michael-profile {
            flex-direction: column;
            text-align: center;
          }

          .michael-info {
            align-items: center;
          }

          .message-content {
            text-align: left;
          }
        }

        @media (max-height: 600px) {
          .ending-container {
            max-height: 90vh;
          }

          .ending-header {
            margin-bottom: 1rem;
          }

          .message-container {
            min-height: 100px;
          }
        }
      `}</style>
    </div>
  );
} 