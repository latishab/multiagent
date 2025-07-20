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