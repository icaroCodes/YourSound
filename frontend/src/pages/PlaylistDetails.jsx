import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { api } from '../lib/api'
import {
  Play, Pause, Shuffle, UserPlus, MoreHorizontal,
  Clock, Search, Plus, Trash2, ListMusic, List, Heart, Camera,
  Pencil, X, Check, Globe, Lock, GripVertical
} from 'lucide-react'
import { useLikeStore } from '../store/useLikeStore'
import PlayingBars from '../components/PlayingBars'
import { useDominantColor } from '../hooks/useDominantColor'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Helpers para persistir a ordem no localStorage ──────────────
function saveOrder(playlistId, ids) {
  try { localStorage.setItem(`ys_pl_order_${playlistId}`, JSON.stringify(ids)) } catch {}
}
function loadOrder(playlistId) {
  try { return JSON.parse(localStorage.getItem(`ys_pl_order_${playlistId}`)) || null } catch { return null }
}
function applyOrder(songs, savedIds) {
  if (!savedIds) return songs
  const map = Object.fromEntries(songs.map(s => [s.playlist_song_id, s]))
  const ordered = savedIds.map(id => map[id]).filter(Boolean)
  const rest = songs.filter(s => !savedIds.includes(s.playlist_song_id))
  return [...ordered, ...rest]
}

// ── Sortable Row Component ───────────────────────────────────────
function SortableSongRow({ song, idx, isActive, playing, isOwner, onRowClick, onRemove, onLike, isLiked, formatTime, formatAddedDate, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: selfDragging } = useSortable({ id: song.playlist_song_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: selfDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group grid grid-cols-[24px_40px_2fr_1.5fr_1.2fr_40px_60px] items-center px-4 py-1.5 rounded-md transition-colors cursor-pointer ${
        isActive ? 'bg-white/8' : 'hover:bg-white/6'
      } ${selfDragging ? 'opacity-30' : ''}`}
      onClick={() => onRowClick(song)}
    >
      {/* Drag Handle — only for owner */}
      <div
        className={`flex items-center justify-center ${isOwner ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity cursor-grab active:cursor-grabbing touch-none`}
        onClick={e => e.stopPropagation()}
        {...(isOwner ? { ...attributes, ...listeners } : {})}
      >
        <GripVertical size={14} className="text-zinc-500" />
      </div>

      {/* # / Play icon */}
      <div className="flex items-center justify-center w-6 h-6">
        {isActive ? (
          playing
            ? <Pause size={14} fill="white" stroke="none" />
            : <Play size={14} fill="white" stroke="none" className="ml-0.5" />
        ) : (
          <span className="text-sm text-zinc-400 font-medium group-hover:hidden">{idx + 1}</span>
        )}
        {!isActive && (
          <Play size={14} fill="white" stroke="none" className="ml-0.5 hidden group-hover:block" />
        )}
      </div>

      {/* Title + Cover + Artist */}
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
          <span className="text-xs text-zinc-400 truncate">{song.artist}</span>
        </div>
      </div>

      {/* Álbum */}
      <span className="text-sm text-zinc-400 truncate hidden md:block hover:underline hover:text-white transition-colors">
        {song.album || song.title}
      </span>

      {/* Adicionada em */}
      <span className="text-sm text-zinc-400 truncate hidden lg:block">
        {formatAddedDate(song.added_at)}
      </span>

      {/* Like */}
      <div className="flex items-center justify-center">
        <button
          onClick={e => { e.stopPropagation(); onLike(song) }}
          className={`transition-all hover:scale-110 ${
            isLiked(song.id)
              ? 'text-spotify-green opacity-100'
              : 'text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart size={14} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Duration / Remove */}
      <div className="flex items-center justify-end gap-2">
        {isOwner ? (
          <>
            <button
              onClick={e => { e.stopPropagation(); onRemove(song.playlist_song_id) }}
              className="text-zinc-400 hover:text-red-400 transition p-1 opacity-0 group-hover:opacity-100"
              title="Remover"
            >
              <Trash2 size={14} />
            </button>
            <span className="text-sm text-zinc-400 group-hover:hidden">{formatTime(song.duration)}</span>
          </>
        ) : (
          <span className="text-sm text-zinc-400">{formatTime(song.duration)}</span>
        )}
      </div>
    </div>
  )
}

export default function PlaylistDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, userProfile } = useAuthStore()
  const { playSong, currentSong, isPlaying, togglePlay, updateQueue } = usePlayerStore()
  const { isLiked, toggleLike } = useLikeStore()

  const [playlist, setPlaylist] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [allAvailableSongs, setAllAvailableSongs] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // Sync player queue if this playlist is currently active.
  // Uses store state directly (not closure) to avoid stale reads.
  const syncQueue = (newSongs) => {
    const { currentSong: cs, queue: q } = usePlayerStore.getState()
    const isActive = newSongs.some(s => s.id === cs?.id) ||
      (q.length > 0 && newSongs.length > 0 && q.some(s => newSongs.some(ps => ps.id === s.id)))
    if (isActive) updateQueue(newSongs)
  }

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    setSongs(prev => {
      const oldIdx = prev.findIndex(s => s.playlist_song_id === active.id)
      const newIdx = prev.findIndex(s => s.playlist_song_id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      saveOrder(id, next.map(s => s.playlist_song_id))
      syncQueue(next)
      return next
    })
  }

  const [uploadingCover, setUploadingCover] = useState(false)
  const coverInputRef = useRef(null)

  // Edit / Delete state
  const [menuOpen, setMenuOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef(null)
  const editInputRef = useRef(null)

  // Compute coverUrl early so the hook always runs (Rules of Hooks)
  const coverUrl = playlist?.cover_url || (songs.length > 0 ? songs[0]?.cover_url : null)
  const bannerColor = useDominantColor(coverUrl)

  useEffect(() => {
    fetchPlaylistData()
  }, [id])

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Focus edit input when modal opens
  useEffect(() => {
    if (editModalOpen) editInputRef.current?.focus()
  }, [editModalOpen])

  const fetchPlaylistData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getPlaylist(id)
      setPlaylist(data.playlist)
      setSongs(applyOrder(data.songs, loadOrder(id)))
    } catch (err) {
      setError(err.message || 'Erro ao carregar playlist.')
    } finally {
      setLoading(false)
    }
  }

  // ── Cover upload ──
  const handleCoverClick = () => {
    if (isOwner) coverInputRef.current?.click()
  }

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingCover(true)
      const data = await api.updatePlaylistCover(id, file)
      setPlaylist(prev => ({ ...prev, cover_url: data.cover_url }))
    } catch (err) {
      console.error('Erro ao enviar capa:', err.message)
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  // ── Edit modal ──
  const openEditModal = () => {
    setEditName(playlist.name)
    setEditDescription(playlist.description || '')
    setEditIsPublic(!!playlist.is_public)
    setEditModalOpen(true)
    setMenuOpen(false)
  }

  const savePlaylistDetails = async () => {
    const trimmedName = editName.trim()
    if (!trimmedName) return

    const fields = {}
    if (trimmedName !== playlist.name) fields.name = trimmedName
    if (editDescription.trim() !== (playlist.description || '')) fields.description = editDescription.trim()
    if (editIsPublic !== !!playlist.is_public) fields.is_public = editIsPublic

    if (Object.keys(fields).length === 0) {
      setEditModalOpen(false)
      return
    }

    try {
      setSavingEdit(true)
      const updated = await api.updatePlaylist(id, fields)
      setPlaylist(prev => ({ ...prev, ...updated }))
      setEditModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar:', err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); savePlaylistDetails() }
    if (e.key === 'Escape') setEditModalOpen(false)
  }

  // ── Delete playlist ──
  const handleDeletePlaylist = async () => {
    try {
      setDeleting(true)
      await api.deletePlaylist(id)
      navigate('/playlists', { replace: true })
    } catch (err) {
      console.error('Erro ao excluir:', err.message)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // ── Search / Songs ──
  const openSearch = async () => {
    setShowSearch(true)
    setSearchQuery('')
    setSearching(true)
    try {
      const data = await api.searchSongs('')
      const existingIds = songs.map(s => s.id)
      const available = data.filter(s => !existingIds.includes(s.id))
      setAllAvailableSongs(available)
      setSearchResults(available)
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const handleSearch = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    const lower = q.trim().toLowerCase()
    if (!lower) {
      setSearchResults(allAvailableSongs)
      return
    }
    setSearchResults(
      allAvailableSongs.filter(s =>
        s.title.toLowerCase().includes(lower) || s.artist.toLowerCase().includes(lower)
      )
    )
  }

  const addSongToPlaylist = async (song) => {
    try {
      const data = await api.addSongToPlaylist(id, song.id)
      const newSong = { ...song, playlist_song_id: data.id, added_at: new Date().toISOString() }
      const next = [...songs, newSong]
      setSongs(next)
      saveOrder(id, next.map(s => s.playlist_song_id))
      syncQueue(next)
      // Remove from both results and available pool so it doesn't reappear
      setSearchResults(prev => prev.filter(s => s.id !== song.id))
      setAllAvailableSongs(prev => prev.filter(s => s.id !== song.id))
    } catch (err) {
      console.error('Erro ao adicionar:', err.message)
    }
  }

  const removeSong = async (playlistSongId) => {
    try {
      await api.removeSongFromPlaylist(id, playlistSongId)
      const next = songs.filter(s => s.playlist_song_id !== playlistSongId)
      setSongs(next)
      saveOrder(id, next.map(s => s.playlist_song_id))
      syncQueue(next)
    } catch (err) {
      console.error(err)
    }
  }

  const isPlaylistActive = songs.length > 0 && songs.some(s => s.id === currentSong?.id)
  const isPlaylistPlaying = isPlaylistActive && isPlaying

  const handlePlayAll = () => {
    if (songs.length === 0) return
    if (isPlaylistActive) {
      togglePlay()
    } else {
      playSong(songs[0], songs)
    }
  }

  const handleRowClick = (song) => {
    if (currentSong?.id === song.id) togglePlay()
    else playSong(song, songs)
  }

  // ── Formatters ──
  const formatTime = (seconds) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const formatAddedDate = (dateStr) => {
    if (!dateStr) return '--'
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'hoje'
    if (diffDays === 1) return 'há 1 dia'
    if (diffDays < 7) return `há ${diffDays} dias`
    if (diffDays < 14) return 'há 1 semana'
    if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0)
  const formatTotalTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
      const parts = [`${h} hora${h !== 1 ? 's' : ''}`]
      if (m > 0) parts.push(`${m} min`)
      if (s > 0) parts.push(`${s} s`)
      return parts.join(' ')
    }
    if (m > 0) return s > 0 ? `${m} minutos ${s} s` : `${m} minutos`
    return `${s} segundos`
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="pb-8">
        <div className="px-6 pt-12 pb-6 flex items-end gap-6" style={{ background: 'linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 50%, #121212 100%)' }}>
          <div className="w-57.5 h-57.5 rounded skeleton shrink-0" />
          <div className="flex flex-col gap-3 flex-1 pb-1">
            <div className="h-3 w-20 skeleton" />
            <div className="h-14 w-3/4 skeleton" />
            <div className="h-4 w-48 skeleton mt-1" />
          </div>
        </div>
        <div className="px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full skeleton" />
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="w-8 h-8 rounded-full skeleton" />
        </div>
        <div className="px-6 space-y-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2">
              <div className="h-3 w-4 skeleton" />
              <div className="w-10 h-10 rounded skeleton shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3.5 w-32 skeleton" />
                <div className="h-3 w-20 skeleton" />
              </div>
              <div className="h-3 w-24 skeleton hidden md:block" />
              <div className="h-3 w-20 skeleton hidden lg:block" />
              <div className="h-3 w-10 skeleton ml-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Error / Not Found ──
  if (error || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ListMusic size={40} className="text-zinc-600" />
        <p className="text-zinc-400 text-sm">{error || 'Playlist não encontrada.'}</p>
        <button onClick={fetchPlaylistData} className="text-white text-sm font-semibold hover:underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  const isOwner = playlist.user_id === user?.id

  return (
    <div className="pb-8">
      {/* Hidden file input for cover */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleCoverChange}
      />

      {/* ─── Gradient Header ─── */}
      <div
        className="px-6 pt-12 pb-6 flex items-end gap-6"
        style={{ background: `linear-gradient(to bottom, ${bannerColor} 0%, #121212 100%)` }}
      >
        {/* Cover Art */}
        <div
          className={`relative w-57.5 h-57.5 bg-zinc-800 rounded shadow-2xl shrink-0 overflow-hidden group ${isOwner ? 'cursor-pointer' : ''}`}
          onClick={handleCoverClick}
        >
          {coverUrl ? (
            <img src={coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-zinc-700 to-zinc-900">
              <ListMusic size={64} className="text-zinc-500" />
            </div>
          )}
          {isOwner && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingCover ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Camera size={32} className="text-white" />
                  <span className="text-white text-xs font-semibold">Escolher foto</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2 min-w-0 pb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-white/70 flex items-center gap-1.5">
            {playlist.is_public ? <Globe size={12} /> : <Lock size={12} />}
            Playlist {playlist.is_public ? 'pública' : 'privada'}
          </span>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-none wrap-break-word">
            {playlist.name}
          </h1>

          {playlist.description && (
            <p className="text-sm text-zinc-300 mt-1 max-w-xl line-clamp-2">{playlist.description}</p>
          )}

          <div className="flex items-center gap-1 text-sm mt-2 flex-wrap text-zinc-400">
            <span className="font-medium text-white">{songs.length}</span>
            <span>{songs.length !== 1 ? 'faixas' : 'faixa'}</span>
            {totalDuration > 0 && (
              <>
                <span className="mx-1 opacity-50">•</span>
                <span>{formatTotalTime(totalDuration)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Actions Bar ─── */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Play */}
          <button
            onClick={handlePlayAll}
            disabled={songs.length === 0}
            className="w-14 h-14 bg-spotify-green rounded-full flex items-center justify-center hover:scale-105 hover:bg-spotify-green-hover transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isPlaylistPlaying
              ? <Pause fill="black" stroke="none" size={24} />
              : <Play fill="black" stroke="none" size={24} className="ml-0.5" />}
          </button>
          <button className="text-zinc-400 hover:text-white transition p-2">
            <Shuffle size={22} />
          </button>
          <button className="text-zinc-400 hover:text-white transition p-2">
            <UserPlus size={22} />
          </button>

          {/* ─── More Menu (Edit / Delete) ─── */}
          {isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="text-zinc-400 hover:text-white transition p-2"
              >
                <MoreHorizontal size={22} />
              </button>

              {menuOpen && (
                <div className="absolute left-0 top-10 z-50 w-56 bg-[#282828] rounded-lg shadow-2xl py-1 text-sm overflow-hidden">
                  <button
                    onClick={openEditModal}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-white"
                  >
                    <Pencil size={16} className="text-zinc-400" />
                    Editar detalhes
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-red-400"
                  >
                    <Trash2 size={16} />
                    Excluir playlist
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="text-sm font-medium">Lista</span>
          <List size={18} />
        </div>
      </div>

      {/* ─── Edit Details Modal ─── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => !savingEdit && setEditModalOpen(false)}>
          <div className="bg-[#282828] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Editar detalhes</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-zinc-400 hover:text-white transition p-1"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Nome</label>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  maxLength={50}
                  className="w-full px-3 py-2.5 bg-white/7 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-zinc-500"
                  placeholder="Nome da playlist"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Descrição <span className="text-zinc-600 font-normal">(opcional)</span></label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white/7 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-zinc-500 resize-none"
                  placeholder="Adicione uma descrição opcional"
                />
                <span className="text-[10px] text-zinc-600 mt-0.5 block text-right">{editDescription.length}/200</span>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Visibilidade</label>
                <button
                  type="button"
                  onClick={() => setEditIsPublic(p => !p)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border transition text-sm font-medium ${
                    editIsPublic
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-white/10 bg-white/5 text-zinc-400'
                  }`}
                >
                  {editIsPublic ? <Globe size={16} /> : <Lock size={16} />}
                  <div className="text-left">
                    <span className="block">{editIsPublic ? 'Pública' : 'Privada'}</span>
                    <span className="text-[11px] font-normal opacity-70">{editIsPublic ? 'Qualquer pessoa pode encontrar e ouvir' : 'Só você pode ver esta playlist'}</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditModalOpen(false)}
                disabled={savingEdit}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-white hover:scale-105 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={savePlaylistDetails}
                disabled={savingEdit || !editName.trim()}
                className="px-5 py-2.5 bg-spotify-green hover:brightness-110 rounded-full text-sm font-bold text-black hover:scale-105 transition disabled:opacity-50"
              >
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="bg-[#282828] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">Excluir playlist?</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Tem certeza que deseja excluir <strong className="text-white">{playlist.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-white hover:scale-105 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePlaylist}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-400 rounded-full text-sm font-bold text-white hover:scale-105 transition disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Song Table ─── */}
      <div className="px-6">
        {songs.length === 0 ? (
          <div className="text-zinc-500 py-16 text-center border border-dashed border-white/5 rounded-lg">
            <p className="text-base mb-2">Esta playlist está vazia.</p>
            {isOwner && (
              <button onClick={() => openSearch()} className="text-white font-semibold hover:underline">
                Pesquise e adicione músicas
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[24px_40px_2fr_1.5fr_1.2fr_40px_60px] items-center px-4 py-2 border-b border-white/10 text-zinc-400 text-xs uppercase tracking-wider font-medium mb-2">
              <span></span>
              <span className="text-center">#</span>
              <span>Título</span>
              <span className="hidden md:block">Álbum</span>
              <span className="hidden lg:block">Adicionada em</span>
              <span></span>
              <span className="flex justify-end"><Clock size={14} /></span>
            </div>

            {/* Sortable Song Rows */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={songs.map(s => s.playlist_song_id)}
                strategy={verticalListSortingStrategy}
              >
                {songs.map((song, idx) => (
                  <SortableSongRow
                    key={song.playlist_song_id}
                    song={song}
                    idx={idx}
                    isActive={currentSong?.id === song.id}
                    playing={currentSong?.id === song.id && isPlaying}
                    isOwner={isOwner}
                    onRowClick={handleRowClick}
                    onRemove={removeSong}
                    onLike={toggleLike}
                    isLiked={isLiked}
                    formatTime={formatTime}
                    formatAddedDate={formatAddedDate}
                  />
                ))}
              </SortableContext>

              {/* Drag overlay — ghost card while dragging */}
              <DragOverlay>
                {activeId ? (() => {
                  const song = songs.find(s => s.playlist_song_id === activeId)
                  if (!song) return null
                  return (
                    <div className="flex items-center gap-3 px-4 py-2 bg-[#3e3e3e] rounded-md shadow-2xl border border-white/10 opacity-95">
                      {song.cover_url
                        ? <img src={song.cover_url} className="w-10 h-10 rounded object-cover shrink-0" alt="" />
                        : <div className="w-10 h-10 rounded bg-zinc-700 shrink-0" />}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate">{song.title}</span>
                        <span className="text-xs text-zinc-400 truncate">{song.artist}</span>
                      </div>
                    </div>
                  )
                })() : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </div>

      {/* ─── Add Songs Section (Owner only) ─── */}
      {isOwner && (
        <div className="px-6 mt-10">
          {!showSearch && songs.length > 0 && (
            <button
              onClick={() => openSearch()}
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
                  placeholder="Pesquisar músicas ou artistas"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/7 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-zinc-500"
                />
              </div>

              <div className="mt-4 space-y-1">
                  {searching ? (
                    <div className="py-4 text-center text-zinc-500 text-sm">Buscando...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-4 text-center text-zinc-500 text-sm">
                      {searchQuery ? 'Nenhum resultado encontrado.' : 'Nenhuma música disponível.'}
                    </div>
                  ) : (
                    searchResults.map(song => (
                      <div key={song.id} className="flex items-center justify-between p-2 rounded hover:bg-white/6 transition">
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
