import { useState, useCallback, useRef, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import RightPanel from '../components/RightPanel'
import Player from '../components/Player'
import MobileNav from '../components/MobileNav'
import MobileUploadPanel from '../components/MobileUploadPanel'
import LyricsOverlay from '../components/LyricsOverlay'
import { usePlayerStore } from '../store/usePlayerStore'

const MIN_SIDEBAR = 200
const MAX_SIDEBAR = 500
const MIN_RIGHT = 200
const MAX_RIGHT = 500

export default function MainLayout() {
  const { isLyricsOpen, toggleLyrics, currentSong } = usePlayerStore()
  const [leftWidth, setLeftWidth] = useState(300)
  const [rightWidth, setRightWidth] = useState(300)
  const [dragging, setDragging] = useState(null) // 'left' | 'right' | null
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false)
      setLeftWidth(300)
    } else {
      setIsSidebarCollapsed(true)
      setLeftWidth(72)
    }
  }

  const handleMouseDown = useCallback((side) => (e) => {
    e.preventDefault()
    if (side === 'left' && isSidebarCollapsed) return
    setDragging(side)

    const startX = e.clientX
    const startWidth = side === 'left' ? leftWidth : rightWidth

    const onMouseMove = (e) => {
      const delta = side === 'left'
        ? e.clientX - startX
        : startX - e.clientX

      const newWidth = Math.min(
        side === 'left' ? MAX_SIDEBAR : MAX_RIGHT,
        Math.max(side === 'left' ? MIN_SIDEBAR : MIN_RIGHT, startWidth + delta)
      )

      if (side === 'left') {
        if (newWidth <= MIN_SIDEBAR && delta < -20 && !isSidebarCollapsed) {
          // Future enhancement: auto collapse on drag too far left
        }
        setLeftWidth(newWidth)
      } else {
        setRightWidth(newWidth)
      }
    }

    const onMouseUp = () => {
      setDragging(null)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [leftWidth, rightWidth, isSidebarCollapsed])

  return (
    <div className="flex flex-col h-screen bg-spotify-base text-white overflow-hidden font-sans text-sm select-none">
      {/* Full-width Navbar - Hidden on Mobile */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Content Area */}
      <div ref={containerRef} className="flex flex-1 min-h-0 px-0 lg:px-2 pb-0 lg:pb-2 overflow-hidden">
        {/* Left Sidebar - Hidden on Mobile */}
        <div className="hidden lg:flex shrink-0 flex-col gap-0 transition-all duration-300 ease-in-out" style={{ width: leftWidth }}>
          <Sidebar collapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
        </div>

        {/* Left resize handle / Spacing - Hidden on Mobile */}
        <div className="hidden lg:flex">
          {isSidebarCollapsed ? (
            <div className="w-2 shrink-0 flex items-center justify-center z-10"></div>
          ) : (
            <div
              className="w-2 shrink-0 cursor-col-resize flex items-center justify-center group z-10"
              onMouseDown={handleMouseDown('left')}
            >
              <div className={`w-[3px] h-8 rounded-full transition-colors ${dragging === 'left' ? 'bg-white/40' : 'bg-transparent group-hover:bg-white/20'}`} />
            </div>
          )}
        </div>

        {/* Center Content */}
        <main className="flex-1 lg:rounded-lg overflow-hidden min-w-0 relative">
          {/* Normal page content */}
          <div className={`h-full overflow-y-auto custom-scrollbar bg-spotify-panel ${isLyricsOpen && currentSong ? 'lg:hidden' : ''} ${currentSong && isMobile ? 'pb-[80px]' : ''}`}>
            <Outlet />
          </div>
          {/* Lyrics replaces center content (Desktop) or overlays (Mobile handled in CSS/Portal if needed, but here it's fine since it's absolute) */}
          {isLyricsOpen && currentSong && (
            <LyricsOverlay />
          )}
        </main>

        {/* Right resize handle - Hidden on Mobile */}
        <div
          className="w-2 shrink-0 cursor-col-resize items-center justify-center group z-10 hidden xl:flex"
          onMouseDown={handleMouseDown('right')}
        >
          <div className={`w-[3px] h-8 rounded-full transition-colors ${dragging === 'right' ? 'bg-white/40' : 'bg-transparent group-hover:bg-white/20'}`} />
        </div>

        {/* Right Panel - Hidden on Mobile */}
        <div
          className="shrink-0 bg-spotify-panel rounded-lg overflow-y-auto custom-scrollbar hidden xl:block"
          style={{ width: rightWidth }}
        >
          <RightPanel />
        </div>
      </div>

      {/* Player Section - JS Conditional to prevent duplicate audio */}
      {isMobile ? (
        /* Mobile Player (Mini Player) */
        <div 
          className="absolute left-2 right-2 z-40"
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
        >
           <Player isMobile={true} />
        </div>
      ) : (
        /* Desktop Player */
        <div className="h-20 shrink-0 w-full px-2 py-2">
          <Player />
        </div>
      )}

      {/* Mobile Navigation Bar - Glassmorphism + iOS Safe Area */}
      <div 
        className="block lg:hidden shrink-0 bg-[#121212]/90 backdrop-blur-xl border-t border-white/5 relative z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', minHeight: '64px' }}
      >
         <MobileNav onAddClick={() => setUploadPanelOpen(true)} />
      </div>

      <MobileUploadPanel 
        isOpen={uploadPanelOpen} 
        onClose={() => setUploadPanelOpen(false)} 
      />
    </div>
  )
}
