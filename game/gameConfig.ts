import { Types } from 'phaser'
import MainScene from './scenes/MainScene'

export const gameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#000000',
  scene: MainScene,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%'
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  }
} 