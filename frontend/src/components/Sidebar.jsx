import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Search, Library, Plus, ListMusic, Music2, Users, Folder, X, List, ChevronRight, Bell } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'
import { useLikeStore } from '../store/useLikeStore'
import { usePlayerStore } from '../store/usePlayerStore'

export default function Sidebar() {
  const { pathname } = useLocation()
  const { userProfile } = useAuthStore()
  const { likedSongs } = useLikeStore()
  const { playSong } = usePlayerStore()
  const [playlists, setPlaylists] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creating, setCreating] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    api.getPlaylists().then(setPlaylists).catch(console.error)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function handleCreatePlaylist(e) {
    e.preventDefault()
    if (!newPlaylistName.trim()) return
    setCreating(true)
    try {
      const created = await api.createPlaylist(newPlaylistName.trim())
      setPlaylists(prev => [...prev, created])
      setNewPlaylistName('')
      setCreateModalOpen(false)
      setMenuOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const filteredPlaylists = searchFilter
    ? playlists.filter(pl => pl.name.toLowerCase().includes(searchFilter.toLowerCase()))
    : playlists

  const username = userProfile?.email?.split('@')[0] || 'Usuário'

  return (
    <>
      {/* ─── Navigation Panel ─── */}
      <div className="bg-spotify-panel rounded-lg p-4 flex flex-col gap-4">
        <Link
          to="/"
          className={`flex items-center gap-4 font-bold text-sm transition-colors ${
            pathname === '/' ? 'text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Home size={24} strokeWidth={pathname === '/' ? 2.5 : 2} />
          <span>Início</span>
        </Link>
        <button
          onClick={() => {
            const searchInput = document.querySelector('input[placeholder="O que você quer ouvir?"]')
            if (searchInput) searchInput.focus()
          }}
          className="flex items-center gap-4 font-bold text-sm transition-colors text-zinc-400 hover:text-white w-full text-left"
        >
          <Search size={24} />
          <span>Buscar</span>
        </button>
      </div>

      {/* ─── Library Panel ─── */}
      <div className="bg-spotify-panel rounded-lg flex-1 flex flex-col min-h-0 mt-2">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <Library size={24} />
            <span className="font-bold text-sm">Sua Biblioteca</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setMenuOpen(o => !o); setCreateModalOpen(false) }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                title="Criar"
              >
                <Plus size={20} />
              </button>

              {menuOpen && (
                <div className="absolute left-0 top-9 z-50 w-64 bg-[#282828] rounded-lg shadow-2xl py-1 text-sm overflow-hidden">
                  {!createModalOpen ? (
                    <>
                      <button
                        onClick={() => setCreateModalOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                      >
                        <div className="w-9 h-9 bg-white/10 rounded flex items-center justify-center shrink-0">
                          <Music2 size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Playlist</p>
                          <p className="text-xs text-zinc-400 leading-tight">Crie uma playlist com músicas</p>
                        </div>
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left opacity-50 cursor-not-allowed">
                        <div className="w-9 h-9 bg-white/10 rounded flex items-center justify-center shrink-0">
                          <Users size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Match</p>
                          <p className="text-xs text-zinc-400 leading-tight">Junte os gostos da sua galera</p>
                        </div>
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left opacity-50 cursor-not-allowed">
                        <div className="w-9 h-9 bg-white/10 rounded flex items-center justify-center shrink-0">
                          <Folder size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Pasta</p>
                          <p className="text-xs text-zinc-400 leading-tight">Organize suas playlists</p>
                        </div>
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-white">Nova playlist</span>
                        <button onClick={() => setCreateModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                      <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={newPlaylistName}
                          onChange={e => setNewPlaylistName(e.target.value)}
                          placeholder="Nome da playlist"
                          maxLength={50}
                          className="bg-white/10 text-white placeholder-zinc-500 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 w-full"
                        />
                        <button
                          type="submit"
                          disabled={!newPlaylistName.trim() || creating}
                          className="bg-white text-black font-semibold rounded-full py-1.5 text-sm hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                        >
                          {creating ? 'Criando...' : 'Criar'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>

            {userProfile?.role === 'admin' && (
              <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-indigo-400 hover:text-indigo-300 relative" title="Notificações">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border border-zinc-900"></span>
              </button>
            )}

            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white" title="Mostrar mais">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap">Playlists</span>
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap">Artistas</span>
        </div>

        {/* Search + Recentes */}
        <div className="px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center">
            {searchOpen ? (
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  onBlur={() => { if (!searchFilter) setSearchOpen(false) }}
                  placeholder="Pesquisar na biblioteca"
                  className="bg-white/10 text-white placeholder-zinc-500 rounded pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-white/30 w-40"
                />
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="text-zinc-400 hover:text-white transition-colors p-1">
                <Search size={16} />
              </button>
            )}
          </div>
          <button className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors text-xs font-medium">
            Recentes <List size={14} />
          </button>
        </div>

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pt-1">
          {/* Músicas Curtidas */}
          <div
            className="flex items-center gap-3 p-2 rounded-md hover:bg-white/[0.07] transition-colors cursor-pointer"
            onClick={() => { if (likedSongs.length > 0) playSong(likedSongs[0], likedSongs) }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center rounded shadow shrink-0">
              <svg role="img" height="14" width="14" viewBox="0 0 16 16" fill="white"><path d="M15.724 4.22A4.313 4.313 0 0 0 12.192.814a4.269 4.269 0 0 0-3.622 1.13.837.837 0 0 1-1.14 0 4.272 4.272 0 0 0-6.21 5.855l5.916 7.05a1.128 1.128 0 0 0 1.727 0l5.916-7.05a4.228 4.228 0 0 0 .945-3.577z"></path></svg>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-white text-sm truncate">Músicas Curtidas</span>
              <span className="text-xs text-zinc-400 truncate">Playlist &bull; {likedSongs.length} música{likedSongs.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* User Playlists */}
          {filteredPlaylists.map(pl => (
            <Link key={pl.id} to={`/playlists/${pl.id}`} className="flex items-center gap-3 p-2 rounded-md hover:bg-white/[0.07] transition-colors">
              <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center rounded shadow shrink-0">
                <ListMusic size={18} className="text-zinc-500" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`font-semibold text-sm truncate ${pathname === `/playlists/${pl.id}` ? 'text-spotify-green' : 'text-white'}`}>{pl.name}</span>
                <span className="text-xs text-zinc-400 truncate">Playlist &bull; {username}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
