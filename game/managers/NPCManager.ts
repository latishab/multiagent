import { Scene } from 'phaser'
import { NPC, NPCConfig } from '../types/NPC'

export class NPCManager {
  private scene: Scene
  private npcs: Array<NPC> = []
  private interactionDistance: number = 100
  private interactionKey: Phaser.Input.Keyboard.Key
  private chatCallback?: (npcId: number, personality: string) => void
  private currentInteractableNPC: NPC | null = null
  private interactionText: Phaser.GameObjects.Text | null = null

  constructor(scene: Scene) {
    this.scene = scene
    if (!scene.input.keyboard) {
      throw new Error('Keyboard input not available')
    }
    this.interactionKey = scene.input.keyboard.addKey('E')

    // Create the interaction text object
    this.interactionText = this.scene.add.text(0, 0, 'Press E to talk', {
      fontSize: '10px',
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 },
      fixedWidth: 0,
      color: '#ffffff'
    })
    this.interactionText.setOrigin(0.5, 1)
    this.interactionText.setDepth(1000)
    this.interactionText.setVisible(false)

    // Create NPC animations
    this.createNPCAnimations()

    // Listen for chat closed event
    if (typeof window !== 'undefined') {
      window.addEventListener('chatClosed', ((event: CustomEvent) => {
        const npc = this.npcs.find(n => n.id === event.detail.npcId)
        if (npc) {
          npc.isInteracting = false
        }
      }) as EventListener)
    }
  }

  private createNPCAnimations() {
    // Create walk animations
    this.scene.anims.create({
      key: 'walk-down',
      frames: this.scene.anims.generateFrameNumbers('playerWalk', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    })
    
    this.scene.anims.create({
      key: 'walk-up',
      frames: this.scene.anims.generateFrameNumbers('playerWalk', { start: 6, end: 11 }),
      frameRate: 10,
      repeat: -1
    })
    
    this.scene.anims.create({
      key: 'walk-side',
      frames: this.scene.anims.generateFrameNumbers('playerWalk', { start: 12, end: 17 }),
      frameRate: 10,
      repeat: -1
    })
    
    // Create idle animations using single frames
    this.scene.anims.create({
      key: 'idle-down',
      frames: [{ key: 'playerIdle', frame: 0 }],
      frameRate: 1,
      repeat: 0
    })
    
    this.scene.anims.create({
      key: 'idle-up',
      frames: [{ key: 'playerIdle', frame: 3 }],
      frameRate: 1,
      repeat: 0
    })
    
    this.scene.anims.create({
      key: 'idle-side',
      frames: [{ key: 'playerIdle', frame: 6 }],
      frameRate: 1,
      repeat: 0
    })
  }

  update(time: number) {
    // Don't update NPCs if chat is open
    if (typeof window !== 'undefined' && (window as any).isChatOpen) {
      return
    }

    // Update each NPC
    for (const npc of this.npcs) {
      if (!npc.isInteracting) {
        this.updateNPCMovement(npc, time)
      }
    }

    // Check for nearby NPCs and show interaction hint
    const player = this.scene.children.getByName('player') as Phaser.Physics.Arcade.Sprite
    if (player) {
      let closestNPC: NPC | null = null
      let closestDistance = Infinity

      for (const npc of this.npcs) {
        if (npc.isInteracting) continue

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

      if (closestNPC !== this.currentInteractableNPC) {
        if (closestNPC) {
          this.showInteractionHint(closestNPC)
        } else {
          this.hideInteractionHint()
        }
        this.currentInteractableNPC = closestNPC
      }

      if (this.currentInteractableNPC && this.interactionText) {
        const npc = this.currentInteractableNPC
        this.interactionText.setPosition(npc.sprite.x, npc.sprite.y - 20)
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      this.checkInteractions()
    }
  }

  private showInteractionHint(npc: NPC) {
    if (this.interactionText) {
      this.interactionText.setVisible(true)
      this.interactionText.setPosition(npc.sprite.x, npc.sprite.y - 20)
    }
  }

  private hideInteractionHint() {
    if (this.interactionText) {
      this.interactionText.setVisible(false)
    }
    this.currentInteractableNPC = null
  }

  private checkInteractions() {
    // Don't check for interactions if chat is open
    if (typeof window !== 'undefined' && (window as any).isChatOpen) {
      return
    }

    // Don't check for interactions if any NPC is already interacting
    if (this.npcs.some(npc => npc.isInteracting)) {
      return
    }

    console.log('E key pressed, checking for NPC interactions...')
    if (this.currentInteractableNPC) {
      console.log('Found interactable NPC:', {
        id: this.currentInteractableNPC.id,
        personality: this.currentInteractableNPC.personality
      })
      
      this.currentInteractableNPC.isInteracting = true
      this.currentInteractableNPC.sprite.setVelocity(0)

      if (this.chatCallback) {
        console.log('Calling chat callback...')
        this.chatCallback(
          this.currentInteractableNPC.id,
          this.currentInteractableNPC.personality
        )
      } else {
        console.warn('No chat callback registered!')
      }

      this.hideInteractionHint()
    } else {
      console.log('No NPC in range for interaction')
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

  private updateNPCMovement(npc: NPC, time: number) {
    if (npc.isInteracting) {
      npc.sprite.setVelocity(0, 0)
      return
    }

    if (npc.isMoving && time >= npc.moveTimer) {
      // Stop moving and set idle animation
      npc.isMoving = false
      npc.sprite.setVelocity(0, 0)
      npc.moveTimer = time + Phaser.Math.Between(npc.pauseTimeMin, npc.pauseTimeMax)

      // Set idle animation based on last direction
      npc.sprite.play(`idle-${npc.lastDirection}`, true)
    } else if (!npc.isMoving && time >= npc.moveTimer) {
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
    sprite.setScale(1.5)
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
    
    // Add collisions
    const levelLayer = this.scene.children.getByName('levelLayer') as Phaser.Tilemaps.TilemapLayer
    if (levelLayer) {
      this.scene.physics.add.collider(sprite, levelLayer)
    }
    
    const player = this.scene.children.getByName('player') as Phaser.Physics.Arcade.Sprite
    if (player) {
      this.scene.physics.add.collider(sprite, player)
    }
    
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
} 