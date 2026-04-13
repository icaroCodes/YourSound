import { useState } from 'react'
import { X, Lock, Globe, Camera, Loader2, Music2 } from 'lucide-react'
import { api } from '../lib/api'
import { useOnboardingStore } from '../store/useOnboardingStore'

export default function CreatePlaylistModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)

  if (!isOpen) return null

  const handleClose = () => {
    setName('')
    setIsPublic(false)
    setCoverFile(null)
    setCoverPreview(null)
    setError('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    try {
      // 1. Create playlist
      const playlist = await api.createPlaylist(name, isPublic)

      // 2. Upload cover if exists
      if (coverFile) {
        await api.updatePlaylistCover(playlist.id, coverFile)
      }

      onCreated && onCreated()
      handleClose()
    } catch (err) {
      setError(err.message || 'Erro ao criar playlist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md bg-[#242424] rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-white">Nova Playlist</h2>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Upload */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative w-40 h-40 bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl group cursor-pointer border-2 border-dashed border-white/5 hover:border-spotify-green transition-colors"
              data-onboarding="modal-cover-upload"
              onClick={() => document.getElementById('playlist-cover-input').click()}
            >
              {coverPreview ? (
                <img src={coverPreview} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <Music2 size={48} strokeWidth={1} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Adicionar Capa</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
              <input
                id="playlist-cover-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files[0]
                  if (f) {
                    setCoverFile(f)
                    setCoverPreview(URL.createObjectURL(f))
                    useOnboardingStore.getState().completeAction('modal-upload-image')
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest text-center block">Nome da Playlist</label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Vibes de Verão"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold focus:ring-2 focus:ring-spotify-green outline-none text-center"
                required
              />
            </div>

            {/* Visibility Toggle */}
            <button
              type="button"
              onClick={() => { setIsPublic(!isPublic); useOnboardingStore.getState().completeAction('modal-toggle-privacy') }}
              data-onboarding="modal-privacy-toggle"
              className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${isPublic ? 'bg-spotify-green/10 border-spotify-green/20' : 'bg-white/5 border-white/10'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPublic ? 'bg-spotify-green/20 text-spotify-green' : 'bg-zinc-800 text-zinc-500'}`}>
                  {isPublic ? <Globe size={24} /> : <Lock size={24} />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">{isPublic ? 'Pública' : 'Privada'}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Visibilidade</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${isPublic ? 'bg-spotify-green' : 'bg-zinc-700'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? 'left-5' : 'left-1'}`} />
              </div>
            </button>
          </div>

          <button
            type="submit"
            data-onboarding="modal-submit-btn"
            onClick={() => useOnboardingStore.getState().completeAction('modal-submit')}
            disabled={loading || !name.trim()}
            className="w-full bg-[#1ED45E] text-black py-5 rounded-full font-black text-lg active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : 'Criar Playlist'}
          </button>
        </form>
      </div>
    </div>
  )
}
