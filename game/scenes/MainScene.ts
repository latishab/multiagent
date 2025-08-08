import { Scene } from 'phaser'
import { PlayerManager } from '../managers/PlayerManager'
import { NPCManager } from '../managers/NPCManager'

export default class MainScene extends Scene {
  // Map properties
  private map!: Phaser.Tilemaps.Tilemap
  private groundLayer!: Phaser.Tilemaps.TilemapLayer
  private levelLayer!: Phaser.Tilemaps.TilemapLayer
  private wallLayer!: Phaser.Tilemaps.TilemapLayer
  private tilesets!: Phaser.Tilemaps.Tileset[]
  
  // Managers
  private playerManager!: PlayerManager
  private npcManager!: NPCManager

  // UI properties
  private selectedSlot: number = 0

  // Minimap properties
  private minimap!: Phaser.Cameras.Scene2D.Camera

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    this.load.on('loaderror', (file: any) => {
      console.error('Failed to load texture:', file.src)
    })
    
    this.load.on('loadcomplete', () => {
      console.log('All assets loaded successfully')
      this.trackClarity('assets_loaded')
    })
    
    // Add WebGL error handling
    if (this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      const gl = this.renderer.gl;
      if (gl) {
        gl.getError(); // Clear any existing errors
      }
    }

    // Load player spritesheets
    this.load.spritesheet('playerIdle', '/assets/characters/Idle.png', { 
      frameWidth: 32, 
      frameHeight: 32 
    })
    this.load.spritesheet('playerWalk', '/assets/characters/Walk.png', { 
      frameWidth: 32, 
      frameHeight: 32 
    })

    // Spritesheet Slicing Guide for update.png (144x96 with 6 characters)
    // The spritesheet layout is:
    // - Total size: 144x96 pixels
    // - Each character block is 48x48 pixels (a perfect 3x3 grid of frames)
    // - Each individual frame is 16x16 pixels
    // - Characters are arranged in 2 rows, 3 characters per row
    // 
    // Dimensions breakdown:
    // Width: 3 character blocks × 48 pixels = 144 pixels total width
    // Height: 2 character blocks × 48 pixels = 96 pixels total height
    // Each character block: 48x48 pixels (3 frames wide × 3 frames high)
    // Each frame: 16x16 pixels
    // 
    // Character positions in spritesheet:
    // Row 1 (0-48px): [White 48px][Brown 48px][Blue 48px]
    // Row 2 (48-96px): [Teal 48px][Dark 48px][Military 48px]
    // 
    // Frame layout within each 48x48 character block:
    // [0][1][2] - Up animations
    // [3][4][5] - Side animations
    // [6][7][8] - Down animations
    // 
    // To calculate frame index:
    // - Each row is 144/16 = 9 frames wide
    // - For character at position (row, col):
    //   startFrame = (row * 9 * 3) + (col * 3)
    //   where row is 0 or 1, col is 0, 1, or 2

    this.load.spritesheet('npcs', '/assets/characters/update.png', {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0
    })
    
    // Load main NPC spritesheet (new.png)
    this.load.spritesheet('main-npc', '/assets/characters/new.png', {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0
    })
    
    // Load map and separate tilesets
    this.load.tilemapTiledJSON('worldMap', '/assets/tilesets/map0803.json')
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
    try {
      // Check for WebGL errors before creating map
      if (this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        const gl = this.renderer.gl;
        if (gl) {
          const error = gl.getError();
          if (error !== gl.NO_ERROR) {
            console.warn('WebGL error before map creation:', error);
          }
        }
      }
      
      this.createMap()
      
      // Initialize managers
      this.playerManager = new PlayerManager(this)
      this.npcManager = new NPCManager(this)
      this.trackClarity('scene_created', {
        mapWidth: this.map?.widthInPixels,
        mapHeight: this.map?.heightInPixels
      })
    } catch (error) {
      console.error('Error during scene creation:', error)
      this.createMap() // Fallback
    }
    
    try {
      // Create player and NPCs
      this.playerManager.createPlayerAnimations()
      const player = this.playerManager.createPlayer(
        750,
        580,
        this.levelLayer,
        this.wallLayer
      )
      
      // Spawn NPCs in their designated areas
      this.npcManager.spawnNPCsInAreas(
        this.map.widthInPixels,
        this.map.heightInPixels,
        this.levelLayer,
        this.wallLayer,
        player
      )
      
      // Spawn main NPC
      this.npcManager.spawnMainNPC(this.levelLayer, this.wallLayer, player)
      
      // Setup NPC chat interaction
      this.npcManager.setInteractionCallback((npcId: string, personality: string) => {
        this.trackClarity('npc_interaction', { npcId, personality })
        if (typeof window !== 'undefined' && (window as any).openChat) {
          ;(window as any).openChat(npcId, personality)
        }
      })

      // Listen for chat closed event
      if (typeof window !== 'undefined') {
        window.addEventListener('chatClosed', ((event: CustomEvent) => {
          this.npcManager.endInteraction(event.detail.npcId)
        }) as EventListener)
      }
      
      this.setupCamera()
      this.createMinimap()
      this.scale.on('resize', this.handleResize, this)

      // Track tile clicks
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2
        const tileX = this.map.worldToTileX(worldPoint.x)
        const tileY = this.map.worldToTileY(worldPoint.y)
        this.trackClarity('tile_click', { x: tileX, y: tileY })
      })
    } catch (error) {
      console.error('Error during game initialization:', error)
    }
  }

  update() {
    this.playerManager.update()
    this.npcManager.update(this.time.now)
    this.updateMinimap()
  }

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
    
    // Create layers in proper rendering order (bottom to top)
    this.groundLayer = this.map.createLayer('ground', this.tilesets, 0, 0)!
    this.wallLayer = this.map.createLayer('wall', this.tilesets, 0, 0)!
    this.levelLayer = this.map.createLayer('item', this.tilesets, 0, 0)!
    
    // Set up collision detection
    // Use the wall layer for solid collision
    this.wallLayer.setCollisionByExclusion([-1]) // Exclude empty tiles (-1) from collision
    
    // Also check for collision properties on the item layer
    this.levelLayer.setCollisionByProperty({ collides: true })
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)

    this.trackClarity('tilemap_created', {
      tilesetCount: this.tilesets.length,
      mapWidth: this.map.widthInPixels,
      mapHeight: this.map.heightInPixels
    })
  }

  private setupCamera() {
    const player = this.playerManager.getPlayer()
    this.cameras.main.startFollow(player)
    this.cameras.main.setZoom(2)
    this.cameras.main.roundPixels = true
    
    const bounds = this.physics.world.bounds
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height)
  }
  
  private handleResize() {
    this.cameras.main.setZoom(2)
    this.cameras.main.roundPixels = true
  }

  private createMinimap() {
    // Calculate position for bottom-left corner
    const minimapWidth = 250
    const minimapHeight = 180
    const padding = 15
    const x = padding
    const y = this.cameras.main.height - minimapHeight - padding
    
    // Create a minimap camera positioned in the bottom-right corner
    this.minimap = this.cameras.add(x, y, minimapWidth, minimapHeight)
    
    // Set minimap properties
    this.minimap.setZoom(0.15) // Zoom out to show more of the map
    this.minimap.setBackgroundColor('#1a1a1a') // Dark gray background
    this.minimap.setAlpha(0.9) // Slightly more opaque
    
    // Create a border for the minimap
    const borderGraphics = this.add.graphics()
    borderGraphics.lineStyle(2, 0x4a90e2, 1) // Blue border color consistent with UI
    borderGraphics.strokeRect(x, y, minimapWidth, minimapHeight)
    
    // Set the minimap to follow the player
    const player = this.playerManager.getPlayer()
    this.minimap.startFollow(player)
    
    // Set bounds for the minimap camera
    const bounds = this.physics.world.bounds
    this.minimap.setBounds(bounds.x, bounds.y, bounds.width, bounds.height)
    
    // Only show specific layers in the minimap for better visibility
    this.minimap.ignore([this.groundLayer]) // Hide ground layer in minimap
  }

  private updateMinimap() {
    // Update minimap position to follow player
    const player = this.playerManager.getPlayer()
    if (player && this.minimap) {
      // The minimap will automatically follow the player due to startFollow()
      // You can add additional minimap logic here if needed
    }
  }

  private trackClarity(eventName: string, tags?: Record<string, string | number | boolean | undefined | null>) {
    if (typeof window === 'undefined') return
    const w = window as any
    w.clarity = w.clarity || function() {
      (w.clarity.q = w.clarity.q || []).push(arguments)
    }
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          w.clarity('set', key, String(value))
        }
      })
    }
    w.clarity('event', eventName)
  }
} 