import React, { useState, useEffect } from 'react';
import { sessionManager } from '../utils/sessionManager';
import styles from '../styles/GameMenu.module.css';

interface MainMenuProps {
  onStartGame: (participantId: string) => void;
}

type MenuState = 'main' | 'participant' | 'settings' | 'controls';

export default function MainMenu({ onStartGame }: MainMenuProps) {
  const [participantId, setParticipantId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [existingParticipantId, setExistingParticipantId] = useState('');
  const [currentMenu, setCurrentMenu] = useState<MenuState>('main');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.25);

  useEffect(() => {
    // Check for existing session
    const checkExistingSession = async () => {
      const sessionInfo = sessionManager.getSessionInfo();
      if (sessionInfo.participantId) {
        setHasExistingSession(true);
        setExistingParticipantId(sessionInfo.participantId);
      } 
    };

    checkExistingSession();
  }, []);

  const handleStartNewGame = async () => {
    if (!participantId.trim()) {
      setError('Please enter a participant ID');
      return;
    }

    if (participantId.length < 2) {
      setError('Participant ID must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Store participant ID
      sessionManager.setParticipantId(participantId.trim());
      
      // Generate a new session ID for this participant
      await sessionManager.getSessionId();
      
      // Start the game
      onStartGame(participantId.trim());
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueGame = async () => {
    setIsLoading(true);
    setError('');

    try {
      onStartGame(existingParticipantId);
    } catch (error) {
      console.error('Error continuing game:', error);
      setError('Failed to continue game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSession = async () => {
    if (confirm('Are you sure you want to clear your current session? This will reset all progress.')) {
      await sessionManager.clearAll();
      setHasExistingSession(false);
      setExistingParticipantId('');
      setParticipantId('');
      setError('');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    window.dispatchEvent(new CustomEvent('audio-toggle-mute', { detail: { isMuted: !isMuted } }));
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    window.dispatchEvent(new CustomEvent('audio-volume-change', { detail: { volume: newVolume } }));
  };

  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    handleVolumeChange(newVolume);
  };

  const renderMainMenu = () => (
    <div className={styles.menuContent}>
      <h1 className={styles.gameTitle}>City Reconstruction</h1>
      <p className={styles.gameSubtitle}>Shape the future of your city</p>
      
      <div className={styles.menuButtons}>
        {hasExistingSession ? (
          <button 
            className={`${styles.menuButton} ${styles.primary}`} 
            onClick={handleContinueGame}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Continue Game'}
          </button>
        ) : (
          <button 
            className={`${styles.menuButton} ${styles.primary}`} 
            onClick={() => setCurrentMenu('participant')}
            disabled={isLoading}
          >
            Play
          </button>
        )}
        
        <button className={styles.menuButton} onClick={() => setCurrentMenu('settings')}>
          Settings
        </button>
        <button className={styles.menuButton} onClick={() => setCurrentMenu('controls')}>
          Controls
        </button>
      </div>
    </div>
  );

  const renderParticipantMenu = () => (
    <div className={styles.menuContent}>
      <div className={styles.menuHeader}>
        <button className={styles.backButton} onClick={() => setCurrentMenu('main')}>
          ← Back
        </button>
        <h2>Enter Participant ID</h2>
      </div>

      <div className={styles.newGameSection}>
        <h3>Enter Your Participant ID</h3>
        <p>Please enter your participant ID to begin the game.</p>
        
        <div className={styles.inputSection}>
          <input
            type="text"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value.toUpperCase())}
            placeholder="e.g., A1, P1, etc."
            className={styles.participantInput}
            maxLength={10}
            disabled={isLoading}
          />
          {error && <p className={styles.errorText}>{error}</p>}
        </div>

        <div className={styles.menuButtons}>
          <button 
            className={`${styles.menuButton} ${styles.primary}`} 
            onClick={handleStartNewGame}
            disabled={isLoading || !participantId.trim()}
          >
            {isLoading ? 'Starting...' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSettingsMenu = () => (
    <div className={styles.menuContent}>
      <div className={styles.menuHeader}>
        <button className={styles.backButton} onClick={() => setCurrentMenu('main')}>
          ← Back
        </button>
        <h2>Settings</h2>
      </div>

      <div className={styles.settingsSection}>
        <h3>Current Session</h3>
        <div className={styles.settingItem}>
          <span>Participant ID:</span>
          <span>{existingParticipantId || 'None'}</span>
        </div>
        <div className={styles.settingItem}>
          <span>Session Status:</span>
          <span>{hasExistingSession ? 'Active' : 'No active session'}</span>
        </div>
        <div className={styles.settingItem}>
          <button className={styles.menuButton} onClick={() => setCurrentMenu('participant')}>
            Change Participant ID
          </button>
        </div>
      </div>
    </div>
  );

  const renderControlsMenu = () => (
    <div className={styles.menuContent}>
      <div className={styles.menuHeader}>
        <button className={styles.backButton} onClick={() => setCurrentMenu('main')}>
          ← Back
        </button>
        <h2>Controls</h2>
      </div>

      <div className={styles.controlsSection}>
        <h3>Movement</h3>
        <div className={styles.controlGrid}>
          <div className={styles.controlItem}>
            <span className={styles.key}>WASD</span>
            <span className={styles.description}>Move around the city</span>
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
          <div className={styles.controlItem}>
            <span className={styles.key}>1</span>
            <span className={styles.description}>Open PDA (📱)</span>
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
            <span className={styles.controlLabel}>Mute</span>
            <button 
              className={`${styles.audioButton} ${isMuted ? styles.active : ''}`}
              onClick={toggleMute}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
          <div className={styles.audioControl}>
            <span className={styles.controlLabel}>Volume</span>
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
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.gameMenuOverlay}>
      <div className={styles.gameMenu}>
        {currentMenu === 'main' && renderMainMenu()}
        {currentMenu === 'participant' && renderParticipantMenu()}
        {currentMenu === 'settings' && renderSettingsMenu()}
        {currentMenu === 'controls' && renderControlsMenu()}
      </div>
    </div>
  );
} 