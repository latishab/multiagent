export interface NPC {
  id: number
  sprite: Phaser.Physics.Arcade.Sprite
  lastDirection: string
  moveTimer: number
  isMoving: boolean
  targetDirection: string
  speed: number
  moveTimeMin: number
  moveTimeMax: number
  pauseTimeMin: number
  pauseTimeMax: number
  personality: string
  isInteracting: boolean
}

export interface NPCConfig {
  id: number
  x: number
  y: number
  personality: string
  speed?: number
  moveTimeMin?: number
  moveTimeMax?: number
  pauseTimeMin?: number
  pauseTimeMax?: number
} 