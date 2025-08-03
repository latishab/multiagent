import { useState, useEffect } from 'react'
import { Game } from 'phaser'
import ChatDialog from './ChatDialog'
import GameMenu from './GameMenu'
import ProgressIndicator from './ProgressIndicator'
import PDA from './PDA'
import EndingOverlay from './EndingOverlay'

import styles from '../styles/UIOverlay.module.css'

interface BallotEntry {
  npcId: number;
  npcName: string;
  system: string;
  round: number;
  sustainableOption: string;
  unsustainableOption: string;
  npcOpinion: string;
  npcReasoning: string;
  timestamp: number;
}

interface UIOverlayProps {
  gameInstance: Game | null
}

export default function UIOverlay({ gameInstance: initialGameInstance }: UIOverlayProps) {
  const [gameInstance, setGameInstance] = useState<Game | null>(initialGameInstance)
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventory, setInventory] = useState<Array<string | null>>(
    new Array(25).fill(null)
  )
  const [showWelcome, setShowWelcome] = useState(true)
  const [showGameMenu, setShowGameMenu] = useState(false)
  const [hasStartedGame, setHasStartedGame] = useState(false)
  const [hasTalkedToGuide, setHasTalkedToGuide] = useState(false)
  
  const [chatState, setChatState] = useState<{
    isOpen: boolean
    npcId: number
    personality: string
    round: number
    isSustainable: boolean
  }>({
    isOpen: false,
    npcId: -1,
    personality: '',
    round: 1,
    isSustainable: true
  })

  // Track which NPCs have been spoken to in each round
  const [spokenNPCs, setSpokenNPCs] = useState<{
    round1: Set<number>
    round2: Set<number>
  }>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('multiagent-spoken-npcs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const result: { round1: Set<number>; round2: Set<number> } = {
            round1: new Set((parsed.round1 || []).map((id: any) => Number(id))),
            round2: new Set((parsed.round2 || []).map((id: any) => Number(id)))
          };
          console.log('Loaded spoken NPCs from localStorage:', {
            round1: Array.from(result.round1),
            round2: Array.from(result.round2)
          });
          return result;
        } catch (error) {
          console.error('Error loading spoken NPCs from localStorage:', error);
        }
      }
    }
    const result: { round1: Set<number>; round2: Set<number> } = {
      round1: new Set<number>(),
      round2: new Set<number>()
    };
    console.log('Initialized empty spoken NPCs:', result);
    return result;
  });

  // Track final decisions for ending calculation
  const [finalDecisions, setFinalDecisions] = useState<{ [npcId: number]: 'sustainable' | 'unsustainable' }>({});
  const [showEnding, setShowEnding] = useState(false);
  const [endingType, setEndingType] = useState<'good' | 'bad' | 'medium' | null>(null);
  const [showPDA, setShowPDA] = useState(false);
  const [showDecisionMode, setShowDecisionMode] = useState(false);
  
  // Ballot entries to track NPC opinions
  const [ballotEntries, setBallotEntries] = useState<BallotEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('multiagent-ballot-entries');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Error loading ballot entries from localStorage:', error);
        }
      }
    }
    return [];
  });

  // Save spoken NPCs to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dataToSave = {
        round1: Array.from(spokenNPCs.round1),
        round2: Array.from(spokenNPCs.round2)
      };
      localStorage.setItem('multiagent-spoken-npcs', JSON.stringify(dataToSave));
    }
  }, [spokenNPCs]);

  // Save ballot entries to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('multiagent-ballot-entries', JSON.stringify(ballotEntries));
    }
  }, [ballotEntries]);

  // Function to be called from the game to open chat
  const openChat = (npcId: string, personality: string) => {
    console.log('Opening chat with NPC:', { npcId, personality });
    
    // Special handling for main NPC (The Guide)
    if (npcId === 'main') {
      console.log('Opening chat with main NPC (The Guide)');
      setChatState({
        isOpen: true,
        npcId: -1, // Use -1 for main NPC
        personality: 'neutral', // Main NPC is neutral
        round: chatState.round, // Main NPC uses current global round
        isSustainable: true // Neutral stance
      });
      return;
    }
    
    // Check if game has started (player has talked to The Guide)
    if (!hasTalkedToGuide) {
      console.log('Game has not started yet. Player must talk to The Guide first.');
      // You could show a notification here if needed
      return;
    }
    
    // Determine the correct round for regular NPCs
    const npcIdNum = parseInt(npcId);
    let correctRound = 1;
    
    // If NPC has completed round 1, they should be in round 2
    if (spokenNPCs.round1.has(npcIdNum)) {
      correctRound = 2;
    }
    
    // If NPC has completed round 2, they should stay in round 2
    if (spokenNPCs.round2.has(npcIdNum)) {
      correctRound = 2;
    }
    
    console.log('Determined round for NPC:', { npcId: npcIdNum, correctRound, round1Spoken: spokenNPCs.round1.has(npcIdNum), round2Spoken: spokenNPCs.round2.has(npcIdNum) });
    
    setChatState({
      isOpen: true,
      npcId: npcIdNum,
      personality,
      round: correctRound,
      isSustainable: chatState.isSustainable
    });
  }

  // Function to close chat
  const closeChat = () => {
    setChatState(prev => ({
      ...prev,
      isOpen: false
    }));

    window.dispatchEvent(new CustomEvent('chatClosed', { detail: { npcId: chatState.npcId.toString() } }));
  }

  // Function to mark NPC as actually spoken to (called when conversation has content)
  const markNPCAsSpoken = (npcId: number, round: number, detectedOpinion?: { opinion: string; reasoning: string }, conversationAnalysis?: { isComplete: boolean; reason: string }) => {
    console.log('markNPCAsSpoken called:', { npcId, round, detectedOpinion, conversationAnalysis });
    
    // Special handling for main NPC (The Guide)
    if (npcId === -1) {
      console.log('Main NPC conversation completed');
      setHasTalkedToGuide(true);
      
      // Check if all NPCs have been spoken to in the current round
      const currentRound = chatState.round;
      const roundKey = currentRound === 1 ? 'round1' : 'round2';
      const currentSpokenNPCs = spokenNPCs[roundKey as keyof typeof spokenNPCs];
      const allNPCsSpoken = currentSpokenNPCs.size >= 6;
      
      if (allNPCsSpoken) {
        // All NPCs spoken, advance to next round
        if (currentRound === 1) {
          console.log('All NPCs spoken in round 1, advancing to round 2');
          setChatState(prev => ({
            ...prev,
            round: 2
          }));
        } else if (currentRound === 2) {
          console.log('All NPCs spoken in round 2, triggering ending phase');
          // Trigger ending phase after a short delay
          setTimeout(() => {
            setShowDecisionMode(true);
            setShowPDA(true);
          }, 1000); // Small delay for better UX
        }
      }
      return;
    }
    
    const roundKey = round === 1 ? 'round1' : 'round2';
    setSpokenNPCs(prev => {
      const newSpokenNPCs = {
        ...prev,
        [roundKey]: new Set(Array.from(prev[roundKey]).concat([npcId]))
      };
      console.log('Updated spoken NPCs:', {
        round1: Array.from(newSpokenNPCs.round1),
        round2: Array.from(newSpokenNPCs.round2)
      });
      return newSpokenNPCs;
    });

    // Add ballot entry for this NPC conversation
    const npcNames: { [key: number]: string } = {
      1: 'Mrs. Aria',
      2: 'Chief Oskar',
      3: 'Mr. Moss',
      4: 'Miss Dai',
      5: 'Ms. Kira',
      6: 'Mr. Han'
    }

    const npcSystems: { [key: number]: string } = {
      1: 'Water Cycle',
      2: 'Energy Grid',
      3: 'Fuel Acquisition',
      4: 'Land Use',
      5: 'Water Distribution',
      6: 'Housing & Shelter'
    }

    const npcOptions: { [key: number]: { sustainable: string; unsustainable: string } } = {
      1: { sustainable: 'Constructed Wetlands', unsustainable: 'Chemical Filtration Tanks' },
      2: { sustainable: 'Local Solar Microgrids', unsustainable: 'Gas Power Hub' },
      3: { sustainable: 'Biofuel Cooperative', unsustainable: 'Diesel Supply Contracts' },
      4: { sustainable: 'Urban Agriculture Zones', unsustainable: 'Industrial Expansion' },
      5: { sustainable: 'Public Shared Reservoir', unsustainable: 'Tiered Access Contracts' },
      6: { sustainable: 'Modular Eco-Pods', unsustainable: 'Smart Concrete Complex' }
    }

    const newEntry: BallotEntry = {
      npcId: npcId,
      npcName: npcNames[npcId],
      system: npcSystems[npcId],
      round: round,
      sustainableOption: npcOptions[npcId].sustainable,
      unsustainableOption: npcOptions[npcId].unsustainable,
      npcOpinion: round === 1 ? 'Introduction phase - no opinion yet' : 
        (detectedOpinion ? detectedOpinion.opinion : 'Opinion not yet revealed'),
      npcReasoning: round === 1 ? 
        (conversationAnalysis?.isComplete ? 'Introduction complete' : 'Introduction in progress') :
        (detectedOpinion ? detectedOpinion.reasoning : 'Waiting for NPC to express their opinion'),
      timestamp: Date.now()
    }

    setBallotEntries(prev => {
      // Check if there's already an entry for this NPC and round
      const existingIndex = prev.findIndex(entry => entry.npcId === npcId && entry.round === round);
      
      console.log('Updating ballot entries for NPC', npcId, 'Round', round);
      console.log('Existing entry found:', existingIndex !== -1);
      console.log('New entry reasoning:', newEntry.npcReasoning);
      console.log('Conversation analysis:', conversationAnalysis);
      
      if (existingIndex !== -1) {
        // Update existing entry
        const updated = [...prev];
        updated[existingIndex] = newEntry;
        console.log('Updated existing ballot entry');
        return updated;
      } else {
        // Add new entry
        console.log('Added new ballot entry');
        return [...prev, newEntry];
      }
    });

    // Check if all NPCs have been spoken to in the current round
    const currentSpokenNPCs = spokenNPCs[roundKey as keyof typeof spokenNPCs];
    const allNPCsSpoken = currentSpokenNPCs.size >= 6;

    // Round advancement is now handled by the main NPC conversation
    // Regular NPCs just track progress, main NPC triggers round changes
    console.log(`NPC ${npcId} conversation completed in round ${round}. All NPCs spoken: ${allNPCsSpoken}`);
  }

  // Function to calculate and show ending
  const calculateAndShowEnding = () => {
    const sustainableCount = Object.values(finalDecisions).filter(decision => decision === 'sustainable').length;
    const unsustainableCount = Object.values(finalDecisions).filter(decision => decision === 'unsustainable').length;
    
    console.log('Calculating ending:', { sustainableCount, unsustainableCount, finalDecisions });
    
    let ending: 'good' | 'bad' | 'medium';
    if (sustainableCount === unsustainableCount) {
      ending = 'medium';
    } else if (sustainableCount > unsustainableCount) {
      ending = 'good';
    } else {
      ending = 'bad';
    }
    
    console.log('Ending determined:', ending);
    setEndingType(ending);
    setShowEnding(true);
  }

  // Function to handle when decisions are complete
  const handleDecisionsComplete = (decisions: { [npcId: number]: 'sustainable' | 'unsustainable' }) => {
    console.log('All decisions complete:', decisions);
    setFinalDecisions(decisions);
    
    // Calculate and show ending
    setTimeout(() => {
      calculateAndShowEnding();
    }, 500); // Small delay for smooth transition
  }

  // Function to handle final decision for a system
  const handleFinalDecision = (npcId: number, choice: 'sustainable' | 'unsustainable') => {
    setFinalDecisions(prev => ({
      ...prev,
      [npcId]: choice
    }));
    
    // Check if all 6 decisions have been made
    const newDecisions = { ...finalDecisions, [npcId]: choice };
    if (Object.keys(newDecisions).length === 6) {
      // All decisions made, calculate ending
      setTimeout(() => {
        calculateAndShowEnding();
      }, 1000); // Small delay for better UX
    }
  }

  // Function to handle ending close
  const handleEndingClose = () => {
    setShowEnding(false);
    setEndingType(null);
    // Could restart the game or go to main menu here
    window.location.reload();
  }

  // Handle round changes (now only for internal use)
  const handleRoundChange = (round: number) => {
    setChatState(prev => ({
      ...prev,
      round,
      // Reset messages when changing rounds
      messages: []
    }))
  }

  // Handle stance changes (now only for internal use)
  const handleStanceChange = (isProSustainable: boolean) => {
    setChatState(prev => ({
      ...prev,
      isSustainable: isProSustainable,
      // Reset messages when changing stance
      messages: []
    }))
  }

  // Handle inventory item clicks
  const handleInventoryItemClick = (item: string | null, index: number) => {
    // Handle inventory item clicks here
  }

  // Handle keyboard input for hotbar selection
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = parseInt(event.key)
      if (key >= 1 && key <= 5) {
        setSelectedSlot(key - 1)
        // If slot 1 is selected, open PDA
        if (key === 1) {
          setShowPDA(true)
        }
      }
      if (event.key === 'i' || event.key === 'I') {
        setInventoryOpen(!inventoryOpen)
      }
      if (event.key === 'Escape') {
        if (showGameMenu) {
          setShowGameMenu(false)
        } else if (showPDA) {
          setShowPDA(false)
        } else if (chatState.isOpen) {
          closeChat()
        } else if (inventoryOpen) {
          setInventoryOpen(false)
        } else {
          setShowGameMenu(true)
        }
        setShowWelcome(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [inventoryOpen, showGameMenu, showPDA, chatState.isOpen, inventory])

  // Expose the openChat function to the window object for the game to use
  useEffect(() => {
    (window as any).openChat = openChat
    return () => {
      delete (window as any).openChat
    }
  }, [openChat])

  // Expose the game state to the window object
  useEffect(() => {
    (window as any).hasGameStarted = hasTalkedToGuide
    return () => {
      delete (window as any).hasGameStarted
    }
  }, [hasTalkedToGuide])

  // Expose the guide alert state to the game
  useEffect(() => {
    (window as any).shouldShowGuideAlert = () => {
      // Show guide alert when the game hasn't started yet (ProgressIndicator shows initial guide checklist)
      // OR when the player hasn't talked to The Guide yet
      return !hasStartedGame || !hasTalkedToGuide;
    }
    
    return () => {
      delete (window as any).shouldShowGuideAlert
    }
  }, [hasTalkedToGuide, hasStartedGame])

  // Expose the triggerEndingPhase function to the window object
  useEffect(() => {
    (window as any).triggerEndingPhase = () => {
      console.log('Triggering ending phase');
      // Show the PDA in decision mode for final choices
      setShowDecisionMode(true);
      setShowPDA(true);
    }
    return () => {
      delete (window as any).triggerEndingPhase
    }
  }, [])

  const handleRestartGame = () => {
    // Clear saved data before restarting
    if (typeof window !== 'undefined') {
      localStorage.removeItem('multiagent-spoken-npcs');
      localStorage.removeItem('multiagent-ballot-entries');
    }
    // Reload the page to restart the game
    window.location.reload()
  }

  const handleNewGame = () => {
    // Clear saved data before starting new game
    if (typeof window !== 'undefined') {
      localStorage.removeItem('multiagent-spoken-npcs');
      localStorage.removeItem('multiagent-ballot-entries');
    }
    // Reload the page to start a new game
    window.location.reload()
  }

  // Handle hotbar slot clicks
  const handleHotbarClick = (index: number) => {
    setSelectedSlot(index)
    // If slot 1 is clicked, open PDA
    if (index === 0) {
      setShowPDA(true)
    }
  }

  return (
    <>
      {/* Welcome Overlay UI */}
      {showWelcome && (
        <div className={styles.welcomeOverlay}>
          <div className={styles.welcomeContent}>
            <h1 className={styles.welcomeTitle}>Welcome to City Reconstruction!</h1>
            <p className={styles.welcomeSubtitle}>Navigate the city and interact with NPCs to make decisions about reconstruction.</p>
            
            <div className={styles.controlsSection}>
              <h2>Controls</h2>
              <div className={styles.controlsGrid}>
                <div className={styles.controlItem}>
                  <span className={styles.key}>WASD</span>
                  <span className={styles.description}>Move around</span>
                </div>
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
                <div className={styles.controlItem}>
                  <span className={styles.key}>2-5</span>
                  <span className={styles.description}>Select hotbar slots</span>
                </div>
                <div className={styles.controlItem}>
                  <span className={styles.key}>ESC</span>
                  <span className={styles.description}>Close dialogs</span>
                </div>
              </div>
            </div>

            <div className={styles.gameInfo}>
              <h3>How to Play</h3>
              <ul>
                <li>Walk around the city and find NPCs (marked with icons)</li>
                <li>Press <strong>E</strong> near an NPC to start a conversation</li>
                <li>Each NPC represents a different city system</li>
                <li>Make choices between sustainable and economic options</li>
                <li>Check your PDA (📱) in hotbar slot 1 to track systems and make decisions</li>
                <li>Your decisions will affect the city's future!</li>
              </ul>
            </div>

            <button 
              className={styles.startButton}
              onClick={() => {
                setShowWelcome(false);
                setHasStartedGame(true);
              }}
            >
              Start Playing
            </button>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {!showWelcome && (
        <ProgressIndicator
          currentRound={chatState.round}
          spokenNPCs={spokenNPCs}
          hasTalkedToGuide={hasTalkedToGuide}
          isChatOpen={chatState.isOpen}
          currentChatNPCId={chatState.npcId}
        />
      )}

      {/* Hotbar */}
      <div className={styles.hotbar}>
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`${styles.hotbarSlot} ${selectedSlot === index ? styles.active : ''} ${index === 0 ? styles.hasPDA : ''}`}
            onClick={() => handleHotbarClick(index)}
          >
            {index === 0 ? '📱' : index + 1}
          </div>
        ))}
      </div>

      {/* Menu Button */}
      <button
        className={styles.menuButton}
        onClick={() => setShowGameMenu(true)}
      >
        Menu (ESC)
      </button>

      {/* Inventory Button */}
      <button
        className={styles.inventoryButton}
        onClick={() => setInventoryOpen(!inventoryOpen)}
      >
        Inventory (I)
      </button>

      {/* Inventory Modal */}
      {inventoryOpen && (
        <div className={styles.inventoryModal}>
          <div className={styles.inventoryContent}>
            <div className={styles.inventoryHeader}>Inventory</div>
            <div className={styles.inventoryGrid}>
              {inventory.map((item, index) => (
                <div 
                  key={index} 
                  className={`${styles.inventorySlot} ${item ? styles.hasItem : ''}`}
                  onClick={() => handleInventoryItemClick(item, index)}
                >
                  {item || ''}
                </div>
              ))}
            </div>
            <button
              className={styles.closeButton}
              onClick={() => setInventoryOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chat Dialog */}
      <ChatDialog
        isOpen={chatState.isOpen}
        npcId={chatState.npcId}
        personality={chatState.personality}
        round={chatState.round}
        isSustainable={chatState.isSustainable}
        spokenNPCs={spokenNPCs}
        onClose={closeChat}
        onRoundChange={handleRoundChange}
        onStanceChange={handleStanceChange}
        onConversationComplete={(npcId, round, detectedOpinion, conversationAnalysis) => markNPCAsSpoken(npcId, round, detectedOpinion, conversationAnalysis)}
      />

      {/* Game Menu */}
      <GameMenu
        isOpen={showGameMenu}
        onClose={() => setShowGameMenu(false)}
        onRestartGame={handleRestartGame}
        onNewGame={handleNewGame}
      />

      {/* PDA */}
      <PDA
        isOpen={showPDA}
        onClose={() => setShowPDA(false)}
        ballotEntries={ballotEntries}
        onDecisionsComplete={handleDecisionsComplete}
        showDecisionMode={showDecisionMode}
      />
      
      {/* Ending Overlay */}
      <EndingOverlay
        isVisible={showEnding}
        endingType={endingType}
        onClose={handleEndingClose}
      />
    </>
  )
} 