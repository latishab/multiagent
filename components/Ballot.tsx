import React, { useState } from 'react'

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

interface BallotProps {
  isOpen: boolean;
  onClose: () => void;
  ballotEntries: BallotEntry[];
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

export default function Ballot({ isOpen, onClose, ballotEntries }: BallotProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary')

  if (!isOpen) return null

  const round1Entries = ballotEntries.filter(entry => entry.round === 1)
  const round2Entries = ballotEntries.filter(entry => entry.round === 2)

  const getNPCInitials = (npcName: string) => {
    return npcName.split(' ').map(word => word[0]).join('')
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="ballot-overlay">
      <div className="ballot-container">
        <div className="ballot-header">
          <h2>City Reconstruction Ballot</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        <div className="ballot-tabs">
          <button 
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button 
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Detailed Notes
          </button>
        </div>

        <div className="ballot-content">
          {activeTab === 'summary' ? (
            <div className="summary-view">
              <div className="round-section">
                <h3>Round 1: Introductions ({round1Entries.length}/6)</h3>
                <div className="npc-summary-grid">
                  {[1, 2, 3, 4, 5, 6].map(npcId => {
                    const entry = round1Entries.find(e => e.npcId === npcId)
                    return (
                      <div key={npcId} className={`npc-summary-card ${entry ? 'completed' : 'pending'}`}>
                        <div className="npc-avatar">
                          {getNPCInitials(NPCNames[npcId])}
                        </div>
                        <div className="npc-info">
                          <div className="npc-name">{NPCNames[npcId]}</div>
                          <div className="npc-system">{NPCSystems[npcId]}</div>
                          {entry && (
                            <div className="npc-options">
                              <div className="option sustainable">🌱 {entry.sustainableOption}</div>
                              <div className="option unsustainable">💰 {entry.unsustainableOption}</div>
                            </div>
                          )}
                        </div>
                        <div className="status-indicator">
                          {entry ? '✓' : '○'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="round-section">
                <h3>Round 2: Opinions ({round2Entries.length}/6)</h3>
                <div className="npc-summary-grid">
                  {[1, 2, 3, 4, 5, 6].map(npcId => {
                    const entry = round2Entries.find(e => e.npcId === npcId)
                    return (
                      <div key={npcId} className={`npc-summary-card ${entry ? 'completed' : 'pending'}`}>
                        <div className="npc-avatar">
                          {getNPCInitials(NPCNames[npcId])}
                        </div>
                        <div className="npc-info">
                          <div className="npc-name">{NPCNames[npcId]}</div>
                          <div className="npc-system">{NPCSystems[npcId]}</div>
                          {entry && (
                            <div className="npc-opinion">
                              <div className="opinion-label">Supports:</div>
                              <div className="opinion-text">{entry.npcOpinion}</div>
                            </div>
                          )}
                        </div>
                        <div className="status-indicator">
                          {entry ? '✓' : '○'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="details-view">
              <div className="entries-list">
                {ballotEntries.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3>No entries yet</h3>
                    <p>Talk to NPCs to start building your ballot of opinions!</p>
                  </div>
                ) : (
                  ballotEntries
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((entry, index) => (
                      <div key={index} className="ballot-entry">
                        <div className="entry-header">
                          <div className="entry-npc">
                            <div className="npc-avatar-small">
                              {getNPCInitials(entry.npcName)}
                            </div>
                            <div className="npc-details">
                              <div className="npc-name">{entry.npcName}</div>
                              <div className="npc-system">{entry.system}</div>
                            </div>
                          </div>
                          <div className="entry-meta">
                            <span className="round-badge">Round {entry.round}</span>
                            <span className="timestamp">{formatDate(entry.timestamp)}</span>
                          </div>
                        </div>
                        
                        <div className="entry-content">
                          <div className="options-section">
                            <h4>Available Options:</h4>
                            <div className="options-grid">
                              <div className="option sustainable">
                                <span className="option-icon">🌱</span>
                                <span className="option-text">{entry.sustainableOption}</span>
                              </div>
                              <div className="option unsustainable">
                                <span className="option-icon">💰</span>
                                <span className="option-text">{entry.unsustainableOption}</span>
                              </div>
                            </div>
                          </div>
                          
                          {entry.round === 2 && (
                            <div className="opinion-section">
                              <h4>NPC's Opinion:</h4>
                              <div className="opinion-content">
                                <div className="opinion-text">{entry.npcOpinion}</div>
                                <div className="reasoning-text">{entry.npcReasoning}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .ballot-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .ballot-container {
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          background: rgba(17, 24, 39, 0.95);
          border: 2px solid #374151;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .ballot-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          background: rgba(31, 41, 55, 0.95);
          border-bottom: 2px solid #374151;
        }

        .ballot-header h2 {
          color: #e5e7eb;
          margin: 0;
          font-size: 24px;
        }

        .close-button {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          background: transparent;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 20px;
        }

        .close-button:hover {
          color: #e5e7eb;
          background-color: rgba(55, 65, 81, 0.5);
        }

        .ballot-tabs {
          display: flex;
          background: rgba(31, 41, 55, 0.95);
          border-bottom: 2px solid #374151;
        }

        .tab-button {
          flex: 1;
          padding: 16px;
          background: transparent;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 16px;
          font-weight: 500;
        }

        .tab-button:hover {
          color: #e5e7eb;
          background: rgba(55, 65, 81, 0.3);
        }

        .tab-button.active {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          border-bottom: 2px solid #3b82f6;
        }

        .ballot-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .round-section {
          margin-bottom: 24px;
        }

        .round-section h3 {
          color: #e5e7eb;
          margin: 0 0 16px 0;
          font-size: 18px;
        }

        .npc-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }

        .npc-summary-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background: rgba(55, 65, 81, 0.3);
          border: 1px solid #4b5563;
          transition: all 0.2s;
        }

        .npc-summary-card.completed {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
        }

        .npc-summary-card.pending {
          opacity: 0.6;
        }

        .npc-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #4b5563;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #e5e7eb;
          font-size: 14px;
          flex-shrink: 0;
        }

        .npc-info {
          flex: 1;
        }

        .npc-name {
          font-size: 14px;
          font-weight: bold;
          color: #f9fafb;
          margin-bottom: 2px;
        }

        .npc-system {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 4px;
        }

        .npc-options {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .option {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .option.sustainable {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .option.unsustainable {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .npc-opinion {
          font-size: 11px;
          color: #d1d5db;
        }

        .opinion-label {
          font-weight: bold;
          margin-bottom: 2px;
        }

        .opinion-text {
          font-style: italic;
        }

        .status-indicator {
          font-size: 18px;
          font-weight: bold;
          color: #9ca3af;
        }

        .npc-summary-card.completed .status-indicator {
          color: #10b981;
        }

        .entries-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ballot-entry {
          background: rgba(55, 65, 81, 0.3);
          border: 1px solid #4b5563;
          border-radius: 8px;
          padding: 16px;
        }

        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .entry-npc {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .npc-avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #4b5563;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #e5e7eb;
          font-size: 12px;
        }

        .npc-details {
          display: flex;
          flex-direction: column;
        }

        .entry-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .round-badge {
          background: #3b82f6;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }

        .timestamp {
          font-size: 10px;
          color: #9ca3af;
        }

        .entry-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .options-section h4,
        .opinion-section h4 {
          color: #e5e7eb;
          margin: 0 0 8px 0;
          font-size: 14px;
        }

        .options-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .option-icon {
          margin-right: 6px;
        }

        .opinion-content {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
          border-radius: 6px;
          padding: 8px;
        }

        .opinion-text {
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 4px;
        }

        .reasoning-text {
          font-size: 12px;
          color: #9ca3af;
          font-style: italic;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          color: #e5e7eb;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
} 