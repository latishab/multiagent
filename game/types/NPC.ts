import { Physics } from 'phaser'

export interface NPC {
  sprite: Physics.Arcade.Sprite
  lastDirection: string
  moveTimer: number
  isMoving: boolean
  targetDirection: string
  speed: number
  moveTimeMin: number
  moveTimeMax: number
  pauseTimeMin: number
  pauseTimeMax: number
  startFrame: number
  type: string
  id: string
  animationId: string
}

export interface NPCType {
  name: string
  startFrame: number
}

/*
 * SPRITESHEET LAYOUT STANDARDIZATION GUIDE
 * 
 * For the update.png spritesheet (144x96 pixels), each character must follow this exact layout:
 * 
 * CHARACTER BLOCK STRUCTURE (48x48 pixels per character):
 * Each character occupies a 3x3 grid of 16x16 frames (48x48 total)
 * 
 * Frame layout within each character block:
 * [0][1][2] - Down animations (walking down)
 * [3][4][5] - Side animations (walking left/right) 
 * [6][7][8] - Up animations (walking up)
 * 
 * SPRITESHEET LAYOUT (2 rows, 3 characters per row):
 * Row 1: [Character 0][Character 1][Character 2] - 48px each
 * Row 2: [Character 3][Character 4][Character 5] - 48px each
 * 
 * REQUIRED STANDARDIZATION:
 * - Each character MUST have exactly 3 frames for each direction
 * - Down frames MUST be in the top row of their 3x3 block
 * - Side frames MUST be in the middle row of their 3x3 block  
 * - Up frames MUST be in the bottom row of their 3x3 block
 * - All frames must be 16x16 pixels
 * - No gaps or spacing between frames
 * - Characters must be arranged in 2 rows of 3 characters each
 * 
 * Frame calculation formula:
 * startFrame = (row * 9 * 3) + (col * 3)
 * where row is 0 or 1, col is 0, 1, or 2
 */

// Spritesheet layout constants (144x96 spritesheet)
const FRAMES_PER_ROW = 9        // Each row is 144/16 = 9 frames wide
const FRAMES_PER_CHAR = 3       // Each character takes 3 frames horizontally
const FRAMES_VERTICALLY = 3     // Each character block is 3 frames high 
const CHAR_WIDTH = 3            // Number of characters per row

// Calculate frame indices for each character
function calculateStartFrame(charIndex: number): number {
  const row = Math.floor(charIndex / CHAR_WIDTH)    // Which row the character is in (0 or 1)
  const col = charIndex % CHAR_WIDTH                // Which position in the row (0, 1, or 2)
  return (row * FRAMES_PER_ROW * FRAMES_VERTICALLY) + (col * FRAMES_PER_CHAR)
}

// Define NPC types with their frame offsets
export const NPC_TYPES: NPCType[] = [
  // First row characters (0-2)
  { name: 'white', startFrame: calculateStartFrame(0) },    // Top-left character
  { name: 'brown', startFrame: calculateStartFrame(1) },    // Top-middle character
  { name: 'blue', startFrame: calculateStartFrame(2) },     // Top-right character
  // Second row characters (3-5)
  { name: 'teal', startFrame: calculateStartFrame(3) },     // Bottom-left character
  { name: 'dark', startFrame: calculateStartFrame(4) },     // Bottom-middle character
  { name: 'military', startFrame: calculateStartFrame(5) }  // Bottom-right character
]

// Helper functions for frame calculations
export function getDownFrames(startFrame: number): number[] {
  // Down frames are in the first row of the character's 3x3 block
  return [
    startFrame,
    startFrame + 1,
    startFrame + 2
  ]
}

export function getSideFrames(startFrame: number): number[] {
  // Side frames are in the second row of the character's 3x3 block
  const rowOffset = FRAMES_PER_ROW
  return [
    startFrame + rowOffset,
    startFrame + rowOffset + 1,
    startFrame + rowOffset + 2
  ]
}

export function getUpFrames(startFrame: number): number[] {
  // Up frames are in the third row of the character's 3x3 block
  const rowOffset = FRAMES_PER_ROW * 2
  return [
    startFrame + rowOffset,
    startFrame + rowOffset + 1,
    startFrame + rowOffset + 2
  ]
} 