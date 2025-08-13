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
    Round1Active = 1,
    AwaitGuideToRound2 = 15,
    Round2Active = 2,
    AwaitGuideToFinalize = 25,
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
  const [spokenNPCs, setSpokenNPCs] = useState<{
    round1: Set<number>
    round2: Set<number>
  }>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      // Get participant ID for localStorage key
      const participantId = sessionManager.getSessionInfo().participantId;
      const storageKey = participantId ? `multiagent-spoken-npcs-${participantId}` : 'multiagent-spoken-npcs';
      
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const result: { round1: Set<number>; round2: Set<number> } = {
            round1: new Set((parsed.round1 || []).map((id: any) => Number(id))),
            round2: new Set((parsed.round2 || []).map((id: any) => Number(id)))
          };
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
    return result;
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
      
      const dataToSave = {
        round1: Array.from(spokenNPCs.round1),
        round2: Array.from(spokenNPCs.round2)
      };
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
    
    // Determine the correct round for regular NPCs
    const npcIdNum = parseInt(npcId);
    let correctRound = 1;
    
    // Check if Round 1 is complete
    const round1Complete = spokenNPCs.round1.size >= 6;
    
    // If Round 1 is not complete, stay in Round 1 regardless of previous conversations
    if (!round1Complete) {
      correctRound = 1;
    } else if (round1Complete && !hasTalkedToGuide) {
      // If Round 1 is complete but guide hasn't been talked to, stay in Round 1
      correctRound = 1;
    } else if (round1Complete && hasTalkedToGuide && spokenNPCs.round1.has(npcIdNum)) {
      // Only advance to Round 2 if guide has been talked to AND Round 1 is complete
      correctRound = 2;
    }
    
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
    window.dispatchEvent(new CustomEvent('chatClosed', { detail: { npcId: 'main' } }));
  }

  // Function to mark NPC as actually spoken to (called when conversation has content)
  const markNPCAsSpoken = (npcId: number, round: number, detectedOpinion?: { opinion: string; reasoning: string }, conversationAnalysis?: { isComplete: boolean; reason: string }) => {
    // Special handling for main NPC (The Guide)
    if (npcId === -1) {
      setHasTalkedToGuide(true);

      // Phase transitions when talking to the guide
      setGamePhase(prev => (prev === GamePhase.NotStarted ? GamePhase.Round1Active : prev));
      if (spokenNPCs.round1.size >= 6 && spokenNPCs.round2.size < 6) {
        setGamePhase(GamePhase.Round2Active);
      }
      
      return;
    }
    
    const roundKey = round === 1 ? 'round1' : 'round2';
    
    // Only mark as spoken if they haven't been spoken to in this round yet
    if (!spokenNPCs[roundKey as keyof typeof spokenNPCs].has(npcId)) {
      setSpokenNPCs(prev => {
        const newSpokenNPCs = {
          ...prev,
          [roundKey]: new Set(Array.from(prev[roundKey]).concat([npcId]))
        };
        
        // If Round 1 just completed, move to awaiting guide to advance to Round 2
        if (round === 1 && newSpokenNPCs.round1.size === 6) {
          setHasTalkedToGuide(false);
          setGamePhase(GamePhase.AwaitGuideToRound2);
        }
        // If Round 2 just completed, move to awaiting guide to finalize
        if (round === 2 && newSpokenNPCs.round2.size === 6) {
          setHasTalkedToGuide(false);
          setGamePhase(GamePhase.AwaitGuideToFinalize);
        }
        
        return newSpokenNPCs;
      });
    } else {
      return;
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
      // Check if there's already an entry for this NPC and round
      const existingIndex = prev.findIndex(entry => entry.npcId === npcId && entry.round === round);
      
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = newEntry;
        return updated; // Update existing entry
      } else {
        return [...prev, newEntry]; // Add new entry
      }
    });

    // Record detected opinion in Round 2 as A (sustainable) or B (unsustainable)
    if (round === 2 && detectedOpinion && npcId >= 1 && npcId <= 6) {
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

    // Check if all NPCs have been spoken to in the current round
    const currentSpokenNPCs = spokenNPCs[roundKey as keyof typeof spokenNPCs];
    const allNPCsSpoken = currentSpokenNPCs.size >= 6;

    // Trigger PDA notification only for regular NPCs (not the main NPC/guide)
    // This alerts users that a new ballot entry has been added to the PDA
    if (npcId >= 1 && npcId <= 6) {
      triggerPdaNotification();
    }
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
      const round1Complete = spokenNPCs.round1.size >= 6
      const round2Complete = spokenNPCs.round2.size >= 6
      return (
        gamePhase === GamePhase.NotStarted ||
        (gamePhase === GamePhase.AwaitGuideToRound2 && round1Complete) ||
        (gamePhase === GamePhase.AwaitGuideToFinalize && round2Complete)
      )
    }
    
    return () => {
      delete (window as any).shouldShowGuideAlert
    }
  }, [gamePhase, hasTalkedToGuide, spokenNPCs.round1.size, spokenNPCs.round2.size, chatState.round])

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
    (window as any).completeRound1 = () => {
      
      setSpokenNPCs(prev => ({
        round1: new Set([1, 2, 3, 4, 5, 6]),
        round2: prev.round2
      }));
      
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

    (window as any).completeRound2 = () => {
      
      setSpokenNPCs(prev => ({
        round1: new Set([1, 2, 3, 4, 5, 6]),
        round2: new Set([1, 2, 3, 4, 5, 6])
      }));
      
      // ✅ ADD THIS LINE to update the game round to 2
      setChatState(prev => ({ ...prev, round: 2 }));
      
      // Create ballot entries for both Round 1 and Round 2
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
      
      setBallotEntries([...round1Entries, ...round2Entries]);
      setHasTalkedToGuide(false); // Don't auto-talk to guide, let player do it
      setShowDecisionMode(true);
    }

    (window as any).resetToRound1 = () => {
      
      setSpokenNPCs({
        round1: new Set(),
        round2: new Set()
      });
      setHasTalkedToGuide(false);
      
    }

    return () => {
      delete (window as any).completeRound1
      delete (window as any).completeRound2
      delete (window as any).resetToRound1
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
    // If slot 1 is clicked, open PDA and clear notification
    if (index === 0) {
      setShowPDA(true)
      setPdaNotification(false) // Clear the notification when PDA is opened
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
            const currentRound = chatState.round === 2 ? 2 : 1;
            const hasSpokenThisRound = currentRound === 1 ? spokenNPCs.round1.has(id) : spokenNPCs.round2.has(id);
            const hasSpokenRound1 = spokenNPCs.round1.has(id);
            const hasSpokenRound2 = spokenNPCs.round2.has(id);
            const isRound1 = currentRound === 1;
            const opinion = npcOpinions[id];
            return (
              <div 
                key={id} 
                className={`${styles.npcSidebarItem} ${hasSpokenThisRound ? (isRound1 ? styles.round1Spoken : styles.round2Spoken) : ''}`}
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
                  {/* Show proposals once spoken to in Round 1 */}
                  {hasSpokenRound1 && (
                    <div className={`${styles.npcProposals} ${(!isRound1 && hasSpokenRound2 && opinion) ? styles.hasSelection : ''}`}>
                      <div className={`${styles.npcProposalRow} ${(!isRound1 && hasSpokenRound2 && opinion === 'A') ? styles.selectedA : ''}`}>
                        <span className={`${styles.proposalPill} ${styles.proposalA} ${(!isRound1 && hasSpokenRound2 && opinion === 'A') ? styles.pillSelectedA : ''}`}>A</span>
                        <span className={styles.proposalText}>{NPCOptions[id].sustainable}</span>
                      </div>
                      <div className={`${styles.npcProposalRow} ${(!isRound1 && hasSpokenRound2 && opinion === 'B') ? styles.selectedB : ''}`}>
                        <span className={`${styles.proposalPill} ${styles.proposalB} ${(!isRound1 && hasSpokenRound2 && opinion === 'B') ? styles.pillSelectedB : ''}`}>B</span>
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
          currentRound={chatState.round}
          spokenNPCs={spokenNPCs}
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
        spokenNPCs={spokenNPCs}
        onClose={closeChat}
        onRoundChange={handleRoundChange}
        onStanceChange={handleStanceChange}
        onConversationComplete={(npcId, round, detectedOpinion, conversationAnalysis) => markNPCAsSpoken(npcId, round, detectedOpinion, conversationAnalysis)}
      />

      {/* Guide Dialog */}
      <GuideDialog
        isOpen={guideDialogOpen}
        round={chatState.round}
        spokenNPCs={spokenNPCs}
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
        spokenNPCs={spokenNPCs}
        currentRound={chatState.round}
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