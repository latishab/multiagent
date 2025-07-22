import { Scene } from 'phaser'
import { PlayerManager } from '../managers/PlayerManager'
import { NPCManager } from '../managers/NPCManager'

export default class MainScene extends Scene {
  // Map properties
  private map!: Phaser.Tilemaps.Tilemap
  private groundLayer!: Phaser.Tilemaps.TilemapLayer
  private levelLayer!: Phaser.Tilemaps.TilemapLayer
  private tilesets!: Phaser.Tilemaps.Tileset[]
  
  // Managers
  private playerManager!: PlayerManager
  private npcManager!: NPCManager

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
    
    // Initialize managers
    this.playerManager = new PlayerManager(this)
    this.npcManager = new NPCManager(this)
    
    // Create player and NPCs
    this.playerManager.createPlayerAnimations()
    const player = this.playerManager.createPlayer(
      this.map.widthInPixels / 2,
      this.map.heightInPixels / 2,
      this.levelLayer
    )
    
    // Spawn NPCs
    this.npcManager.spawnNPCsInCircle(
      this.map.widthInPixels,
      this.map.heightInPixels,
      this.levelLayer,
      player
    )
    
    // Setup NPC chat interaction
    this.npcManager.setInteractionCallback((npcId: number, personality: string) => {
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
    this.scale.on('resize', this.handleResize, this)
  }

  update() {
    this.playerManager.update()
    this.npcManager.update(this.time.now)
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
    
    this.groundLayer = this.map.createLayer('ground', this.tilesets, 0, 0)!
    this.levelLayer = this.map.createLayer('item', this.tilesets, 0, 0)!
    
    this.levelLayer.setCollisionByProperty({ collides: true })
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
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

  public setSelectedSlot(slot: number) {
    this.selectedSlot = slot
  }
} 