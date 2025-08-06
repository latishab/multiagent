import React, { useState } from 'react';
import { sessionManager } from '../utils/sessionManager';
import styles from '../styles/GameMenu.module.css';

interface GameMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartGame: () => void;
  onNewGame: () => void;
  onReturnToMainMenu: () => void;
}

type MenuState = 'main' | 'controls';

export default function GameMenu({ isOpen, onClose, onRestartGame, onNewGame, onReturnToMainMenu }: GameMenuProps) {
  const [currentMenu, setCurrentMenu] = useState<MenuState>('main');

  const handleRestartGame = async () => {
    if (confirm('Are you sure you want to restart the game? This will clear your current progress.')) {
      await sessionManager.clearSessionOnly();
      onRestartGame();
      onClose();
    }
  };

  const handleNewGame = async () => {
    if (confirm('Are you sure you want to start a new game? This will clear all conversations and reset your session.')) {
      await sessionManager.clearSessionOnly();
      onRestartGame();
      onClose();
    }
  };

  const renderMainMenu = () => (
    <div className={styles.menuContent}>
      <h1 className={styles.gameTitle}>City Reconstruction</h1>
      <p className={styles.gameSubtitle}>Shape the future of your city</p>
      
      <div className={styles.menuButtons}>
        <button className={`${styles.menuButton} ${styles.primary}`} onClick={() => onClose()}>
          Continue Game
        </button>
        <button className={`${styles.menuButton} ${styles.danger}`} onClick={handleNewGame}>
          New Game
        </button>
        <button className={styles.menuButton} onClick={onReturnToMainMenu}>
          Return to Main Menu
        </button>
        <button className={styles.menuButton} onClick={() => setCurrentMenu('controls')}>
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