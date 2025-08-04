import React, { useState, useEffect } from 'react'

interface EndingOverlayProps {
  isVisible: boolean;
  endingType: 'good' | 'bad' | 'medium' | null;
  onClose: () => void;
}

export default function EndingOverlay({ isVisible, endingType, onClose }: EndingOverlayProps) {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (isVisible && endingType) {
      // Start fade in after a short delay
      setTimeout(() => {
        setFadeIn(true);
      }, 500);
    } else {
      setFadeIn(false);
    }
  }, [isVisible, endingType]);

  if (!isVisible || !endingType) {
    return null;
  }

  const getEndingImage = () => {
    switch (endingType) {
      case 'good':
        return '/assets/Engding/good ending.jpg';
      case 'bad':
        return '/assets/Engding/bad ending.jpg';
      case 'medium':
        return '/assets/Engding/medium.jpg';
      default:
        return '';
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

  const getEndingDescription = () => {
    switch (endingType) {
      case 'good':
        return 'Your sustainable choices have led to a brighter future for the city. The environment and community thrive together.';
      case 'bad':
        return 'Economic priorities have taken precedence. The city faces challenges ahead.';
      case 'medium':
        return 'A balanced approach has been taken. The city\'s future remains uncertain.';
      default:
        return '';
    }
  };

  return (
    <>
      <div className={`ending-overlay ${fadeIn ? 'fade-in' : ''}`}>
        <div className="ending-content">
          <img 
            src={getEndingImage()} 
            alt={`${endingType} ending`}
            className="ending-image"
          />
          <div className="ending-text">
            <h1 className="ending-title">{getEndingTitle()}</h1>
            <p className="ending-description">{getEndingDescription()}</p>
            <button className="ending-button" onClick={onClose}>
              Return to Menu
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ending-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }

        .ending-overlay.fade-in {
          opacity: 1;
        }

        .ending-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 90vw;
          max-height: 90vh;
        }

        .ending-image {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .ending-text {
          margin-top: 2rem;
          text-align: center;
          color: white;
        }

        .ending-title {
          font-size: 3rem;
          font-weight: bold;
          margin: 0 0 1rem 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }

        .ending-description {
          font-size: 1.2rem;
          margin: 0 0 2rem 0;
          max-width: 600px;
          line-height: 1.6;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .ending-button {
          padding: 1rem 2rem;
          font-size: 1.1rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .ending-button:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }

        @media (max-width: 768px) {
          .ending-title {
            font-size: 2rem;
          }
          
          .ending-description {
            font-size: 1rem;
          }
          
          .ending-button {
            padding: 0.8rem 1.5rem;
            font-size: 1rem;
          }
        }
      `}</style>
    </>
  )
} 