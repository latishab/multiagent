import React, { useState } from 'react';
import { sessionManager } from '../utils/sessionManager';
import styles from '../styles/GameMenu.module.css';

interface GameMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartGame: () => void;
  onNewGame: () => void;
}

type MenuState = 'main' | 'settings' | 'about' | 'controls';

export default function GameMenu({ isOpen, onClose, onRestartGame, onNewGame }: GameMenuProps) {
  const [currentMenu, setCurrentMenu] = useState<MenuState>('main');

  const handleRestartGame = async () => {
    if (confirm('Are you sure you want to restart the game? This will clear your current progress.')) {
      await sessionManager.clearSession();
      onRestartGame();
      onClose();
    }
  };

  const handleNewGame = async () => {
    if (confirm('Are you sure you want to start a new game? This will clear your current progress.')) {
      await sessionManager.clearSession();
      onNewGame();
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
        <button className={styles.menuButton} onClick={handleNewGame}>
          New Game
        </button>
        <button className={styles.menuButton} onClick={() => setCurrentMenu('settings')}>
          Settings
        </button>
        <button className={styles.menuButton} onClick={() => setCurrentMenu('controls')}>
          Controls
        </button>
        <button className={styles.menuButton} onClick={() => setCurrentMenu('about')}>
          About
        </button>
      </div>

      <div className={styles.menuFooter}>
        <p>Press ESC to close menu</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className={styles.menuContent}>
      <div className={styles.menuHeader}>
        <button className={styles.backButton} onClick={() => setCurrentMenu('main')}>
          ← Back
        </button>
        <h2>Settings</h2>
      </div>

      <div className={styles.settingsSection}>
        <h3>Game</h3>
        <div className={styles.settingItem}>
          <button className={styles.dangerButton} onClick={handleRestartGame}>
            Restart Game
          </button>
        </div>
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

  const renderAbout = () => (
    <div className={styles.menuContent}>
      <div className={styles.menuHeader}>
        <button className={styles.backButton} onClick={() => setCurrentMenu('main')}>
          ← Back
        </button>
        <h2>About</h2>
      </div>

      <div className={styles.aboutContent}>
        <h3>City Reconstruction</h3>
        <p>
          An interactive decision-making game where players engage with NPCs to make choices 
          about city reconstruction, balancing sustainability with economic factors.
        </p>

        <h4>Game Features</h4>
        <ul>
          <li>6 unique NPCs representing different city systems</li>
          <li>Three conversation rounds with each NPC</li>
          <li>AI-powered conversations with memory</li>
          <li>Multiple choice scenarios</li>
          <li>Session-based progress tracking</li>
        </ul>

        <h4>NPCs</h4>
        <ul>
          <li><strong>Mr. Aria</strong> - Water Cycle (Retired Ecologist)</li>
          <li><strong>Chief Oskar</strong> - Energy Grid (Infrastructure Engineer)</li>
          <li><strong>Ms. Moss</strong> - Fuel Acquisition (Fuel Supplier)</li>
          <li><strong>Mr. Dai</strong> - Land Use (Volunteer Teacher)</li>
          <li><strong>Ms. Kira</strong> - Water Distribution (Water Justice Activist)</li>
          <li><strong>Mrs. Han</strong> - Housing & Shelter (Builder/Constructor)</li>
        </ul>

        <div className={styles.versionInfo}>
          <p>Version 1.0.0</p>
          <p>Built with Next.js, Phaser, and AI</p>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className={styles.gameMenuOverlay}>
      <div className={styles.gameMenu}>
        {currentMenu === 'main' && renderMainMenu()}
        {currentMenu === 'settings' && renderSettings()}
        {currentMenu === 'controls' && renderControls()}
        {currentMenu === 'about' && renderAbout()}
      </div>
    </div>
  );
} 