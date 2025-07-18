import { Scene } from 'phaser'

export default class MainScene extends Scene {
  // Player properties
  private player!: Phaser.Physics.Arcade.Sprite
  private lastDirection = 'down'
  
  // Map properties
  private map!: Phaser.Tilemaps.Tilemap
  private groundLayer!: Phaser.Tilemaps.TilemapLayer
  private levelLayer!: Phaser.Tilemaps.TilemapLayer
  private tilesets!: Phaser.Tilemaps.Tileset[]
  
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
    this.createPlayer()
    this.setupControls()
    this.setupCamera()
    
    this.scale.on('resize', this.handleResize, this)
  }

  update() {
    this.handlePlayerMovement()
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
    
    this.createPlayerAnimations()
    this.player.play('idle-down')
    
    this.physics.add.collider(this.player, this.levelLayer)
  }

  private createPlayerAnimations() {
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

  // Camera and utility methods
  private setupCamera() {
    this.cameras.main.startFollow(this.player)
    this.cameras.main.setZoom(2)
    this.cameras.main.roundPixels = true
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
  }
  
  private handleResize() {
    this.cameras.main.setZoom(2)
    this.cameras.main.roundPixels = true
  }

  public setSelectedSlot(slot: number) {
    this.selectedSlot = slot
  }
} 