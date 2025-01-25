import React from 'react'
import Sidebar from './components/shared/Sidebar'

const Layout = ({ children }: {children: React.ReactNode}) => {
  return (
    <main className="root">
      <Sidebar/>
            {/*<MobileNav/>*/}

        <div className="root">
            <div className="root-container">
                <div className="wrapper">
                {children}
                </div>
            </div>

        </div>
        
      </main>
  )
}

export default Layout