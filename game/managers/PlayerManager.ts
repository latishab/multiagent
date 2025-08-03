import { Scene } from 'phaser'

export class PlayerManager {
  private scene: Scene
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: any
  private lastDirection: string = 'down'
  private selectedSlot: number = 0
  private inventory: Array<string | null> = new Array(25).fill(null)

  constructor(scene: Scene) {
    this.scene = scene
    this.setupControls()
  }

  createPlayerAnimations() {
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

  createPlayer(x: number, y: number, levelLayer: Phaser.Tilemaps.TilemapLayer) {
    this.player = this.scene.physics.add.sprite(x, y, 'playerIdle', 0)
    this.player.setName('player')
    this.player.setCollideWorldBounds(true)
    this.player.setScale(2.0) // Match NPC scale
    this.player.setSize(16, 16)
    this.player.setOffset(8, 16)
    
    this.player.play('idle-down')
    
    this.scene.physics.add.collider(this.player, levelLayer)

    return this.player
  }

  setupControls() {
    if (!this.scene.input.keyboard) {
      throw new Error('Keyboard input not available')
    }
    this.cursors = this.scene.input.keyboard.createCursorKeys()
    this.wasd = this.scene.input.keyboard.addKeys('W,S,A,D')
  }

  update() {
    if (!this.player) return

    const speed = 150
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
      if (this.scene.anims.exists(currentAnimation)) {
        if (this.player.anims.currentAnim?.key !== currentAnimation) {
          this.player.play(currentAnimation, true)
        }
      } else {
        console.warn(`Animation ${currentAnimation} does not exist, using fallback`)
        if (this.player.anims.currentAnim?.key !== 'idle-down') {
          this.player.play('idle-down', true)
        }
      }
    } catch (error) {
      console.error('Error playing animation:', error)
      this.player.setFrame(0)
    }
  }

  getPlayer() {
    return this.player
  }

  setSelectedSlot(slot: number) {
    this.selectedSlot = slot
  }

  getSelectedSlot() {
    return this.selectedSlot
  }

  getInventoryItem(slot: number) {
    return this.inventory[slot]
  }

  setInventoryItem(slot: number, item: string | null) {
    this.inventory[slot] = item
    // Emit event for UI update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inventoryUpdate', {
        detail: { slot, item }
      }))
    }
  }

  addToInventory(item: string) {
    // First try to add to selected slot if empty
    if (!this.inventory[this.selectedSlot]) {
      this.setInventoryItem(this.selectedSlot, item)
      return true
    }

    // Then try to find any empty slot
    const emptySlot = this.inventory.findIndex(slot => slot === null)
    if (emptySlot !== -1) {
      this.setInventoryItem(emptySlot, item)
      return true
    }

    return false
  }
} 