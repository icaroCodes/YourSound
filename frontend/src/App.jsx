import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { useLikeStore } from './store/useLikeStore'
import { useDialogStore } from './store/useDialogStore'
import { useOnboardingStore } from './store/useOnboardingStore'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Upload from './pages/Upload'
import PlaylistDetails from './pages/PlaylistDetails'
import LikedSongs from './pages/LikedSongs'
import Admin from './pages/Admin'
import Profile from './pages/Profile'
import Search from './pages/Search'
import Dialog from './components/Dialog'

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
      {/* Navbar skeleton - Desktop Only */}
      <div className="hidden lg:flex h-16 items-center px-6 gap-4">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="w-8 h-8 rounded-full skeleton" />
        </div>
        <div className="flex-1 max-w-md">
          <div className="h-10 rounded-full skeleton" />
        </div>
        <div className="w-8 h-8 rounded-full skeleton ml-auto" />
      </div>

      {/* Mobile Header Skeleton */}
      <div className="lg:hidden h-16 flex items-center px-4 justify-between">
        <div className="h-7 w-24 skeleton" />
        <div className="h-8 w-8 rounded-full skeleton" />
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 lg:px-2 gap-2">
        {/* Sidebar skeleton - Desktop Only */}
        <div className="hidden lg:flex w-[300px] shrink-0 flex-col gap-2">
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
        <div className="flex-1 bg-[#121212] lg:rounded-lg p-4 lg:p-6 overflow-hidden">
          {/* Pills - Desktop Only */}
          <div className="hidden lg:flex gap-2 mb-6">
            <div className="h-8 w-16 rounded-full skeleton" />
            <div className="h-8 w-20 rounded-full skeleton" />
            <div className="h-8 w-20 rounded-full skeleton" />
          </div>

          <div className="space-y-8">
            <div className="h-7 w-48 skeleton mb-5" />

            {/* Grid for desktop, Scroll for mobile */}
            <div className="hidden lg:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3 p-4 rounded-lg bg-white/[0.02]">
                  <div className="aspect-square rounded-md skeleton" />
                  <div className="h-4 w-3/4 skeleton" />
                  <div className="h-3 w-1/2 skeleton" />
                </div>
              ))}
            </div>

            <div className="lg:hidden flex gap-4 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="shrink-0 w-[180px] space-y-3">
                  <div className="aspect-square rounded-[8px] skeleton" />
                  <div className="h-4 w-3/4 skeleton" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Player skeleton - Desktop Only appearance */}
      <div className="hidden lg:flex h-20 shrink-0 px-4 py-3 items-center">
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

      {/* Mobile Nav Placeholder */}
      <div className="lg:hidden h-16 shrink-0 bg-black/90 flex items-center justify-around px-4 border-t border-white/5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-8 h-8 rounded skeleton" />
        ))}
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
    if (session) {
      initLikes()

      // Mostrar aviso educacional na primeira vez
      const hasSeenDisclaimer = localStorage.getItem('yoursound_disclaimer_seen')
      if (!hasSeenDisclaimer) {
        useDialogStore.getState().showAlert(
          'Este é um projeto estritamente educacional. Toda responsabilidade pelo conteúdo publicado, importado ou reproduzido nesta plataforma é inteiramente do usuário. Não incentivamos nem apoiamos a pirataria de qualquer forma.',
          { title: 'Aviso de Responsabilidade', icon: 'info' }
        ).then(() => {
          localStorage.setItem('yoursound_disclaimer_seen', 'true')
          // Iniciar onboarding após o disclaimer no primeiro login
          const { isCompleted, isActive } = useOnboardingStore.getState()
          if (!isCompleted && !isActive) {
            setTimeout(() => useOnboardingStore.getState().start(), 500)
          }
        })
      }
    }
  }, [session, initLikes])

  if (isLoading) {
    return <AppSkeleton />
  }

  return (
    <>
      <Dialog />
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Home />} />
            <Route path="upload" element={<Upload />} />
            <Route path="search" element={<Search />} />
            <Route path="liked" element={<LikedSongs />} />
            <Route path="playlists/:id" element={<PlaylistDetails />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={
              <ProtectedRoute adminOnly={true}>
                <Admin />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </>
  )
}
