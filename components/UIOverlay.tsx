import { useState, useEffect } from 'react'
import { Game } from 'phaser'
import ChatDialog from './ChatDialog'
import GuideDialog from './GuideDialog'
import GameMenu from './GameMenu'
import ProgressIndicator from './ProgressIndicator'
import PDA from './PDA'
import EndingOverlay from './EndingOverlay'
import { NPCNames, NPCSystems, NPCOptions, getNPCImage } from '../utils/npcData'
import { sessionManager } from '../utils/sessionManager'
import { soundEffects } from '../utils/soundEffects'

import styles from '../styles/UIOverlay.module.css'

interface BallotEntry {
  npcId: number;
  npcName: string;
  system: string;
  round: number;
  sustainableOption: string;
  unsustainableOption: string;
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
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-show-welcome-${participantId}` : 'multiagent-show-welcome';
      
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [showGameMenu, setShowGameMenu] = useState(false);
  // Game phase enum to drive UI and flow
  enum GamePhase {
    NotStarted = 0,
    Round1 = 1,
    AwaitGuideToFinalize = 15,
    Completed = 100,
  }
  const [gamePhase, setGamePhase] = useState<GamePhase>(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-game-phase-${participantId}` : 'multiagent-game-phase';
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        try { return JSON.parse(saved) as GamePhase; } catch {}
      }
    }
    return GamePhase.NotStarted;
  });
  const [hasTalkedToGuide, setHasTalkedToGuide] = useState(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-has-talked-to-guide-${participantId}` : 'multiagent-has-talked-to-guide';
      
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  
  const [chatState, setChatState] = useState<{
    isOpen: boolean
    npcId: number
    personality: string
    round: number
    isSustainable: boolean
  }>(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-chat-state-${participantId}` : 'multiagent-chat-state';
      
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Error loading chat state from localStorage:', error);
        }
      }
    }
    return {
      isOpen: false,
      npcId: -1,
      personality: '',
      round: 1,
      isSustainable: true
    };
  });

  // Persist gamePhase
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-game-phase-${participantId}` : 'multiagent-game-phase';
      localStorage.setItem(storageKey, JSON.stringify(gamePhase));
    }
  }, [gamePhase]);

  // Track which NPCs have been spoken to in each round
  const [spokenNPCs, setSpokenNPCs] = useState<Set<number>>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      // Get participant ID for localStorage key
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-spoken-npcs-${participantId}` : 'multiagent-spoken-npcs';
      
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Handle both old format (with round1/round2) and new format (simple array)
          if (Array.isArray(parsed)) {
            return new Set(parsed.map((id: any) => Number(id)));
          } else if (parsed.round1) {
            // Migrate from old format - combine round1 and round2
            const combined = [...(parsed.round1 || []), ...(parsed.round2 || [])];
            return new Set(combined.map((id: any) => Number(id)));
          }
        } catch (error) {
          console.error('Error loading spoken NPCs from localStorage:', error);
        }
      }
    }
    return new Set<number>();
  });

  // Track final decisions for ending calculation
  const [finalDecisions, setFinalDecisions] = useState<{ [npcId: number]: 'sustainable' | 'unsustainable' }>(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-final-decisions-${participantId}` : 'multiagent-final-decisions';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {};
  });
  const [showEnding, setShowEnding] = useState(false);
  const [endingType, setEndingType] = useState<'good' | 'medium' | 'bad' | null>(null);
  const [showPDA, setShowPDA] = useState(false);
  const [showDecisionMode, setShowDecisionMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-show-decision-mode-${participantId}` : 'multiagent-show-decision-mode';
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        try { return JSON.parse(saved) as boolean; } catch {}
      }
    }
    return false;
  });
  const [decisionsFinalized, setDecisionsFinalized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-decisions-finalized-${participantId}` : 'multiagent-decisions-finalized';
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        try { return JSON.parse(saved) as boolean; } catch {}
      }
    }
    return false;
  });
  const [pdaNotification, setPdaNotification] = useState(false);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [guideDialogManuallyClosed, setGuideDialogManuallyClosed] = useState(false);
  
  // Track detected opinions (A = sustainable, B = unsustainable) per NPC for Round 2
  const [npcOpinions, setNpcOpinions] = useState<{ [npcId: number]: 'A' | 'B' | null }>(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-npc-opinions-${participantId}` : 'multiagent-npc-opinions';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  });

  
  // Ballot entries to track NPC opinions
  const [ballotEntries, setBallotEntries] = useState<BallotEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-ballot-entries-${participantId}` : 'multiagent-ballot-entries';
      
      const saved = localStorage.getItem(storageKey);
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
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-spoken-npcs-${participantId}` : 'multiagent-spoken-npcs';
      
      const dataToSave = Array.from(spokenNPCs);
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [spokenNPCs]);

  // Save ballot entries to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-ballot-entries-${participantId}` : 'multiagent-ballot-entries';
      
      localStorage.setItem(storageKey, JSON.stringify(ballotEntries));
    }
  }, [ballotEntries]);

  // Persist showDecisionMode per participant
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-show-decision-mode-${participantId}` : 'multiagent-show-decision-mode';
      localStorage.setItem(storageKey, JSON.stringify(showDecisionMode));
    }
  }, [showDecisionMode]);

  // Persist decisionsFinalized per participant
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-decisions-finalized-${participantId}` : 'multiagent-decisions-finalized';
      localStorage.setItem(storageKey, JSON.stringify(decisionsFinalized));
    }
  }, [decisionsFinalized]);

  // Persist finalDecisions per participant
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-final-decisions-${participantId}` : 'multiagent-final-decisions';
      localStorage.setItem(storageKey, JSON.stringify(finalDecisions));
    }
  }, [finalDecisions]);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-show-welcome-${participantId}` : 'multiagent-show-welcome';
      
      localStorage.setItem(storageKey, JSON.stringify(showWelcome));
    }
  }, [showWelcome]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-has-talked-to-guide-${participantId}` : 'multiagent-has-talked-to-guide';
      
      localStorage.setItem(storageKey, JSON.stringify(hasTalkedToGuide));
    }
  }, [hasTalkedToGuide]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-chat-state-${participantId}` : 'multiagent-chat-state';
      
      localStorage.setItem(storageKey, JSON.stringify(chatState));
    }
  }, [chatState]);

  // Update global window state to reflect loaded values
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).hasGameStarted = gamePhase !== GamePhase.NotStarted;
      (window as any).hasTalkedToGuide = hasTalkedToGuide;
      (window as any).currentRound = chatState.round;
      (window as any).spokenNPCs = spokenNPCs;
    }
  }, [gamePhase, hasTalkedToGuide, chatState.round, spokenNPCs]);

  // Automatically open Guide Dialog when game starts or when ready for final decisions
  useEffect(() => {
    // Auto-open guide dialog if:
    // 1. Welcome screen is not showing
    // 2. Game hasn't started yet (NotStarted phase) AND player hasn't talked to guide yet
    // 3. Guide dialog is not already open
    if (!showWelcome && gamePhase === GamePhase.NotStarted && !hasTalkedToGuide && !guideDialogOpen) {
      setGuideDialogOpen(true);
      setGuideDialogManuallyClosed(false); // Reset the manual close flag
    }
    
    // Also auto-open when all NPCs are spoken to and ready for final decisions
    // But only if the user hasn't manually closed it
    if (!showWelcome && gamePhase === GamePhase.AwaitGuideToFinalize && !guideDialogOpen && !guideDialogManuallyClosed) {
      setGuideDialogOpen(true);
    }
  }, [showWelcome, gamePhase, hasTalkedToGuide, guideDialogOpen, guideDialogManuallyClosed]);

  // Persist npcOpinions per participant
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-npc-opinions-${participantId}` : 'multiagent-npc-opinions';
      localStorage.setItem(storageKey, JSON.stringify(npcOpinions));
    }
  }, [npcOpinions]);

  // (removed) sidebar hint persistence

  // Function to play tablet ding sound
  const playTabletDing = () => {
    try {
      const audio = new Audio('/assets/sound_effects/Ding_tablet sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Could not play tablet ding sound:', error);
      });
    } catch (error) {
      console.warn('Could not create audio for tablet ding:', error);
    }
  };

  // Function to trigger PDA notification
  const triggerPdaNotification = () => {
    setPdaNotification(true);
    playTabletDing();
  };

  // Function to be called from the game to open chat
  const openChat = (npcId: string, personality: string) => {
    // Special handling for main NPC (The Guide)
    if (npcId === 'main') {
      setGuideDialogOpen(true);
      return;
    }
    
    // Check if game has started (player has talked to The Guide)
    if (!hasTalkedToGuide) {
      return;
    }
    
    // Using single round system - all NPCs use round 1
    const npcIdNum = parseInt(npcId);
    const correctRound = 1;
    
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

  // Function to close guide dialog
  const closeGuideDialog = () => {
    setGuideDialogOpen(false);
    // If we're in the finalize phase, mark that the user manually closed it
    if (gamePhase === GamePhase.AwaitGuideToFinalize) {
      setGuideDialogManuallyClosed(true);
    }
    window.dispatchEvent(new CustomEvent('chatClosed', { detail: { npcId: 'main' } }));
  }

  // Function to mark NPC as actually spoken to (called when conversation has content)
  const markNPCAsSpoken = (npcId: number, round: number, detectedOpinion?: { opinion: string; reasoning: string }, conversationAnalysis?: { isComplete: boolean; reason: string }) => {
    // Special handling for main NPC (The Guide)
    if (npcId === -1) {
      setHasTalkedToGuide(true);

      // Phase transitions when talking to the guide
      setGamePhase(prev => (prev === GamePhase.NotStarted ? GamePhase.Round1 : prev));
      
      return;
    }
    
    // Only mark as spoken if they haven't been spoken to yet
    if (!spokenNPCs.has(npcId)) {
      setSpokenNPCs(prev => {
        const newSpokenNPCs = new Set(prev).add(npcId);
        
        // If all 6 NPCs have been spoken to, move to awaiting guide to finalize
        if (newSpokenNPCs.size === 6) {
          setHasTalkedToGuide(false);
          setGamePhase(GamePhase.AwaitGuideToFinalize);
        }
        
        return newSpokenNPCs;
      });
    }

    const newEntry: BallotEntry = {
      npcId: npcId,
      npcName: NPCNames[npcId],
      system: NPCSystems[npcId],
      round: round,
      sustainableOption: NPCOptions[npcId].sustainable,
      unsustainableOption: NPCOptions[npcId].unsustainable,
      timestamp: Date.now()
    }

    setBallotEntries(prev => {
      // Check if there's already an entry for this NPC
      const existingIndex = prev.findIndex(entry => entry.npcId === npcId);
      
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = newEntry;
        return updated; // Update existing entry
      } else {
        return [...prev, newEntry]; // Add new entry
      }
    });

    // Record detected opinion as A (sustainable) or B (unsustainable)
    if (detectedOpinion && npcId >= 1 && npcId <= 6) {
      const sustainable = NPCOptions[npcId].sustainable;
      const unsustainable = NPCOptions[npcId].unsustainable;
      const normalized = detectedOpinion.opinion === sustainable
        ? 'A'
        : detectedOpinion.opinion === unsustainable
        ? 'B'
        : null;
      if (normalized) {
        setNpcOpinions(prev => ({ ...prev, [npcId]: normalized }));
      }
    }

    // Check if all NPCs have been spoken to
    const allNPCsSpoken = spokenNPCs.size >= 6;

    // Ballot entry added for regular NPCs (notification functionality removed)
  }

  // Function to calculate and show ending
  const calculateAndShowEnding = () => {
    const sustainableCount = Object.values(finalDecisions).filter(decision => decision === 'sustainable').length;
    
    let ending: 'good' | 'medium' | 'bad';
    if (sustainableCount >= 6) {
      ending = 'good';
    } else if (sustainableCount >= 4) {
      ending = 'medium';
    } else {
      ending = 'bad';
    }
    
    setEndingType(ending);
    setShowEnding(true);
  }

  // Function to handle when decisions are complete
  const handleDecisionsComplete = (decisions: { [npcId: number]: 'sustainable' | 'unsustainable' }) => {
    setFinalDecisions(decisions);
    setShowDecisionMode(true);
    setDecisionsFinalized(true);
    setGamePhase(GamePhase.Completed);
    
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('return-to-main-menu'));
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
    soundEffects.playClick();
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
    (window as any).hasGameStarted = gamePhase !== GamePhase.NotStarted
    return () => {
      delete (window as any).hasGameStarted
    }
  }, [gamePhase])

  // Expose the guide alert state to the game
  useEffect(() => {
    (window as any).shouldShowGuideAlert = () => {
      const allNPCsSpoken = spokenNPCs.size >= 6
      return (
        gamePhase === GamePhase.NotStarted ||
        (gamePhase === GamePhase.AwaitGuideToFinalize && allNPCsSpoken)
      )
    }
    
    return () => {
      delete (window as any).shouldShowGuideAlert
    }
  }, [gamePhase, hasTalkedToGuide, spokenNPCs.size, chatState.round])

  // Expose the triggerEndingPhase function to the window object
  useEffect(() => {
    (window as any).triggerEndingPhase = () => {
      setShowDecisionMode(true);
      setShowPDA(true);
    }
    return () => {
      delete (window as any).triggerEndingPhase
    }
  }, [])

  // Expose testing functions to the window object
  useEffect(() => {
    (window as any).completeAllNPCs = () => {
      
      setSpokenNPCs(new Set([1, 2, 3, 4, 5, 6]));
      
      // Don't change round yet - wait for Michael to finish his speech
      // setChatState(prev => ({ ...prev, round: 2 }));
      
      // Create ballot entries for Round 1 (introduction phase)
      const round1Entries: BallotEntry[] = [
        {
          npcId: 1,
          npcName: NPCNames[1],
          system: NPCSystems[1],
          round: 1,
          sustainableOption: NPCOptions[1].sustainable,
          unsustainableOption: NPCOptions[1].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 2,
          npcName: NPCNames[2],
          system: NPCSystems[2],
          round: 1,
          sustainableOption: NPCOptions[2].sustainable,
          unsustainableOption: NPCOptions[2].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 3,
          npcName: NPCNames[3],
          system: NPCSystems[3],
          round: 1,
          sustainableOption: NPCOptions[3].sustainable,
          unsustainableOption: NPCOptions[3].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 4,
          npcName: NPCNames[4],
          system: NPCSystems[4],
          round: 1,
          sustainableOption: NPCOptions[4].sustainable,
          unsustainableOption: NPCOptions[4].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 5,
          npcName: NPCNames[5],
          system: NPCSystems[5],
          round: 1,
          sustainableOption: NPCOptions[5].sustainable,
          unsustainableOption: NPCOptions[5].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 6,
          npcName: NPCNames[6],
          system: NPCSystems[6],
          round: 1,
          sustainableOption: NPCOptions[6].sustainable,
          unsustainableOption: NPCOptions[6].unsustainable,
          timestamp: Date.now()
        }
      ];
      
      setBallotEntries(round1Entries);
      setHasTalkedToGuide(false); 
      
    }

    // Legacy testing function cleanup
    (window as any).createTestBallot = () => {
      const round1Entries: BallotEntry[] = [
        {
          npcId: 1,
          npcName: NPCNames[1],
          system: NPCSystems[1],
          round: 1,
          sustainableOption: NPCOptions[1].sustainable,
          unsustainableOption: NPCOptions[1].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 2,
          npcName: NPCNames[2],
          system: NPCSystems[2],
          round: 1,
          sustainableOption: NPCOptions[2].sustainable,
          unsustainableOption: NPCOptions[2].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 3,
          npcName: NPCNames[3],
          system: NPCSystems[3],
          round: 1,
          sustainableOption: NPCOptions[3].sustainable,
          unsustainableOption: NPCOptions[3].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 4,
          npcName: NPCNames[4],
          system: NPCSystems[4],
          round: 1,
          sustainableOption: NPCOptions[4].sustainable,
          unsustainableOption: NPCOptions[4].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 5,
          npcName: NPCNames[5],
          system: NPCSystems[5],
          round: 1,
          sustainableOption: NPCOptions[5].sustainable,
          unsustainableOption: NPCOptions[5].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 6,
          npcName: NPCNames[6],
          system: NPCSystems[6],
          round: 1,
          sustainableOption: NPCOptions[6].sustainable,
          unsustainableOption: NPCOptions[6].unsustainable,
          timestamp: Date.now()
        }
      ];
      
      const round2Entries: BallotEntry[] = [
        {
          npcId: 1,
          npcName: NPCNames[1],
          system: NPCSystems[1],
          round: 2,
          sustainableOption: NPCOptions[1].sustainable,
          unsustainableOption: NPCOptions[1].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 2,
          npcName: NPCNames[2],
          system: NPCSystems[2],
          round: 2,
          sustainableOption: NPCOptions[2].sustainable,
          unsustainableOption: NPCOptions[2].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 3,
          npcName: NPCNames[3],
          system: NPCSystems[3],
          round: 2,
          sustainableOption: NPCOptions[3].sustainable,
          unsustainableOption: NPCOptions[3].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 4,
          npcName: NPCNames[4],
          system: NPCSystems[4],
          round: 2,
          sustainableOption: NPCOptions[4].sustainable,
          unsustainableOption: NPCOptions[4].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 5,
          npcName: NPCNames[5],
          system: NPCSystems[5],
          round: 2,
          sustainableOption: NPCOptions[5].sustainable,
          unsustainableOption: NPCOptions[5].unsustainable,
          timestamp: Date.now()
        },
        {
          npcId: 6,
          npcName: NPCNames[6],
          system: NPCSystems[6],
          round: 2,
          sustainableOption: NPCOptions[6].sustainable,
          unsustainableOption: NPCOptions[6].unsustainable,
          timestamp: Date.now()
        }
      ];
      
      setBallotEntries(round1Entries);
      setHasTalkedToGuide(false); // Don't auto-talk to guide, let player do it
    }

    (window as any).resetGame = () => {
      setSpokenNPCs(new Set());
      setHasTalkedToGuide(false);
      setGamePhase(GamePhase.NotStarted);
      setBallotEntries([]);
      setNpcOpinions({});
    }

    return () => {
      delete (window as any).completeAllNPCs
      delete (window as any).resetGame
      delete (window as any).createTestBallot
    }
  }, [])

  const handleRestartGame = async () => {
    
    // Clear saved data before restarting
    if (typeof window !== 'undefined') {
      setShowDecisionMode(false);
      setShowPDA(false);
      const participantId = sessionManager.getSessionInfo().participantId;
      const spokenNPCsKey = participantId ? `multiagent-spoken-npcs-${participantId}` : 'multiagent-spoken-npcs';
      const ballotEntriesKey = participantId ? `multiagent-ballot-entries-${participantId}` : 'multiagent-ballot-entries';
      const hasTalkedToGuideKey = participantId ? `multiagent-has-talked-to-guide-${participantId}` : 'multiagent-has-talked-to-guide';
      const chatStateKey = participantId ? `multiagent-chat-state-${participantId}` : 'multiagent-chat-state';
      const gamePhaseKey = participantId ? `multiagent-game-phase-${participantId}` : 'multiagent-game-phase';
      const decisionModeKey = participantId ? `multiagent-show-decision-mode-${participantId}` : 'multiagent-show-decision-mode';
      const decisionsFinalizedKey = participantId ? `multiagent-decisions-finalized-${participantId}` : 'multiagent-decisions-finalized';
      const finalDecisionsKey = participantId ? `multiagent-final-decisions-${participantId}` : 'multiagent-final-decisions';
      
      localStorage.removeItem(spokenNPCsKey);
      localStorage.removeItem(ballotEntriesKey);
      localStorage.removeItem(hasTalkedToGuideKey);
      localStorage.removeItem(chatStateKey);
      localStorage.removeItem(gamePhaseKey);
      localStorage.removeItem(decisionModeKey);
      localStorage.removeItem(decisionsFinalizedKey);
      localStorage.removeItem(finalDecisionsKey);
      
      // Clear and reset welcome state for this participant
      const welcomeKey = participantId ? `multiagent-show-welcome-${participantId}` : 'multiagent-show-welcome';
      localStorage.removeItem(welcomeKey);
      localStorage.setItem(welcomeKey, 'true');

      // Clear session but keep participant ID
      await sessionManager.clearSessionOnly();      
    }
    window.location.href = window.location.origin + window.location.pathname;
  }

  const handleNewGame = async () => {
    // Clear saved data before starting new game
    if (typeof window !== 'undefined') {
      setShowDecisionMode(false);
      setShowPDA(false);
      const participantId = sessionManager.getSessionInfo().participantId;
      const spokenNPCsKey = participantId ? `multiagent-spoken-npcs-${participantId}` : 'multiagent-spoken-npcs';
      const ballotEntriesKey = participantId ? `multiagent-ballot-entries-${participantId}` : 'multiagent-ballot-entries';
      const hasTalkedToGuideKey = participantId ? `multiagent-has-talked-to-guide-${participantId}` : 'multiagent-has-talked-to-guide';
      const chatStateKey = participantId ? `multiagent-chat-state-${participantId}` : 'multiagent-chat-state';
      const gamePhaseKey = participantId ? `multiagent-game-phase-${participantId}` : 'multiagent-game-phase';
      const decisionModeKey = participantId ? `multiagent-show-decision-mode-${participantId}` : 'multiagent-show-decision-mode';
      const decisionsFinalizedKey = participantId ? `multiagent-decisions-finalized-${participantId}` : 'multiagent-decisions-finalized';
      const finalDecisionsKey = participantId ? `multiagent-final-decisions-${participantId}` : 'multiagent-final-decisions';
      
      localStorage.removeItem(spokenNPCsKey);
      localStorage.removeItem(ballotEntriesKey);
      localStorage.removeItem(hasTalkedToGuideKey);
      localStorage.removeItem(chatStateKey);
      localStorage.removeItem(gamePhaseKey);
      localStorage.removeItem(decisionModeKey);
      localStorage.removeItem(decisionsFinalizedKey);
      localStorage.removeItem(finalDecisionsKey);
      
      // Clear and reset welcome state for this participant
      const welcomeKey = participantId ? `multiagent-show-welcome-${participantId}` : 'multiagent-show-welcome';
      localStorage.removeItem(welcomeKey);
      localStorage.setItem(welcomeKey, 'true');

      // Don't clear the participant ID - just clear game progress data
      // The participant ID should remain so the game can restart properly
    }
    window.location.href = window.location.origin + window.location.pathname;
  }

  // Handle hotbar slot clicks
  const handleHotbarClick = (index: number) => {
    soundEffects.playClick();
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
                soundEffects.playClick();
                setShowWelcome(false);
              }}
            >
              Start Playing
            </button>
          </div>
        </div>
      )}

      {/* Persistent NPC Sidebar */}
      {!showWelcome && (
        <div 
          className={styles.npcSidebar}
        >
          {[1, 2, 3, 4, 5, 6].map((id) => {
            const hasSpoken = spokenNPCs.has(id);
            const opinion = npcOpinions[id];
            return (
              <div 
                key={id} 
                className={`${styles.npcSidebarItem} ${hasSpoken ? styles.round1Spoken : ''}`}
              >
                <div className={styles.npcLeft}>
                  <div className={styles.npcHead}>
                    <img src={`/assets/characters/${getNPCImage(id)}`} alt={NPCNames[id]} />
                    {opinion && (
                      <span className={`${styles.opinionBadge} ${opinion === 'A' ? styles.opinionA : styles.opinionB}`}>
                        {opinion}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.npcRight}>
                  <div className={styles.npcNameRow}>
                    <span className={styles.npcName}>{NPCNames[id]}</span>
                  </div>
                  {/* Show proposals once spoken to */}
                  {hasSpoken && (
                    <div className={`${styles.npcProposals} ${(hasSpoken && opinion) ? styles.hasSelection : ''}`}>
                      <div className={`${styles.npcProposalRow} ${(hasSpoken && opinion === 'A') ? styles.selectedA : ''}`}>
                        <span className={`${styles.proposalPill} ${styles.proposalA} ${(hasSpoken && opinion === 'A') ? styles.pillSelectedA : ''}`}>A</span>
                        <span className={styles.proposalText}>{NPCOptions[id].sustainable}</span>
                      </div>
                      <div className={`${styles.npcProposalRow} ${(hasSpoken && opinion === 'B') ? styles.selectedB : ''}`}>
                        <span className={`${styles.proposalPill} ${styles.proposalB} ${(hasSpoken && opinion === 'B') ? styles.pillSelectedB : ''}`}>B</span>
                        <span className={styles.proposalText}>{NPCOptions[id].unsustainable}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Indicator */}
      {!showWelcome && (
        <ProgressIndicator
          currentRound={1}
          spokenNPCs={{
            round1: spokenNPCs,
            round2: new Set<number>()
          }}
          hasTalkedToGuide={hasTalkedToGuide}
          gamePhase={gamePhase}
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
            {index === 0 ? (
              <div style={{ position: 'relative' }}>
                <img 
                  src="/assets/PDA/pda.png" 
                  alt="PDA" 
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    objectFit: 'contain'
                  }} 
                />
                {pdaNotification && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#ef4444',
                      borderRadius: '50%',
                      border: '1px solid #ffffff',
                      boxShadow: '0 0 4px rgba(239, 68, 68, 0.8)'
                    }}
                  />
                )}
              </div>
            ) : (
              index + 1
            )}
          </div>
        ))}
      </div>

      {/* Menu Button */}
      <button
        className={styles.menuButton}
        onClick={() => {
          soundEffects.playClick();
          setShowGameMenu(true);
        }}
      >
        Menu (ESC)
      </button>

      {/* Inventory Button */}
      <button
        className={styles.inventoryButton}
        onClick={() => {
          soundEffects.playClick();
          setInventoryOpen(!inventoryOpen);
        }}
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
              onClick={() => {
                soundEffects.playClick();
                setInventoryOpen(false);
              }}
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
        spokenNPCs={{
          round1: spokenNPCs,
          round2: new Set<number>()
        }}
        onClose={closeChat}
        onRoundChange={handleRoundChange}
        onStanceChange={handleStanceChange}
        onConversationComplete={(npcId, round, detectedOpinion, conversationAnalysis) => markNPCAsSpoken(npcId, round, detectedOpinion, conversationAnalysis)}
      />

      {/* Guide Dialog */}
      <GuideDialog
        isOpen={guideDialogOpen}
        round={chatState.round}
        spokenNPCs={{
          round1: spokenNPCs,
          round2: new Set<number>()
        }}
        onClose={closeGuideDialog}
        onRoundChange={handleRoundChange}
        onConversationComplete={(npcId, round, detectedOpinion, conversationAnalysis) => markNPCAsSpoken(npcId, round, detectedOpinion, conversationAnalysis)}
        onOpenPDA={() => {
          setShowDecisionMode(true);
          setShowPDA(true);
        }}
      />

      {/* Game Menu */}
      <GameMenu
        isOpen={showGameMenu}
        onClose={() => setShowGameMenu(false)}
        onRestartGame={handleRestartGame}
        onNewGame={handleNewGame}
        onReturnToMainMenu={() => {
          setShowGameMenu(false);
          window.dispatchEvent(new CustomEvent('return-to-main-menu'));
        }}
      />

      {/* PDA */}
      <PDA
        isOpen={showPDA}
        onClose={() => setShowPDA(false)}
        ballotEntries={ballotEntries}
        onDecisionsComplete={handleDecisionsComplete}
        showDecisionMode={showDecisionMode}
        spokenNPCs={{
          round1: spokenNPCs,
          round2: new Set<number>()
        }}
        currentRound={1}
        decisionsFinalized={decisionsFinalized}
        finalDecisions={finalDecisions}
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