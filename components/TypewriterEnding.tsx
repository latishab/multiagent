import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCompletionMessages, narrativesToMessages } from '../utils/guideNarratives';

interface TypewriterEndingProps {
  endingType: 'good' | 'bad';
  onComplete: () => void;
}

export default function TypewriterEnding({ endingType, onComplete }: TypewriterEndingProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sound effect durations in milliseconds (exact from audio files)
  const soundDurations = {
    good: [16196, 18442, 16274, 3004], // good_ending_1.mp3 (16.2s), good_ending_2.mp3 (18.4s), good_ending_3.mp3 (16.3s), good_ending_4.mp3 (3.0s)
    bad: [11886, 16431, 10762] // bad_ending_1.mp3 (11.9s), bad_ending_2.mp3 (16.4s), bad_ending_3.mp3 (10.8s)
  };

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
  const currentDurations = soundDurations[endingType];
  
  console.log('TypewriterEnding Debug:', {
    endingType,
    messagesCount: messages.length,
    currentMessageIndex,
    currentMessage: currentMessage?.text,
    isVisible
  });

  // Play sound effect for current message
  useEffect(() => {
    if (!currentMessage) return;

    const soundIndex = currentMessageIndex;
    const soundFile = `${endingType}_ending_${soundIndex + 1}.mp3`;
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Create and play audio
    audioRef.current = new Audio(`/assets/sound_effects/${soundFile}`);
    audioRef.current.loop = false; // Ensure no looping
    audioRef.current.play().catch(err => {
      console.log('Audio play failed:', err);
    });

    // Fade in the message
    setIsVisible(true);

    // Set timeout based on sound duration
    const duration = currentDurations[soundIndex] || 5000;
    const timeoutId = setTimeout(() => {
      setIsVisible(false);
      
      // Wait for fade out, then move to next message or show continue button
      setTimeout(() => {
        if (currentMessageIndex < messages.length - 1) {
          setCurrentMessageIndex(prev => prev + 1);
        } else {
          setShowContinueButton(true);
        }
      }, 500); // 500ms fade out duration
    }, duration);

    return () => {
      clearTimeout(timeoutId);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentMessageIndex, endingType, messages.length, currentDurations]); 

  const handleContinue = () => {
    if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(prev => prev + 1);
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
        <div className={`dialogue-content ${isVisible ? 'fade-in' : 'fade-out'}`}>
          {currentMessage?.text || 'Loading message...'}
        </div>
      </div>

      {/* Continue Button - Top Right */}
      {showContinueButton && (
        <div className="continue-section">
          <button className="continue-button" onClick={handleContinue}>
            {currentMessageIndex < messages.length - 1 ? 'Continue' : 'Return to Main Menu'}
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