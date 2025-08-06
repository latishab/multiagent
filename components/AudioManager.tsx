import React, { useEffect, useRef, useState } from 'react';

interface AudioManagerProps {
  isPlaying: boolean;
  volume?: number;
}

export default function AudioManager({ isPlaying, volume = 0.25 }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Create audio element
    const audio = new Audio('/assets/soundtrack/the_archimedes_initiative.mp3');
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    
    audioRef.current = audio;

    // Handle audio events
    const handleCanPlayThrough = () => {
      setIsLoaded(true);
      console.log('Soundtrack loaded successfully');
    };

    const handleError = (e: Event) => {
      console.error('Error loading soundtrack:', e);
    };

    const handleEnded = () => {
      console.log('Soundtrack ended, should loop automatically');
    };

    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [volume]);

  // Handle play/pause based on game state
  useEffect(() => {
    if (!audioRef.current || !isLoaded) return;

    if (isPlaying && !isMuted) {
      audioRef.current.play().catch(error => {
        console.error('Error playing soundtrack:', error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isLoaded, isMuted]);

  // Handle mute/unmute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    setIsMuted(!isMuted);
    if (!isMuted) {
      audioRef.current.pause();
    } else if (isPlaying) {
      audioRef.current.play().catch(error => {
        console.error('Error playing soundtrack:', error);
      });
    }
  };

  // Handle volume changes
  const handleVolumeChange = (newVolume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = newVolume;
  };

  // Listen for custom events from GameMenu
  useEffect(() => {
    const handleToggleMute = (event: CustomEvent) => {
      setIsMuted(event.detail.isMuted);
    };

    const handleVolumeChange = (event: CustomEvent) => {
      if (audioRef.current) {
        audioRef.current.volume = event.detail.volume;
      }
    };

    window.addEventListener('audio-toggle-mute', handleToggleMute as EventListener);
    window.addEventListener('audio-volume-change', handleVolumeChange as EventListener);

    return () => {
      window.removeEventListener('audio-toggle-mute', handleToggleMute as EventListener);
      window.removeEventListener('audio-volume-change', handleVolumeChange as EventListener);
    };
  }, []);

  return null;
} 