import { Scene } from 'phaser'

// NPC interface for managing NPCs
interface NPC {
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
}

export default class MainScene extends Scene {
  // Player properties
  private player!: Phaser.Physics.Arcade.Sprite
  private lastDirection = 'down'
  
  // Map properties
  private map!: Phaser.Tilemaps.Tilemap
  private groundLayer!: Phaser.Tilemaps.TilemapLayer
  private levelLayer!: Phaser.Tilemaps.TilemapLayer
  private tilesets!: Phaser.Tilemaps.Tileset[]
  
  // NPC properties
  private npcs: NPC[] = []
  
  // Input properties
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: any
  
  // UI properties
  private selectedSlot: number = 0

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    // Load player spritesheets
    this.load.spritesheet('playerIdle', '/assets/characters/Idle.png', { 
      frameWidth: 32, 
      frameHeight: 32 
    })
    this.load.spritesheet('playerWalk', '/assets/characters/Walk.png', { 
      frameWidth: 32, 
      frameHeight: 32 
    })
    
    // Load map and separate tilesets
    this.load.tilemapTiledJSON('worldMap', '/assets/tilesets/map.json')
    this.load.image('Low-TownA5', '/assets/tilesets/Low-TownA5.png')
    this.load.image('Mid-TownA5', '/assets/tilesets/Mid-TownA5.png')
    this.load.image('Low-TownD', '/assets/tilesets/Low-TownD.png')
    this.load.image('Low-TownC', '/assets/tilesets/Low-TownC.png')
    this.load.image('apartmentA5demo', '/assets/tilesets/apartmentA5demo.png')
    this.load.image('Interiors_free_32x32', '/assets/tilesets/Interiors_free_32x32.png')
    this.load.image('Mid-TownD', '/assets/tilesets/Mid-TownD.png')
    this.load.image('Mid-TownC', '/assets/tilesets/Mid-TownC.png')
  }

  create() {
    this.createMap()
    this.createAnimations() 
    this.createPlayer()
    this.createNPCs()
    this.setupControls()
    this.setupCamera()
    
    this.scale.on('resize', this.handleResize, this)
  }

  update() {
    this.handlePlayerMovement()
    this.updateNPCs()
  }

  // Map setup methods
  private createMap() {
    this.map = this.make.tilemap({ 
      key: 'worldMap',
      tileWidth: 16,
      tileHeight: 16
    })
    
    this.tilesets = [
      this.map.addTilesetImage('Low-TownA5', 'Low-TownA5')!,
      this.map.addTilesetImage('Mid-TownA5', 'Mid-TownA5')!,
      this.map.addTilesetImage('Low-TownD', 'Low-TownD')!,
      this.map.addTilesetImage('Low-TownC', 'Low-TownC')!,
      this.map.addTilesetImage('apartmentA5demo', 'apartmentA5demo')!,
      this.map.addTilesetImage('Interiors_free_32x32', 'Interiors_free_32x32')!,
      this.map.addTilesetImage('Mid-TownD', 'Mid-TownD')!,
      this.map.addTilesetImage('Mid-TownC', 'Mid-TownC')!
    ]
    
    this.groundLayer = this.map.createLayer('ground', this.tilesets, 0, 0)!
    this.levelLayer = this.map.createLayer('item', this.tilesets, 0, 0)!
    
    this.levelLayer.setCollisionByProperty({ collides: true })

    // Set the physics world bounds to match the map size
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
  }

  private createAnimations() {
    // Create all animations that will be shared between player and NPCs
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('playerWalk', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    })
    
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('playerWalk', { start: 6, end: 11 }),
      frameRate: 10,
      repeat: -1
    })
    
    this.anims.create({
      key: 'walk-side',
      frames: this.anims.generateFrameNumbers('playerWalk', { start: 12, end: 17 }),
      frameRate: 10,
      repeat: -1
    })
    
    this.anims.create({
      key: 'idle-down',
      frames: this.anims.generateFrameNumbers('playerIdle', { start: 0, end: 0 }),
      frameRate: 1,
      repeat: 0
    })
    
    this.anims.create({
      key: 'idle-up',
      frames: this.anims.generateFrameNumbers('playerIdle', { start: 6, end: 6 }),
      frameRate: 1,
      repeat: 0
    })
    
    this.anims.create({
      key: 'idle-side',
      frames: this.anims.generateFrameNumbers('playerIdle', { start: 12, end: 12 }),
      frameRate: 1,
      repeat: 0
    })
  }

  // Player setup methods
  private createPlayer() {
    const mapCenterX = this.map.widthInPixels / 2
    const mapCenterY = this.map.heightInPixels / 2
    
    this.player = this.physics.add.sprite(mapCenterX, mapCenterY, 'playerIdle', 0)
    this.player.setCollideWorldBounds(true)
    this.player.setScale(1)
    this.player.setSize(16, 16)
    this.player.setOffset(8, 16)
    
    this.player.play('idle-down')
    
    this.physics.add.collider(this.player, this.levelLayer)

    // Log the bounds for debugging
    console.log('Map size:', {
      width: this.map.widthInPixels,
      height: this.map.heightInPixels,
      tileWidth: this.map.tileWidth,
      tileHeight: this.map.tileHeight,
      widthInTiles: this.map.width,
      heightInTiles: this.map.height
    })
  }

  private createNPCs() {
    // Define spawn positions for 6 NPCs around the map
    const mapWidth = this.map.widthInPixels
    const mapHeight = this.map.heightInPixels
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
      targetDirection: 'down',
      speed: 50, // Default speed
      moveTimeMin: 1000, // Default move time
      moveTimeMax: 2000, // Default move time
      pauseTimeMin: 500, // Default pause time
      pauseTimeMax: 1000 // Default pause time
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

  // Input and movement methods
  private setupControls() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D')
    
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = parseInt(event.key)
      if (key >= 1 && key <= 5) {
        this.selectedSlot = key - 1
      }
    })
  }

  private handlePlayerMovement() {
    const speed = 100 
    
    this.player.setVelocity(0)
    
    let isMoving = false
    let currentAnimation = `idle-${this.lastDirection}`
    
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
    
    if (this.cursors.left?.isDown || this.wasd.A.isDown) {
      this.player.setVelocityX(-speed)
      if (!isMoving) {
        this.player.setFlipX(true)
        currentAnimation = 'walk-side'
        this.lastDirection = 'side'
      }
      isMoving = true
    } else if (this.cursors.right?.isDown || this.wasd.D.isDown) {
      this.player.setVelocityX(speed)
      if (!isMoving) {
        this.player.setFlipX(false)
        currentAnimation = 'walk-side'
        this.lastDirection = 'side'
      }
      isMoving = true
    }
    
    if (!isMoving) {
      currentAnimation = `idle-${this.lastDirection}`
    }
    
    try {
      if (this.anims.exists(currentAnimation)) {
        this.player.play(currentAnimation, true)
      } else {
        this.player.play('idle-down', true)
      }
    } catch (error) {
      console.error('Error playing animation:', error)
      this.player.setFrame(0)
    }
  }

  private updateNPCs() {
    const time = this.time.now
    
    this.npcs.forEach(npc => {
      // Update movement timer
      if (time > npc.moveTimer) {
        if (npc.isMoving) {
          // Stop moving and set pause timer
          npc.isMoving = false
          npc.sprite.setVelocity(0)
          npc.moveTimer = time + Phaser.Math.Between(npc.pauseTimeMin, npc.pauseTimeMax)
          
          // Set the correct idle frame based on direction
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
          
          // Set velocity and animation based on direction
          switch (npc.targetDirection) {
            case 'up':
              npc.sprite.setVelocity(0, -npc.speed)
              if (this.anims.exists('walk-up')) {
                npc.sprite.play('walk-up', true)
              } else {
                npc.sprite.setTexture('playerWalk', 6)
              }
              npc.lastDirection = 'up'
              break
            case 'down':
              npc.sprite.setVelocity(0, npc.speed)
              if (this.anims.exists('walk-down')) {
                npc.sprite.play('walk-down', true)
              } else {
                npc.sprite.setTexture('playerWalk', 0)
              }
              npc.lastDirection = 'down'
              break
            case 'left':
              npc.sprite.setVelocity(-npc.speed, 0)
              npc.sprite.setFlipX(true)
              if (this.anims.exists('walk-side')) {
                npc.sprite.play('walk-side', true)
              } else {
                npc.sprite.setTexture('playerWalk', 12)
              }
              npc.lastDirection = 'side'
              break
            case 'right':
              npc.sprite.setVelocity(npc.speed, 0)
              npc.sprite.setFlipX(false)
              if (this.anims.exists('walk-side')) {
                npc.sprite.play('walk-side', true)
              } else {
                npc.sprite.setTexture('playerWalk', 12)
              }
              npc.lastDirection = 'side'
              break
          }
        }
      }
    })
  }

  // Camera and utility methods
  private setupCamera() {
    this.cameras.main.startFollow(this.player)
    this.cameras.main.setZoom(2)
    this.cameras.main.roundPixels = true
    
    // Set camera bounds to match the physics world
    const bounds = this.physics.world.bounds
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height)
  }
  
  private handleResize() {
    this.cameras.main.setZoom(2)
    this.cameras.main.roundPixels = true
  }

  public setSelectedSlot(slot: number) {
    this.selectedSlot = slot
  }
} 