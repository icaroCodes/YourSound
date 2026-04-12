import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { api } from '../lib/api'
import {
  Upload as UploadIcon, Music4, ImageIcon, X, Check,
  Link2, AlertCircle, CheckCircle2, Globe, Lock,
  Type, Video, AlignLeft
} from 'lucide-react'

// ─── Animation variants ───────────────────────────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } }
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 26, stiffness: 300 } }
}

const fadeIn = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 28, stiffness: 320 } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-2">
      <label className="text-[11px] uppercase tracking-widest font-semibold text-zinc-500 px-0.5">
        {label}
      </label>
      {children}
    </motion.div>
  )
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm
        placeholder:text-zinc-600 focus:outline-none focus:border-[#1ED45E] focus:ring-1 focus:ring-[#1ED45E]/40
        transition-all hover:border-zinc-700"
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Upload() {
  const { user } = useAuthStore()

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [useLink, setUseLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [subtitleMode, setSubtitleMode] = useState('none') // 'none', 'manual', 'video'
  const [subtitleData, setSubtitleData] = useState([])
  const [subtitleVideoUrl, setSubtitleVideoUrl] = useState('')
  const [manualText, setManualText] = useState('')

  const audioInputRef = useRef(null)
  const coverInputRef = useRef(null)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAudioChange = (file) => {
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'O arquivo deve ter no máximo 15MB.' })
      return
    }
    setAudioFile(file)
    setMessage({ type: '', text: '' })
  }

  const handleCoverChange = (file) => {
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const removeCover = (e) => {
    e.stopPropagation()
    setCoverFile(null)
    setCoverPreview(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('audio/')) handleAudioChange(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!useLink && !audioFile) {
      setMessage({ type: 'error', text: 'Selecione um arquivo de áudio.' })
      return
    }
    if (useLink && !linkUrl.trim()) {
      setMessage({ type: 'error', text: 'Insira o link do vídeo.' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const payload = {
        title, artist, isPublic, coverFile,
        subtitleMode,
        subtitleData: subtitleMode === 'manual' ? subtitleData : null,
        subtitleVideoUrl: subtitleMode === 'video' ? subtitleVideoUrl : null
      }
      const result = useLink
        ? await api.uploadSongFromLink({ ...payload, url: linkUrl })
        : await api.uploadSong({ ...payload, audioFile })

      setMessage({ type: 'success', text: result.message })
      setTitle(''); setArtist(''); setIsPublic(false)
      setAudioFile(null); setCoverFile(null); setCoverPreview(null); setLinkUrl('')
      setSubtitleMode('none'); setSubtitleData([]); setSubtitleVideoUrl(''); setManualText('')
      if (audioInputRef.current) audioInputRef.current.value = ''
      if (coverInputRef.current) coverInputRef.current.value = ''
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-xl mx-auto px-4 py-10 pb-32">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold text-white tracking-tight">Enviar música</h1>
        <p className="text-zinc-500 text-sm mt-1.5">Adicione faixas à sua biblioteca.</p>
      </motion.div>

      {/* Feedback */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            key="msg"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={`mb-6 flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm border ${
              message.type === 'error'
                ? 'bg-red-500/8 border-red-500/20 text-red-400'
                : 'bg-[#1ED45E]/8 border-[#1ED45E]/20 text-[#1ED45E]'
            }`}
          >
            {message.type === 'error'
              ? <AlertCircle size={16} className="shrink-0" />
              : <CheckCircle2 size={16} className="shrink-0" />
            }
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit}>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >

          {/* ── Título ── */}
          <Field label="Título da música">
            <Input
              type="text" required
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Nome da faixa"
            />
          </Field>

          {/* ── Artista ── */}
          <Field label="Artista / Banda">
            <Input
              type="text" required
              value={artist} onChange={e => setArtist(e.target.value)}
              placeholder="Nome do artista"
            />
          </Field>

          {/* ── Divisor ── */}
          <motion.div variants={fadeUp} className="h-px bg-zinc-900 my-2" />

          {/* ── Toggle Fonte ── */}
          <motion.div variants={fadeUp}>
            <div className="relative flex bg-zinc-900 rounded-2xl p-1 gap-1">
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-y-1 rounded-full bg-white"
                style={{ width: 'calc(50% - 4px)', left: useLink ? 'calc(50% + 0px)' : '4px' }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              />
              <button
                type="button"
                onClick={() => setUseLink(false)}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition-colors duration-200 ${
                  !useLink ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <UploadIcon size={14} />
                Arquivo Local
              </button>
              <button
                type="button"
                onClick={() => setUseLink(true)}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition-colors duration-200 ${
                  useLink ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Link2 size={14} />
                Link (YT / TikTok)
              </button>
            </div>
          </motion.div>

          {/* ── Área de Arquivo / Link ── */}
          <AnimatePresence mode="wait">
            {useLink ? (
              <motion.div key="link" variants={fadeIn} initial="hidden" animate="show" exit="exit">
                <label className="block text-[11px] uppercase tracking-widest font-semibold text-zinc-500 mb-2 px-0.5">
                  URL do Vídeo
                </label>
                <div className="relative">
                  <Link2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                  <input
                    type="url" required value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm
                      placeholder:text-zinc-600 focus:outline-none focus:border-[#1ED45E] focus:ring-1 focus:ring-[#1ED45E]/40
                      transition-all hover:border-zinc-700"
                    placeholder="https://youtube.com/watch?v=... ou TikTok"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div key="file" variants={fadeIn} initial="hidden" animate="show" exit="exit">
                <input
                  ref={audioInputRef}
                  type="file" accept="audio/*"
                  className="hidden"
                  onChange={e => handleAudioChange(e.target.files[0])}
                />
                <motion.div
                  animate={{
                    borderColor: isDragging ? '#1ED45E' : audioFile ? 'rgba(30, 212, 94, 0.3)' : 'rgba(255,255,255,0.06)',
                    backgroundColor: isDragging ? 'rgba(30, 212, 94, 0.04)' : audioFile ? 'rgba(30, 212, 94, 0.03)' : 'rgba(255,255,255,0.015)',
                    scale: isDragging ? 1.01 : 1,
                  }}
                  transition={{ duration: 0.18 }}
                  onClick={() => audioInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className="w-full min-h-[140px] rounded-xl border border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    {audioFile ? (
                      <motion.div key="has-file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2 px-6 text-center">
                        <div className="w-10 h-10 rounded-full bg-[#1ED45E]/15 flex items-center justify-center">
                          <Music4 size={18} className="text-[#1ED45E]" />
                        </div>
                        <p className="text-xs font-medium text-white truncate max-w-[200px]">{audioFile.name}</p>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 text-center px-6">
                        <UploadIcon size={20} className="text-zinc-500" />
                        <p className="text-xs font-medium text-zinc-400">Arraste ou clique para enviar áudio</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Capa ── */}
          <motion.div variants={fadeUp}>
            <label className="block text-[11px] uppercase tracking-widest font-semibold text-zinc-500 mb-2 px-0.5">
              Arte da Capa <span className="normal-case tracking-normal font-normal text-zinc-600">(opcional)</span>
            </label>
            <input
              ref={coverInputRef}
              type="file" accept="image/*" className="hidden"
              onChange={e => handleCoverChange(e.target.files[0])}
            />
            <div
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 cursor-pointer transition-colors"
            >
              <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-zinc-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-300 truncate">{coverFile ? coverFile.name : 'Escolher imagem'}</p>
              </div>
              {coverFile && (
                <button type="button" onClick={removeCover} className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700">
                  <X size={14} className="text-zinc-400" />
                </button>
              )}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="h-px bg-zinc-900 my-2" />

          {/* ── Legendas e Fundo ── */}
          <motion.div variants={fadeUp} className="space-y-4">
            <label className="block text-[11px] uppercase tracking-widest font-semibold text-zinc-500 px-0.5">
              Legendas e Fundo
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-900 rounded-2xl">
              {[
                { id: 'none', label: 'Automática', icon: <AlignLeft size={14} /> },
                { id: 'manual', label: 'Manual', icon: <Type size={14} /> },
                { id: 'video', label: 'Vídeo', icon: <Video size={14} /> }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSubtitleMode(opt.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-[11px] font-bold transition-all ${
                    subtitleMode === opt.id 
                      ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {subtitleMode === 'manual' && (
                <motion.div key="manual" variants={fadeIn} initial="hidden" animate="show" exit="exit" className="space-y-3">
                  <textarea
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    placeholder="Cole a letra da música aqui..."
                    className="w-full h-32 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition-all resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const lines = manualText.split('\n').filter(l => l.trim()).map((text, i) => ({
                        time: i * 3.5,
                        text: text.trim()
                      }))
                      setSubtitleData(lines)
                      setMessage({ type: 'success', text: 'Letra processada!' })
                    }}
                    className="w-full py-2.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors"
                  >
                    Confirmar Letra
                  </button>
                </motion.div>
              )}

              {subtitleMode === 'video' && (
                <motion.div key="video" variants={fadeIn} initial="hidden" animate="show" exit="exit">
                  <div className="relative">
                    <Video size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="url"
                      value={subtitleVideoUrl}
                      onChange={e => setSubtitleVideoUrl(e.target.value)}
                      placeholder="URL do YouTube ou TikTok"
                      className="w-full pl-10 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {subtitleMode === 'none' && (
                <motion.div key="none" variants={fadeIn} initial="hidden" animate="show" exit="exit" className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 text-center">
                  <p className="text-xs text-zinc-500 italic">Busca automática via LRCLIB ativada.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeUp} className="h-px bg-zinc-900 my-2" />

          {/* ── Visibilidade ── */}
          <motion.div variants={fadeUp}>
            <button
              type="button"
              onClick={() => setIsPublic(p => !p)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all ${
                isPublic ? 'bg-[#1ED45E]/5 border-[#1ED45E]/20' : 'bg-zinc-900/50 border-zinc-800'
              }`}
            >
              <div className={`w-10 h-6 rounded-full relative transition-colors ${isPublic ? 'bg-[#1ED45E]' : 'bg-zinc-800'}`}>
                <motion.div animate={{ x: isPublic ? 18 : 2 }} className="w-4 h-4 rounded-full bg-white absolute top-1" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  {isPublic ? <><Globe size={13} className="text-[#1ED45E]" /> Público</> : <><Lock size={13} className="text-zinc-500" /> Privado</>}
                </p>
              </div>
            </button>
          </motion.div>

          {/* ── Submit ── */}
          <motion.div variants={fadeUp} className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-[#1ED45E] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#1ED45E]/10 h-14"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : 'Enviar música'}
            </button>
          </motion.div>

        </motion.div>
      </form>
    </div>
  )
}
