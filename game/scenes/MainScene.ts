import { Scene } from 'phaser'

export default class MainScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: any
  private selectedSlot: number = 0
  private grassChunks: Set<string> = new Set()

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
    
    // Load tileset for grass background as spritesheet
    // Image is 192x320, let's try different configurations
    this.load.spritesheet('springTileset', '/assets/tilesets/Tileset Spring.png', { 
      frameWidth: 16, 
      frameHeight: 16
      // No margin/spacing - let's see the raw result first
    })
    
    // Add load event listeners for debugging
    this.load.on('filecomplete-spritesheet-springTileset', () => {
      console.log('Spring tileset loaded successfully!')
    })
    
    this.load.on('loaderror', (file: any) => {
      console.error('Failed to load:', file.src)
    })
  }

  create() {
    // Test individual tiles first to see what they look like
    this.createTileTest()
    
    // Create grass background
    this.createGrassBackground()
    
    // Create player
    this.createPlayer()
    
    // Setup controls
    this.setupControls()
    
    // Setup camera with pixel-perfect zoom
    this.cameras.main.startFollow(this.player)
    this.cameras.main.setZoom(3) 
    this.cameras.main.roundPixels = true 
    
    // Handle screen resize
    this.scale.on('resize', this.handleResize, this)
  }
  
  private createTileTest() {
    // Display frames from the later part where grass should be (around frames 120-170)
    const startFrame = 120 // Start from frame 120 where tiles should be
    for (let i = 0; i < 48; i++) {
      const frameNum = startFrame + i
      const x = (i % 12) * 32 - 176 
      const y = Math.floor(i / 12) * 32 - 48 
      
      const tile = this.add.image(x, y, 'springTileset', frameNum)
      tile.setScale(2) 
      
      // Add text label showing frame number
      const label = this.add.text(x, y + 18, frameNum.toString(), {
        fontSize: '8px',
        color: '#000000',
        backgroundColor: '#ffffff'
      })
      label.setOrigin(0.5)
    }
  }
  
  private handleResize() {
    // Maintain pixel-perfect camera settings on resize
    this.cameras.main.setZoom(3)
    this.cameras.main.roundPixels = true
    
    // Regenerate grass coverage when screen size changes
    if (this.player) {
      this.generateGrassAroundPlayer()
    }
  }

  private createGrassBackground() {
    // Remove world bounds for unlimited world
    this.physics.world.setBounds(-Infinity, -Infinity, Infinity, Infinity)
    
    // Create initial grass chunks around spawn point (0, 0)
    this.generateInitialGrassChunks()
  }
  
  private generateInitialGrassChunks() {
    const chunkSize = 256
    
    // Calculate how many chunks we need based on screen size
    const screenWidth = this.cameras.main.width
    const screenHeight = this.cameras.main.height
    const chunksX = Math.ceil(screenWidth / chunkSize) + 4 // Extra buffer
    const chunksY = Math.ceil(screenHeight / chunkSize) + 4 // Extra buffer
    
    // Generate initial area around spawn
    const halfX = Math.floor(chunksX / 2)
    const halfY = Math.floor(chunksY / 2)
    
    for (let chunkX = -halfX; chunkX <= halfX; chunkX++) {
      for (let chunkY = -halfY; chunkY <= halfY; chunkY++) {
        const chunkKey = `${chunkX},${chunkY}`
        if (!this.grassChunks.has(chunkKey)) {
          this.createGrassChunk(chunkX, chunkY, chunkSize)
          this.grassChunks.add(chunkKey)
        }
      }
    }
  }
  
  private generateGrassAroundPlayer() {
    // Safety check - make sure player exists
    if (!this.player) {
      return
    }
    
    const chunkSize = 256 // Size of each grass chunk
    
    // Calculate render distance based on screen size with generous buffer
    const screenWidth = this.cameras.main.width
    const screenHeight = this.cameras.main.height
    const renderDistance = Math.max(screenWidth, screenHeight) + 500
    
    // Get player position
    const playerX = this.player.x
    const playerY = this.player.y
    
    // Calculate which chunks we need
    const chunkStartX = Math.floor((playerX - renderDistance) / chunkSize)
    const chunkEndX = Math.ceil((playerX + renderDistance) / chunkSize)
    const chunkStartY = Math.floor((playerY - renderDistance) / chunkSize)
    const chunkEndY = Math.ceil((playerY + renderDistance) / chunkSize)
    
    // Generate grass for each chunk that doesn't exist yet
    for (let chunkX = chunkStartX; chunkX <= chunkEndX; chunkX++) {
      for (let chunkY = chunkStartY; chunkY <= chunkEndY; chunkY++) {
        const chunkKey = `${chunkX},${chunkY}`
        
        if (!this.grassChunks.has(chunkKey)) {
          this.createGrassChunk(chunkX, chunkY, chunkSize)
          this.grassChunks.add(chunkKey)
        }
      }
    }
  }
  
  private createGrassChunk(chunkX: number, chunkY: number, chunkSize: number) {
    const tileSize = 16 // Original tileset tile size
    const scale = 2 // Scale up for visibility
    const scaledTileSize = tileSize * scale
    const startX = chunkX * chunkSize
    const startY = chunkY * chunkSize
    
    // Create a container for this grass chunk
    const chunkContainer = this.add.container(0, 0)
    
    // Create grass tiles within this chunk using specific frames from the spring tileset
    for (let x = startX; x < startX + chunkSize; x += scaledTileSize) {
      for (let y = startY; y < startY + chunkSize; y += scaledTileSize) {
        // Use deterministic seeding to pick grass tile variants
        const seedX = Math.abs((x * 7) % 3)
        const seedY = Math.abs((y * 13) % 3)
        
        // Based on user feedback, the actual tiles are in the later columns
        // Let's try frames from the back part of the tileset
        // With 12 tiles per row, let's try frames from later columns
        const grassFrames = [120, 121, 122, 132, 133, 134, 144, 145, 146] // Later frames where grass should be
        const grassFrame = grassFrames[(seedX + seedY) % grassFrames.length]
        
        // Create a grass tile using specific frame from the spring tileset
        const grassTile = this.add.image(x + scaledTileSize/2, y + scaledTileSize/2, 'springTileset', grassFrame)
        grassTile.setScale(scale) // Scale up the 16x16 tile
        grassTile.setOrigin(0.5, 0.5)
        
        // Add some variety by randomly flipping some tiles
        if (seedX > 2) {
          grassTile.setFlipX(true)
        }
        if (seedY > 2) {
          grassTile.setFlipY(true)
        }
        
        // Add slight rotation variety for more natural look
        if ((seedX + seedY) % 4 === 0) {
          grassTile.setRotation(Math.PI / 2) // 90 degrees
        }
        
        // Add the tile to the container
        chunkContainer.add(grassTile)
      }
    }
    
    // Tag this container with chunk info for cleanup
    chunkContainer.setData('chunkX', chunkX)
    chunkContainer.setData('chunkY', chunkY)
  }



  private createPlayer() {
    // Create player sprite using the first frame of the idle sprite sheet
    this.player = this.physics.add.sprite(0, 0, 'playerIdle', 0)
    
    // Set player physics (no world bounds for unlimited world)
    this.player.setCollideWorldBounds(false)
    this.player.setDamping(true)
    this.player.setDrag(500)
    this.player.setMaxVelocity(200)
    
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
    
    // Create idle animation using just one frame so character stays perfectly still
    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('playerIdle', { start: 0, end: 0 }),
      frameRate: 1,
      repeat: -1
    })
    
    // Start with idle animation
    this.player.play('idle')
    this.player.body!.setSize(16, 20)
    this.player.body!.setOffset(8, 12)
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
    
    // Regenerate grass periodically as player moves to maintain infinite world
    if (!this.lastGrassUpdate || this.time.now - this.lastGrassUpdate > 500) {
      this.updateGrassBackground()
      this.lastGrassUpdate = this.time.now
    }
  }
  
  private lastGrassUpdate: number = 0
  
  private updateGrassBackground() {
    // Safety check - make sure player exists
    if (!this.player) {
      return
    }
    
    // Calculate cleanup distance based on screen size
    const screenWidth = this.cameras.main.width
    const screenHeight = this.cameras.main.height
    const cleanupDistance = Math.max(screenWidth, screenHeight) + 800
    const chunkSize = 256
    
    // Get player position
    const playerX = this.player.x
    const playerY = this.player.y
    
    // Clean up distant grass chunks and world objects
    this.children.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Container && child.getData('chunkX') !== undefined) {
        const chunkX = child.getData('chunkX')
        const chunkY = child.getData('chunkY')
        const chunkCenterX = chunkX * chunkSize + chunkSize / 2
        const chunkCenterY = chunkY * chunkSize + chunkSize / 2
        
        const distance = Phaser.Math.Distance.Between(chunkCenterX, chunkCenterY, playerX, playerY)
        if (distance > cleanupDistance) {
          const chunkKey = `${chunkX},${chunkY}`
          this.grassChunks.delete(chunkKey)
          child.destroy()
        }
      }
      
      // Clean up distant world objects
      if (child instanceof Phaser.GameObjects.Image && child.getData('isWorldObject')) {
        const distance = Phaser.Math.Distance.Between(child.x, child.y, playerX, playerY)
        if (distance > cleanupDistance) {
          child.destroy()
        }
      }
    })
    
    // Generate new grass around current player position
    this.generateGrassAroundPlayer()
    
    // TODO: Re-enable world objects later
    // this.generateWorldObjects()
  }
  
  private generateWorldObjects() {
    // Safety check - make sure player exists
    if (!this.player) {
      return
    }
    
    // Get player position
    const playerX = this.player.x
    const playerY = this.player.y
    
    // Add some scattered objects in the world using deterministic positioning
    const objectSpacing = 200 // Distance between potential object spawns
    const spawnRange = 800 // How far from player to check for object spawns
    
    for (let x = playerX - spawnRange; x <= playerX + spawnRange; x += objectSpacing) {
      for (let y = playerY - spawnRange; y <= playerY + spawnRange; y += objectSpacing) {
        // Use position as seed for deterministic object placement
        const seed = Math.abs((x * 7 + y * 13) % 100)
        
        // Only spawn objects occasionally (10% chance)
        if (seed < 10) {
          const objectKey = `obj_${Math.floor(x/objectSpacing)}_${Math.floor(y/objectSpacing)}`
          
          // Check if this object already exists
          const existingObject = this.children.list.find(child => 
            child.getData && child.getData('objectKey') === objectKey
          )
          
          if (!existingObject) {
            this.createWorldObject(x, y, seed, objectKey)
          }
        }
      }
    }
  }
  
  private createWorldObject(x: number, y: number, seed: number, objectKey: string) {
    let objectSprite: Phaser.GameObjects.Image
    
    // Choose object type based on seed
    if (seed < 3) {
      // Trees
      objectSprite = this.add.image(x, y, 'tree')
      objectSprite.setScale(2)
    } else if (seed < 5) {
      // Houses (rare)
      objectSprite = this.add.image(x, y, 'house')
      objectSprite.setScale(1.5)
    } else if (seed < 8) {
      // Animals
      const animalType = seed % 2 === 0 ? 'cow' : 'chicken'
      objectSprite = this.add.image(x, y, animalType)
      objectSprite.setScale(2)
    } else {
      // Crops
      objectSprite = this.add.image(x, y, 'crops')
      objectSprite.setScale(2)
    }
    
    // Tag for cleanup
    objectSprite.setData('objectKey', objectKey)
    objectSprite.setData('isWorldObject', true)
    
    // Add physics body for collision (optional)
    this.physics.add.existing(objectSprite, true) // true makes it static
  }

  private handlePlayerMovement() {
    const speed = 100 
    
    // Reset velocity
    this.player.setVelocity(0)
    
    let isMoving = false
    let currentAnimation = 'idle'
    
    // Vertical movement (prioritize vertical over horizontal for animation)
    if (this.cursors.up?.isDown || this.wasd.W.isDown) {
      this.player.setVelocityY(-speed)
      currentAnimation = 'walk-up'
      isMoving = true
    } else if (this.cursors.down?.isDown || this.wasd.S.isDown) {
      this.player.setVelocityY(speed)
      currentAnimation = 'walk-down'
      isMoving = true
    }
    
    // Horizontal movement
    if (this.cursors.left?.isDown || this.wasd.A.isDown) {
      this.player.setVelocityX(-speed)
      if (!isMoving) { // Only use side animation if not already moving vertically
        this.player.setFlipX(true) // Flip sprite when moving left
        currentAnimation = 'walk-side'
      }
      isMoving = true
    } else if (this.cursors.right?.isDown || this.wasd.D.isDown) {
      this.player.setVelocityX(speed)
      if (!isMoving) { // Only use side animation if not already moving vertically
        this.player.setFlipX(false) // Don't flip when moving right
        currentAnimation = 'walk-side'
      }
      isMoving = true
    }
    
    // Play appropriate animation
    this.player.play(currentAnimation, true)
  }

  // Method to be called from UI to set selected slot
  public setSelectedSlot(slot: number) {
    this.selectedSlot = slot
    console.log(`Selected slot: ${slot + 1}`)
  }
} 