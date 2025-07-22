import { Scene } from 'phaser'
import { NPC, NPCConfig } from '../types/NPC'

export class NPCManager {
  private scene: Scene
  private npcs: Array<NPC> = []
  private interactionDistance: number = 50
  private interactionKey: Phaser.Input.Keyboard.Key
  private chatCallback?: (npcId: number, personality: string) => void
  private currentInteractableNPC: NPC | null = null

  constructor(scene: Scene) {
    this.scene = scene
    if (!scene.input.keyboard) {
      throw new Error('Keyboard input not available')
    }
    this.interactionKey = scene.input.keyboard.addKey('E')
  }

  createNPC(config: NPCConfig): NPC {
    const {
      id,
      x,
      y,
      personality,
      speed = 50,
      moveTimeMin = 1000,
      moveTimeMax = 2000,
      pauseTimeMin = 500,
      pauseTimeMax = 1000
    } = config

    // Create NPC sprite
    const sprite = this.scene.physics.add.sprite(x, y, 'playerIdle', 0)
    
    // Set NPC properties
    sprite.setCollideWorldBounds(true)
    sprite.setScale(1)
    sprite.setSize(16, 16)
    sprite.setOffset(8, 16)
    
    // Create NPC object
    const npc: NPC = {
      id,
      sprite,
      lastDirection: 'down',
      moveTimer: 0,
      isMoving: false,
      targetDirection: 'down',
      speed,
      moveTimeMin,
      moveTimeMax,
      pauseTimeMin,
      pauseTimeMax,
      personality,
      isInteracting: false
    }
    
    // Add to NPCs array
    this.npcs.push(npc)
    
    // Start with idle animation
    sprite.play('idle-down')
    
    // Add collision with level layer if it exists
    const levelLayer = this.scene.children.getByName('levelLayer') as Phaser.Tilemaps.TilemapLayer
    if (levelLayer) {
      this.scene.physics.add.collider(sprite, levelLayer)
    }
    
    // Add collision with player
    const player = this.scene.children.getByName('player') as Phaser.Physics.Arcade.Sprite
    if (player) {
      this.scene.physics.add.collider(sprite, player)
    }
    
    // Add collision between NPCs
    this.npcs.forEach(otherNpc => {
      if (otherNpc.sprite !== sprite) {
        this.scene.physics.add.collider(sprite, otherNpc.sprite)
      }
    })

    return npc
  }

  spawnNPCsInCircle(mapWidth: number, mapHeight: number, levelLayer: Phaser.Tilemaps.TilemapLayer, player: Phaser.Physics.Arcade.Sprite) {
    const margin = 200
    const personalities = [
      "A friendly shopkeeper who loves to chat about local gossip",
      "A mysterious wanderer with cryptic knowledge of ancient artifacts",
      "A cheerful street musician who shares stories through songs",
      "A grumpy old wizard who reluctantly helps adventurers",
      "A young apprentice blacksmith eager to prove their skills",
      "A retired adventurer with tales of epic quests"
    ]
    
    const positions = [
      { x: margin, y: margin },
      { x: mapWidth - margin, y: margin },
      { x: margin, y: mapHeight - margin },
      { x: mapWidth - margin, y: mapHeight - margin },
      { x: mapWidth / 3, y: mapHeight / 2 },
      { x: (mapWidth * 2) / 3, y: mapHeight / 2 }
    ]
    
    positions.forEach((pos, index) => {
      this.createNPC({
        id: index,
        x: pos.x,
        y: pos.y,
        personality: personalities[index]
      })
    })
  }

  update(time: number) {
    // Update NPC movements
    this.npcs.forEach(npc => {
      if (!npc.isInteracting) {
        this.updateNPCMovement(npc, time)
      }
    })

    // Check for nearby NPCs and show interaction hint
    const player = this.scene.children.getByName('player') as Phaser.Physics.Arcade.Sprite
    if (player) {
      let closestNPC: NPC | null = null
      let closestDistance = Infinity

      for (const npc of this.npcs) {
        const distance = Phaser.Math.Distance.Between(
          player.x,
          player.y,
          npc.sprite.x,
          npc.sprite.y
        )

        if (distance <= this.interactionDistance && distance < closestDistance) {
          closestNPC = npc
          closestDistance = distance
        }
      }

      // Show or hide interaction hint
      if (closestNPC !== this.currentInteractableNPC) {
        if (this.currentInteractableNPC) {
          this.hideInteractionHint()
        }
        if (closestNPC) {
          this.showInteractionHint(closestNPC)
        }
        this.currentInteractableNPC = closestNPC
      }
    }

    // Check for interaction input
    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      this.checkInteractions()
    }
  }

  private updateNPCMovement(npc: NPC, time: number) {
    if (time > npc.moveTimer) {
      if (npc.isMoving) {
        // Stop moving and set pause timer
        npc.isMoving = false
        npc.sprite.setVelocity(0)
        npc.moveTimer = time + Phaser.Math.Between(npc.pauseTimeMin, npc.pauseTimeMax)
        
        // Set idle animation
        switch (npc.lastDirection) {
          case 'up':
            npc.sprite.setTexture('playerIdle', 6)
            break
          case 'down':
            npc.sprite.setTexture('playerIdle', 0)
            break
          case 'side':
            npc.sprite.setTexture('playerIdle', 12)
            break
        }
      } else {
        // Start moving in a random direction
        npc.isMoving = true
        const directions = ['up', 'down', 'left', 'right']
        npc.targetDirection = directions[Phaser.Math.Between(0, 3)]
        npc.moveTimer = time + Phaser.Math.Between(npc.moveTimeMin, npc.moveTimeMax)
        
        // Set velocity and animation
        switch (npc.targetDirection) {
          case 'up':
            npc.sprite.setVelocity(0, -npc.speed)
            npc.sprite.play('walk-up', true)
            npc.lastDirection = 'up'
            break
          case 'down':
            npc.sprite.setVelocity(0, npc.speed)
            npc.sprite.play('walk-down', true)
            npc.lastDirection = 'down'
            break
          case 'left':
            npc.sprite.setVelocity(-npc.speed, 0)
            npc.sprite.setFlipX(true)
            npc.sprite.play('walk-side', true)
            npc.lastDirection = 'side'
            break
          case 'right':
            npc.sprite.setVelocity(npc.speed, 0)
            npc.sprite.setFlipX(false)
            npc.sprite.play('walk-side', true)
            npc.lastDirection = 'side'
            break
        }
      }
    }
  }

  private checkInteractions() {
    const player = this.scene.children.getByName('player') as Phaser.Physics.Arcade.Sprite
    if (!player) return

    // Find the closest NPC within interaction distance
    let closestNPC: NPC | null = null
    let closestDistance = Infinity

    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        npc.sprite.x,
        npc.sprite.y
      )

      if (distance <= this.interactionDistance && distance < closestDistance) {
        closestNPC = npc
        closestDistance = distance
      }
    }

    // If we found a close NPC, trigger interaction
    if (closestNPC && this.chatCallback) {
      closestNPC.isInteracting = true
      closestNPC.sprite.setVelocity(0)
      this.chatCallback(closestNPC.id, closestNPC.personality)
    }
  }

  private showInteractionHint(npc: NPC) {
    if (typeof window !== 'undefined' && (window as any).showInteractionHint) {
      const camera = this.scene.cameras.main
      const screenX = (npc.sprite.x - camera.scrollX) * camera.zoom
      const screenY = (npc.sprite.y - camera.scrollY) * camera.zoom
      ;(window as any).showInteractionHint(npc.id, screenX, screenY)
    }
  }

  private hideInteractionHint() {
    if (typeof window !== 'undefined' && (window as any).hideInteractionHint) {
      (window as any).hideInteractionHint()
    }
  }

  setInteractionCallback(callback: (npcId: number, personality: string) => void) {
    this.chatCallback = callback
  }

  endInteraction(npcId: number) {
    const npc = this.npcs.find(n => n.id === npcId)
    if (npc) {
      npc.isInteracting = false
    }
  }
} 