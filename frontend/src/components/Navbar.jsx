import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Music, Bell, Users, Download, ChevronLeft, ChevronRight, Upload, Settings, X, Play, Edit2, Home } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { api } from '../lib/api'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { userProfile, signOut } = useAuthStore()
  const { playSong } = usePlayerStore()

  const [query, setQuery] = useState('')
  const [allSongs, setAllSongs] = useState([])
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  
  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)
  const profileRef = useRef(null)

  // Close dropdowns on outside click
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

  // Load all songs when search opens, filter locally
  const loadAllSongs = async () => {
    if (allSongs.length > 0) return // already loaded
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

  // Filter locally as user types
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
    if (window.confirm('Tem certeza que deseja excluir sua conta? Esta ação é irreversível.')) {
      try {
        await api.deleteAccount()
        signOut()
      } catch (err) {
        alert(err.message)
      }
    }
  }

  return (
    <div className="h-16 flex items-center justify-between px-4 shrink-0 bg-spotify-base">
      {/* Left: Logo + Nav arrows */}
      <div className="flex items-center gap-3">
        <Link to="/" className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shrink-0">
          <Music size={16} className="text-black" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Center: Search with dropdown */}
      <div className="flex-1 max-w-[480px] mx-6 relative" ref={searchRef}>
        <div className="flex items-center gap-2">
          {/* Home Button */}
          <Link
            to="/"
            className="w-11 h-11 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] flex items-center justify-center shrink-0 transition-colors group"
            title="Início"
          >
            <Home size={22} className="text-zinc-400 group-hover:text-white transition-colors" />
          </Link>

          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-zinc-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder="O que você quer ouvir?"
              className="w-full pl-11 pr-12 py-2.5 bg-white/[0.07] hover:bg-white/[0.12] focus:bg-white/[0.12] border border-transparent focus:border-white/20 focus:ring-1 focus:ring-white/20 text-white rounded-full text-sm font-medium transition-colors outline-none placeholder:text-zinc-400"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
              {query && (
                <button onClick={clearSearch} className="text-zinc-400 hover:text-white transition p-0.5">
                  <X size={16} />
                </button>
              )}
              <div className="h-5 w-px bg-white/10"></div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <line x1="4" y1="10" x2="20" y2="10" />
                <line x1="10" y1="4" x2="10" y2="10" />
              </svg>
            </div>
          </div>
        </div>

        {/* Search Dropdown */}
        {dropdownOpen && (
          <div className="absolute top-full left-[52px] right-0 mt-2 bg-[#282828] rounded-lg shadow-2xl overflow-hidden z-50 max-h-[420px] flex flex-col">
            {/* Navigation hint */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 text-zinc-500 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">&uarr;</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">&darr;</kbd>
                </div>
                <span>Navegar</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Enter</kbd>
                <span>Tocar</span>
              </div>
            </div>

            {/* Results */}
            <div className="overflow-y-auto custom-scrollbar flex-1">
              {searching ? (
                <div className="px-4 py-6 text-center text-zinc-500 text-sm">Buscando...</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                  {query ? `Nenhum resultado para "${query}"` : 'Nenhuma música encontrada'}
                </div>
              ) : (
                results.map((song, idx) => (
                  <button
                    key={song.id}
                    onClick={() => handlePlay(song)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === selectedIdx ? 'bg-white/[0.12]' : 'hover:bg-white/[0.07]'
                    }`}
                  >
                    {/* Cover */}
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-zinc-700 flex items-center justify-center shrink-0">
                        <Search size={16} className="text-zinc-500" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-white truncate">{song.title}</span>
                      <span className="text-xs text-zinc-400 truncate">Música &bull; {song.artist}</span>
                    </div>

                    {/* Play hint on hover/select */}
                    <Play size={14} className={`text-zinc-500 shrink-0 ${idx === selectedIdx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-2 relative" ref={profileRef}>

        <Link to="/upload" className="text-zinc-400 hover:text-white transition p-2 rounded-full hover:bg-white/[0.07] hidden sm:flex">
          <Upload size={18} />
        </Link>

        {userProfile?.role === 'admin' && (
          <Link to="/admin" className="text-indigo-400 hover:text-indigo-300 transition p-2 rounded-full hover:bg-white/[0.07] hidden sm:flex">
            <Settings size={18} />
          </Link>
        )}

        <button className="text-zinc-400 hover:text-white transition p-2 rounded-full hover:bg-white/[0.07]">
          <Users size={18} />
        </button>

        <button
          onClick={() => setProfileModalOpen(!profileModalOpen)}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center text-xs font-bold text-white hover:scale-105 transition shadow-lg border-2 border-transparent hover:border-white/30"
          title="Conta"
        >
          {userProfile?.email ? userProfile.email[0].toUpperCase() : 'Y'}
        </button>

        {/* Profile Modal */}
        {profileModalOpen && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-[#282828] rounded-lg shadow-2xl py-1 text-sm overflow-hidden z-50 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center text-lg font-bold text-white shadow-inner">
                  {userProfile?.email ? userProfile.email[0].toUpperCase() : 'Y'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-bold truncate leading-tight">
                    {userProfile?.username || userProfile?.email?.split('@')[0] || 'Usuário'}
                  </span>
                  <span className="text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                    Conta {userProfile?.role === 'admin' ? 'Premium (Admin)' : 'Free'}
                  </span>
                </div>
              </div>
            </div>

            <div className="py-1">
              <Link to="/profile" className="flex items-center justify-between px-4 py-2 hover:bg-white/[0.07] transition-colors text-white group">
                <span>Perfil</span>
                <ChevronRight size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
              </Link>
              <button 
                onClick={() => { /* Opções de edição de nome poderiam ser aqui */ }}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/[0.07] transition-colors text-white group cursor-default"
              >
                <span>Editar Informações</span>
                <Edit2 size={14} className="text-zinc-500" />
              </button>
            </div>

            <div className="h-px bg-white/5 mx-2 my-1"></div>

            <div className="py-1">
              <button 
                onClick={signOut}
                className="w-full flex items-center px-4 py-2 hover:bg-red-500/10 transition-colors text-white"
              >
                Sair
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="w-full flex items-center px-4 py-2 hover:bg-red-500/10 transition-colors text-red-500 text-xs"
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
