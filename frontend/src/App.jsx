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
import Admin from './pages/Admin'

function ProtectedRoute({ children, adminOnly = false }) {
  const { session, userProfile, isLoading } = useAuthStore()
  
  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>
  
  if (!session) return <Navigate to="/login" replace />
  
  if (adminOnly && userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  
  return children
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
    return <div className="h-screen flex items-center justify-center bg-zinc-950 text-white">Carregando YourSound...</div>
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="upload" element={<Upload />} />
          <Route path="search" element={<Home />} />
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
