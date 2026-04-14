import { useState, useEffect } from 'react'
import { X, Music, CloudUpload, Link2, CheckCircle2, AlertCircle, Loader2, ImageIcon, Globe, Lock, AlignLeft, Type, Video } from 'lucide-react'
import { api } from '../lib/api'

export default function MobileUploadPanel({ isOpen, onClose }) {
  const [mode, setMode] = useState(null) // 'link' | 'file' | null
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Fields
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [url, setUrl] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [subtitleMode, setSubtitleMode] = useState('none') // 'none', 'manual', 'video'
  const [subtitleVideoType, setSubtitleVideoType] = useState('link')
  const [subtitleLinkMode, setSubtitleLinkMode] = useState('stream')
  const [subtitleVideoFile, setSubtitleVideoFile] = useState(null)
  const [subtitleData, setSubtitleData] = useState([])
  const [subtitleVideoUrl, setSubtitleVideoUrl] = useState('')
  const [manualText, setManualText] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMode(null)
        setLoading(false)
        setError('')
        setSuccess(false)
        setTitle('')
        setArtist('')
        setUrl('')
        setIsPublic(false)
        setSubtitleMode('none')
        setSubtitleData([])
        setSubtitleVideoUrl('')
        setSubtitleVideoUrl('')
        setSubtitleVideoFile(null)
        setSubtitleVideoType('link')
        setSubtitleLinkMode('stream')
        setManualText('')
        setCoverFile(null)
        setCoverPreview(null)
      }, 300)
    }
  }, [isOpen])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = { 
        title, 
        artist, 
        isPublic, 
        coverFile,
        subtitleMode,
        subtitleData: subtitleMode === 'manual' ? subtitleData : null,
        subtitleVideoUrl: subtitleMode === 'video' && subtitleVideoType === 'link' ? subtitleVideoUrl : null,
        subtitleVideoFile: subtitleMode === 'video' && subtitleVideoType === 'file' ? subtitleVideoFile : null,
        subtitleLinkMode: subtitleMode === 'video' && subtitleVideoType === 'link' ? subtitleLinkMode : null
      }

      if (mode === 'link') {
        if (!url || !title || !artist) throw new Error('Preencha todos os campos')
        await api.uploadSongFromLink({ ...payload, url })
      } else {
        if (!file || !title || !artist) throw new Error('Selecione um arquivo e preencha os campos')
        await api.uploadSong({ ...payload, audioFile: file })
      }
      setSuccess(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-end items-end select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full bg-[#181818] rounded-t-[2rem] border-t border-white/10 p-6 pt-2 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-4 mb-8" onClick={onClose} />

        {success ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
             <div className="w-20 h-20 bg-spotify-green/20 rounded-full flex items-center justify-center text-spotify-green">
                <CheckCircle2 size={48} />
             </div>
             <div>
                <h3 className="text-xl font-bold">Música Enviada!</h3>
                <p className="text-zinc-400 text-sm mt-1">Sua música já está em nosso catálogo.</p>
             </div>
          </div>
        ) : (
          <>
            {mode === null ? (
              <div className="space-y-6">
                <div className="text-center mb-2">
                   <h3 className="text-xl font-black">Adicionar Música</h3>
                   <p className="text-zinc-400 text-sm">Escolha como deseja enviar sua música</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => setMode('link')}
                    className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-5 rounded-2xl border border-white/5 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                      <Link2 size={28} />
                    </div>
                    <div className="text-left">
                       <p className="font-bold text-lg">Importar de Link</p>
                       <p className="text-zinc-400 text-sm">YouTube ou TikTok</p>
                    </div>
                  </button>

                 
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar pb-4 pr-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-black">{mode === 'link' ? 'Importar Link' : 'Enviar Arquivo'}</h3>
                  <button type="button" onClick={() => setMode(null)} className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider">Mudar</button>
                </div>

                {error && (
                  <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs flex items-center gap-2 border border-red-500/20">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {mode === 'link' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">URL do Vídeo</label>
                        <input 
                          type="url"
                          value={url}
                          onChange={e => setUrl(e.target.value)}
                          placeholder="YouTube ou TikTok"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-spotify-green outline-none"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">O áudio será baixado e armazenado automaticamente.</p>
                    </div>
                  )}

                  {mode === 'file' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Arquivo de Áudio</label>
                      <label className="flex flex-col items-center justify-center w-full aspect-[4/1] bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                          {file ? (
                             <p className="text-spotify-green font-bold text-sm truncate max-w-[200px]">{file.name}</p>
                          ) : (
                             <>
                               <CloudUpload size={20} className="text-zinc-500 mb-1" />
                               <p className="text-[10px] text-zinc-500 font-bold">Selecionar Áudio</p>
                             </>
                          )}
                        </div>
                        <input type="file" className="hidden" accept="audio/*" onChange={e => setFile(e.target.files[0])} required />
                      </label>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Título</label>
                      <input 
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Nome da música"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-spotify-green outline-none"
                        required
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Artista</label>
                      <input 
                        type="text"
                        value={artist}
                        onChange={e => setArtist(e.target.value)}
                        placeholder="Nome do artista"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-spotify-green outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Cover Section */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Capa (Opcional)</label>
                    <input
                      type="file" accept="image/*" className="hidden" id="mobile-cover-input"
                      onChange={e => {
                        const f = e.target.files[0]
                        if (f) {
                          setCoverFile(f)
                          setCoverPreview(URL.createObjectURL(f))
                        }
                      }}
                    />
                    <label 
                      htmlFor="mobile-cover-input"
                      className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-zinc-600" />}
                      </div>
                      <span className="text-xs font-bold text-zinc-400">{coverFile ? coverFile.name : 'Escolher imagem corporativa'}</span>
                    </label>
                  </div>

                  {/* Subtitles Section */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Modo de Legenda</label>
                    <div className="grid grid-cols-3 gap-2">
                       {[
                         { id: 'none', label: 'Auto', icon: <AlignLeft size={14} /> },
                         { id: 'manual', label: 'Manual', icon: <Type size={14} /> },
                         { id: 'video', label: 'Vídeo', icon: <Video size={14} /> }
                       ].map(opt => (
                         <button
                           key={opt.id}
                           type="button"
                           onClick={() => setSubtitleMode(opt.id)}
                           className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-black transition-all border ${
                             subtitleMode === opt.id 
                               ? 'bg-white text-black border-white' 
                               : 'bg-white/5 text-zinc-500 border-white/5'
                           }`}
                         >
                           {opt.icon}
                           {opt.label}
                         </button>
                       ))}
                    </div>

                    {subtitleMode === 'manual' && (
                      <div className="space-y-2">
                        <textarea
                          value={manualText}
                          onChange={e => setManualText(e.target.value)}
                          placeholder="Cole a letra da música aqui..."
                          className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-spotify-green outline-none resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const lines = manualText.split('\n').filter(l => l.trim()).map((text, i) => ({
                              time: i * 3.5,
                              text: text.trim()
                            }))
                            setSubtitleData(lines)
                            setError('') // Clear error if any
                          }}
                          className="w-full py-2 bg-white/10 text-white rounded-lg text-xs font-bold"
                        >
                          Confirmar Letra
                        </button>
                      </div>
                    )}

                    {subtitleMode === 'video' && (
                      <div className="space-y-3">
                        <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                          <button
                            type="button"
                            onClick={() => setSubtitleVideoType('link')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all ${
                              subtitleVideoType === 'link' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
                            }`}
                          >
                            Link
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubtitleVideoType('file')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all ${
                              subtitleVideoType === 'file' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
                            }`}
                          >
                            Arquivo
                          </button>
                        </div>
                        
                        {subtitleVideoType === 'link' ? (
                          <div className="space-y-2">
                            <input
                              type="url"
                              value={subtitleVideoUrl}
                              onChange={e => setSubtitleVideoUrl(e.target.value)}
                              placeholder="URL do YouTube ou TikTok"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-spotify-green outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSubtitleLinkMode('stream')}
                                className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-colors ${
                                  subtitleLinkMode === 'stream' 
                                    ? 'bg-spotify-green/10 text-spotify-green border-spotify-green/30' 
                                    : 'bg-white/5 text-zinc-400 border-white/5'
                                }`}
                              >
                                Link Rápido
                              </button>
                              <button
                                type="button"
                                onClick={() => setSubtitleLinkMode('download')}
                                className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-colors ${
                                  subtitleLinkMode === 'download' 
                                    ? 'bg-spotify-green/10 text-spotify-green border-spotify-green/30' 
                                    : 'bg-white/5 text-zinc-400 border-white/5'
                                }`}
                              >
                                Baixar MP4
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file" accept="video/*" className="hidden" id="mobile-subtitle-video-input"
                              onChange={e => setSubtitleVideoFile(e.target.files[0])}
                            />
                            <label 
                              htmlFor="mobile-subtitle-video-input"
                              className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer"
                            >
                              <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                <Video size={18} className="text-zinc-600" />
                              </div>
                              <span className="text-xs font-bold text-zinc-400 truncate flex-1 min-w-0">
                                {subtitleVideoFile ? subtitleVideoFile.name : 'Escolher vídeo (MP4)'}
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visibility Toggle */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsPublic(!isPublic)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isPublic ? 'bg-spotify-green/10 border-spotify-green/20' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isPublic ? <Globe size={18} className="text-spotify-green" /> : <Lock size={18} className="text-zinc-500" />}
                        <div className="text-left">
                          <p className="text-sm font-bold">{isPublic ? 'Pública' : 'Privada'}</p>
                          <p className="text-[10px] text-zinc-500">Visibilidade do pedido</p>
                        </div>
                      </div>
                      <div className={`w-9 h-5 rounded-full relative transition-colors ${isPublic ? 'bg-spotify-green' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? 'left-[18px]' : 'left-0.5'}`} />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                   <button 
                     type="button"
                     onClick={onClose}
                     className="flex-1 py-4 rounded-full font-bold text-zinc-400 active:scale-95 transition-transform"
                   >
                     Sair
                   </button>
                   <button 
                     type="submit"
                     disabled={loading}
                     className="flex-1 bg-white text-black py-4 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                   >
                     {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar'}
                   </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
