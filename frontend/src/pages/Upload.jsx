import { useState, useRef } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { api } from '../lib/api'
import { Upload as UploadIcon, AlertCircle, CheckCircle2, Music4, Image as ImageIcon, X } from 'lucide-react'

export default function Upload() {
  const { user } = useAuthStore()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const audioInputRef = useRef(null)
  const coverInputRef = useRef(null)

  const handleAudioChange = (e) => {
    const file = e.target.files[0]
    if (file && file.size > 15 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'O arquivo de áudio deve ter no máximo 15MB.' })
      e.target.value = null
      return
    }
    setAudioFile(file)
    setMessage({ type: '', text: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!audioFile) {
      setMessage({ type: 'error', text: 'Selecione um arquivo de áudio.' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const result = await api.uploadSong({
        title,
        artist,
        isPublic,
        audioFile,
        coverFile
      })

      setMessage({ type: 'success', text: result.message })
      setTitle('')
      setArtist('')
      setIsPublic(false)
      setAudioFile(null)
      setCoverFile(null)
      if (audioInputRef.current) audioInputRef.current.value = ''
      if (coverInputRef.current) coverInputRef.current.value = ''
    } catch (err) {
      console.error("Upload error:", err.message)
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 animate-in fade-in duration-700">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
          Crie algo incrível
        </h1>
        <p className="text-zinc-400 text-lg max-w-lg mx-auto">
          Adicione suas faixas à sua biblioteca e compartilhe seu talento com o mundo.
        </p>
      </div>

      {message.text && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border animate-in slide-in-from-top-2 ${
          message.type === 'error' 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Main Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="group">
              <label className="block text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-2 px-1 group-focus-within:text-indigo-400 transition-colors">
                Título da Música
              </label>
              <input 
                type="text" required value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white text-lg placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:bg-white/[0.05]"
                placeholder="Nome da sua obra-prima"
              />
            </div>
            <div className="group">
              <label className="block text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-2 px-1 group-focus-within:text-indigo-400 transition-colors">
                Artista / Banda
              </label>
              <input 
                type="text" required value={artist} onChange={e => setArtist(e.target.value)}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white text-lg placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:bg-white/[0.05]"
                placeholder="Quem é o criador?"
              />
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-4 bg-white/[0.03] p-5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-all active:scale-[0.98]">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
                    className="peer appearance-none w-6 h-6 rounded-full border border-white/10 checked:bg-indigo-500 checked:border-indigo-500 transition-all"
                  />
                  <CheckCircle2 size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Tornar música pública</span>
                  <span className="text-xs text-zinc-500">Permitir que outros usuários ouçam sua faixa</span>
                </div>
              </label>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-4">
            {/* Audio Upload */}
            <div className="relative h-full">
              <input 
                ref={audioInputRef}
                type="file" accept="audio/*" required onChange={handleAudioChange}
                className="hidden"
              />
              <div 
                onClick={() => audioInputRef.current?.click()}
                className={`h-full min-h-[220px] rounded-3xl border border-dashed flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                  audioFile 
                    ? 'bg-indigo-500/5 border-indigo-500/40 text-indigo-400' 
                    : 'bg-white/[0.02] border-white/10 text-zinc-500 hover:bg-white/[0.04] hover:border-white/20'
                }`}
              >
                {audioFile ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                      <Music4 size={28} className="text-indigo-400" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-indigo-200 font-semibold truncate max-w-[200px]">{audioFile.name}</p>
                      <p className="text-[10px] uppercase tracking-wider opacity-60">Toque para alterar</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UploadIcon size={28} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-zinc-300">Carregar Áudio</p>
                      <p className="text-[11px] opacity-60">Arraste ou clique para selecionar (MP3, WAV)</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cover Art Section */}
        <div className="space-y-4">
          <label className="block text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-2 px-1">
            Arte da Capa (Opcional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <input 
                ref={coverInputRef}
                type="file" accept="image/*" onChange={e => setCoverFile(e.target.files[0])}
                className="hidden"
              />
              <div 
                onClick={() => coverInputRef.current?.click()}
                className={`w-full py-10 rounded-2xl border border-dashed flex items-center gap-6 px-8 transition-all cursor-pointer ${
                  coverFile 
                    ? 'bg-emerald-500/5 border-emerald-500/40 text-emerald-400' 
                    : 'bg-white/[0.02] border-white/10 text-zinc-500 hover:bg-white/[0.04] hover:border-white/20'
                }`}
              >
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center shrink-0 ${
                  coverFile ? 'bg-emerald-500/10' : 'bg-white/5'
                }`}>
                  {coverFile ? (
                    <img 
                      src={URL.createObjectURL(coverFile)} 
                      alt="Preview" 
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <ImageIcon size={32} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-300 truncate">
                    {coverFile ? coverFile.name : 'Escolher uma imagem'}
                  </p>
                  <p className="text-[11px] opacity-60">Ideal: 1:1, JPG ou PNG de alta resolução</p>
                </div>
                {coverFile && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCoverFile(null); if(coverInputRef.current) coverInputRef.current.value = '' }}
                    className="ml-auto p-2 hover:bg-white/10 rounded-full text-zinc-400"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center">
              <button 
                type="submit" disabled={loading}
                className="w-full h-full min-h-[60px] bg-white text-black font-extrabold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    <span>Fazendo Upload...</span>
                  </div>
                ) : (
                  <>Enviar Música</>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
