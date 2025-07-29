import { Scene, Physics } from 'phaser'
import { NPC, NPCType, NPC_TYPES, NPCConfig, getDownFrames, getSideFrames, getUpFrames } from '../types/NPC'

export class NPCManager {
  private scene: Scene
  private npcs: NPC[] = []
  private interactionDistance: number = 100
  private interactionKey: Phaser.Input.Keyboard.Key
  private chatCallback?: (npcId: string, personality: string) => void
  private currentInteractableNPC: NPC | null = null
  private interactionText: Phaser.GameObjects.Text | null = null
  
  private readonly npcConfigs = [
    {
      id: "1",
      personality: "A retired ecologist with a deep understanding of natural systems",
      name: "Mrs. Aria"
    },
    {
      id: "2",
      personality: "A pragmatic infrastructure engineer focused on system stability",
      name: "Chief Oskar"
    },
    {
      id: "3",
      personality: "A forward-thinking fuel supplier interested in sustainable options",
      name: "Mr. Moss"
    },
    {
      id: "4",
      personality: "A passionate teacher advocating for community-focused development",
      name: "Miss Dai"
    },
    {
      id: "5",
      personality: "A determined water justice activist fighting for equal access",
      name: "Ms. Kira"
    },
    {
      id: "6",
      personality: "An innovative builder exploring eco-friendly construction methods",
      name: "Mr. Han"
    }
  ];

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
    sprite.setScale(2.25) 
    sprite.setSize(16, 16)
    sprite.setOffset(8, 16)
    
    // Add collision with the level layer
    this.scene.physics.add.collider(sprite, levelLayer)
    
    // Add collision between NPC and player
    this.scene.physics.add.collider(sprite, player)

    // Find the index of this NPC type to get the correct config
    const npcTypeIndex = NPC_TYPES.findIndex(type => type.name === npcType.name)
    const id = (npcTypeIndex + 1).toString()
    
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
      animationId: `${npcType.name}-${id}`,
      personality: this.npcConfigs[npcTypeIndex]?.personality || "A mysterious character",
      isInteracting: false,
      areaBounds: npcType.areaBounds
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
      const npcData = {
        "1": "A retired ecologist who prioritizes ecological restoration and believes in working with nature. Speaks slowly and gently, often referring to natural laws and past experiences.",
        "2": "A pragmatic infrastructure engineer who prioritizes system stability and efficiency. Speaks in technical terms and focuses on data-driven solutions.",
        "3": "A forward-thinking fuel supplier balancing sustainability with practicality. Interested in innovative solutions while acknowledging economic realities.",
        "4": "A passionate teacher advocating for community-focused development. Emphasizes education and sustainable urban planning.",
        "5": "A determined water justice activist fighting for equal access. Focuses on fair distribution and community empowerment.",
        "6": "An innovative builder exploring eco-friendly construction methods. Balances modern technology with environmental consciousness."
      }

      const npcIndex = parseInt(this.currentInteractableNPC.id) - 1;
      const npcConfig = this.npcConfigs[npcIndex];
      console.log('Found interactable NPC:', {
        id: this.currentInteractableNPC.id,
        name: npcConfig?.name,
        personality: npcData[this.currentInteractableNPC.id as keyof typeof npcData] || this.currentInteractableNPC.personality
      })
      
      this.currentInteractableNPC.isInteracting = true
      this.currentInteractableNPC.sprite.setVelocity(0)

      if (this.chatCallback) {
        console.log('Calling chat callback with NPC:', {
          id: this.currentInteractableNPC.id,
          name: npcConfig?.name
        })
        this.chatCallback(
          this.currentInteractableNPC.id,
          npcData[this.currentInteractableNPC.id as keyof typeof npcData] || this.currentInteractableNPC.personality
        )
      } else {
        console.warn('No chat callback registered!')
      }

      this.hideInteractionHint()
    } else {
      console.log('No NPC in range for interaction')
    }
  }

  setInteractionCallback(callback: (npcId: string, personality: string) => void) {
    this.chatCallback = callback
  }

  endInteraction(npcId: string) {
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

    // Check if NPC is within bounds and adjust if needed
    if (npc.areaBounds) {
      const bounds = npc.areaBounds
      const sprite = npc.sprite
      
      // Keep NPC within bounds
      if (sprite.x < bounds.x) {
        sprite.x = bounds.x
        npc.sprite.setVelocity(0, 0)
        npc.isMoving = false
        npc.moveTimer = time + Phaser.Math.Between(npc.pauseTimeMin, npc.pauseTimeMax)
        return
      }
      if (sprite.x > bounds.x + bounds.width) {
        sprite.x = bounds.x + bounds.width
        npc.sprite.setVelocity(0, 0)
        npc.isMoving = false
        npc.moveTimer = time + Phaser.Math.Between(npc.pauseTimeMin, npc.pauseTimeMax)
        return
      }
      if (sprite.y < bounds.y) {
        sprite.y = bounds.y
        npc.sprite.setVelocity(0, 0)
        npc.isMoving = false
        npc.moveTimer = time + Phaser.Math.Between(npc.pauseTimeMin, npc.pauseTimeMax)
        return
      }
      if (sprite.y > bounds.y + bounds.height) {
        sprite.y = bounds.y + bounds.height
        npc.sprite.setVelocity(0, 0)
        npc.isMoving = false
        npc.moveTimer = time + Phaser.Math.Between(npc.pauseTimeMin, npc.pauseTimeMax)
        return
      }
    }

    if (npc.isMoving && time >= npc.moveTimer) {
      // Stop moving and set idle animation
      npc.isMoving = false
      npc.sprite.setVelocity(0, 0)
      npc.moveTimer = time + Phaser.Math.Between(npc.pauseTimeMin, npc.pauseTimeMax)

      // Set idle animation based on last direction
      npc.sprite.play(`npc-${npc.animationId}-idle-${npc.lastDirection}`, true)
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

  private getNPCName(startFrame: number): string {
    return NPC_TYPES.find(type => type.startFrame === startFrame)?.name || 'unknown'
  }

  spawnNPCsInAreas(mapWidth: number, mapHeight: number, levelLayer: Phaser.Tilemaps.TilemapLayer, player: Physics.Arcade.Sprite) {
    NPC_TYPES.forEach((npcType, index) => {
      let x: number, y: number
      
      if (npcType.areaBounds) {
        // Spawn NPC within their designated area
        const bounds = npcType.areaBounds
        x = bounds.x + bounds.width / 2
        y = bounds.y + bounds.height / 2
      } else {
        // Fallback to circle spawning if no area bounds defined
        const centerX = mapWidth / 2
        const centerY = mapHeight / 2
        const radius = Math.min(mapWidth, mapHeight) / 4
        const angle = (index / NPC_TYPES.length) * Math.PI * 2
        x = centerX + Math.cos(angle) * radius
        y = centerY + Math.sin(angle) * radius
      }
      
      this.createNPC(x, y, npcType, levelLayer, player)
    })
  }
} 