import React from 'react'
import { NPCNames, NPCSystems, NPCOptions, getNPCImage, generateNPCPreferences } from '../utils/npcData'
import { sessionManager } from '../utils/sessionManager'

interface ProgressIndicatorProps {
  currentRound: number;
  spokenNPCs: {
    round1: Set<number>;
    round2: Set<number>;
  };
  hasTalkedToGuide?: boolean;
  gamePhase?: number; // 0=NotStarted, 1=Active, 15=AwaitGuideToFinalize, 100=Completed
  isChatOpen?: boolean;
  currentChatNPCId?: number;
}

export default function ProgressIndicator({ currentRound, spokenNPCs, hasTalkedToGuide = false, gamePhase = 0, isChatOpen = false, currentChatNPCId = -1 }: ProgressIndicatorProps) {
  const spokenNPCsList = Array.from(spokenNPCs.round1);
  const progress = (spokenNPCsList.length / 6) * 100;

  // MARK: - Logic Definitions
  // Single source of truth: drive from gamePhase (0 means NotStarted)
  const gameStarted = gamePhase !== 0;
  
  // Check if currently talking to The Guide
  const isTalkingToGuide = isChatOpen && currentChatNPCId === -1;
  
  // Check completion status
  const allNPCsSpoken = spokenNPCsList.length >= 6;
  
  // Whether to show Michael's mission checklist (mutually exclusive with progress bars)
  const initialStateActive = !gameStarted || (allNPCsSpoken && !hasTalkedToGuide) || gamePhase === 100;
  const isCompletedPhase = gamePhase === 100;
  
  // Determine what guidance to show
  const getGuidanceMessage = () => {
    if (!gameStarted) {
      return "Talk to Michael to start your mission";
    }
    
    if (allNPCsSpoken && !hasTalkedToGuide) {
      return "All experts consulted! Talk to Michael to make final decisions";
    } else if (allNPCsSpoken && hasTalkedToGuide) {
      return "Open your PDA to review all systems and make final decisions";
    } else {
      return `Talk to specialists to get their recommendations (${spokenNPCsList.length}/6)`;
    }
  };

  // Get opinion data for each NPC in single round system
  const getNPCOpinion = (npcId: number) => {
    const isSpokenTo = spokenNPCsList.includes(npcId);
    if (!isSpokenTo) {
      return { type: 'not_spoken', spoken: false };
    }
    
    // Show their opinion if player has spoken to them
    const participantId = sessionManager.getSessionInfo().participantId;
    if (participantId) {
      const preferences = generateNPCPreferences(participantId);
      const choice = preferences[npcId];
      const chosenOption = choice === 'sustainable' 
        ? NPCOptions[npcId].sustainable 
        : NPCOptions[npcId].unsustainable;
      const optionType = choice === 'sustainable' ? 'Proposal A' : 'Proposal B';
      
      return { 
        type: 'opinion', 
        choice, 
        chosenOption, 
        optionType,
        spoken: true
      };
    }
    
    return { type: 'not_spoken', spoken: false };
  };

  // Get mission text for single round system
  const getMissionText = (npcId: number) => {
    const npc = NPCOptions[npcId];
    if (!npc) return 'System information not available';
    
    return `Get ${NPCNames[npcId]}'s recommendation for ${NPCSystems[npcId]}`;
  };

  // Get detailed checklist items for each NPC in single round system
  const getNPCChecklistItems = (npcId: number) => {
    const npc = NPCOptions[npcId];
    if (!npc) return [];
    
    return [
      `Understand the current state of ${NPCSystems[npcId]}`,
      `Learn about ${npc.sustainable} and ${npc.unsustainable} approaches`,
      `Get ${NPCNames[npcId]}'s professional recommendation`,
      `Understand their reasoning and trade-offs`
    ];
  };

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h3>Mission Checklist</h3>
        {initialStateActive ? (
          <div className="initial-state">
            <div className="guide-checklist">
              <div className="guide-header">
                <img 
                  src="/assets/characters/tourguide.png" 
                  alt="Michael" 
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    borderRadius: '50%',
                    border: '2px solid #374151'
                  }} 
                />
                <span className="guide-title">Michael</span>
              </div>
              <div className="guide-mission">
                <div className="mission-title">
                  {gamePhase === 100 ? "Mission: Completed" :
                   !gameStarted ? "Mission: Start Your Journey" :
                   (allNPCsSpoken && !hasTalkedToGuide) ? "Mission: Make Final Decisions" : "Mission: Continue"}
                </div>
                <div className="checklist-items">
                  <div className="checklist-item">
                    <span className="checklist-checkbox">
                      {isCompletedPhase ? '☑' : (!hasTalkedToGuide ? '☐' : '☑')}
                    </span>
                    <span className="checklist-text">Find Michael in the facility</span>
                  </div>
                  <div className="checklist-item">
                    <span className="checklist-checkbox">
                      {isCompletedPhase ? '☑' : (!hasTalkedToGuide ? '☐' : '☑')}
                    </span>
                    <span className="checklist-text">
                      {!gameStarted ? "Talk to Michael to understand your mission" : 
                       allNPCsSpoken ? "Talk to Michael to make final decisions" : "Talk to Michael"}
                    </span>
                  </div>
                  {!gameStarted && (
                    <>
                      <div className="checklist-item">
                        <span className="checklist-checkbox">
                          {!hasTalkedToGuide ? '☐' : '☑'}
                        </span>
                        <span className="checklist-text">Learn about the 6 experts you need to consult</span>
                      </div>
                      <div className="checklist-item">
                        <span className="checklist-checkbox">
                          {!hasTalkedToGuide ? '☐' : '☑'}
                        </span>
                        <span className="checklist-text">Understand how to use your PDA for tracking progress</span>
                      </div>
                    </>
                  )}
                  {allNPCsSpoken && (
                    <>
                      <div className="checklist-item">
                        <span className="checklist-checkbox">
                          {isCompletedPhase ? '☑' : (!hasTalkedToGuide ? '☐' : '☑')}
                        </span>
                        <span className="checklist-text">Review all collected information in your PDA</span>
                      </div>
                      <div className="checklist-item">
                        <span className="checklist-checkbox">
                          {isCompletedPhase ? '☑' : (!hasTalkedToGuide ? '☐' : '☑')}
                        </span>
                        <span className="checklist-text">Make final decisions for the facility's future</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          !isTalkingToGuide && (
            <div className="round-info">
              <span className="current-round">Expert Consultation</span>
              <span className="round-description">
                Get recommendations from all specialists
              </span>
              <div className="guidance-message">
                {getGuidanceMessage()}
              </div>
            </div>
          )
        )}
      </div>

      {gameStarted && hasTalkedToGuide && !initialStateActive && (
        <div className="progress-bars">
          <div className="progress-bar-container">
            <div className="progress-label">
              <span>Expert Consultation Progress</span>
              <span className="progress-count">{spokenNPCsList.length}/6</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill round1-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {gameStarted && !(allNPCsSpoken && !hasTalkedToGuide) && (
        <div className="npc-grid">
          {[1, 2, 3, 4, 5, 6].map((npcId) => {
          const isSpoken = spokenNPCsList.includes(npcId);
          
          // Get opinion data
          const opinionData = getNPCOpinion(npcId);
          const hasOpinion = opinionData !== null && opinionData.type === 'opinion';
          
          return (
            <div 
              key={npcId}
              className={`npc-item ${isSpoken ? 'spoken' : ''} ${hasOpinion ? 'has-opinion' : ''}`}
            >
              <div className="npc-avatar">
                <img src={`/assets/characters/${getNPCImage(npcId)}`} alt={NPCNames[npcId]} />
              </div>
              <div className="npc-info">
                <div className="npc-name">{NPCNames[npcId]}</div>
                <div className="npc-system">{NPCSystems[npcId]}</div>
                <div className="npc-checklist">
                  {getNPCChecklistItems(npcId).map((item, index) => (
                    <div key={index} className="checklist-item">
                      <span className="checklist-checkbox">
                        {!isSpoken ? '☐' : '☑'}
                      </span>
                      <span className="checklist-text">{item}</span>
                    </div>
                  ))}
                </div>
                
                <div className="npc-status-text">
                  {!isSpoken ? 'Not consulted' : 
                   hasOpinion ? 'Recommendation collected' : 'Consultation complete'}
                </div>
              </div>
              <div className="npc-checkbox">
                {!isSpoken ? '☐' : '☑'}
              </div>
            </div>
          );
        })}
        </div>
      )}

      <style jsx>{`
        .progress-indicator {
          position: fixed;
          top: clamp(1rem, 3vw, 1.25rem);
          right: clamp(1rem, 3vw, 1.25rem);
          width: clamp(280px, 25vw, 320px);
          background: rgba(17, 24, 39, 0.95);
          border: 2px solid #374151;
          border-radius: 12px;
          padding: clamp(0.75rem, 1.5vw, 1rem);
          color: #e5e7eb;
          z-index: 100;
          max-height: 85vh;
          overflow-y: auto;
          backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .progress-header {
          margin-bottom: 16px;
        }

        .progress-header h3 {
          margin: 0 0 0.5rem 0;
          font-size: clamp(1rem, 2.5vw, 1.125rem);
          font-weight: bold;
          color: #f9fafb;
        }

        .round-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .current-round {
          font-size: clamp(0.875rem, 2.5vw, 1rem);
          font-weight: bold;
          color: #3b82f6;
        }

        .round-description {
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          color: #9ca3af;
        }

        .initial-state {
          margin-bottom: 1rem;
        }

        .guide-checklist {
          background: rgba(59, 130, 246, 0.1);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          padding: 1rem;
        }

        .guide-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .guide-icon {
          font-size: 1.5rem;
        }

        .guide-title {
          font-size: clamp(0.875rem, 2.5vw, 1rem);
          font-weight: bold;
          color: #3b82f6;
        }

        .guide-mission {
          margin-top: 0.5rem;
        }

        .mission-title {
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          font-weight: 600;
          color: #f9fafb;
          margin-bottom: 0.5rem;
        }

        .checklist-items {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .checklist-item {
          display: flex;
          align-items: flex-start;
          gap: 0.375rem;
          font-size: clamp(0.625rem, 1.8vw, 0.75rem);
          line-height: 1.3;
        }

        .checklist-checkbox {
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          color: #6b7280;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .checklist-text {
          color: #9ca3af;
          flex: 1;
        }

        .guide-message {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          margin-top: 1rem;
        }

        .guide-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .guide-text h4 {
          margin: 0 0 0.25rem 0;
          font-size: clamp(0.875rem, 2.5vw, 1rem);
          color: #3b82f6;
          font-weight: bold;
        }

        .guide-text p {
          margin: 0;
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          color: #9ca3af;
          line-height: 1.4;
        }

        .purpose-checklist {
          margin-top: 0.75rem;
          padding: 0.5rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 6px;
        }

        .purpose-checklist h4 {
          margin: 0 0 0.5rem 0;
          font-size: clamp(0.7rem, 1.8vw, 0.8rem);
          color: #3b82f6;
          font-weight: 600;
        }

        .checklist-items {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: clamp(0.6rem, 1.5vw, 0.7rem);
          color: #d1d5db;
          line-height: 1.3;
        }

        .checklist-icon {
          font-size: clamp(0.7rem, 1.8vw, 0.8rem);
          flex-shrink: 0;
        }

        .progress-bars {
          margin-bottom: 1rem;
        }

        .progress-bar-container {
          margin-bottom: 0.75rem;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.375rem;
          font-size: clamp(0.75rem, 2vw, 0.875rem);
        }

        .progress-count {
          color: #9ca3af;
          font-weight: bold;
        }

        .progress-bar {
          height: 8px;
          background: #374151;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .round1-fill {
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        }

        .round2-fill {
          background: linear-gradient(90deg, #10b981, #059669);
        }

        .npc-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5rem;
        }

        .npc-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 8px;
          background: rgba(31, 41, 55, 0.8);
          border: 2px solid #374151;
          transition: all 0.2s;
          margin-bottom: 0.5rem;
        }

        .npc-item.spoken {
          background: rgba(31, 41, 55, 0.9);
          border-color: #10b981;
        }

        .npc-item.round1.spoken {
          background: rgba(31, 41, 55, 0.9);
          border-color: #3b82f6;
        }

        .npc-item.round2.spoken {
          background: rgba(31, 41, 55, 0.9);
          border-color: #10b981;
        }

        .npc-avatar {
          width: clamp(2rem, 6vw, 2.5rem);
          height: clamp(2rem, 6vw, 2.5rem);
          border-radius: 50%;
          background: #4b5563;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #e5e7eb;
          font-size: clamp(0.75rem, 2.5vw, 0.875rem);
          flex-shrink: 0;
          overflow: hidden;
          border: 2px solid #4b5563;
        }

        .npc-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          border-radius: 50%;
        }

        .npc-info {
          flex: 1;
          min-width: 0;
        }

        .npc-name {
          font-size: clamp(0.75rem, 2.5vw, 0.875rem);
          font-weight: bold;
          color: #f9fafb;
        }

        .npc-system {
          font-size: clamp(0.625rem, 2vw, 0.75rem);
          color: #9ca3af;
        }

        .npc-checklist {
          margin-top: 0.5rem;
        }

        .checklist-item {
          display: flex;
          align-items: flex-start;
          gap: 0.25rem;
          margin-bottom: 0.25rem;
          font-size: clamp(0.5rem, 1.5vw, 0.625rem);
          line-height: 1.3;
        }

        .checklist-checkbox {
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          color: #6b7280;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .checklist-text {
          color: #9ca3af;
          flex: 1;
        }

        .npc-checkbox {
          font-size: clamp(1.25rem, 4vw, 1.5rem);
          font-weight: bold;
          color: #6b7280;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .npc-item.spoken .npc-checkbox {
          color: #10b981;
        }

        .npc-opinion {
          margin-top: 4px;
        }

        .opinion-indicator {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
          display: inline-block;
        }

        .opinion-indicator.sustainable {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .opinion-indicator.unsustainable {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .npc-item.has-opinion {
          background: rgba(31, 41, 55, 0.9);
          border-color:  #374151;
        }

        .npc-item.round2.has-opinion {
          background: rgba(31, 41, 55, 0.9);
          border-color:  #374151;
        }

        .npc-status-text {
          font-size: clamp(0.55rem, 1.4vw, 0.7rem);
          color: #9ca3af;
          margin-top: 0.2rem;
          font-weight: 500;
          line-height: 1.2;
          padding: 0.15rem 0.3rem;
          background: rgba(55, 65, 81, 0.2);
          border-radius: 3px;
          border: 1px solid rgba(75, 85, 99, 0.3);
          display: inline-block;
          align-self: flex-start;
        }

        .npc-item.spoken .npc-status-text {
          color: #10b981;
        }

        .npc-item.has-opinion .npc-status-text { color: #3b82f6; font-weight: 600; }

        .guidance-message {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 6px;
          font-size: 0.8rem;
          color: #3b82f6;
          font-weight: 500;
          text-align: center;
        }

        @media (max-width: 768px) {
          .progress-indicator {
            width: clamp(260px, 90vw, 300px);
            right: clamp(0.5rem, 2vw, 0.75rem);
            top: clamp(0.5rem, 2vw, 0.75rem);
            max-height: 80vh;
          }

          .npc-item {
            padding: 0.25rem;
            gap: 0.375rem;
          }

          .npc-status-text {
            font-size: clamp(0.5rem, 1.3vw, 0.65rem);
            padding: 0.1rem 0.25rem;
          }

          .purpose-checklist {
            margin-top: 0.5rem;
            padding: 0.375rem;
          }

          .checklist-item {
            font-size: clamp(0.55rem, 1.4vw, 0.65rem);
            gap: 0.25rem;
          }

          
        }
      `}</style>
    </div>
  )
} 