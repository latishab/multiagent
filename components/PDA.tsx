import React, { useState, useEffect } from 'react'
import { NPCNames, NPCSystems, NPCOptions, OptionDescriptions, generateNPCPreferences, generateSpecialistRecommendations, getNPCImage } from '../utils/npcData'
import { sessionManager } from '../utils/sessionManager'

// Types for PDA decisions
interface PDADecision {
  npcId: number;
  npcName: string;
  systemName: string;
  playerChosenOption: string;
  playerRejectedOption: string;
  timestamp: number;
  npcPreference: 'sustainable' | 'unsustainable'; 
  playerChoiceType: string; // "sustainable" or "unsustainable"
}

interface BallotEntry {
  npcId: number;
  npcName: string;
  system: string;
  round: number;
  sustainableOption: string;
  unsustainableOption: string;
  timestamp: number;
}

interface PDAProps {
  isOpen: boolean;
  onClose: () => void;
  ballotEntries: BallotEntry[];
  onDecisionsComplete?: (decisions: { [npcId: number]: 'sustainable' | 'unsustainable' }) => void;
  showDecisionMode?: boolean;
  spokenNPCs?: {
    round1: Set<number>;
    round2: Set<number>;
  };
  currentRound?: number;
  decisionsFinalized?: boolean;
  finalDecisions?: { [npcId: number]: 'sustainable' | 'unsustainable' };
}

export default function PDA({ isOpen, onClose, ballotEntries, onDecisionsComplete, showDecisionMode = false, spokenNPCs, currentRound = 1, decisionsFinalized = false, finalDecisions: finalDecisionsProp }: PDAProps) {
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<{ [npcId: number]: 'sustainable' | 'unsustainable' }>(() => finalDecisionsProp || {});
  const [activeTab, setActiveTab] = useState<'info' | 'decisions'>('info');
  const [specialistRecommendations, setSpecialistRecommendations] = useState<{ [key: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate recommendations based on participant ID
  useEffect(() => {
    const participantId = sessionManager.getSessionInfo().participantId;
    if (participantId) {
      const preferences = generateNPCPreferences(participantId);
      const recommendations = generateSpecialistRecommendations(preferences);
      setSpecialistRecommendations(recommendations);
    }
  }, []);

  // Reset selected system when round changes
  useEffect(() => {
    setSelectedSystem(null);
  }, [currentRound]);

  const handleDecision = (npcId: number, choice: 'sustainable' | 'unsustainable') => {
    if (decisionsFinalized) return; // lock after finalize
    setDecisions(prev => ({
      ...prev,
      [npcId]: choice
    }));
  };

  // Function to store PDA decisions
  const storePDADecisions = async (decisions: { [npcId: number]: 'sustainable' | 'unsustainable' }) => {
    try {
      const sessionId = await sessionManager.getSessionId();
      const participantId = sessionManager.getSessionInfo().participantId;
      
      // Get NPC preferences based on participant ID
      const npcPreferences = participantId ? generateNPCPreferences(participantId) : {};
      
      // Count total pro-sustainable choices made by player
      const totalProSustainableChoices = Object.values(decisions).filter(choice => choice === 'sustainable').length;
      
      // Convert decisions object to array format with full details
      const decisionsArray: PDADecision[] = Object.entries(decisions).map(([npcId, choice]) => {
        const npcIdNum = parseInt(npcId);
        const isSustainable = choice === 'sustainable';
        const npcPreference = npcPreferences[npcIdNum] || 'sustainable'; // Default to sustainable if no preference found
        
        return {
          npcId: npcIdNum,
          npcName: NPCNames[npcIdNum],
          systemName: NPCSystems[npcIdNum],
          playerChosenOption: isSustainable ? NPCOptions[npcIdNum].sustainable : NPCOptions[npcIdNum].unsustainable,
          playerRejectedOption: isSustainable ? NPCOptions[npcIdNum].unsustainable : NPCOptions[npcIdNum].sustainable,
          timestamp: Date.now(),
          npcPreference, // What the NPC supports (pro/anti sustainable)
          playerChoiceType: isSustainable ? 'sustainable' : 'unsustainable' // Whether player choice is sustainable or unsustainable
        };
      });

      const response = await fetch('/api/store-pda-decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          decisions: decisionsArray,
          participantId,
          totalProSustainableChoices
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error storing PDA decisions:', error);
      throw error;
    }
  };

  const handleCompleteDecisions = async () => {
    if (decisionsFinalized) return; // already submitted
    if (Object.keys(decisions).length === 6) {
      setIsSubmitting(true);
      try {
        // Store decisions in database
        await storePDADecisions(decisions);
        
        // Call the original callback if provided
        if (onDecisionsComplete) {
          onDecisionsComplete(decisions);
        }
      } catch (error) {
        console.error('Failed to store PDA decisions:', error);
        if (onDecisionsComplete) {
          onDecisionsComplete(decisions);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getSystemInfo = (npcId: number) => {
    // Show info from both rounds (keep Round 1 data visible)
    const entry = ballotEntries.find(e => e.npcId === npcId && e.round === 2) || 
                  ballotEntries.find(e => e.npcId === npcId && e.round === 1);
    return entry || null;
  };

  const getProgress = () => {
    return Object.keys(decisions).length;
  };

  const isSystemComplete = (npcId: number) => {
    return decisions[npcId] !== undefined;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="pda-overlay">
        <div className="pda-container">
          {/* PDA Header */}
          <div className="pda-header">
            <div className="pda-title">
              <span className="pda-icon">📱</span>
              <h1>PDA</h1>
            </div>
            <button className="pda-close" onClick={onClose}>✕</button>
          </div>

          {/* PDA Navigation */}
          <div className="pda-nav">
            <button 
              className={`nav-tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              📋 Information
            </button>
            <button 
              className={`nav-tab ${activeTab === 'decisions' ? 'active' : ''}`}
              onClick={() => setActiveTab('decisions')}
            >
              ⚖️ Make Decisions
              {showDecisionMode && getProgress() > 0 && <span className="progress-badge">{getProgress()}/6</span>}
            </button>
          </div>

          {/* PDA Content */}
          <div className="pda-content">
            {activeTab === 'info' ? (
              /* Information Tab */
              <div className="info-tab">
                <div className="systems-grid">
                  {[1, 2, 3, 4, 5, 6].map((npcId) => {
                    const systemInfo = getSystemInfo(npcId);
                    const hasSpokenToNPC = currentRound === 1 
                      ? spokenNPCs?.round1?.has(npcId) || false
                      : spokenNPCs?.round2?.has(npcId) || false;
                    const hasInfo = systemInfo !== null; // Show info if there's any ballot data
                    const hasCurrentRoundInfo = hasSpokenToNPC; // For green borders/checkmarks
                    
                    return (
                      <div 
                        key={npcId} 
                        className={`system-card ${selectedSystem === npcId ? 'selected' : ''} ${hasCurrentRoundInfo ? 'has-info' : 'no-info'}`}
                        onClick={() => setSelectedSystem(npcId)}
                      >
                        <div className="system-header">
                          <div className="system-title">
                            <div className="npc-profile">
                              <img 
                                src={`/assets/characters/${getNPCImage(npcId)}`} 
                                alt={`${NPCNames[npcId]}`}
                                onError={(e) => {
                                  // Fallback to jpeg if png doesn't exist
                                  const target = e.target as HTMLImageElement;
                                  target.src = `/assets/characters/${getNPCImage(npcId).replace('.png', '.jpeg')}`;
                                }}
                              />
                            </div>
                            <div className="system-info">
                              <h3>{NPCSystems[npcId]}</h3>
                              <span className="npc-name">{NPCNames[npcId]}</span>
                            </div>
                          </div>
                          {hasCurrentRoundInfo && <span className="info-badge">✓</span>}
                        </div>
                        
                        <div className="system-details">
                          {hasInfo ? (
                            <>
                              <div className="options-section">
                                <h4>Available Options:</h4>
                                                                <div className="options-grid">
                                  {(() => {
                                    const participantId = sessionManager.getSessionInfo().participantId;
                                    const preferences = participantId ? generateNPCPreferences(participantId) : null;
                                    const recommendation = preferences ? preferences[npcId] : null;
                                    
                                    // Show specialist choice if player has spoken to this NPC (any round)
                                    const hasSpokenR1 = spokenNPCs?.round1?.has(npcId) || false;
                                    const hasSpokenR2 = spokenNPCs?.round2?.has(npcId) || false;
                                    const hasSpokenToNPC = hasSpokenR1 || hasSpokenR2;
                                    const shouldShowChoice = recommendation && hasSpokenToNPC;
                                    
                                    return (
                                      <>
                                        <div className={`option sustainable ${shouldShowChoice && recommendation === 'sustainable' ? 'recommended' : ''}`}>
                                          <span className="option-icon">📋</span>
                                          <div className="option-info">
                                            <strong>Proposal A:</strong>
                                            {shouldShowChoice && recommendation === 'sustainable' && <span className="option-recommendation-badge">⭐ Specialist Choice</span>}
                                            <p>{NPCOptions[npcId].sustainable}</p>
                                            <p className="option-description">{OptionDescriptions[npcId].sustainable}</p>
                                          </div>
                                        </div>
                                        <div className={`option unsustainable ${shouldShowChoice && recommendation === 'unsustainable' ? 'recommended' : ''}`}>
                                          <span className="option-icon">📄</span>
                                          <div className="option-info">
                                            <strong>Proposal B:</strong>
                                            {shouldShowChoice && recommendation === 'unsustainable' && <span className="option-recommendation-badge">⭐ Specialist Choice</span>}
                                            <p>{NPCOptions[npcId].unsustainable}</p>
                                            <p className="option-description">{OptionDescriptions[npcId].unsustainable}</p>
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              
                              {(() => {
                                const participantId = sessionManager.getSessionInfo().participantId;
                                const preferences = participantId ? generateNPCPreferences(participantId) : null;
                                const recommendation = preferences ? preferences[npcId] : null;
                                const hasSpokenR1 = spokenNPCs?.round1?.has(npcId) || false;
                                const hasSpokenR2 = spokenNPCs?.round2?.has(npcId) || false;
                                const hasSpokenToNPC = hasSpokenR1 || hasSpokenR2;
                                
                                if (hasSpokenToNPC && recommendation) {
                                  return (
                                    <div className="opinion-section">
                                      <h4>Specialist's Choice:</h4>
                                      <div className="opinion-content">
                                        <div className={`recommendation-badge ${recommendation}`}>
                                          <div className="recommendation-option">
                                            <strong>{NPCNames[npcId]} recommends:</strong> {
                                              recommendation === 'sustainable' 
                                                ? NPCOptions[npcId].sustainable 
                                                : NPCOptions[npcId].unsustainable
                                            } (Proposal {recommendation === 'sustainable' ? 'A' : 'B'})
                                          </div>
                                        </div>
                                        <p>{specialistRecommendations[npcId] || 'Detailed reasoning will be available after speaking with them.'}</p>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="no-opinion-message">
                                      <p>No specialist recommendation collected yet.</p>
                                      <p>Talk to {NPCNames[npcId]} to get their professional recommendation.</p>
                                    </div>
                                  );
                                }
                              })()}
                            </>
                          ) : (
                            <div className="no-info-message">
                              <p>No information collected yet.</p>
                              <p>Talk to {NPCNames[npcId]} to learn about their system and options.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Decisions Tab */
              <div className="decisions-tab">
                {showDecisionMode ? (
                  <>
                    <div className="decisions-header">
                      <h2>Final City Decisions</h2>
                      <p>Choose the future for each system based on your collected information</p>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${(getProgress() / 6) * 100}%` }}
                        />
                      </div>
                      <span className="progress-text">{getProgress()}/6 Systems Decided</span>
                    </div>

                    <div className="decisions-grid">
                      {[1, 2, 3, 4, 5, 6].map((npcId) => {
                        const systemInfo = getSystemInfo(npcId);
                        
                        return (
                          <div 
                            key={npcId} 
                            className={`decision-card ${isSystemComplete(npcId) ? 'completed' : ''}`}
                          >
                            <div className="decision-header">
                              <div className="decision-title">
                                <div className="npc-profile">
                                  <img 
                                    src={`/assets/characters/${getNPCImage(npcId)}`} 
                                    alt={`${NPCNames[npcId]}`}
                                    onError={(e) => {
                                      // Fallback to jpeg if png doesn't exist
                                      const target = e.target as HTMLImageElement;
                                      target.src = `/assets/characters/${getNPCImage(npcId).replace('.png', '.jpeg')}`;
                                    }}
                                  />
                                </div>
                                <div className="decision-info">
                                  <h3>{NPCSystems[npcId]}</h3>
                                  <span className="npc-name">{NPCNames[npcId]}</span>
                                </div>
                              </div>
                              {isSystemComplete(npcId) && <span className="completed-badge">✓</span>}
                            </div>
                            
                            <div className="decision-options">
                              {(() => {
                                const participantId = sessionManager.getSessionInfo().participantId;
                                const preferences = participantId ? generateNPCPreferences(participantId) : null;
                                const recommendation = preferences ? preferences[npcId] : null;
                                
                                // Only show specialist choice if player has spoken to this NPC in Round 2
                                const hasSpokenToNPC = spokenNPCs?.round2?.has(npcId) || false;
                                const shouldShowChoice = false; 
                                
                                    return (
                                  <>
                                        <button
                                          className={`decision-button sustainable ${decisions[npcId] === 'sustainable' ? 'selected' : ''}`}
                                      onClick={() => handleDecision(npcId, 'sustainable')}
                                      disabled={isSystemComplete(npcId) || decisionsFinalized}
                                    >
                                      <span className="option-icon">📋</span>
                                      <div className="option-content">
                                        <h4>Proposal A</h4>
                                        <p>{NPCOptions[npcId].sustainable}</p>
                                      </div>
                                    </button>
                                    
                                        <button
                                          className={`decision-button unsustainable ${decisions[npcId] === 'unsustainable' ? 'selected' : ''}`}
                                      onClick={() => handleDecision(npcId, 'unsustainable')}
                                      disabled={isSystemComplete(npcId) || decisionsFinalized}
                                    >
                                      <span className="option-icon">📄</span>
                                      <div className="option-content">
                                        <h4>Proposal B</h4>
                                        <p>{NPCOptions[npcId].unsustainable}</p>
                                      </div>
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {getProgress() === 6 && (
                      <div className="complete-section">
                        <button 
                          className="complete-button" 
                          onClick={handleCompleteDecisions}
                          disabled={isSubmitting || decisionsFinalized}
                        >
                          {isSubmitting ? 'Submitting...' : decisionsFinalized ? 'Decisions Submitted' : 'Submit Final Decisions'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Empty State for Decisions Tab */
                  <div className="decisions-empty-state">
                    <div className="empty-state-icon">⏳</div>
                    <h2>Decisions Not Yet Available</h2>
                    <p>You need to complete your research before making final decisions.</p>
                    <div className="empty-state-steps">
                      <div className="step">
                        <span className="step-number">1</span>
                        <span className="step-text">Talk to all 6 specialists to learn about their systems</span>
                      </div>
                      <div className="step">
                        <span className="step-number">2</span>
                        <span className="step-text">Return to The Guide to advance to the decision phase</span>
                      </div>
                      <div className="step">
                        <span className="step-number">3</span>
                        <span className="step-text">Make your final decisions for the city's future</span>
                      </div>
                    </div>
                    <div className="empty-state-info">
                      <p><strong>Current Progress:</strong> {(() => {
                        const consultedNPCs = new Set(ballotEntries.map(entry => entry.npcId));
                        return consultedNPCs.size;
                      })()}/6 specialists consulted</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .pda-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .pda-container {
          background: linear-gradient(135deg, #1f2937, #111827);
          border: 3px solid #374151;
          border-radius: 20px;
          width: 90vw;
          max-width: 1200px;
          height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .pda-header {
          background: linear-gradient(135deg, #374151, #1f2937);
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #4b5563;
        }

        .pda-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .pda-icon {
          font-size: 1.5rem;
        }

        .pda-title h1 {
          margin: 0;
          font-size: 1.5rem;
          color: #f9fafb;
        }

        .pda-close {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .pda-close:hover {
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.1);
        }

        .pda-nav {
          background: #1f2937;
          padding: 0.5rem 1.5rem;
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid #374151;
        }

        .nav-tab {
          background: none;
          border: none;
          color: #9ca3af;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
        }

        .nav-tab:hover {
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-tab.active {
          background: #3b82f6;
          color: white;
        }

        .progress-badge {
          background: #10b981;
          color: white;
          font-size: 0.7rem;
          padding: 0.2rem 0.4rem;
          border-radius: 10px;
          margin-left: 0.5rem;
        }

        .pda-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          color: #e5e7eb;
        }

        /* Information Tab Styles */
        .systems-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1rem;
        }

        .system-card {
          background: rgba(55, 65, 81, 0.3);
          border: 2px solid #4b5563;
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .system-card:hover {
          border-color: #6b7280;
          background: rgba(55, 65, 81, 0.5);
        }

        .system-card.selected {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }

        .system-card.has-info {
          border-color: #10b981;
        }

        .system-card.no-info {
          border-color: #6b7280;
          opacity: 0.7;
        }

        .system-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .system-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .npc-profile {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #4b5563;
          background-color: #1f2937;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .npc-profile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          border-radius: 50%;
        }

        .system-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .system-info h3 {
          margin: 0;
          font-size: 1.2rem;
          color: #f9fafb;
        }

        .npc-name {
          font-size: 0.9rem;
          color: #9ca3af;
        }

        .info-badge {
          background: #10b981;
          color: white;
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .system-details {
          margin-top: 1rem;
        }

        .options-section {
          margin-bottom: 1.5rem;
        }

        .options-section h4 {
          margin: 0 0 0.75rem 0;
          color: #f9fafb;
        }

        .options-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(55, 65, 81, 0.5);
          border-radius: 8px;
          border-left: 4px solid;
        }

        .option.sustainable {
          border-left-color: #10b981;
        }

        .option.unsustainable {
          border-left-color: #f59e0b;
        }

        .option.recommended {
          border-left-width: 6px;
          background: rgba(59, 130, 246, 0.1);
        }

        .option-recommendation-badge {
          background: #3b82f6;
          color: white;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: bold;
          margin-left: 0.5rem;
          display: inline-block;
        }

        .option-icon {
          font-size: 1.2rem;
        }

        .option-info strong {
          color: #f9fafb;
          font-size: 0.9rem;
        }

        .option-info p {
          margin: 0.25rem 0 0 0;
          color: #9ca3af;
          font-size: 0.85rem;
        }

        .option-description {
          margin: 0.5rem 0 0 0 !important;
          color: #6b7280 !important;
          font-size: 0.8rem !important;
          font-style: italic;
          line-height: 1.3;
        }

        .opinion-section h4 {
          margin: 0 0 0.75rem 0;
          color: #f9fafb;
        }

        .recommendation-display {
          margin-bottom: 1rem;
        }

        .recommendation-badge {
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          border: 2px solid;
          position: relative;
        }

        .recommendation-badge.sustainable {
          background: rgba(16, 185, 129, 0.1);
          border-color: #10b981;
        }

        .recommendation-badge.unsustainable {
          background: rgba(245, 158, 11, 0.1);
          border-color: #f59e0b;
        }

        .recommendation-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .recommendation-icon {
          font-size: 1.2rem;
        }

        .recommendation-label {
          background: #374151;
          color: #e5e7eb;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .recommendation-option {
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .recommendation-option strong {
          color: #f9fafb;
        }

        .no-recommendation {
          color: #9ca3af;
          font-style: italic;
          text-align: center;
          padding: 1rem;
          background: rgba(55, 65, 81, 0.3);
          border-radius: 8px;
          border: 1px solid #4b5563;
        }

        .opinion-content p {
          margin: 0.5rem 0;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .opinion-content strong {
          color: #f9fafb;
        }

        .no-info-message {
          text-align: center;
          color: #9ca3af;
          font-style: italic;
          margin-top: 1rem;
        }

        .no-opinion-message {
          text-align: center;
          color: #9ca3af;
          font-style: italic;
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(55, 65, 81, 0.3);
          border-radius: 8px;
          border: 1px solid #4b5563;
        }

        /* Decisions Tab Styles */
        .decisions-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .decisions-header h2 {
          margin: 0 0 0.5rem 0;
          color: #f9fafb;
        }

        .decisions-header p {
          margin: 0 0 1.5rem 0;
          color: #9ca3af;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #374151;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.9rem;
          color: #9ca3af;
        }

        .decisions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .decision-card {
          background: rgba(55, 65, 81, 0.3);
          border: 2px solid #4b5563;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .decision-card.completed {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }

        .decision-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .decision-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .decision-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .decision-info h3 {
          margin: 0;
          font-size: 1.2rem;
          color: #f9fafb;
        }

        .completed-badge {
          background: #10b981;
          color: white;
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .decision-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .decision-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(55, 65, 81, 0.5);
          border: 2px solid #4b5563;
          border-radius: 8px;
          color: #e5e7eb;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .decision-button:hover:not(:disabled) {
          border-color: #6b7280;
          background: rgba(55, 65, 81, 0.7);
        }

        .decision-button.selected {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.2);
        }

        .decision-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* .decision-button.recommended { hidden to avoid overriding green selection }
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        } */

        /* .decision-recommendation-badge { hidden to avoid badge in decisions }
          background: #3b82f6;
          color: white;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: bold;
          margin-left: 0.5rem;
          display: inline-block;
        } */

        .complete-section {
          text-align: center;
          margin-top: 2rem;
        }

        .complete-button {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white !important;
          border: none;
          padding: clamp(1rem, 3vw, 1.5rem) clamp(2rem, 6vw, 3rem);
          font-size: clamp(1rem, 2.5vw, 1.125rem);
          font-weight: bold;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          text-transform: uppercase;
          letter-spacing: 1px;
          min-width: clamp(200px, 30vw, 300px);
        }

        .complete-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
          color: white !important;
        }

        .complete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Empty State Styles */
        .decisions-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 2rem;
          height: 100%;
          color: #9ca3af;
        }

        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .decisions-empty-state h2 {
          color: #e5e7eb;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .decisions-empty-state p {
          margin-bottom: 2rem;
          font-size: 1rem;
          line-height: 1.5;
        }

        .empty-state-steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
          max-width: 400px;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 1rem;
          text-align: left;
        }

        .step-number {
          background: #374151;
          color: #e5e7eb;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .step-text {
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .empty-state-info {
          background: rgba(55, 65, 81, 0.3);
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #4b5563;
        }

        .empty-state-info p {
          margin: 0;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .pda-container {
            width: 95vw;
            height: 90vh;
          }

          .systems-grid,
          .decisions-grid {
            grid-template-columns: 1fr;
          }

          .pda-title h1 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </>
  )
} 