import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Users, Upload, Settings, X, Play, ChevronLeft, ChevronRight, Home, User } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { useDialogStore } from '../store/useDialogStore'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { api } from '../lib/api'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { userProfile, signOut } = useAuthStore()
  const { playSong } = usePlayerStore()
  const { showAlert, showConfirm } = useDialogStore()

  const [query, setQuery] = useState('')
  const [allSongs, setAllSongs] = useState([])
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileModalOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadAllSongs = async () => {
    if (allSongs.length > 0) return
    setSearching(true)
    try {
      const data = await api.searchSongs('')
      setAllSongs(data)
      setResults(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (!dropdownOpen) return
    const q = query.trim().toLowerCase()
    if (!q) {
      setResults(allSongs)
      return
    }
    setResults(allSongs.filter(s =>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    ))
    setSelectedIdx(-1)
  }, [query, allSongs, dropdownOpen])

  const handleInputChange = (e) => {
    setQuery(e.target.value)
    setDropdownOpen(true)
    setSelectedIdx(-1)
    // Onboarding: mark search action as complete when user types
    if (e.target.value.trim().length >= 2) {
      useOnboardingStore.getState().completeAction('search')
    }
  }

  const handleFocus = () => {
    setDropdownOpen(true)
    loadAllSongs()
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setDropdownOpen(false)
    inputRef.current?.focus()
  }

  const handlePlay = (song) => {
    playSong(song, results)
    setDropdownOpen(false)
    // Onboarding: mark play action complete
    useOnboardingStore.getState().completeAction('play-song')
  }

  const handleKeyDown = (e) => {
    if (!dropdownOpen || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault()
      handlePlay(results[selectedIdx])
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = await showConfirm(
      'Esta ação é permanente e não pode ser desfeita. Todos os seus dados serão removidos.',
      { title: 'Excluir conta', confirmText: 'Excluir', destructive: true }
    )
    if (!confirmed) return
    try {
      await api.deleteAccount()
      signOut()
    } catch (err) {
      await showAlert(err.message, { title: 'Erro', icon: 'error' })
    }
  }

  // Avatar: foto se existir, senão inicial do nome/email
  const avatarLetter = (userProfile?.display_name || userProfile?.email || 'Y')[0].toUpperCase()
  const displayName = userProfile?.display_name || 'Usuário'

  return (
    <div className="h-16 flex items-center justify-between px-4 shrink-0 bg-spotify-base">
      {/* Left: Logo + Nav arrows */}
      <div className="flex items-center gap-3">
        <Link to="/" className="hover:scale-105 transition-transform shrink-0">
          <img src="/yoursound.svg" alt="YourSound" className="w-8 h-8" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-[480px] mx-6 relative" ref={searchRef} data-onboarding="search-input">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="w-11 h-11 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center shrink-0 transition-colors group"
            title="Início"
          >
            <Home size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
          </Link>

          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={16} className="text-zinc-500" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder="O que você quer ouvir?"
              className="w-full pl-11 pr-10 py-2.5 bg-zinc-900 hover:bg-zinc-800 focus:bg-zinc-800 border border-transparent focus:border-zinc-700 text-white rounded-full text-sm font-medium transition-colors outline-none placeholder:text-zinc-500"
            />
            {query && (
              <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Search Dropdown */}
        {dropdownOpen && (
          <div className="absolute top-full left-[52px] right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[420px] flex flex-col" data-onboarding="search-results">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 text-zinc-600 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">&uarr;</kbd>
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">&darr;</kbd>
                </div>
                <span>Navegar</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">Enter</kbd>
                <span>Tocar</span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {searching ? (
                <div className="px-4 py-6 text-center text-zinc-600 text-sm">Buscando...</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-6 text-center text-zinc-600 text-sm">
                  {query ? `Nenhum resultado para "${query}"` : 'Nenhuma música encontrada'}
                </div>
              ) : (
                results.map((song, idx) => (
                  <button
                    key={song.id}
                    onClick={() => handlePlay(song)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === selectedIdx ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'
                    }`}
                  >
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Search size={14} className="text-zinc-600" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-white truncate">{song.title}</span>
                      <span className="text-xs text-zinc-500 truncate">Música · {song.artist}</span>
                    </div>
                    <Play size={13} className={`text-zinc-500 shrink-0 ${idx === selectedIdx ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-1 relative" ref={profileRef}>
        <Link to="/upload" className="text-zinc-500 hover:text-white transition p-2 rounded-full hover:bg-zinc-900 hidden sm:flex" title="Enviar música">
          <Upload size={18} />
        </Link>

        {userProfile?.role === 'admin' && (
          <Link to="/admin" className="text-zinc-500 hover:text-white transition p-2 rounded-full hover:bg-zinc-900 hidden sm:flex" title="Admin">
            <Settings size={18} />
          </Link>
        )}

        <button
          onClick={() => setProfileModalOpen(!profileModalOpen)}
          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-black hover:scale-105 transition-transform ml-1 shadow-md"
          style={{ background: userProfile?.avatar_url ? 'transparent' : '#1ED45E' }}
          title="Conta"
          data-onboarding="profile-button"
        >
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            avatarLetter
          )}
        </button>

        {/* Profile Modal */}
        {profileModalOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-1.5 text-sm overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-black shrink-0"
                style={{ background: userProfile?.avatar_url ? 'transparent' : '#1ED45E' }}
              >
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  avatarLetter
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white font-semibold text-sm truncate leading-tight">{displayName}</span>
                <span className="text-zinc-500 text-xs truncate">{userProfile?.email}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <Link
                to="/profile"
                onClick={() => setProfileModalOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-white"
              >
                <User size={15} className="text-zinc-400" />
                <span>Perfil</span>
              </Link>
            </div>

            <div className="h-px bg-zinc-800 mx-3 my-1" />

            <div className="py-1">
              <button
                onClick={signOut}
                className="w-full flex items-center px-4 py-2.5 hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white"
              >
                Sair
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full flex items-center px-4 py-2.5 hover:bg-red-500/10 transition-colors text-red-500 text-xs"
              >
                Excluir Conta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
