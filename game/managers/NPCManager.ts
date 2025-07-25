import { Scene, Physics, GameObjects } from 'phaser'
import { NPC, NPCType, NPC_TYPES, getDownFrames, getSideFrames, getUpFrames } from '../types/NPC'

export class NPCManager {
  private scene: Scene
  private npcs: NPC[] = []

  constructor(scene: Scene) {
    this.scene = scene
  }

  createNPCAnimations(npc: NPC) {
    const baseFrame = npc.startFrame
    const npcName = this.getNPCName(npc.startFrame)
    const uniqueId = `${npcName}-${npc.id}`

    // Get frame arrays for each direction
    const downFrames = getDownFrames(baseFrame)
    const sideFrames = getSideFrames(baseFrame)
    const upFrames = getUpFrames(baseFrame)

    // Walk animations
    this.scene.anims.create({
      key: `npc-${uniqueId}-walk-down`,
      frames: [
        { key: 'npcs', frame: downFrames[0] },
        { key: 'npcs', frame: downFrames[1] }
      ],
      frameRate: 6,
      repeat: -1,
      yoyo: true
    })

    this.scene.anims.create({
      key: `npc-${uniqueId}-walk-side`,
      frames: [
        { key: 'npcs', frame: sideFrames[0] },
        { key: 'npcs', frame: sideFrames[1] }
      ],
      frameRate: 6,
      repeat: -1,
      yoyo: true
    })

    this.scene.anims.create({
      key: `npc-${uniqueId}-walk-up`,
      frames: [
        { key: 'npcs', frame: upFrames[0] },
        { key: 'npcs', frame: upFrames[1] }
      ],
      frameRate: 6,
      repeat: -1,
      yoyo: true
    })

    // Idle animations (using the last frame of each row)
    this.scene.anims.create({
      key: `npc-${uniqueId}-idle-down`,
      frames: [{ key: 'npcs', frame: downFrames[2] }],  // Last frame of down row
      frameRate: 1,
      repeat: 0
    })

    this.scene.anims.create({
      key: `npc-${uniqueId}-idle-side`,
      frames: [{ key: 'npcs', frame: sideFrames[2] }],  // Last frame of side row
      frameRate: 1,
      repeat: 0
    })

    this.scene.anims.create({
      key: `npc-${uniqueId}-idle-up`,
      frames: [{ key: 'npcs', frame: upFrames[2] }],  // Last frame of up row
      frameRate: 1,
      repeat: 0
    })

    return uniqueId
  }

  createNPC(x: number, y: number, npcType: NPCType, levelLayer: Phaser.Tilemaps.TilemapLayer, player: Physics.Arcade.Sprite) {
    // Create NPC sprite using the correct frame from the spritesheet
    // Use the middle frame of the down-facing row as default
    const defaultFrame = getDownFrames(npcType.startFrame)[1]
    const sprite = this.scene.physics.add.sprite(x, y, 'npcs', defaultFrame)
    
    // Set NPC properties
    sprite.setCollideWorldBounds(true)
    sprite.setScale(1)
    sprite.setSize(16, 16)
    sprite.setOffset(8, 16)
    
    // Add collision with the level layer
    this.scene.physics.add.collider(sprite, levelLayer)
    
    // Add collision between NPC and player
    this.scene.physics.add.collider(sprite, player)

    const id = this.npcs.length.toString()
    
    // Create NPC object with type-specific animations
    const npc: NPC = {
      sprite: sprite,
      lastDirection: 'down',
      moveTimer: 0,
      isMoving: false,
      targetDirection: 'down',
      speed: 50,
      moveTimeMin: 1000,
      moveTimeMax: 2000,
      pauseTimeMin: 500,
      pauseTimeMax: 1000,
      startFrame: npcType.startFrame,
      type: npcType.name,
      id: id,
      animationId: `${npcType.name}-${id}`
    }
    
    // Create animations for this specific NPC and get its unique animation ID
    const uniqueId = this.createNPCAnimations(npc)
    npc.animationId = uniqueId
    
    // Add to NPCs array
    this.npcs.push(npc)
    
    // Start with idle animation using unique ID
    sprite.play(`npc-${uniqueId}-idle-down`)
    
    // Add collision between this NPC and other NPCs
    this.npcs.forEach(otherNpc => {
      if (otherNpc.sprite !== sprite) {
        this.scene.physics.add.collider(sprite, otherNpc.sprite)
      }
    })

    return npc
  }

  update(time: number) {
    this.npcs.forEach(npc => {
      if (time > npc.moveTimer) {
        if (npc.isMoving) {
          npc.isMoving = false
          npc.sprite.setVelocity(0)
          npc.moveTimer = time + Phaser.Math.Between(npc.pauseTimeMin, npc.pauseTimeMax)
          npc.sprite.play(`npc-${npc.animationId}-idle-${npc.lastDirection}`)
        } else {
          npc.isMoving = true
          const directions = ['up', 'down', 'left', 'right']
          npc.targetDirection = directions[Phaser.Math.Between(0, 3)]
          npc.moveTimer = time + Phaser.Math.Between(npc.moveTimeMin, npc.moveTimeMax)
          
          switch (npc.targetDirection) {
            case 'up':
              npc.sprite.setVelocity(0, -npc.speed)
              npc.sprite.play(`npc-${npc.animationId}-walk-up`, true)
              npc.lastDirection = 'up'
              break
            case 'down':
              npc.sprite.setVelocity(0, npc.speed)
              npc.sprite.play(`npc-${npc.animationId}-walk-down`, true)
              npc.lastDirection = 'down'
              break
            case 'left':
              npc.sprite.setVelocity(-npc.speed, 0)
              npc.sprite.setFlipX(true)
              npc.sprite.play(`npc-${npc.animationId}-walk-side`, true)
              npc.lastDirection = 'side'
              break
            case 'right':
              npc.sprite.setVelocity(npc.speed, 0)
              npc.sprite.setFlipX(false)
              npc.sprite.play(`npc-${npc.animationId}-walk-side`, true)
              npc.lastDirection = 'side'
              break
          }
        }
      }
    })
  }

  private getNPCName(startFrame: number): string {
    return NPC_TYPES.find(type => type.startFrame === startFrame)?.name || 'unknown'
  }

  spawnNPCsInCircle(mapWidth: number, mapHeight: number, levelLayer: Phaser.Tilemaps.TilemapLayer, player: Physics.Arcade.Sprite) {
    const centerX = mapWidth / 2
    const centerY = mapHeight / 2
    const radius = Math.min(mapWidth, mapHeight) / 4

    NPC_TYPES.forEach((npcType, index) => {
      const angle = (index / NPC_TYPES.length) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      this.createNPC(x, y, npcType, levelLayer, player)
    })
  }
} 