import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { api } from '../lib/api'
import { Play, Pause, Shuffle, Download, UserPlus, MoreHorizontal, Clock, Search, Plus, Trash2, ListMusic, List, Heart } from 'lucide-react'
import { useLikeStore } from '../store/useLikeStore'

export default function PlaylistDetails() {
  const { id } = useParams()
  const { user, userProfile } = useAuthStore()
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayerStore()
  const { isLiked, toggleLike } = useLikeStore()

  const [playlist, setPlaylist] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => {
    fetchPlaylistData()
  }, [id])

  const fetchPlaylistData = async () => {
    try {
      setLoading(true)
      const data = await api.getPlaylist(id)
      setPlaylist(data.playlist)
      setSongs(data.songs)
    } catch (err) {
      console.error("Erro ao carregar playlist:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    const q = e.target.value
    setSearchQuery(q)

    if (q.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const data = await api.searchSongs(q)
      const existingIds = songs.map(s => s.id)
      setSearchResults(data.filter(s => !existingIds.includes(s.id)))
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const addSongToPlaylist = async (song) => {
    try {
      const data = await api.addSongToPlaylist(id, song.id)
      setSongs([{ ...song, playlist_song_id: data.id }, ...songs])
      setSearchResults(searchResults.filter(s => s.id !== song.id))
    } catch (err) {
      console.error("Erro ao adicionar:", err.message)
    }
  }

  const removeSong = async (playlistSongId) => {
    try {
      await api.removeSongFromPlaylist(id, playlistSongId)
      setSongs(songs.filter(s => s.playlist_song_id !== playlistSongId))
    } catch (err) {
      console.error(err)
    }
  }

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs)
    }
  }

  const isCurrentlyPlaying = (song) => {
    return currentSong?.id === song.id && isPlaying
  }

  const handleRowClick = (song) => {
    if (currentSong?.id === song.id) {
      togglePlay()
    } else {
      playSong(song, songs)
    }
  }

  const formatTime = (seconds) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-sm">Carregando playlist...</div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-sm">Playlist não encontrada.</div>
      </div>
    )
  }

  const isOwner = playlist.user_id === user?.id
  const username = userProfile?.email?.split('@')[0] || 'Usuário'
  const coverUrl = songs.length > 0 ? songs[0].cover_url : null

  return (
    <div className="pb-8">
      {/* ─── Gradient Header ─── */}
      <div
        className="px-6 pt-12 pb-6 flex items-end gap-6"
        style={{
          background: 'linear-gradient(to bottom, #5a4a28 0%, #3a3218 50%, #121212 100%)'
        }}
      >
        {/* Cover Art */}
        <div className="w-[230px] h-[230px] bg-zinc-800 rounded shadow-2xl shrink-0 overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900">
              <ListMusic size={64} className="text-zinc-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2 min-w-0 pb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Playlist</span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-none truncate">
            {playlist.name}
          </h1>
          <div className="flex items-center gap-1 text-sm mt-2">
            <span className="font-bold text-white hover:underline cursor-pointer">{username}</span>
            <span className="text-zinc-300">&bull;</span>
            <span className="text-zinc-300">{songs.length} música{songs.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* ─── Actions Bar ─── */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Play Button */}
          <button
            onClick={handlePlayAll}
            disabled={songs.length === 0}
            className="w-14 h-14 bg-spotify-green rounded-full flex items-center justify-center hover:scale-105 hover:bg-spotify-green-hover transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          >
            <Play fill="black" stroke="none" size={24} className="ml-0.5" />
          </button>
          <button className="text-zinc-400 hover:text-white transition p-2">
            <Shuffle size={22} />
          </button>
          <button className="text-zinc-400 hover:text-white transition p-2">
            <Download size={22} />
          </button>
          <button className="text-zinc-400 hover:text-white transition p-2">
            <UserPlus size={22} />
          </button>
          <button className="text-zinc-400 hover:text-white transition p-2">
            <MoreHorizontal size={22} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="text-sm font-medium">Lista</span>
          <List size={18} />
        </div>
      </div>

      {/* ─── Song Table ─── */}
      <div className="px-6">
        {songs.length === 0 ? (
          <div className="text-zinc-500 py-16 text-center border border-dashed border-white/5 rounded-lg">
            <p className="text-base mb-2">Esta playlist está vazia.</p>
            {isOwner && (
              <button
                onClick={() => setShowSearch(true)}
                className="text-white font-semibold hover:underline"
              >
                Pesquise e adicione músicas
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_1fr_40px_60px] items-center px-4 py-2 border-b border-white/10 text-zinc-400 text-xs uppercase tracking-wider font-medium mb-2">
              <span className="text-center">#</span>
              <span>Título</span>
              <span className="hidden md:block">Artista</span>
              <span></span>
              <span className="flex justify-end">
                <Clock size={14} />
              </span>
            </div>

            {/* Song Rows */}
            {songs.map((song, idx) => {
              const isActive = currentSong?.id === song.id
              const playing = isActive && isPlaying
              const hovered = hoveredRow === idx

              return (
                <div
                  key={song.playlist_song_id}
                  className={`group grid grid-cols-[40px_1fr_1fr_40px_60px] items-center px-4 py-1.5 rounded-md transition-colors cursor-pointer ${
                    isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'
                  }`}
                  onMouseEnter={() => setHoveredRow(idx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => handleRowClick(song)}
                >
                  {/* # / Play icon */}
                  <div className="flex items-center justify-center w-6 h-6">
                    {hovered ? (
                      playing ? (
                        <Pause size={14} fill="white" stroke="none" />
                      ) : (
                        <Play size={14} fill="white" stroke="none" className="ml-0.5" />
                      )
                    ) : isActive ? (
                      <div className="flex items-end gap-[2px] h-3">
                        <span className="w-[3px] bg-spotify-green rounded-full animate-pulse" style={{ height: '60%' }} />
                        <span className="w-[3px] bg-spotify-green rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                        <span className="w-[3px] bg-spotify-green rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.3s' }} />
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 font-medium">{idx + 1}</span>
                    )}
                  </div>

                  {/* Title + Cover */}
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {song.cover_url ? (
                      <img src={song.cover_url} className="w-10 h-10 rounded object-cover shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500 text-xs">&#9835;</div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className={`font-medium truncate text-sm ${isActive ? 'text-spotify-green' : 'text-white'}`}>
                        {song.title}
                      </span>
                      <span className="text-xs text-zinc-400 truncate md:hidden">{song.artist}</span>
                    </div>
                  </div>

                  {/* Artist */}
                  <span className="text-sm text-zinc-400 truncate hidden md:block hover:underline hover:text-white transition-colors">
                    {song.artist}
                  </span>

                  {/* Like */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(song) }}
                      className={`transition-all hover:scale-110 ${
                        isLiked(song.id) ? 'text-spotify-green opacity-100' : 'text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100'
                      } ${isLiked(song.id) ? '!opacity-100' : ''}`}
                    >
                      <Heart size={14} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Duration / Remove */}
                  <div className="flex items-center justify-end gap-2">
                    {isOwner && hovered ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSong(song.playlist_song_id) }}
                        className="text-zinc-400 hover:text-red-400 transition p-1"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span className="text-sm text-zinc-400">{formatTime(song.duration)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* ─── Add Songs Section (Owner only) ─── */}
      {isOwner && (
        <div className="px-6 mt-10">
          {!showSearch && songs.length > 0 && (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-semibold transition"
            >
              <Plus size={18} /> Adicionar músicas
            </button>
          )}

          {showSearch && (
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Vamos adicionar algo à sua playlist</h3>
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}
                  className="text-zinc-400 hover:text-white text-sm font-semibold"
                >
                  Fechar
                </button>
              </div>

              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Pesquisar músicas"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.07] border border-white/10 rounded text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-zinc-500"
                />
              </div>

              {searchQuery.length > 0 && (
                <div className="mt-4 space-y-1">
                  {searching ? (
                    <div className="py-4 text-center text-zinc-500 text-sm">Buscando...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-4 text-center text-zinc-500 text-sm">Nenhum resultado encontrado.</div>
                  ) : (
                    searchResults.map(song => (
                      <div key={song.id} className="flex items-center justify-between p-2 rounded hover:bg-white/[0.06] transition">
                        <div className="flex items-center gap-3 min-w-0">
                          {song.cover_url ? (
                            <img src={song.cover_url} className="w-10 h-10 rounded object-cover shrink-0" alt="" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500 text-xs">&#9835;</div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-white truncate">{song.title}</span>
                            <span className="text-xs text-zinc-400 truncate">{song.artist}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => addSongToPlaylist(song)}
                          className="px-4 py-1.5 border border-white/20 rounded-full text-sm font-semibold text-white hover:border-white hover:scale-105 transition shrink-0 ml-4"
                        >
                          Adicionar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
