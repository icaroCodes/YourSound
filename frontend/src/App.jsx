import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { useLikeStore } from './store/useLikeStore'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Upload from './pages/Upload'
import Playlists from './pages/Playlists'
import PlaylistDetails from './pages/PlaylistDetails'
import LikedSongs from './pages/LikedSongs'
import Admin from './pages/Admin'

function ProtectedRoute({ children, adminOnly = false }) {
  const { session, userProfile, isLoading } = useAuthStore()
  
  if (isLoading) return null // MainLayout skeleton will show via AppSkeleton
  
  if (!session) return <Navigate to="/login" replace />
  
  if (adminOnly && userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  
  return children
}

function PublicRoute({ children }) {
  const { session, isLoading } = useAuthStore()
  
  if (isLoading) return null
  
  if (session) return <Navigate to="/" replace />
  
  return children
}

/* ─── Skeleton do Layout Completo ─── */
function AppSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* Navbar skeleton */}
      <div className="h-16 flex items-center px-6 gap-4">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="w-8 h-8 rounded-full skeleton" />
        </div>
        <div className="flex-1 max-w-md">
          <div className="h-10 rounded-full skeleton" />
        </div>
        <div className="w-8 h-8 rounded-full skeleton ml-auto" />
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 px-2 gap-2">
        {/* Sidebar skeleton */}
        <div className="w-[300px] shrink-0 flex flex-col gap-2">
          <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-5">
            <div className="h-4 w-16 skeleton" />
            <div className="h-4 w-14 skeleton" />
          </div>
          <div className="bg-[#121212] rounded-lg flex-1 p-4 flex flex-col gap-3">
            <div className="h-4 w-28 skeleton mb-2" />
            <div className="flex gap-2 mb-3">
              <div className="h-7 w-20 rounded-full skeleton" />
              <div className="h-7 w-16 rounded-full skeleton" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-12 h-12 rounded skeleton shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3.5 w-3/4 skeleton" />
                  <div className="h-3 w-1/2 skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 bg-[#121212] rounded-lg p-6 overflow-hidden">
          {/* Pills */}
          <div className="flex gap-2 mb-6">
            <div className="h-8 w-16 rounded-full skeleton" />
            <div className="h-8 w-20 rounded-full skeleton" />
            <div className="h-8 w-20 rounded-full skeleton" />
          </div>
          {/* Recent grid skeleton */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center bg-white/[0.03] rounded overflow-hidden h-16">
                <div className="w-16 h-16 skeleton shrink-0" style={{ borderRadius: 0 }} />
                <div className="px-4 flex-1">
                  <div className="h-3.5 w-3/4 skeleton" />
                </div>
              </div>
            ))}
          </div>
          {/* Section title */}
          <div className="h-6 w-48 skeleton mb-5" />
          {/* Cards grid */}
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col gap-3 p-4 rounded-lg bg-white/[0.02]">
                <div className="aspect-square rounded-md skeleton" />
                <div className="h-4 w-3/4 skeleton" />
                <div className="h-3 w-1/2 skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player skeleton */}
      <div className="h-20 shrink-0 px-4 py-3 flex items-center">
        <div className="w-[30%] flex items-center gap-3">
          <div className="w-14 h-14 rounded skeleton" />
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-24 skeleton" />
            <div className="h-3 w-16 skeleton" />
          </div>
        </div>
        <div className="w-[40%] flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full skeleton" />
            ))}
          </div>
          <div className="w-full h-1 rounded-full skeleton" />
        </div>
        <div className="w-[30%] flex justify-end gap-3">
          <div className="h-1 w-24 rounded-full skeleton self-center" />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { initialize, isLoading, session } = useAuthStore()
  const initLikes = useLikeStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (session) initLikes()
  }, [session, initLikes])

  if (isLoading) {
    return <AppSkeleton />
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="upload" element={<Upload />} />
          <Route path="search" element={<Home />} />
          <Route path="liked" element={<LikedSongs />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="playlists/:id" element={<PlaylistDetails />} />
          <Route path="admin" element={
            <ProtectedRoute adminOnly={true}>
              <Admin />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  )
}
