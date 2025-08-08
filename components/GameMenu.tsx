import React, { useState, useEffect } from 'react';
import { sessionManager } from '../utils/sessionManager';
import { soundEffects } from '../utils/soundEffects';
import styles from '../styles/GameMenu.module.css';

interface GameMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartGame: () => void;
  onNewGame: () => void;
  onReturnToMainMenu: () => void;
}

type MenuState = 'main' | 'controls' | 'audio';

export default function GameMenu({ isOpen, onClose, onRestartGame, onNewGame, onReturnToMainMenu }: GameMenuProps) {
  const [currentMenu, setCurrentMenu] = useState<MenuState>('main');
  const [isMuted, setIsMuted] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [sfxVolume, setSfxVolume] = useState(0.5);

  const handleRestartGame = async () => {
    if (confirm('Are you sure you want to restart the game? This will clear your current progress.')) {
      onRestartGame();
      onClose();
    }
  };

  const handleNewGame = async () => {
    if (confirm('Are you sure you want to start a new game? This will clear all conversations and reset your session.')) {
      try {
        // Don't clear the session - let the onNewGame handler manage the clearing
        onNewGame();
        onClose();
      } catch (error) {
        console.error('Error starting new game:', error);
        // Fallback: just restart without clearing session
        onNewGame();
        onClose();
      }
    }
  };

  const toggleMute = () => {
    soundEffects.playClick();
    setIsMuted(!isMuted);
    window.dispatchEvent(new CustomEvent('audio-toggle-mute', { detail: { isMuted: !isMuted } }));
  };

  const toggleSfxMute = () => {
    soundEffects.playClick();
    setIsSfxMuted(!isSfxMuted);
    window.dispatchEvent(new CustomEvent('audio-toggle-sfx-mute', { detail: { isSfxMuted: !isSfxMuted } }));
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    window.dispatchEvent(new CustomEvent('audio-volume-change', { detail: { volume: newVolume } }));
  };

  const handleSfxVolumeChange = (newSfxVolume: number) => {
    setSfxVolume(newSfxVolume);
    window.dispatchEvent(new CustomEvent('audio-sfx-volume-change', { detail: { sfxVolume: newSfxVolume } }));
  };

  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    handleVolumeChange(newVolume);
  };

  const handleSfxVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSfxVolume = parseFloat(e.target.value);
    handleSfxVolumeChange(newSfxVolume);
  };

  const renderMainMenu = () => (
    <div className={styles.menuContent}>
      <h1 className={styles.gameTitle}>City Reconstruction</h1>
      <p className={styles.gameSubtitle}>Shape the future of your city</p>
      
      <div className={styles.menuButtons}>
        <button className={`${styles.menuButton} ${styles.primary}`} onClick={() => {
          soundEffects.playClick();
          onClose();
        }}>
          Continue Game
        </button>
        <button className={`${styles.menuButton} ${styles.danger}`} onClick={() => {
          soundEffects.playClick();
          handleRestartGame();
        }}>
          Restart Game
        </button>
        <button className={styles.menuButton} onClick={() => {
          soundEffects.playClick();
          onReturnToMainMenu();
        }}>
          Return to Main Menu
        </button>
        <button className={styles.menuButton} onClick={() => {
          soundEffects.playClick();
          setCurrentMenu('controls');
        }}>
          Controls
        </button>

      </div>

      <div className={styles.menuFooter}>
        <p>Press ESC to close menu</p>
      </div>
    </div>
  );



  const renderControls = () => (
    <div className={styles.menuContent}>
      <div className={styles.menuHeader}>
        <button className={styles.backButton} onClick={() => {
          soundEffects.playClick();
          setCurrentMenu('main');
        }}>
          ← Back
        </button>
        <h2>Controls</h2>
      </div>

      <div className={styles.controlsSection}>
        <h3>Movement</h3>
        <div className={styles.controlGrid}>
          <div className={styles.controlItem}>
            <span className={styles.key}>WASD</span>
            <span className={styles.description}>Move around the facility</span>
          </div>
          <div className={styles.controlItem}>
            <span className={styles.key}>Arrow Keys</span>
            <span className={styles.description}>Alternative movement</span>
          </div>
        </div>
      </div>

      <div className={styles.controlsSection}>
        <h3>Interaction</h3>
        <div className={styles.controlGrid}>
          <div className={styles.controlItem}>
            <span className={styles.key}>E</span>
            <span className={styles.description}>Interact with NPCs</span>
          </div>
          <div className={styles.controlItem}>
            <span className={styles.key}>I</span>
            <span className={styles.description}>Open inventory</span>
          </div>
        </div>
      </div>

      <div className={styles.controlsSection}>
        <h3>Interface</h3>
        <div className={styles.controlGrid}>
          <div className={styles.controlItem}>
            <span className={styles.key}>1-5</span>
            <span className={styles.description}>Select hotbar slots</span>
          </div>
          <div className={styles.controlItem}>
            <span className={styles.key}>ESC</span>
            <span className={styles.description}>Close dialogs / Open menu</span>
          </div>
        </div>
      </div>

      <div className={styles.controlsSection}>
        <h3>Audio</h3>
        <div className={styles.audioControls}>
          <div className={styles.audioControl}>
            <span className={styles.controlLabel}>Music</span>
            <button 
              className={`${styles.audioButton} ${isMuted ? styles.active : ''}`}
              onClick={toggleMute}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeSliderChange}
              className={styles.volumeSlider}
              disabled={isMuted}
            />
            <span className={styles.volumeValue}>{Math.round(volume * 100)}%</span>
          </div>
          <div className={styles.audioControl}>
            <span className={styles.controlLabel}>SFX</span>
            <button 
              className={`${styles.audioButton} ${isSfxMuted ? styles.active : ''}`}
              onClick={toggleSfxMute}
            >
              {isSfxMuted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={handleSfxVolumeSliderChange}
              className={styles.volumeSlider}
              disabled={isSfxMuted}
            />
            <span className={styles.volumeValue}>{Math.round(sfxVolume * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className={styles.gameMenuOverlay}>
      <div className={styles.gameMenu}>
        {currentMenu === 'main' && renderMainMenu()}
        {currentMenu === 'controls' && renderControls()}
      </div>
    </div>
  );
} 