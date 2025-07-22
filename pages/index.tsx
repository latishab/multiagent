import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import UIOverlay from '../components/UIOverlay'

// Create a separate Game component
const GameComponent = dynamic(() => import('../components/GameComponent'), {
  ssr: false
})

export default function Home() {
  return (
    <div className="relative w-screen h-screen">
      <GameComponent />
      <UIOverlay />
    </div>
  )
} 