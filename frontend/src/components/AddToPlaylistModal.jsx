import { useState, useEffect, useRef } from 'react'
import { X, Plus, Search, Check, Heart, ListMusic, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useLikeStore } from '../store/useLikeStore'

export default function AddToPlaylistModal({ song, onClose }) {
  const { isLiked, toggleLike } = useLikeStore()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState({})   // playlistId → true
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const newNameRef = useRef(null)
  const overlayRef = useRef(null)

  useEffect(() => {
    api.getPlaylists()
      .then(setPlaylists)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (creating) newNameRef.current?.focus()
  }, [creating])

  const toggleSelected = (playlistId) => {
    setSelected(prev => ({ ...prev, [playlistId]: !prev[playlistId] }))
    setError('')
  }

  const anySelected = Object.values(selected).some(Boolean)

  const handleConfirm = async () => {
    const targets = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    if (targets.length === 0) { onClose(); return }
    setSaving(true)
    setError('')
    const errors = []
    await Promise.all(
      targets.map(async (playlistId) => {
        try {
          await api.addSongToPlaylist(playlistId, song.id)
        } catch (err) {
          if (!err.message?.toLowerCase().includes('já')) {
            errors.push(err.message)
          }
        }
      })
    )
    setSaving(false)
    if (errors.length > 0) {
      setError(errors[0])
    } else {
      onClose()
    }
  }

  const handleCreatePlaylist = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSavingNew(true)
    setError('')
    try {
      const playlist = await api.createPlaylist(newName.trim(), false)
      setPlaylists(prev => [playlist, ...prev])
      setSelected(prev => ({ ...prev, [playlist.id]: true }))
      setNewName('')
      setCreating(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingNew(false)
    }
  }

  const liked = isLiked(song?.id)
  const filtered = playlists.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-[#282828] rounded-xl shadow-2xl w-80 max-h-[500px] flex flex-col overflow-hidden border border-white/10">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
          <span className="text-sm font-bold text-white">Adicionar à playlist</span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition p-1">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Procurar uma playlist"
              className="w-full pl-8 pr-3 py-2 bg-white/10 rounded text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:bg-white/15 transition"
            />
          </div>
        </div>

        {/* Nova Playlist */}
        <div className="px-4 pb-2 shrink-0">
          {creating ? (
            <form onSubmit={handleCreatePlaylist} className="flex gap-2">
              <input
                ref={newNameRef}
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setCreating(false)}
                placeholder="Nome da playlist"
                maxLength={50}
                className="flex-1 px-3 py-1.5 bg-white/10 rounded text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:bg-white/15 transition"
              />
              <button
                type="submit"
                disabled={savingNew || !newName.trim()}
                className="px-3 py-1.5 bg-spotify-green text-black text-xs font-bold rounded hover:brightness-110 disabled:opacity-50 transition"
              >
                {savingNew ? '...' : 'Criar'}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="text-zinc-400 hover:text-white transition">
                <X size={14} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 text-white text-sm font-semibold hover:text-spotify-green transition py-1"
            >
              <Plus size={16} />
              Nova playlist
            </button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto custom-scrollbar flex-1 px-2">

          {/* Músicas Curtidas */}
          <button
            onClick={() => toggleLike(song)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition text-left"
          >
            <div className="w-10 h-10 rounded bg-linear-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center shrink-0">
              <Heart size={18} className="text-white" fill="white" />
            </div>
            <span className="flex-1 text-sm font-medium text-white truncate">Músicas Curtidas</span>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              liked ? 'border-spotify-green bg-spotify-green' : 'border-zinc-500'
            }`}>
              {liked && <Check size={11} strokeWidth={3} className="text-black" />}
            </div>
          </button>

          {playlists.length > 0 && <div className="h-px bg-white/10 mx-2 my-1" />}

          {/* Playlists */}
          {loading ? (
            <div className="py-6 flex justify-center">
              <Loader2 size={18} className="text-zinc-500 animate-spin" />
            </div>
          ) : filtered.length === 0 && query ? (
            <div className="py-4 text-center text-zinc-500 text-xs">Nenhuma playlist encontrada</div>
          ) : (
            filtered.map(playlist => {
              const isSelected = !!selected[playlist.id]
              return (
                <button
                  key={playlist.id}
                  onClick={() => toggleSelected(playlist.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition text-left"
                >
                  {playlist.cover_url ? (
                    <img src={playlist.cover_url} className="w-10 h-10 rounded object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-zinc-700 flex items-center justify-center shrink-0">
                      <ListMusic size={16} className="text-zinc-400" />
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium text-white truncate">{playlist.name}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'border-spotify-green bg-spotify-green' : 'border-zinc-500'
                  }`}>
                    {isSelected && <Check size={11} strokeWidth={3} className="text-black" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="px-4 py-2 text-xs text-red-400 text-center shrink-0">{error}</p>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sm font-semibold text-zinc-400 hover:text-white transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !anySelected}
            className="px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:scale-105 transition disabled:opacity-40 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
