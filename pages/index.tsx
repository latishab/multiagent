import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Head from 'next/head'

// Dynamically import the game component to avoid SSR issues with Phaser
const GameComponent = dynamic(() => import('../components/GameComponent'), {
  ssr: false
})

export default function Home() {
  return (
    <>
      <Head>
        <title>Farming Game</title>
        <meta name="description" content="A Harvest Moon style farming game" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main style={{ margin: 0, padding: 0, background: '#2c5f2d' }}>
        <GameComponent />
      </main>
    </>
  )
} 