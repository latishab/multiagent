import React from 'react'

interface ProgressIndicatorProps {
  currentRound: number;
  spokenNPCs: {
    round1: Set<number>;
    round2: Set<number>;
  };
  ballotEntries?: Array<{
    npcId: number;
    npcName: string;
    system: string;
    round: number;
    sustainableOption: string;
    unsustainableOption: string;
    npcOpinion: string;
    npcReasoning: string;
    timestamp: number;
  }>;
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

export default function ProgressIndicator({ currentRound, spokenNPCs, ballotEntries = [] }: ProgressIndicatorProps) {
  console.log('ProgressIndicator re-rendering with:', { currentRound, spokenNPCs, ballotEntries });
  
  const round1Spoken = Array.from(spokenNPCs.round1);
  const round2Spoken = Array.from(spokenNPCs.round2);
  
  const round1Progress = (round1Spoken.length / 6) * 100;
  const round2Progress = (round2Spoken.length / 6) * 100;

  // Get opinion data for each NPC
  const getNPCOpinion = (npcId: number, round: number) => {
    const entry = ballotEntries.find(e => e.npcId === npcId && e.round === round);
    if (!entry) return null;
    
    // For round 1, just show that they were introduced
    if (round === 1) {
      return { type: 'introduced', sustainable: entry.sustainableOption, unsustainable: entry.unsustainableOption };
    }
    
    // For round 2, show their actual opinion
    if (round === 2) {
      const isSustainable = entry.npcOpinion === entry.sustainableOption;
      return { 
        type: 'opinion', 
        opinion: isSustainable ? 'sustainable' : 'unsustainable',
        option: isSustainable ? entry.sustainableOption : entry.unsustainableOption
      };
    }
    
    return null;
  };

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h3>Mission Checklist</h3>
        <div className="round-info">
          <span className="current-round">Round {currentRound}</span>
          <span className="round-description">
            {currentRound === 1 ? 'Introduction' : 'Options Discussion'}
          </span>
        </div>
        <div className="purpose-checklist">
          <h4>What to Ask Each NPC:</h4>
          <div className="checklist-items">
            {currentRound === 1 ? (
              <>
                <div className="checklist-item">
                  <span className="checklist-icon">👤</span>
                  <span>Ask about their role and background</span>
                </div>
                <div className="checklist-item">
                  <span className="checklist-icon">🏗️</span>
                  <span>Learn about their system ({NPCSystems[1]}, {NPCSystems[2]}, etc.)</span>
                </div>
                <div className="checklist-item">
                  <span className="checklist-icon">⚖️</span>
                  <span>Find out about both options (sustainable vs economic)</span>
                </div>
              </>
            ) : (
              <>
                <div className="checklist-item">
                  <span className="checklist-icon">💭</span>
                  <span>Ask for their recommendation</span>
                </div>
                <div className="checklist-item">
                  <span className="checklist-icon">🤔</span>
                  <span>Find out why they prefer their choice</span>
                </div>
                <div className="checklist-item">
                  <span className="checklist-icon">📊</span>
                  <span>Learn about the trade-offs they see</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
      </div>

      <div className="npc-grid">
        {[1, 2, 3, 4, 5, 6].map((npcId) => {
          const isSpokenRound1 = round1Spoken.includes(npcId);
          const isSpokenRound2 = round2Spoken.includes(npcId);
          const isCurrentRound = currentRound === 1 ? isSpokenRound1 : isSpokenRound2;
          
          // Get opinion data for current round
          const opinionData = getNPCOpinion(npcId, currentRound);
          const hasOpinion = opinionData !== null;
          
          // Get ballot entry for this NPC and round
          const ballotEntry = ballotEntries.find(entry => entry.npcId === npcId && entry.round === currentRound);
          
          // Debug logging for Ms. Kira (NPC 5)
          if (npcId === 5) {
            console.log('ProgressIndicator - NPC 5 ballot entry:', ballotEntry);
            console.log('ProgressIndicator - All ballot entries:', ballotEntries);
            console.log('ProgressIndicator - Current round:', currentRound);
          }
          
          // Get mission text for current round
          const getMissionText = (npcId: number, round: number) => {
            const npc = NPCOptions[npcId];
            if (!npc) return '';
            
            if (round === 1) {
              return `Learn about ${npc.sustainable} vs ${npc.unsustainable}`;
            } else {
              return `Discover their opinion on ${npc.sustainable} vs ${npc.unsustainable}`;
            }
          };
          
          return (
                        <div 
              key={npcId}
              className={`npc-item ${isCurrentRound ? 'spoken' : ''} ${currentRound === 1 ? 'round1' : 'round2'} ${hasOpinion ? 'has-opinion' : ''}`}
            >
              <div className="npc-avatar">
                {NPCNames[npcId].split(' ')[1]?.[0] || NPCNames[npcId][0]}
              </div>
              <div className="npc-info">
                <div className="npc-name">{NPCNames[npcId]}</div>
                <div className="npc-system">{NPCSystems[npcId]}</div>
                <div className="npc-mission">
                  {getMissionText(npcId, currentRound)}
                </div>
                <div className="npc-status-text">
                  {!isCurrentRound ? 'Not spoken' : 
                   currentRound === 1 ? 
                     (isSpokenRound1 ? (ballotEntry?.npcReasoning || 'Introduction complete') : 'Introduction in progress') :
                     (hasOpinion ? 'Recommendation collected' : 'Recommendation pending')}
                </div>
                {hasOpinion && currentRound === 2 && (
                  <div className="npc-opinion">
                    {opinionData?.type === 'opinion' && (
                      <span className={`opinion-indicator ${opinionData.opinion}`}>
                        {opinionData.opinion === 'sustainable' ? '🌱' : '💰'} {opinionData.option}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="npc-status">
                {!isCurrentRound ? '○' : 
                 hasOpinion ? (currentRound === 2 ? '💬' : '✓') : '⋯'}
              </div>
            </div>
          );
        })}
      </div>

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
          padding: 0.375rem;
          border-radius: 6px;
          background: rgba(55, 65, 81, 0.3);
          border: 1px solid #4b5563;
          transition: all 0.2s;
          margin-bottom: 0.25rem;
        }

        .npc-item.spoken {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
        }

        .npc-item.round1.spoken {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
        }

        .npc-item.round2.spoken {
          background: rgba(16, 185, 129, 0.2);
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

        .npc-mission {
          font-size: clamp(0.5rem, 1.5vw, 0.625rem);
          color: #6b7280;
          font-style: italic;
          margin-top: 2px;
          line-height: 1.2;
        }

        .npc-status {
          font-size: clamp(1rem, 3vw, 1.125rem);
          font-weight: bold;
          color: #9ca3af;
          flex-shrink: 0;
        }

        .npc-item.spoken .npc-status {
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
          background: rgba(59, 130, 246, 0.3);
          border-color: #3b82f6;
        }

        .npc-item.round2.has-opinion {
          background: rgba(16, 185, 129, 0.3);
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