import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

const GameComponent = dynamic(() => import('../components/GameComponent'), {
  ssr: false
})

const UIOverlay = dynamic(() => import('../components/UIOverlay'), {
  ssr: false
})

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Game Canvas Container */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <GameComponent />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
        <UIOverlay gameInstance={null} />
      </div>

      <style jsx global>{`
        /* Ensure Phaser canvas doesn't overlap UI */
        canvas {
          z-index: 0 !important;
        }
      `}</style>
    </main>
  )
} 