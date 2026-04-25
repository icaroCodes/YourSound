import { useState, useEffect } from 'react'
import { X, Music, CloudUpload, CheckCircle2, AlertCircle, Loader2, ImageIcon, Globe, Lock, AlignLeft, Type } from 'lucide-react'
import { api } from '../lib/api'

export default function MobileUploadPanel({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Fields
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [file, setFile] = useState(null)
  const [audioMode, setAudioMode] = useState('file') // 'file', 'link'
  const [audioUrl, setAudioUrl] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [subtitleMode, setSubtitleMode] = useState('none') // 'none', 'manual'
  const [subtitleData, setSubtitleData] = useState([])
  const [manualText, setManualText] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setLoading(false)
        setError('')
        setSuccess(false)
        setTitle('')
        setArtist('')
        setFile(null)
        setAudioMode('file')
        setAudioUrl('')
        setIsPublic(false)
        setSubtitleMode('none')
        setSubtitleData([])
        setManualText('')
        setCoverFile(null)
        setCoverPreview(null)
      }, 300)
    }
  }, [isOpen])

  async function handleDownload(e) {
    if (e) e.preventDefault()
    if (!audioUrl) {
      setError('Insira o link da música')
      return
    }
    setLoading(true)
    setError('')
    try {
      const blob = await api.downloadMp3FromLink(audioUrl)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Audio_${Date.now()}.mp3`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      
      setSuccess(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (audioMode === 'file' && !file) throw new Error('Selecione um arquivo de áudio')
      if (!title || !artist) throw new Error('Preencha o título e o artista')
      
      await api.uploadSong({
        title,
        artist,
        isPublic,
        audioFile: file,
        coverFile,
        subtitleMode,
        subtitleData: subtitleMode === 'manual' ? subtitleData : null,
      })

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
                <h3 className="text-xl font-bold">Sucesso!</h3>
                <p className="text-zinc-400 text-sm mt-1">Ação concluída com sucesso.</p>
             </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar pb-4 pr-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black">Enviar Música</h3>
              <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs flex items-center gap-2 border border-red-500/20">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Ação</label>
                  <div className="flex gap-1.5 bg-white/5 rounded-full p-0.5">
                    <button
                      type="button"
                      onClick={() => setAudioMode('file')}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                        audioMode === 'file' ? 'bg-spotify-green text-black' : 'text-zinc-500'
                      }`}
                    >
                      Adicionar à Biblioteca
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioMode('link')}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                        audioMode === 'link' ? 'bg-spotify-green text-black' : 'text-zinc-500'
                      }`}
                    >
                      Baixar MP3 (Link)
                    </button>
                  </div>
                </div>
              </div>

              {audioMode === 'link' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      value={audioUrl}
                      onChange={e => setAudioUrl(e.target.value)}
                      placeholder="Link do YouTube ou TikTok"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-spotify-green outline-none"
                    />
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
                       type="button"
                       onClick={handleDownload}
                       disabled={loading}
                       className="flex-1 bg-[#1ED45E] text-black py-4 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                     >
                       {loading ? <Loader2 className="animate-spin" size={20} /> : 'Baixar Arquivo MP3'}
                     </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
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
                      <input type="file" className="hidden" accept="audio/*" onChange={e => setFile(e.target.files[0])} />
                    </label>
                  </div>

                  {/* Title & Artist */}
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
                      <span className="text-xs font-bold text-zinc-400">{coverFile ? coverFile.name : 'Escolher imagem'}</span>
                    </label>
                  </div>

                  {/* Subtitles Section */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Modo de Legenda</label>
                    <div className="grid grid-cols-2 gap-2">
                       {[
                         { id: 'none', label: 'Auto', icon: <AlignLeft size={14} /> },
                         { id: 'manual', label: 'Manual', icon: <Type size={14} /> }
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
                            const parsedLines = manualText.split('\n').map(l => l.trim()).filter(Boolean).map((text, i) => {
                              const match = text.match(/^\[?(?:(\d{1,2}):)?(\d+)(?:\.(\d+))?\]?\s*(.*)/);
                              if (match) {
                                const min = match[1] ? parseInt(match[1]) : 0;
                                const sec = parseInt(match[2]);
                                const msStr = match[3] || '0';
                                const ms = parseInt(msStr) / Math.pow(10, msStr.length);
                                return { time: min * 60 + sec + ms, text: (match[4] || '').trim() };
                              }
                              return { time: i * 3.5, text: text.trim() };
                            });
                            setSubtitleData(parsedLines)
                            setError('') // Clear error if any
                          }}
                          className="w-full py-2 bg-white/10 text-white rounded-lg text-xs font-bold"
                        >
                          Confirmar Letra
                        </button>
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
                          <p className="text-[10px] text-zinc-500">Visibilidade da música</p>
                        </div>
                      </div>
                      <div className={`w-9 h-5 rounded-full relative transition-colors ${isPublic ? 'bg-spotify-green' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? 'left-[18px]' : 'left-0.5'}`} />
                      </div>
                    </button>
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
                       {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Música'}
                     </button>
                  </div>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
