import { Scene } from 'phaser'

// NPC interface for managing NPCs
interface NPC {
  sprite: Phaser.Physics.Arcade.Sprite
  lastDirection: string
  moveTimer: number
  isMoving: boolean
  targetDirection: string
}

export default class MainScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private npcs: NPC[] = []
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: any
  private selectedSlot: number = 0
  private lastDirection = 'down'
  private map!: Phaser.Tilemaps.Tilemap
  private groundLayer!: Phaser.Tilemaps.TilemapLayer
  private levelLayer!: Phaser.Tilemaps.TilemapLayer
  private tileset!: Phaser.Tilemaps.Tileset

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    this.load.spritesheet('playerIdle', '/assets/characters/Idle.png', { 
      frameWidth: 32, 
      frameHeight: 32 
    })
    this.load.spritesheet('playerWalk', '/assets/characters/Walk.png', { 
      frameWidth: 32, 
      frameHeight: 32 
    })
    
    // Load tilemap and tileset
    this.load.tilemapTiledJSON('worldMap', '/assets/tilesets/world.json')
    this.load.image('springTileset', '/assets/tilesets/Tileset Spring.png')
    
    console.log('Loading tilemap and tileset...')
  }

  create() {
    // Create tilemap from JSON
    this.map = this.make.tilemap({ key: 'worldMap' })
    
    // Add tileset to the map
    this.tileset = this.map.addTilesetImage('Tileset Spring', 'springTileset')!
    
    // Create layers
    this.groundLayer = this.map.createLayer('Ground', this.tileset, 0, 0)!
    this.levelLayer = this.map.createLayer('Level 1', this.tileset, 0, 0)!
    
    // Scale up the tilemap to make it more visible (2x scale)
    this.groundLayer.setScale(2)
    this.levelLayer.setScale(2)
    
    // Set collision properties for tiles that have collision=true
    this.levelLayer.setCollisionByProperty({ collides: true })
    
    console.log('Tilemap created successfully')
    
    // Create animations first (shared by player and NPCs)
    this.createPlayerAnimations()
    
    // Create player at the center of the map (map is 100x100 tiles, each 16px, scaled 2x)
    const mapCenterX = (this.map.widthInPixels * 2) / 2
    const mapCenterY = (this.map.heightInPixels * 2) / 2
    this.createPlayer(mapCenterX, mapCenterY)
    
    // Create NPCs
    this.createNPCs()
    
    // Setup controls
    this.setupControls()
    
    // Setup camera with pixel-perfect zoom
    this.cameras.main.startFollow(this.player)
    this.cameras.main.setZoom(3)
    this.cameras.main.roundPixels = true
    
    // Set camera bounds to the tilemap
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels * 2, this.map.heightInPixels * 2)
    
    // Handle screen resize
    this.scale.on('resize', this.handleResize, this)
    
    console.log(`Map size: ${this.map.widthInPixels}x${this.map.heightInPixels} pixels`)
    console.log(`Player spawned at: ${mapCenterX}, ${mapCenterY}`)
  }
  
  private createPlayer(x: number, y: number) {
    // Create player sprite using the first frame of the idle sprite sheet
    this.player = this.physics.add.sprite(x, y, 'playerIdle', 0)
    
    // Set player properties
    this.player.setCollideWorldBounds(true)
    this.player.setScale(1)
    this.player.setSize(16, 16) // Smaller collision box
    this.player.setOffset(8, 16) // Offset collision box to feet
    
    // Play idle animation
    this.player.play('idle-down')
    
    // Add collision with the level layer
    this.physics.add.collider(this.player, this.levelLayer)
  }

  private createNPCs() {
    // Define spawn positions for 6 NPCs around the map
    const mapWidth = this.map.widthInPixels * 2
    const mapHeight = this.map.heightInPixels * 2
    const margin = 200 // Keep NPCs away from edges
    
    const npcPositions = [
      { x: margin, y: margin }, // Top-left
      { x: mapWidth - margin, y: margin }, // Top-right
      { x: margin, y: mapHeight - margin }, // Bottom-left
      { x: mapWidth - margin, y: mapHeight - margin }, // Bottom-right
      { x: mapWidth / 3, y: mapHeight / 2 }, // Left-center
      { x: (mapWidth * 2) / 3, y: mapHeight / 2 } // Right-center
    ]
    
    npcPositions.forEach((pos, index) => {
      this.createNPC(pos.x, pos.y, index)
    })
    
    console.log(`Created ${this.npcs.length} NPCs`)
  }

  private createNPC(x: number, y: number, id: number) {
    // Create NPC sprite using the same assets as player
    const sprite = this.physics.add.sprite(x, y, 'playerIdle', 0)
    
    // Set NPC properties (same as player)
    sprite.setCollideWorldBounds(true)
    sprite.setScale(1)
    sprite.setSize(16, 16)
    sprite.setOffset(8, 16)
    
    // Add collision with the level layer
    this.physics.add.collider(sprite, this.levelLayer)
    
    // Add collision between NPC and player
    this.physics.add.collider(sprite, this.player)
    
    // Create NPC object
    const npc: NPC = {
      sprite: sprite,
      lastDirection: 'down',
      moveTimer: 0,
      isMoving: false,
      targetDirection: 'down'
    }
    
    // Add to NPCs array
    this.npcs.push(npc)
    
    // Start with idle animation
    sprite.play('idle-down')
    
    // Add collision between this NPC and other NPCs
    this.npcs.forEach(otherNpc => {
      if (otherNpc !== npc) {
        this.physics.add.collider(sprite, otherNpc.sprite)
      }
    })
  }

  private createPlayerAnimations() {
    // Create walking animations for different directions
    // Front view (facing down/towards camera) - frames 0-5
    if (!this.anims.exists('walk-down')) {
      this.anims.create({
        key: 'walk-down',
        frames: this.anims.generateFrameNumbers('playerWalk', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
      })
    }
    
    // Back view (facing up/away from camera) - frames 6-11
    if (!this.anims.exists('walk-up')) {
      this.anims.create({
        key: 'walk-up',
        frames: this.anims.generateFrameNumbers('playerWalk', { start: 6, end: 11 }),
        frameRate: 10,
        repeat: -1
      })
    }
    
    // Side view (facing left/right) - frames 12-17
    if (!this.anims.exists('walk-side')) {
      this.anims.create({
        key: 'walk-side',
        frames: this.anims.generateFrameNumbers('playerWalk', { start: 12, end: 17 }),
        frameRate: 10,
        repeat: -1
      })
    }
    
    // Create idle animations for different directions using the idle spritesheet
    if (!this.anims.exists('idle-down')) {
      this.anims.create({
        key: 'idle-down',
        frames: this.anims.generateFrameNumbers('playerIdle', { start: 0, end: 0 }),
        frameRate: 1,
        repeat: 0
      })
    }
    
    if (!this.anims.exists('idle-up')) {
      this.anims.create({
        key: 'idle-up',
        frames: this.anims.generateFrameNumbers('playerIdle', { start: 6, end: 6 }),
        frameRate: 1,
        repeat: 0
      })
    }
    
    if (!this.anims.exists('idle-side')) {
      this.anims.create({
        key: 'idle-side',
        frames: this.anims.generateFrameNumbers('playerIdle', { start: 12, end: 12 }),
        frameRate: 1,
        repeat: 0
      })
    }
    
    console.log('Character animations created successfully')
  }

  private setupControls() {
    // Create cursor keys
    this.cursors = this.input.keyboard!.createCursorKeys()
    
    // Create WASD keys
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D')
    
    // Add number key listeners for hotbar
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = parseInt(event.key)
      if (key >= 1 && key <= 5) {
        this.selectedSlot = key - 1
      }
    })
  }

  update() {
    this.handlePlayerMovement()
    this.handleNPCMovement()
  }

  private handleNPCMovement() {
    const npcSpeed = 50 // Slower than player
    
    this.npcs.forEach(npc => {
      // Decrease move timer
      npc.moveTimer -= this.game.loop.delta
      
      // If timer is up, decide new action
      if (npc.moveTimer <= 0) {
        const action = Phaser.Math.Between(0, 100)
        
        if (action < 30) {
          // 30% chance to idle
          npc.isMoving = false
          npc.moveTimer = Phaser.Math.Between(1000, 3000) // Idle for 1-3 seconds
        } else {
          // 70% chance to move in a random direction
          const directions = ['up', 'down', 'left', 'right']
          npc.targetDirection = directions[Phaser.Math.Between(0, 3)]
          npc.isMoving = true
          npc.moveTimer = Phaser.Math.Between(1000, 2500) // Move for 1-2.5 seconds
        }
      }
      
      // Handle movement
      if (npc.isMoving) {
        npc.sprite.setVelocity(0) // Reset velocity
        
        let currentAnimation = `idle-${npc.lastDirection}`
        
        switch (npc.targetDirection) {
          case 'up':
            npc.sprite.setVelocityY(-npcSpeed)
            currentAnimation = 'walk-up'
            npc.lastDirection = 'up'
            break
          case 'down':
            npc.sprite.setVelocityY(npcSpeed)
            currentAnimation = 'walk-down'
            npc.lastDirection = 'down'
            break
          case 'left':
            npc.sprite.setVelocityX(-npcSpeed)
            npc.sprite.setFlipX(true)
            currentAnimation = 'walk-side'
            npc.lastDirection = 'side'
            break
          case 'right':
            npc.sprite.setVelocityX(npcSpeed)
            npc.sprite.setFlipX(false)
            currentAnimation = 'walk-side'
            npc.lastDirection = 'side'
            break
        }
        
        // Play walking animation
        try {
          if (this.anims.exists(currentAnimation)) {
            npc.sprite.play(currentAnimation, true)
          } else {
            console.warn(`Animation '${currentAnimation}' does not exist for NPC`)
            npc.sprite.play('idle-down', true)
          }
        } catch (error) {
          console.error('Error playing NPC walking animation:', error)
          npc.sprite.setFrame(0)
        }
      } else {
        // NPC is idle
        npc.sprite.setVelocity(0)
        const idleAnimation = `idle-${npc.lastDirection}`
        try {
          if (this.anims.exists(idleAnimation)) {
            npc.sprite.play(idleAnimation, true)
          } else {
            console.warn(`Animation '${idleAnimation}' does not exist for NPC`)
            npc.sprite.play('idle-down', true)
          }
        } catch (error) {
          console.error('Error playing NPC idle animation:', error)
          npc.sprite.setFrame(0)
        }
      }
    })
  }
  
  private handleResize() {
    // Maintain pixel-perfect camera settings on resize
    this.cameras.main.setZoom(3)
    this.cameras.main.roundPixels = true
  }

  private handlePlayerMovement() {
    const speed = 100 
    
    // Reset velocity
    this.player.setVelocity(0)
    
    let isMoving = false
    let currentAnimation = `idle-${this.lastDirection}`
    
    // Vertical movement (prioritize vertical over horizontal for animation)
    if (this.cursors.up?.isDown || this.wasd.W.isDown) {
      this.player.setVelocityY(-speed)
      currentAnimation = 'walk-up'
      this.lastDirection = 'up'
      isMoving = true
    } else if (this.cursors.down?.isDown || this.wasd.S.isDown) {
      this.player.setVelocityY(speed)
      currentAnimation = 'walk-down'
      this.lastDirection = 'down'
      isMoving = true
    }
    
    // Horizontal movement
    if (this.cursors.left?.isDown || this.wasd.A.isDown) {
      this.player.setVelocityX(-speed)
      if (!isMoving) { // Only use side animation if not already moving vertically
        this.player.setFlipX(true) // Flip sprite when moving left
        currentAnimation = 'walk-side'
        this.lastDirection = 'side'
      }
      isMoving = true
    } else if (this.cursors.right?.isDown || this.wasd.D.isDown) {
      this.player.setVelocityX(speed)
      if (!isMoving) { // Only use side animation if not already moving vertically
        this.player.setFlipX(false) // Don't flip when moving right
        currentAnimation = 'walk-side'
        this.lastDirection = 'side'
      }
      isMoving = true
    }
    
    // If not moving, use idle animation for last direction
    if (!isMoving) {
      currentAnimation = `idle-${this.lastDirection}`
    }
    
    // Play appropriate animation with error checking
    try {
      if (this.anims.exists(currentAnimation)) {
        this.player.play(currentAnimation, true)
      } else {
        console.warn(`Animation '${currentAnimation}' does not exist, falling back to idle-down`)
        this.player.play('idle-down', true)
      }
    } catch (error) {
      console.error('Error playing animation:', error)
      this.player.setFrame(0)
    }
  }

  // Method to be called from UI to set selected slot
  public setSelectedSlot(slot: number) {
    this.selectedSlot = slot
    console.log(`Selected slot: ${slot + 1}`)
  }
} 