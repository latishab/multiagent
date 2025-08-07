/**
 * Utility functions for conversation management
 */

/**
 * Gets the effective round for conversation storage
 * Each round has its own conversation history for all NPCs including The Guide
 */
export function getEffectiveRound(npcId: number, round: number): number {
  return round;
}

/**
 * Validates conversation parameters
 */
export function validateConversationParams(npcId: number, round: number, sessionId: string): boolean {
  return !isNaN(npcId) && !isNaN(round) && Boolean(sessionId) && sessionId.length > 0;
} 