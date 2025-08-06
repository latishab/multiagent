import { Scene, Physics } from 'phaser'
import { NPC, NPCType, NPC_TYPES, MAIN_NPC_TYPE, NPCConfig, getDownFrames, getSideFrames, getUpFrames } from '../types/NPC'

export class NPCManager {
  private scene: Scene
  private npcs: NPC[] = []
  private interactionDistance: number = 100
  private interactionKey: Phaser.Input.Keyboard.Key
  private chatCallback?: (npcId: string, personality: string) => void
  private currentInteractableNPC: NPC | null = null
  private interactionText: Phaser.GameObjects.Text | null = null
  private guideAlertText: Phaser.GameObjects.Text | null = null
  
  private readonly npcConfigs = [
    {
      id: "1",
      personality: "A retired ecologist with a deep understanding of natural systems",
      name: "Mr. Aria"
    },
    {
      id: "2",
      personality: "A pragmatic infrastructure engineer focused on system stability",
      name: "Chief Oskar"
    },
    {
      id: "3",
      personality: "A forward-thinking fuel supplier interested in sustainable options",
      name: "Ms. Moss"
    },
    {
      id: "4",
      personality: "A passionate teacher advocating for community-focused development",
      name: "Mr. Dai"
    },
    {
      id: "5",
      personality: "A determined water justice activist fighting for equal access",
      name: "Ms. Kira"
    },
    {
      id: "6",
      personality: "An innovative builder exploring eco-friendly construction methods",
      name: "Mrs. Han"
    }
  ];

  // Main NPC configuration
  private readonly mainNPCConfig = {
    id: "main",
    personality: "The wise guide who helps players understand the world and their mission",
    name: "The Guide"
  };

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

    // Create the guide alert text object
    this.guideAlertText = this.scene.add.text(0, 0, '!', {
      fontSize: '16px',
      backgroundColor: '#f59e0b',
      padding: { x: 6, y: 2 },
      color: '#1f2937',
      fontStyle: 'bold'
    })
    this.guideAlertText.setOrigin(0.5, 1)
    this.guideAlertText.setDepth(1001) // Higher than regular interaction text
    this.guideAlertText.setVisible(false)

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

  createNPC(x: number, y: number, npcType: NPCType, levelLayer: Phaser.Tilemaps.TilemapLayer, wallLayer: Phaser.Tilemaps.TilemapLayer, player: Physics.Arcade.Sprite) {
    // Create NPC sprite using the correct frame from the spritesheet
    // Use the middle frame of the down-facing row as default
    const defaultFrame = getDownFrames(npcType.startFrame)[1]
    const sprite = this.scene.physics.add.sprite(x, y, 'npcs', defaultFrame)
    
    // Set NPC properties
    sprite.setCollideWorldBounds(true)
    sprite.setScale(2.25) 
    sprite.setSize(16, 16)
    sprite.setOffset(8, 16)
    
    // Add collision with both level layer and wall layer
    this.scene.physics.add.collider(sprite, levelLayer)
    this.scene.physics.add.collider(sprite, wallLayer)
    
    // Add overlap detection between NPC and player (instead of collision)
    this.scene.physics.add.overlap(sprite, player, () => {
      // This will be handled in the update loop for interaction detection
    })

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
    
    // Add overlap detection between this NPC and other NPCs (instead of collision)
    this.npcs.forEach(otherNpc => {
      if (otherNpc.sprite !== sprite) {
        this.scene.physics.add.overlap(sprite, otherNpc.sprite, () => {
          // NPCs can overlap but won't push each other
        })
      }
    })

    return npc
  }

  createMainNPC(x: number, y: number, levelLayer: Phaser.Tilemaps.TilemapLayer, wallLayer: Phaser.Tilemaps.TilemapLayer, player: Physics.Arcade.Sprite) {
    // Create main NPC sprite using the new.png spritesheet
    const sprite = this.scene.physics.add.sprite(x, y, 'main-npc', 0) // Use 'main-npc' key for new.png
    
    // Set main NPC properties
    sprite.setCollideWorldBounds(true)
    sprite.setScale(2.25)
    sprite.setSize(16, 16)
    sprite.setOffset(8, 16)
    
    // Add collision with both level layer and wall layer
    this.scene.physics.add.collider(sprite, levelLayer)
    this.scene.physics.add.collider(sprite, wallLayer)
    
    // Add overlap detection between main NPC and player
    this.scene.physics.add.overlap(sprite, player, () => {
      // This will be handled in the update loop for interaction detection
    })

    // Create main NPC object
    const mainNPC: NPC = {
      sprite: sprite,
      lastDirection: 'down',
      moveTimer: 0,
      isMoving: false,
      targetDirection: 'down',
      speed: 30, // Slower speed for main NPC
      moveTimeMin: 2000,
      moveTimeMax: 4000,
      pauseTimeMin: 1000,
      pauseTimeMax: 2000,
      startFrame: 0, // First frame of new.png
      type: 'main',
      id: 'main',
      animationId: 'main-npc',
      personality: this.mainNPCConfig.personality,
      isInteracting: false,
      areaBounds: { x: 400, y: 300, width: 400, height: 300 }
    }
    
    // Create animations for main NPC
    this.createMainNPCAnimations(mainNPC)
    
    // Add to NPCs array
    this.npcs.push(mainNPC)
    
    // Start with idle animation
    sprite.play('main-npc-idle-down')
    
    // Add overlap detection between main NPC and other NPCs
    this.npcs.forEach(otherNpc => {
      if (otherNpc.sprite !== sprite) {
        this.scene.physics.add.overlap(sprite, otherNpc.sprite, () => {
          // NPCs can overlap but won't push each other
        })
      }
    })

    return mainNPC
  }

  createMainNPCAnimations(npc: NPC) {
    // Create animations for main NPC using new.png spritesheet
    // Layout: First row (0-2) = Up, Second row (3-5) = Side, Third row (6-8) = Down
    
    // Walk animations
    this.scene.anims.create({
      key: 'main-npc-walk-down',
      frames: [
        { key: 'main-npc', frame: 6 }, // Down frames (third row, first frame)
        { key: 'main-npc', frame: 7 }  // Down frames (third row, second frame)
      ],
      frameRate: 6,
      repeat: -1,
      yoyo: true
    })

    this.scene.anims.create({
      key: 'main-npc-walk-side',
      frames: [
        { key: 'main-npc', frame: 3 }, // Side frames (second row, first frame)
        { key: 'main-npc', frame: 4 }  // Side frames (second row, second frame)
      ],
      frameRate: 6,
      repeat: -1,
      yoyo: true
    })

    this.scene.anims.create({
      key: 'main-npc-walk-up',
      frames: [
        { key: 'main-npc', frame: 0 }, // Up frames (first row, first frame)
        { key: 'main-npc', frame: 1 }  // Up frames (first row, second frame)
      ],
      frameRate: 6,
      repeat: -1,
      yoyo: true
    })

    // Idle animations (using the last frame of each row)
    this.scene.anims.create({
      key: 'main-npc-idle-down',
      frames: [{ key: 'main-npc', frame: 8 }], // Down idle (third row, last frame)
      frameRate: 1,
      repeat: 0
    })

    this.scene.anims.create({
      key: 'main-npc-idle-side',
      frames: [{ key: 'main-npc', frame: 5 }], // Side idle (second row, last frame)
      frameRate: 1,
      repeat: 0
    })

    this.scene.anims.create({
      key: 'main-npc-idle-up',
      frames: [{ key: 'main-npc', frame: 2 }], // Up idle (first row, last frame)
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

      // Check for nearby NPCs for interaction hints
      for (const npc of this.npcs) {
        if (npc.isInteracting) continue

        // Only consider NPCs that should be interactable
        if (!this.shouldNPCBeInteractable(npc)) continue

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

      // Handle interaction text visibility
      if (closestNPC !== this.currentInteractableNPC) {
        if (closestNPC) {
          this.showInteractionHint(closestNPC)
        } else {
          this.hideInteractionHint()
        }
        this.currentInteractableNPC = closestNPC
      }

      // Handle guide alert globally (not tied to proximity)
      const shouldShowGuideAlert = typeof window !== 'undefined' && 
        ((window as any).shouldShowGuideAlert && (window as any).shouldShowGuideAlert());
      
      if (shouldShowGuideAlert) {
        // Find The Guide NPC to position the alert
        const guideNPC = this.npcs.find(npc => npc.id === 'main');
        if (guideNPC && this.guideAlertText) {
          this.guideAlertText.setVisible(true)
          this.guideAlertText.setPosition(guideNPC.sprite.x, guideNPC.sprite.y - 20)
        }
      } else {
        // Hide guide alert when not needed
        if (this.guideAlertText) {
          this.guideAlertText.setVisible(false)
        }
      }

      // Update interaction text positions for nearby NPCs
      if (this.currentInteractableNPC) {
        const npc = this.currentInteractableNPC
        
        // Don't show interaction text for The Guide when guide alert is showing
        if (npc.id === 'main' && shouldShowGuideAlert) {
          if (this.interactionText) {
            this.interactionText.setVisible(false)
          }
        } else {
          // Show regular interaction text for all NPCs
          if (this.interactionText) {
            this.interactionText.setVisible(true)
            this.interactionText.setPosition(npc.sprite.x, npc.sprite.y - 20)
          }
        }
      } else {
        // No NPC in range - hide interaction text
        if (this.interactionText) {
          this.interactionText.setVisible(false)
        }
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      this.checkInteractions()
    }
  }

  private showInteractionHint(npc: NPC) {
    // Special handling for The Guide
    if (npc.id === 'main') {
      if (typeof window !== 'undefined' && (window as any).shouldShowGuideAlert && (window as any).shouldShowGuideAlert()) {
        // Show guide alert instead of "Press E to talk"
        if (this.guideAlertText) {
          this.guideAlertText.setVisible(true)
          this.guideAlertText.setPosition(npc.sprite.x, npc.sprite.y - 20)
        }
        // Hide the regular interaction text
        if (this.interactionText) {
          this.interactionText.setVisible(false)
        }
      } else {
        // Hide guide alert if it shouldn't be shown
        if (this.guideAlertText) {
          this.guideAlertText.setVisible(false)
        }
        // Show regular "Press E to talk" for The Guide when alert shouldn't be shown
        if (this.interactionText) {
          this.interactionText.setText('Press E to talk')
          this.interactionText.setVisible(true)
          this.interactionText.setPosition(npc.sprite.x, npc.sprite.y - 20)
        }
      }
    } else {
      // Regular NPCs - check if game has started
      if (typeof window !== 'undefined' && !(window as any).hasGameStarted) {
        // Show message that player needs to talk to The Guide first
        if (this.interactionText) {
          this.interactionText.setText('Talk to The Guide first')
          this.interactionText.setVisible(true)
          this.interactionText.setPosition(npc.sprite.x, npc.sprite.y - 20)
        }
      } else {
        // Normal interaction for regular NPCs
        if (this.interactionText) {
          this.interactionText.setText('Press E to talk')
          this.interactionText.setVisible(true)
          this.interactionText.setPosition(npc.sprite.x, npc.sprite.y - 20)
        }
      }
    }
  }

  private shouldNPCBeInteractable(npc: NPC): boolean {
    // The Guide should always be interactable
    if (npc.id === 'main') {
      return true
    }

    // Check if game has started
    const hasGameStarted = typeof window !== 'undefined' && (window as any).hasGameStarted
    if (!hasGameStarted) {
      return false
    }

    // Check if The Guide should be the only interactable NPC
    const shouldShowGuideAlert = typeof window !== 'undefined' && 
      ((window as any).shouldShowGuideAlert && (window as any).shouldShowGuideAlert())
    
    if (shouldShowGuideAlert) {
      // Only The Guide should be interactable when guide alert is showing
      return false
    }

    // For regular NPCs, check if they should be interactable based on current round
    const currentRound = typeof window !== 'undefined' && (window as any).currentRound ? (window as any).currentRound : 1
    const spokenNPCs = typeof window !== 'undefined' && (window as any).spokenNPCs ? (window as any).spokenNPCs : { round1: new Set(), round2: new Set() }
    
    const npcId = parseInt(npc.id)
    if (isNaN(npcId)) {
      return false // Invalid NPC ID
    }

    // In Round 1: All NPCs should be interactable
    if (currentRound === 1) {
      return true
    }

    // In Round 2: Only NPCs that haven't been spoken to in Round 2 should be interactable
    if (currentRound === 2) {
      return !spokenNPCs.round2.has(npcId)
    }

    return true
  }

  private hideInteractionHint() {
    if (this.interactionText) {
      this.interactionText.setVisible(false)
    }
    if (this.guideAlertText) {
      this.guideAlertText.setVisible(false)
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

    // Check if the current interactable NPC should be interactable based on game state
    if (this.currentInteractableNPC && !this.shouldNPCBeInteractable(this.currentInteractableNPC)) {
      return
    }

    // Check if game has started (player has talked to The Guide)
    // Only block regular NPCs if game hasn't started, but always allow The Guide
    if (typeof window !== 'undefined' && !(window as any).hasGameStarted && this.currentInteractableNPC?.id === 'main') {
      // Allow The Guide interaction even if game hasn't started
    } else if (typeof window !== 'undefined' && !(window as any).hasGameStarted && this.currentInteractableNPC?.id !== 'main') {
      // Block regular NPCs if game hasn't started
      return
    }

    if (this.currentInteractableNPC) {
      const npcData = {
        "1": "A retired ecologist who prioritizes ecological restoration and believes in working with nature. Speaks slowly and gently, often referring to natural laws and past experiences.",
        "2": "A pragmatic infrastructure engineer who prioritizes system stability and efficiency. Speaks in technical terms and focuses on data-driven solutions.",
        "3": "A forward-thinking fuel supplier balancing sustainability with practicality. Interested in innovative solutions while acknowledging economic realities.",
        "4": "A passionate teacher advocating for community-focused development. Emphasizes education and sustainable urban planning.",
        "5": "A determined water justice activist fighting for equal access. Focuses on fair distribution and community empowerment.",
        "6": "An innovative builder exploring eco-friendly construction methods. Balances modern technology with environmental consciousness.",
        "main": "The wise guide who helps players understand the world and their mission. Provides guidance and wisdom about the game's objectives and mechanics."
      }

      let npcConfig;
      let npcName;
      
      if (this.currentInteractableNPC.id === 'main') {
        npcConfig = this.mainNPCConfig;
        npcName = this.mainNPCConfig.name;
      } else {
        const npcIndex = parseInt(this.currentInteractableNPC.id) - 1;
        npcConfig = this.npcConfigs[npcIndex];
        npcName = npcConfig?.name;
      }
      
      this.currentInteractableNPC.isInteracting = true
      this.currentInteractableNPC.sprite.setVelocity(0)

      if (this.chatCallback) {
        this.chatCallback(
          this.currentInteractableNPC.id,
          npcData[this.currentInteractableNPC.id as keyof typeof npcData] || this.currentInteractableNPC.personality
        )
      } else {
        console.warn('❌ No chat callback registered!')
      }

      this.hideInteractionHint()
    } else {
      console.log('❌ No NPC in range for interaction')
    }
  }

  setInteractionCallback(callback: (npcId: string, personality: string) => void) {
    this.chatCallback = callback
  }

  endInteraction(npcId: string) {
    let targetNpcId = npcId
    if (npcId === '-1') {
      targetNpcId = 'main'
    }
    
    const npc = this.npcs.find(n => n.id === targetNpcId)
    if (npc) {
      npc.isInteracting = false
    } else {
      console.warn('Could not find NPC to end interaction:', { originalId: npcId, targetId: targetNpcId })
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
      if (npc.animationId === 'main-npc') {
        npc.sprite.play(`main-npc-idle-${npc.lastDirection}`, true)
      } else {
        npc.sprite.play(`npc-${npc.animationId}-idle-${npc.lastDirection}`, true)
      }
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
          if (npc.animationId === 'main-npc') {
            npc.sprite.play(`main-npc-walk-up`, true)
          } else {
            npc.sprite.play(`npc-${npc.animationId}-walk-up`, true)
          }
          npc.lastDirection = 'up'
          break
        case 'down':
          npc.sprite.setVelocity(0, npc.speed)
          if (npc.animationId === 'main-npc') {
            npc.sprite.play(`main-npc-walk-down`, true)
          } else {
            npc.sprite.play(`npc-${npc.animationId}-walk-down`, true)
          }
          npc.lastDirection = 'down'
          break
        case 'left':
          npc.sprite.setVelocity(-npc.speed, 0)
          npc.sprite.setFlipX(true)
          if (npc.animationId === 'main-npc') {
            npc.sprite.play(`main-npc-walk-side`, true)
          } else {
            npc.sprite.play(`npc-${npc.animationId}-walk-side`, true)
          }
          npc.lastDirection = 'side'
          break
        case 'right':
          npc.sprite.setVelocity(npc.speed, 0)
          npc.sprite.setFlipX(false)
          if (npc.animationId === 'main-npc') {
            npc.sprite.play(`main-npc-walk-side`, true)
          } else {
            npc.sprite.play(`npc-${npc.animationId}-walk-side`, true)
          }
          npc.lastDirection = 'side'
          break
      }
    }
  }

  private getNPCName(startFrame: number): string {
    return NPC_TYPES.find(type => type.startFrame === startFrame)?.name || 'unknown'
  }

  private findValidSpawnPosition(bounds: { x: number, y: number, width: number, height: number }, levelLayer: Phaser.Tilemaps.TilemapLayer, wallLayer: Phaser.Tilemaps.TilemapLayer): { x: number, y: number } {
    const tileSize = 16 // Each tile is 16x16 pixels
    const npcSize = 16 // NPC collision size
    
    // Check if bounds are within map limits
    const mapWidth = levelLayer.width
    const mapHeight = levelLayer.height
    
    // Clamp bounds to map boundaries
    const clampedBounds = {
      x: Math.max(0, Math.min(bounds.x, mapWidth - bounds.width)),
      y: Math.max(0, Math.min(bounds.y, mapHeight - bounds.height)),
      width: Math.min(bounds.width, mapWidth),
      height: Math.min(bounds.height, mapHeight)
    }
    
    // Try the center first
    let x = clampedBounds.x + clampedBounds.width / 2
    let y = clampedBounds.y + clampedBounds.height / 2
    
    // Check if center position is valid
    if (this.isValidSpawnPosition(x, y, levelLayer, wallLayer)) {
      return { x, y }
    }
    
    // If center is invalid, try random positions within the bounds
    const maxAttempts = 50
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      x = clampedBounds.x + Math.random() * clampedBounds.width
      y = clampedBounds.y + Math.random() * clampedBounds.height
      
      if (this.isValidSpawnPosition(x, y, levelLayer, wallLayer)) {
        return { x, y }
      }
    }
    
    // If no valid position found, try expanding the search area
    const expandedBounds = {
      x: Math.max(0, clampedBounds.x - 100),
      y: Math.max(0, clampedBounds.y - 100),
      width: Math.min(clampedBounds.width + 200, mapWidth),
      height: Math.min(clampedBounds.height + 200, mapHeight)
    }
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      x = expandedBounds.x + Math.random() * expandedBounds.width
      y = expandedBounds.y + Math.random() * expandedBounds.height
      
      if (this.isValidSpawnPosition(x, y, levelLayer, wallLayer)) {
        return { x, y }
      }
    }
    
    // Last resort: try to find any valid position on the map
    for (let attempt = 0; attempt < 100; attempt++) {
      x = Math.random() * mapWidth
      y = Math.random() * mapHeight
      
      if (this.isValidSpawnPosition(x, y, levelLayer, wallLayer)) {
        return { x, y }
      }
    }
    
    // Ultimate fallback: return center of map
    return { x: mapWidth / 2, y: mapHeight / 2 }
  }

  private isValidSpawnPosition(x: number, y: number, levelLayer: Phaser.Tilemaps.TilemapLayer, wallLayer: Phaser.Tilemaps.TilemapLayer): boolean {
    const tileSize = 16
    const npcSize = 16
    
    // Convert pixel coordinates to tile coordinates
    const tileX = Math.floor(x / tileSize)
    const tileY = Math.floor(y / tileSize)
    
    // Check if coordinates are within map bounds
    if (tileX < 0 || tileY < 0 || tileX >= levelLayer.width || tileY >= levelLayer.height) {
      return false
    }
    
    // Check if the tile exists and is walkable
    const levelTile = levelLayer.getTileAt(tileX, tileY)
    const wallTile = wallLayer.getTileAt(tileX, tileY)
    
    // Position is valid if:
    // 1. Level tile exists and is not a collision tile
    // 2. Wall tile doesn't exist (no wall)
    // 3. Level tile doesn't have collision properties
    const hasLevelTile = levelTile !== null
    const hasWallTile = wallTile !== null
    const hasCollision = levelTile && levelTile.properties && levelTile.properties.collides
    
    return hasLevelTile && !hasWallTile && !hasCollision
  }

  spawnNPCsInAreas(mapWidth: number, mapHeight: number, levelLayer: Phaser.Tilemaps.TilemapLayer, wallLayer: Phaser.Tilemaps.TilemapLayer, player: Physics.Arcade.Sprite) {
    NPC_TYPES.forEach((npcType, index) => {
      let x: number, y: number
      
      if (npcType.areaBounds) {
        // Find a valid spawn position within the designated area
        const spawnPos = this.findValidSpawnPosition(npcType.areaBounds, levelLayer, wallLayer)
        x = spawnPos.x
        y = spawnPos.y
      } else {
        // Fallback to circle spawning if no area bounds defined
        const centerX = mapWidth / 2
        const centerY = mapHeight / 2
        const radius = Math.min(mapWidth, mapHeight) / 4
        const angle = (index / NPC_TYPES.length) * Math.PI * 2
        x = centerX + Math.cos(angle) * radius
        y = centerY + Math.sin(angle) * radius
      }
      
      // Ensure NPC spawns within map boundaries
      x = Math.max(50, Math.min(x, mapWidth - 50))
      y = Math.max(50, Math.min(y, mapHeight - 50))
      
      this.createNPC(x, y, npcType, levelLayer, wallLayer, player)
    })
  }

  spawnMainNPC(levelLayer: Phaser.Tilemaps.TilemapLayer, wallLayer: Phaser.Tilemaps.TilemapLayer, player: Physics.Arcade.Sprite) {
    // Spawn main NPC in the center of the map
    const x = 750 // Center X position
    const y = 520 // Center Y position
    
    this.createMainNPC(x, y, levelLayer, wallLayer, player)
  }
} 