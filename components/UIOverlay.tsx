import { useState, useEffect } from 'react'
import { Game } from 'phaser'
import ChatDialog from './ChatDialog'
import GameMenu from './GameMenu'
import ProgressIndicator from './ProgressIndicator'
import Ballot from './Ballot'
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
  const [showBallot, setShowBallot] = useState(false)
  
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
  }>({
    round1: new Set(),
    round2: new Set()
  })

  // Ballot entries to track NPC opinions
  const [ballotEntries, setBallotEntries] = useState<BallotEntry[]>([])

  // Add ballot to inventory on first load
  useEffect(() => {
    if (!showWelcome) {
      setInventory(prev => {
        const newInventory = [...prev]
        if (!newInventory.includes('📝 Ballot')) {
          newInventory[0] = '📝 Ballot'
        }
        return newInventory
      })
    }
  }, [showWelcome])

  // Function to be called from the game to open chat
  const openChat = (npcId: string, personality: string) => {
    console.log('Opening chat with NPC:', { npcId, personality });
    setChatState({
      isOpen: true,
      npcId: parseInt(npcId),
      personality,
      round: chatState.round,
      isSustainable: chatState.isSustainable
    });
  }

  // Function to close chat
  const closeChat = () => {
    console.log('Closing chat with NPC:', chatState.npcId);
    
    // Don't mark NPC as spoken to just for closing the dialog
    // Progress will be tracked based on actual conversation content
    
    setChatState(prev => ({
      ...prev,
      isOpen: false
    }));

    window.dispatchEvent(new CustomEvent('chatClosed', { detail: { npcId: chatState.npcId.toString() } }));
  }

  // Function to mark NPC as actually spoken to (called when conversation has content)
  const markNPCAsSpoken = (npcId: number, round: number, detectedOpinion?: { opinion: string; reasoning: string }) => {
    const roundKey = round === 1 ? 'round1' : 'round2';
    setSpokenNPCs(prev => ({
      ...prev,
      [roundKey]: new Set(Array.from(prev[roundKey]).concat([npcId]))
    }));

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
      npcReasoning: round === 1 ? 'NPC introduced their system and options' : 
        (detectedOpinion ? detectedOpinion.reasoning : 'Waiting for NPC to express their opinion'),
      timestamp: Date.now()
    }

    setBallotEntries(prev => [...prev, newEntry]);

    // Check if all NPCs have been spoken to in the current round
    const currentSpokenNPCs = spokenNPCs[roundKey as keyof typeof spokenNPCs];
    const allNPCsSpoken = currentSpokenNPCs.size >= 6;

    // If all NPCs spoken in round 1, automatically advance to round 2
    if (round === 1 && allNPCsSpoken) {
      console.log('All NPCs spoken in round 1, advancing to round 2');
      setChatState(prev => ({
        ...prev,
        round: 2
      }));
      setSpokenNPCs(prev => ({
        ...prev,
        round1: new Set(),
        round2: new Set()
      }));
    }
    // If all NPCs spoken in round 2, show completion message
    else if (round === 2 && allNPCsSpoken) {
      console.log('All NPCs spoken in round 2, conversation complete');
    }
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
    if (item === '📝 Ballot') {
      setShowBallot(true)
      setInventoryOpen(false)
    }
  }

  // Handle keyboard input for hotbar selection
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = parseInt(event.key)
      if (key >= 1 && key <= 5) {
        setSelectedSlot(key - 1)
        // If slot 1 is selected and ballot is available, open ballot
        if (key === 1 && inventory[0] === '📝 Ballot') {
          setShowBallot(true)
        }
      }
      if (event.key === 'i' || event.key === 'I') {
        setInventoryOpen(!inventoryOpen)
      }
      if (event.key === 'Escape') {
        if (showGameMenu) {
          setShowGameMenu(false)
        } else if (showBallot) {
          setShowBallot(false)
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
  }, [inventoryOpen, showGameMenu, showBallot, chatState.isOpen, inventory])

  // Expose the openChat function to the window object for the game to use
  useEffect(() => {
    (window as any).openChat = openChat
    return () => {
      delete (window as any).openChat
    }
  }, [])

  const handleRestartGame = () => {
    // Reload the page to restart the game
    window.location.reload()
  }

  const handleNewGame = () => {
    // Reload the page to start a new game
    window.location.reload()
  }

  // Handle hotbar slot clicks
  const handleHotbarClick = (index: number) => {
    setSelectedSlot(index)
    // If slot 1 is clicked and ballot is available, open ballot
    if (index === 0 && inventory[0] === '📝 Ballot') {
      setShowBallot(true)
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
                  <span className={styles.key}>1-5</span>
                  <span className={styles.description}>Select hotbar slots</span>
                </div>
                <div className={styles.controlItem}>
                  <span className={styles.key}>1</span>
                  <span className={styles.description}>Open ballot (if available)</span>
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
                <li>Your decisions will affect the city's future!</li>
                <li>Check your ballot (📝) in hotbar slot 1 or inventory to track opinions</li>
              </ul>
            </div>

            <button 
              className={styles.startButton}
              onClick={() => setShowWelcome(false)}
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
          ballotEntries={ballotEntries}
        />
      )}

      {/* Hotbar */}
      <div className={styles.hotbar}>
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`${styles.hotbarSlot} ${selectedSlot === index ? styles.active : ''} ${index === 0 && inventory[0] === '📝 Ballot' ? styles.hasBallot : ''}`}
            onClick={() => handleHotbarClick(index)}
          >
            {index === 0 && inventory[0] === '📝 Ballot' ? '📝' : index + 1}
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
        onClose={closeChat}
        onRoundChange={handleRoundChange}
        onStanceChange={handleStanceChange}
        onConversationComplete={(npcId, round, detectedOpinion) => markNPCAsSpoken(npcId, round, detectedOpinion)}
      />

      {/* Ballot */}
      <Ballot
        isOpen={showBallot}
        onClose={() => setShowBallot(false)}
        ballotEntries={ballotEntries}
      />

      {/* Game Menu */}
      <GameMenu
        isOpen={showGameMenu}
        onClose={() => setShowGameMenu(false)}
        onRestartGame={handleRestartGame}
        onNewGame={handleNewGame}
      />
    </>
  )
} 