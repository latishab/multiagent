import React from 'react'

interface ProgressIndicatorProps {
  currentRound: number;
  spokenNPCs: {
    round1: Set<number>;
    round2: Set<number>;
  };
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

export default function ProgressIndicator({ currentRound, spokenNPCs }: ProgressIndicatorProps) {
  const round1Spoken = Array.from(spokenNPCs.round1);
  const round2Spoken = Array.from(spokenNPCs.round2);
  
  const round1Progress = (round1Spoken.length / 6) * 100;
  const round2Progress = (round2Spoken.length / 6) * 100;

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h3>Conversation Progress</h3>
        <div className="round-info">
          <span className="current-round">Round {currentRound}</span>
          <span className="round-description">
            {currentRound === 1 ? 'Introduction' : 'Options Discussion'}
          </span>
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
          
          return (
            <div 
              key={npcId} 
              className={`npc-item ${isCurrentRound ? 'spoken' : ''} ${currentRound === 1 ? 'round1' : 'round2'}`}
            >
              <div className="npc-avatar">
                {NPCNames[npcId].split(' ')[1]?.[0] || NPCNames[npcId][0]}
              </div>
              <div className="npc-info">
                <div className="npc-name">{NPCNames[npcId]}</div>
                <div className="npc-system">{NPCSystems[npcId]}</div>
              </div>
              <div className="npc-status">
                {isCurrentRound ? '✓' : '○'}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .progress-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 300px;
          background: rgba(17, 24, 39, 0.95);
          border: 2px solid #374151;
          border-radius: 12px;
          padding: 16px;
          color: #e5e7eb;
          z-index: 100;
        }

        .progress-header {
          margin-bottom: 16px;
        }

        .progress-header h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: bold;
          color: #f9fafb;
        }

        .round-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .current-round {
          font-size: 16px;
          font-weight: bold;
          color: #3b82f6;
        }

        .round-description {
          font-size: 12px;
          color: #9ca3af;
        }

        .progress-bars {
          margin-bottom: 16px;
        }

        .progress-bar-container {
          margin-bottom: 12px;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 12px;
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
          gap: 8px;
        }

        .npc-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 8px;
          background: rgba(55, 65, 81, 0.3);
          border: 1px solid #4b5563;
          transition: all 0.2s;
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
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #4b5563;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #e5e7eb;
          font-size: 14px;
        }

        .npc-info {
          flex: 1;
        }

        .npc-name {
          font-size: 12px;
          font-weight: bold;
          color: #f9fafb;
        }

        .npc-system {
          font-size: 10px;
          color: #9ca3af;
        }

        .npc-status {
          font-size: 16px;
          font-weight: bold;
          color: #9ca3af;
        }

        .npc-item.spoken .npc-status {
          color: #10b981;
        }
      `}</style>
    </div>
  )
} 