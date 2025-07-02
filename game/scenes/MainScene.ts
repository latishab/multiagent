import { Scene } from 'phaser'

export default class MainScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite
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
    
    // Create player at the center of the map (map is 100x100 tiles, each 16px, scaled 2x)
    const mapCenterX = (this.map.widthInPixels * 2) / 2
    const mapCenterY = (this.map.heightInPixels * 2) / 2
    this.createPlayer(mapCenterX, mapCenterY)
    
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
    
    // Create animations
    this.createPlayerAnimations()
    
    // Play idle animation
    this.player.play('idle-down')
    
    // Add collision with the level layer
    this.physics.add.collider(this.player, this.levelLayer)
  }

  private createPlayerAnimations() {
    // Create walking animations for different directions
    // Front view (facing down/towards camera) - frames 0-5
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('playerWalk', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    })
    
    // Back view (facing up/away from camera) - frames 6-11
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('playerWalk', { start: 6, end: 11 }),
      frameRate: 10,
      repeat: -1
    })
    
    // Side view (facing left/right) - frames 12-17
    this.anims.create({
      key: 'walk-side',
      frames: this.anims.generateFrameNumbers('playerWalk', { start: 12, end: 17 }),
      frameRate: 10,
      repeat: -1
    })
    
    // Create idle animations for different directions using the idle spritesheet
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
    
    console.log('Player animations created successfully')
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