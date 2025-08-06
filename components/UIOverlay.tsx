import { useState, useEffect } from 'react'
import { Game } from 'phaser'
import ChatDialog from './ChatDialog'
import GuideDialog from './GuideDialog'
import GameMenu from './GameMenu'
import ProgressIndicator from './ProgressIndicator'
import PDA from './PDA'
import EndingOverlay from './EndingOverlay'
import { NPCNames, NPCSystems, NPCOptions } from '../utils/npcData'
import { sessionManager } from '../utils/sessionManager'

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
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('multiagent-show-welcome');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [hasStartedGame, setHasStartedGame] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('multiagent-has-started-game');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [hasTalkedToGuide, setHasTalkedToGuide] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('multiagent-has-talked-to-guide');
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
      const saved = localStorage.getItem('multiagent-chat-state');
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
    return result;
  });

  // Track final decisions for ending calculation
  const [finalDecisions, setFinalDecisions] = useState<{ [npcId: number]: 'sustainable' | 'unsustainable' }>({});
  const [showEnding, setShowEnding] = useState(false);
  const [endingType, setEndingType] = useState<'good' | 'bad' | null>(null);
  const [showPDA, setShowPDA] = useState(false);
  const [showDecisionMode, setShowDecisionMode] = useState(false);
  const [pdaNotification, setPdaNotification] = useState(false);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  
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

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('multiagent-show-welcome', JSON.stringify(showWelcome));
    }
  }, [showWelcome]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('multiagent-has-started-game', JSON.stringify(hasStartedGame));
    }
  }, [hasStartedGame]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('multiagent-has-talked-to-guide', JSON.stringify(hasTalkedToGuide));
    }
  }, [hasTalkedToGuide]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('multiagent-chat-state', JSON.stringify(chatState));
    }
  }, [chatState]);

  // Update global window state to reflect loaded values
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).hasGameStarted = hasStartedGame;
      (window as any).hasTalkedToGuide = hasTalkedToGuide;
      (window as any).currentRound = chatState.round;
      (window as any).spokenNPCs = spokenNPCs;
    }
  }, [hasStartedGame, hasTalkedToGuide, chatState.round, spokenNPCs]);

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
    
    // If Round 1 is complete and NPC has been spoken to in Round 1, they should be in Round 2
    if (round1Complete && spokenNPCs.round1.has(npcIdNum)) {
      correctRound = 2;
    }
    
    // If Round 1 is not complete, stay in Round 1 regardless of previous conversations
    if (!round1Complete) {
      correctRound = 1;
    }
    
    console.log('Determined round for NPC:', { 
      npcId: npcIdNum, 
      correctRound, 
      round1Spoken: spokenNPCs.round1.has(npcIdNum), 
      round2Spoken: spokenNPCs.round2.has(npcIdNum),
      round1Complete,
      round1Size: spokenNPCs.round1.size
    });
    
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
    console.log('markNPCAsSpoken called:', { npcId, round, detectedOpinion, conversationAnalysis });
    
    // Special handling for main NPC (The Guide)
    if (npcId === -1) {
      setHasTalkedToGuide(true);
      
      // Check if all NPCs have been spoken to in the current round
      const currentRound = chatState.round;
      const round1Complete = spokenNPCs.round1.size >= 6;
      const round2Complete = spokenNPCs.round2.size >= 6;
      
      // Only advance to Round 2 if Round 1 is complete
      if (currentRound === 1 && round1Complete) {
        console.log('All NPCs spoken in round 1, advancing to round 2');
        setChatState(prev => ({
          ...prev,
          round: 2
        }));
      } else if (currentRound === 2 && round2Complete) {
        console.log('All NPCs spoken in round 2, triggering ending phase');
        // Trigger ending phase after a short delay
        setTimeout(() => {
          setShowDecisionMode(true);
          setShowPDA(true);
        }, 1000); // Small delay for better UX
      } else if (currentRound === 1 && !round1Complete) {
        // Don't advance - player needs to complete Round 1 first
      } else if (currentRound === 2 && !round2Complete) {
        // Don't advance - player needs to complete Round 2 first
      }
      // Note: The Guide conversation history is preserved across rounds, so we don't add them to spokenNPCs
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
        console.log('Updated spoken NPCs:', {
          round1: Array.from(newSpokenNPCs.round1),
          round2: Array.from(newSpokenNPCs.round2)
        });
        return newSpokenNPCs;
      });
    } else {
      console.log('NPC already spoken to in this round, not marking again:', { npcId, round });
      return;
    }

    const newEntry: BallotEntry = {
      npcId: npcId,
      npcName: NPCNames[npcId],
      system: NPCSystems[npcId],
      round: round,
      sustainableOption: NPCOptions[npcId].sustainable,
      unsustainableOption: NPCOptions[npcId].unsustainable,
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

    // Trigger PDA notification only for regular NPCs (not the main NPC/guide)
    // This alerts users that a new ballot entry has been added to the PDA
    if (npcId >= 1 && npcId <= 6) {
      triggerPdaNotification();
    }

    // Round advancement is now handled by the main NPC conversation
    // Regular NPCs just track progress, main NPC triggers round changes
    console.log(`NPC ${npcId} conversation completed in round ${round}. All NPCs spoken: ${allNPCsSpoken}`);
  }

  // Function to calculate and show ending
  const calculateAndShowEnding = () => {
    const sustainableCount = Object.values(finalDecisions).filter(decision => decision === 'sustainable').length;
    const unsustainableCount = Object.values(finalDecisions).filter(decision => decision === 'unsustainable').length;
    
    console.log('Calculating ending:', { sustainableCount, unsustainableCount, finalDecisions });
    
    let ending: 'good' | 'bad';
    if (sustainableCount >= 5) {
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
    (window as any).hasGameStarted = hasStartedGame
    return () => {
      delete (window as any).hasGameStarted
    }
  }, [hasStartedGame])

  // Expose the guide alert state to the game
  useEffect(() => {
    (window as any).shouldShowGuideAlert = () => {
      // Show guide alert when:
      // 1. Game hasn't started yet (ProgressIndicator shows initial guide checklist)
      // 2. Player hasn't talked to The Guide yet (including when Round 1 is complete)
      return !hasStartedGame || !hasTalkedToGuide;
    }
    
    return () => {
      delete (window as any).shouldShowGuideAlert
    }
  }, [hasTalkedToGuide, hasStartedGame, spokenNPCs.round1.size])

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

  // Expose testing functions to the window object
  useEffect(() => {
    (window as any).completeRound1 = () => {
      console.log('🧪 TESTING: Completing Round 1 for all NPCs');
      setSpokenNPCs(prev => ({
        round1: new Set([1, 2, 3, 4, 5, 6]),
        round2: prev.round2
      }));
      
      // ✅ ADD THIS LINE to update the game round
      setChatState(prev => ({ ...prev, round: 2 }));
      
      // Create ballot entries for Round 1 (introduction phase)
      const round1Entries: BallotEntry[] = [
        {
          npcId: 1,
          npcName: NPCNames[1],
          system: NPCSystems[1],
          round: 1,
          sustainableOption: NPCOptions[1].sustainable,
          unsustainableOption: NPCOptions[1].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 2,
          npcName: NPCNames[2],
          system: NPCSystems[2],
          round: 1,
          sustainableOption: NPCOptions[2].sustainable,
          unsustainableOption: NPCOptions[2].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 3,
          npcName: NPCNames[3],
          system: NPCSystems[3],
          round: 1,
          sustainableOption: NPCOptions[3].sustainable,
          unsustainableOption: NPCOptions[3].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 4,
          npcName: NPCNames[4],
          system: NPCSystems[4],
          round: 1,
          sustainableOption: NPCOptions[4].sustainable,
          unsustainableOption: NPCOptions[4].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 5,
          npcName: NPCNames[5],
          system: NPCSystems[5],
          round: 1,
          sustainableOption: NPCOptions[5].sustainable,
          unsustainableOption: NPCOptions[5].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 6,
          npcName: NPCNames[6],
          system: NPCSystems[6],
          round: 1,
          sustainableOption: NPCOptions[6].sustainable,
          unsustainableOption: NPCOptions[6].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        }
      ];
      
      setBallotEntries(round1Entries);
      setHasTalkedToGuide(false); // Don't auto-talk to guide, let player do it
      setHasStartedGame(true); // Game has started, but guide not talked to yet
      console.log('✅ Round 1 completed! Talk to The Guide to advance to Round 2');
      console.log('📱 PDA populated with Round 1 information');
    }

    (window as any).completeRound2 = () => {
      console.log('🧪 TESTING: Completing Round 2 for all NPCs');
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
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 2,
          npcName: NPCNames[2],
          system: NPCSystems[2],
          round: 1,
          sustainableOption: NPCOptions[2].sustainable,
          unsustainableOption: NPCOptions[2].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 3,
          npcName: NPCNames[3],
          system: NPCSystems[3],
          round: 1,
          sustainableOption: NPCOptions[3].sustainable,
          unsustainableOption: NPCOptions[3].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 4,
          npcName: NPCNames[4],
          system: NPCSystems[4],
          round: 1,
          sustainableOption: NPCOptions[4].sustainable,
          unsustainableOption: NPCOptions[4].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 5,
          npcName: NPCNames[5],
          system: NPCSystems[5],
          round: 1,
          sustainableOption: NPCOptions[5].sustainable,
          unsustainableOption: NPCOptions[5].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
          timestamp: Date.now()
        },
        {
          npcId: 6,
          npcName: NPCNames[6],
          system: NPCSystems[6],
          round: 1,
          sustainableOption: NPCOptions[6].sustainable,
          unsustainableOption: NPCOptions[6].unsustainable,
          npcOpinion: '',
          npcReasoning: '',
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
          npcOpinion: 'I recommend the Urban Agriculture Zones. They create community spaces and improve food security. The industrial expansion might bring more tax revenue, but it eliminates green spaces and increases pollution. We need to balance economic growth with community wellbeing.',
          npcReasoning: 'Community wellbeing and food security',
          timestamp: Date.now()
        },
        {
          npcId: 2,
          npcName: NPCNames[2],
          system: NPCSystems[2],
          round: 2,
          sustainableOption: NPCOptions[2].sustainable,
          unsustainableOption: NPCOptions[2].unsustainable,
          npcOpinion: 'I recommend the Diesel Supply Contracts. Reliability is crucial for fuel systems. The biofuel cooperative is innovative but has limited production capacity. Right now, we need guaranteed fuel availability to keep the city running. The contracts provide stable pricing and supply.',
          npcReasoning: 'System reliability and guaranteed supply',
          timestamp: Date.now()
        },
        {
          npcId: 3,
          npcName: NPCNames[3],
          system: NPCSystems[3],
          round: 2,
          sustainableOption: NPCOptions[3].sustainable,
          unsustainableOption: NPCOptions[3].unsustainable,
          npcOpinion: 'I recommend the Local Solar Microgrids. They reduce carbon emissions and create energy independence. The gas power hub might be more reliable, but it locks us into fossil fuel dependency. We need to invest in renewable energy now for a sustainable future.',
          npcReasoning: 'Environmental sustainability and energy independence',
          timestamp: Date.now()
        },
        {
          npcId: 4,
          npcName: NPCNames[4],
          system: NPCSystems[4],
          round: 2,
          sustainableOption: NPCOptions[4].sustainable,
          unsustainableOption: NPCOptions[4].unsustainable,
          npcOpinion: 'I recommend the Public Shared Reservoir. Water is a basic human right that shouldn\'t be privatized. The tiered contracts might encourage conservation, but they could create water poverty for low-income families. Equal access ensures no one goes thirsty.',
          npcReasoning: 'Water justice and equal access',
          timestamp: Date.now()
        },
        {
          npcId: 5,
          npcName: NPCNames[5],
          system: NPCSystems[5],
          round: 2,
          sustainableOption: NPCOptions[5].sustainable,
          unsustainableOption: NPCOptions[5].unsustainable,
          npcOpinion: 'I recommend the Constructed Wetlands. While they take longer to purify water, they work with nature rather than against it. The chemical tanks might be faster, but they introduce toxins that could harm the ecosystem for generations. We need to think long-term about our water quality.',
          npcReasoning: 'Environmental sustainability and long-term ecosystem health',
          timestamp: Date.now()
        },
        {
          npcId: 6,
          npcName: NPCNames[6],
          system: NPCSystems[6],
          round: 2,
          sustainableOption: NPCOptions[6].sustainable,
          unsustainableOption: NPCOptions[6].unsustainable,
          npcOpinion: 'I recommend the Modular Eco-Pods. They\'re quick to deploy and environmentally friendly. The smart concrete complexes might be more durable, but they\'re extremely resource-intensive. We need housing solutions that don\'t destroy the environment we\'re trying to rebuild.',
          npcReasoning: 'Environmental impact and quick deployment',
          timestamp: Date.now()
        }
      ];
      
      setBallotEntries([...round1Entries, ...round2Entries]);
      setHasTalkedToGuide(false); // Don't auto-talk to guide, let player do it
      setHasStartedGame(true); // Game has started, but guide not talked to yet
      
      // ✅ ENABLE DECISION MODE when Round 2 is complete
      setShowDecisionMode(true);
      
      console.log('✅ Round 2 completed! Talk to The Guide to make final decisions');
      console.log('📱 PDA populated with Round 1 and Round 2 information');
      console.log('⚖️ Decision mode enabled - players can now make final choices');
    }

    (window as any).resetToRound1 = () => {
      console.log('🧪 TESTING: Resetting to Round 1');
      setSpokenNPCs({
        round1: new Set(),
        round2: new Set()
      });
      setHasTalkedToGuide(false);
      setHasStartedGame(true); // Game has started, but guide not talked to yet
      console.log('✅ Reset to Round 1! Talk to NPCs to complete Round 1');
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
      localStorage.removeItem('multiagent-spoken-npcs');
      localStorage.removeItem('multiagent-ballot-entries');
      localStorage.removeItem('multiagent-has-talked-to-guide');
      localStorage.removeItem('multiagent-chat-state');
      localStorage.removeItem('multiagent-has-started-game');
      localStorage.setItem('multiagent-show-welcome', 'true');
      
      // Clear session but keep participant ID
      await sessionManager.clearSessionOnly();
    }
    // Reload the page to restart the game
    window.location.reload()
  }

  const handleNewGame = async () => {
    // Clear saved data before starting new game
    if (typeof window !== 'undefined') {
      localStorage.removeItem('multiagent-spoken-npcs');
      localStorage.removeItem('multiagent-ballot-entries');
      localStorage.removeItem('multiagent-has-talked-to-guide');
      localStorage.removeItem('multiagent-chat-state');
      localStorage.removeItem('multiagent-has-started-game');
      localStorage.setItem('multiagent-show-welcome', 'true');

      // Clear session but keep participant ID
      await sessionManager.clearSessionOnly();
    }
    // Reload the page to start a new game
    window.location.reload()
  }

  // Handle hotbar slot clicks
  const handleHotbarClick = (index: number) => {
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

      {/* Guide Dialog */}
      <GuideDialog
        isOpen={guideDialogOpen}
        round={chatState.round}
        spokenNPCs={spokenNPCs}
        onClose={closeGuideDialog}
        onRoundChange={handleRoundChange}
        onConversationComplete={(npcId, round, detectedOpinion, conversationAnalysis) => markNPCAsSpoken(npcId, round, detectedOpinion, conversationAnalysis)}
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