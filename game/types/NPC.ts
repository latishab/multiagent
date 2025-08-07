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
  personality: string
  isInteracting: boolean
  // Area bounds for NPC movement
  areaBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface NPCType {
  name: string
  startFrame: number
  // Optional area bounds for this NPC type
  areaBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface NPCConfig {
  id: string
  x: number
  y: number
  personality: string
  startFrame: number
  type: string
  speed?: number
  moveTimeMin?: number
  moveTimeMax?: number
  pauseTimeMin?: number
  pauseTimeMax?: number
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
 * [0][1][2] - Up animations (walking up)
 * [3][4][5] - Side animations (walking left/right) 
 * [6][7][8] - Down animations (walking down)
 * 
 * SPRITESHEET LAYOUT (2 rows, 3 characters per row):
 * Row 1: [Character 0][Character 1][Character 2] - 48px each
 * Row 2: [Character 3][Character 4][Character 5] - 48px each
 * 
 * REQUIRED STANDARDIZATION:
 * - Each character MUST have exactly 3 frames for each direction
 * - Up frames MUST be in the top row of their 3x3 block
 * - Side frames MUST be in the middle row of their 3x3 block  
 * - Down frames MUST be in the bottom row of their 3x3 block
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

// Define NPC types with their frame offsets and area bounds
export const NPC_TYPES: NPCType[] = [
  // First row characters (0-2)
  { 
    name: 'mr-dai', 
    startFrame: calculateStartFrame(0),
    areaBounds: { x: 100, y: 100, width: 300, height: 200 }  
  },
  { 
    name: 'ms-moss', 
    startFrame: calculateStartFrame(1),
    areaBounds: { x: 800, y: 180, width: 300, height: 200 }  
  },
  { 
    name: 'chief-oskar', 
    startFrame: calculateStartFrame(2),
    areaBounds: { x: 1300, y: 300, width: 300, height: 200 }  
  },
  // Second row characters (3-5)
  { 
    name: 'ms-kira', 
    startFrame: calculateStartFrame(3),
    areaBounds: { x: 80, y: 400, width: 300, height: 200 }  
  },
  { 
    name: 'mr-aria', 
    startFrame: calculateStartFrame(4),
    areaBounds: { x: 500, y: 400, width: 300, height: 200 }  
  },
  { 
    name: 'mrs-han', 
    startFrame: calculateStartFrame(5),
    areaBounds: { x: 1200, y: 400, width: 300, height: 200 }  
  }
]

// Main NPC type that uses new.png spritesheet
export const MAIN_NPC_TYPE: NPCType = {
  name: 'main',
  startFrame: 0, 
  areaBounds: { x: 400, y: 300, width: 400, height: 300 }  // Central area
}

// Helper functions for frame calculations
export function getDownFrames(startFrame: number): number[] {
  // Down frames are in the third row (bottom) of the character's 3x3 block
  const rowOffset = FRAMES_PER_ROW * 2
  return [
    startFrame + rowOffset,
    startFrame + rowOffset + 1,
    startFrame + rowOffset + 2
  ]
}

export function getSideFrames(startFrame: number): number[] {
  // Side frames are in the second row (middle) of the character's 3x3 block
  const rowOffset = FRAMES_PER_ROW
  return [
    startFrame + rowOffset,
    startFrame + rowOffset + 1,
    startFrame + rowOffset + 2
  ]
}

export function getUpFrames(startFrame: number): number[] {
  // Up frames are in the first row (top) of the character's 3x3 block
  return [
    startFrame,
    startFrame + 1,
    startFrame + 2
  ]
} 