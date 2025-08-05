import React, { useState, useEffect } from 'react'
import TypewriterEnding from './TypewriterEnding'

interface EndingOverlayProps {
  isVisible: boolean;
  endingType: 'good' | 'bad' | null;
  onClose: () => void;
}

export default function EndingOverlay({ isVisible, endingType, onClose }: EndingOverlayProps) {
  const [showTypewriter, setShowTypewriter] = useState(false);

  useEffect(() => {
    if (isVisible && endingType) {
      // Show typewriter ending after a short delay
      setTimeout(() => {
        setShowTypewriter(true);
      }, 500);
    } else {
      setShowTypewriter(false);
    }
  }, [isVisible, endingType]);

  if (!isVisible || !endingType) {
    return null;
  }

  return (
    <>
      {showTypewriter && (
        <TypewriterEnding 
          endingType={endingType} 
          onComplete={onClose}
        />
      )}
    </>
  )
} 