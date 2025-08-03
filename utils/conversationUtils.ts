/**
 * Utility functions for conversation management
 */

/**
 * Gets the effective round for conversation storage
 * The Guide always uses round 1 to preserve conversation across rounds
 */
export function getEffectiveRound(npcId: number, round: number): number {
  return npcId === -1 ? 1 : round;
}

/**
 * Validates conversation parameters
 */
export function validateConversationParams(npcId: number, round: number, sessionId: string): boolean {
  return !isNaN(npcId) && !isNaN(round) && Boolean(sessionId) && sessionId.length > 0;
} 