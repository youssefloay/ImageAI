import { UserButton } from '@clerk/nextjs'
import React from 'react'

function Home() {
  return (
    <div>
      <p>Home</p>
      <UserButton afterSwitchSessionUrl='/'/>  {/* Updated for fallback redirect */}
    </div>
  )
}

export default Home