import React from 'react'

interface ProgressIndicatorProps {
  currentRound: number;
  spokenNPCs: {
    round1: Set<number>;
    round2: Set<number>;
  };
  hasTalkedToGuide?: boolean;
  isChatOpen?: boolean;
  currentChatNPCId?: number;
}

const NPCNames: { [key: number]: string } = {
  1: 'Mrs. Aria',
  2: 'Chief Oskar',
  3: 'Mr. Moss',
  4: 'Miss Dai',
  5: 'Ms. Kira',
  6: 'Mr. Han'
}

const NPCSystems: { [key: number]: string } = {
  1: 'Water Cycle',
  2: 'Energy Grid',
  3: 'Fuel Acquisition',
  4: 'Land Use',
  5: 'Water Distribution',
  6: 'Housing & Shelter'
}

const NPCOptions: { [key: number]: { sustainable: string; unsustainable: string; system: string } } = {
  1: { 
    sustainable: 'Constructed Wetlands', 
    unsustainable: 'Chemical Filtration Tanks',
    system: 'Water Cycle'
  },
  2: { 
    sustainable: 'Local Solar Microgrids', 
    unsustainable: 'Gas Power Hub',
    system: 'Energy Grid'
  },
  3: { 
    sustainable: 'Biofuel Cooperative', 
    unsustainable: 'Diesel Supply Contracts',
    system: 'Fuel Acquisition'
  },
  4: { 
    sustainable: 'Urban Agriculture Zones', 
    unsustainable: 'Industrial Expansion',
    system: 'Land Use'
  },
  5: { 
    sustainable: 'Public Shared Reservoir', 
    unsustainable: 'Tiered Access Contracts',
    system: 'Water Distribution'
  },
  6: { 
    sustainable: 'Modular Eco-Pods', 
    unsustainable: 'Smart Concrete Complex',
    system: 'Housing & Shelter'
  }
}

export default function ProgressIndicator({ currentRound, spokenNPCs, hasTalkedToGuide = false, isChatOpen = false, currentChatNPCId = -1 }: ProgressIndicatorProps) {
  console.log('ProgressIndicator re-rendering with:', { currentRound, spokenNPCs });
  
  const round1Spoken = Array.from(spokenNPCs.round1);
  const round2Spoken = Array.from(spokenNPCs.round2);
  
  const round1Progress = (round1Spoken.length / 6) * 100;
  const round2Progress = (round2Spoken.length / 6) * 100;

  // Check if game has started (if any NPCs have been spoken to or guide has been talked to)
  const hasGameStarted = round1Spoken.length > 0 || round2Spoken.length > 0 || hasTalkedToGuide;
  
  // Check if currently talking to The Guide
  const isTalkingToGuide = isChatOpen && currentChatNPCId === -1;
  
  // Check round completion status
  const round1Complete = round1Spoken.length >= 6;
  const round2Complete = round2Spoken.length >= 6;
  
  // Determine the actual current round based on completion status
  const actualCurrentRound = (() => {
    // If Round 1 is not complete, we're still in Round 1
    if (!round1Complete) {
      return 1;
    }
    // If Round 1 is complete but Round 2 is not, we're in Round 2
    if (round1Complete && !round2Complete) {
      return 2;
    }
    // If both rounds are complete, we're in Round 2 (decision phase)
    if (round1Complete && round2Complete) {
      return 2;
    }
    // Default fallback
    return currentRound;
  })();
  
  // Determine what guidance to show
  const getGuidanceMessage = () => {
    if (!hasGameStarted) {
      return "Talk to The Guide to start your mission";
    }
    
    if (actualCurrentRound === 1) {
      if (round1Complete && !hasTalkedToGuide) {
        return "Round 1 complete! Talk to The Guide to advance to Round 2";
      } else if (round1Complete && hasTalkedToGuide) {
        return "Round 2: Talk to all specialists to get their recommendations";
      } else {
        return `Round 1: Talk to specialists to learn about their systems (${round1Spoken.length}/6)`;
      }
    } else if (actualCurrentRound === 2) {
      if (round2Complete && !hasTalkedToGuide) {
        return "Round 2 complete! Talk to The Guide to make final decisions";
      } else if (round2Complete && hasTalkedToGuide) {
        return "Open your PDA to review all systems and make final decisions";
      } else {
        return `Round 2: Get recommendations from specialists (${round2Spoken.length}/6)`;
      }
    }
    
    return "Continue your mission";
  };

  // Get opinion data for each NPC
  const getNPCOpinion = (npcId: number, round: number) => {
    // For round 1, just show that they were introduced
    if (round === 1) {
      return { type: 'introduced' };
    }
    
    // For round 2, show their actual opinion
    if (round === 2) {
      return { type: 'opinion' };
    }
    
    return null;
  };

  // Get mission text for current round
  const getMissionText = (npcId: number, round: number) => {
    const npc = NPCOptions[npcId];
    if (!npc) return 'System information not available';
    
    if (round === 1) {
      return `Understand ${npc.system} options`;
    } else if (round === 2) {
      return `Get ${NPCNames[npcId]}'s recommendation`;
    }
    
    return 'Mission information not available';
  };

  // Get detailed checklist items for each NPC
  const getNPCChecklistItems = (npcId: number, round: number) => {
    const npc = NPCOptions[npcId];
    if (!npc) return [];
    
    if (round === 1) {
      return [
        `Understand the current state of ${npc.system}`,
        `Learn about ${npc.sustainable} approach`,
        `Learn about ${npc.unsustainable} approach`,
        `Compare the trade-offs between both options`
      ];
    } else if (round === 2) {
      return [
        `Ask ${NPCNames[npcId]} for their recommendation`,
        `Understand why they prefer their choice`,
        `Learn about the specific benefits they see`,
        `Understand the concerns they have about alternatives`
      ];
    }
    
    return [];
  };

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h3>Mission Checklist</h3>
        {!hasGameStarted ? (
          <div className="initial-state">
            <div className="guide-checklist">
              <div className="guide-header">
                <span className="guide-icon">👤</span>
                <span className="guide-title">The Guide</span>
              </div>
              <div className="guide-mission">
                <div className="mission-title">Mission: Start Your Journey</div>
                <div className="checklist-items">
                  <div className="checklist-item">
                    <span className="checklist-checkbox">
                      {!hasTalkedToGuide ? '☐' : '☑'}
                    </span>
                    <span className="checklist-text">Find The Guide in the city</span>
                  </div>
                  <div className="checklist-item">
                    <span className="checklist-checkbox">
                      {!hasTalkedToGuide ? '☐' : '☑'}
                    </span>
                    <span className="checklist-text">Talk to The Guide to understand your mission</span>
                  </div>
                  <div className="checklist-item">
                    <span className="checklist-checkbox">
                      {!hasTalkedToGuide ? '☐' : '☑'}
                    </span>
                    <span className="checklist-text">Learn about the 6 specialists you need to consult</span>
                  </div>
                  <div className="checklist-item">
                    <span className="checklist-checkbox">
                      {!hasTalkedToGuide ? '☐' : '☑'}
                    </span>
                    <span className="checklist-text">Understand how to use your PDA for tracking progress</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          !isTalkingToGuide && (
            <div className="round-info">
              <span className="current-round">Round {actualCurrentRound}</span>
              <span className="round-description">
                {actualCurrentRound === 1 ? 'Introduction' : 'Options Discussion'}
              </span>
              <div className="guidance-message">
                {getGuidanceMessage()}
              </div>
            </div>
          )
        )}
      </div>

      {hasGameStarted && (
        <div className="progress-bars">
          <div className="progress-bar-container">
            <div className="progress-label">
              <span>Round 1: Introduction</span>
              <span className="progress-count">{round1Spoken.length}/6</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill round1-fill"
                style={{ width: `${round1Progress}%` }}
              />
            </div>
          </div>

          {round1Complete && (
            <div className="progress-bar-container">
              <div className="progress-label">
                <span>Round 2: Options Discussion</span>
                <span className="progress-count">{round2Spoken.length}/6</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill round2-fill"
                  style={{ width: `${round2Progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {hasGameStarted && (
        <div className="npc-grid">
          {[1, 2, 3, 4, 5, 6].map((npcId) => {
          const isSpokenRound1 = round1Spoken.includes(npcId);
          const isSpokenRound2 = round2Spoken.includes(npcId);
          const isCurrentRound = actualCurrentRound === 1 ? isSpokenRound1 : isSpokenRound2;
          
          // Get opinion data for actual current round
          const opinionData = getNPCOpinion(npcId, actualCurrentRound);
          const hasOpinion = opinionData !== null;
          
          return (
            <div 
              key={npcId}
              className={`npc-item ${isCurrentRound ? 'spoken' : ''} ${actualCurrentRound === 1 ? 'round1' : 'round2'} ${hasOpinion ? 'has-opinion' : ''}`}
            >
              <div className="npc-avatar">
                {NPCNames[npcId].split(' ')[1]?.[0] || NPCNames[npcId][0]}
              </div>
              <div className="npc-info">
                <div className="npc-name">{NPCNames[npcId]}</div>
                <div className="npc-system">{NPCSystems[npcId]}</div>
                <div className="npc-checklist">
                  {getNPCChecklistItems(npcId, actualCurrentRound).map((item, index) => (
                    <div key={index} className="checklist-item">
                      <span className="checklist-checkbox">
                        {!isCurrentRound ? '☐' : '☑'}
                      </span>
                      <span className="checklist-text">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="npc-status-text">
                  {!isCurrentRound ? 'Not spoken' : 
                   actualCurrentRound === 1 ? 
                     (isSpokenRound1 ? 'Introduction complete' : 'Introduction in progress') :
                     (hasOpinion ? 'Recommendation collected' : 'Recommendation pending')}
                </div>
              </div>
              <div className="npc-checkbox">
                {!isCurrentRound ? '☐' : 
                 hasOpinion ? '☑' : '☒'}
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
          border-color: #10b981;
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

        .npc-item.has-opinion .npc-status-text {
          color: #3b82f6;
          font-weight: 600;
        }

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