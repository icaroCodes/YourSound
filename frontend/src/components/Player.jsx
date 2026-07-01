import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLikeStore } from '../store/useLikeStore'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { audioManager } from '../lib/audioRef'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Mic2, ListMusic, Maximize2, Heart, PictureInPicture2,
  PlusCircle, Music2, ChevronDown, Share2, MoreHorizontal,
  Shuffle, Repeat, Repeat1, MonitorSpeaker, ChevronUp
} from 'lucide-react'
import AddToPlaylistModal from './AddToPlaylistModal'
import MobileLyrics from './MobileLyrics'
import SongOfflineButton from './SongOfflineButton'
import { api } from '../lib/api'
import { shareLink } from '../lib/share'
import { useDialogStore } from '../store/useDialogStore'
import { useAuthStore } from '../store/useAuthStore'
import { useLiquidGlass } from '../hooks/useLiquidGlass'

export default function Player({ isMobile = false }) {
  const token = useAuthStore(state => state.session?.access_token)
  const {
    currentSong, isPlaying, togglePlay, next, previous,
    volume, setVolume, queue, isQueueOpen, toggleQueue,
    isLyricsOpen, toggleLyrics, repeatMode, toggleRepeat
  } = usePlayerStore()
  const [shuffleOn, setShuffleOn] = useState(false)
  const [sharingSong, setSharingSong] = useState(false)
  
  const { isLiked, toggleLike } = useLikeStore()
  const { showAlert } = useDialogStore()
  
  const audioRef = useRef(null)
  const fadeInterval = useRef(null)
  const isInitialLoadRef = useRef(true)
  const lastSavedTimeRef = useRef(-1)

  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [pipWindow, setPipWindow] = useState(null)
  const [previousVolume, setPreviousVolume] = useState(1)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [isMobileFullScreen, setIsMobileFullScreen] = useState(false)

  const apiBase = import.meta.env.VITE_API_URL || ''

  // Fetch the signed audio URL from the backend when the song changes.
  // The backend returns a JSON { url } with a direct Supabase signed URL,
  // which the <audio> element loads without any cross-origin redirects.
  const [audioUrl, setAudioUrl] = useState('')
  const hasToken = !!token
  useEffect(() => {
    // Para imediatamente o áudio antigo ao trocar de música, evitando que
    // o efeito de play reinicie a faixa anterior (ex.: áudio "ended" volta ao 0)
    // enquanto a nova URL ainda está sendo buscada.
    const audio = audioRef.current
    if (audio) { try { audio.pause(); audio.currentTime = 0 } catch {} }

    if (!currentSong) { setAudioUrl(''); return }
    if (!navigator.onLine) {
      // Offline: usa a URL pública direta (servida pelo cache do service worker).
      // O endpoint /stream depende do backend e não responde sem internet.
      setAudioUrl(currentSong.file_url || '')
      return
    }
    if (!token) {
      // No token yet — use the direct URL so playback isn't blocked
      setAudioUrl(currentSong.file_url || '')
      return
    }
    setAudioUrl('') // clear old URL while fetching new one
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${apiBase}/api/songs/${currentSong.id}/stream?token=${token}`)
        if (!res.ok) throw new Error(`Stream error ${res.status}`)
        const data = await res.json()
        if (!cancelled && data.url) setAudioUrl(data.url)
        else if (!cancelled) setAudioUrl(currentSong.file_url || '')
      } catch (err) {
        console.error('[Player] Stream failed, using direct URL:', err.message)
        if (!cancelled) setAudioUrl(currentSong.file_url || '')
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id, hasToken, apiBase])

  // Share audio element for direct access (Lyrics, etc.)
  useEffect(() => {
    if (audioRef.current) {
      audioManager.element = audioRef.current
    }
    return () => { audioManager.element = null }
  }, [currentSong])

  // Media Session API — iOS lock screen / Control Center controls
  useEffect(() => {
    if (!currentSong || !('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      artwork: currentSong.cover_url
        ? [{ src: currentSong.cover_url, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    })

    navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) togglePlay() })
    navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) togglePlay() })
    navigator.mediaSession.setActionHandler('previoustrack', previous)
    navigator.mediaSession.setActionHandler('nexttrack', next)

    return () => {
      ['play', 'pause', 'previoustrack', 'nexttrack'].forEach(action => {
        try { navigator.mediaSession.setActionHandler(action, null) } catch { }
      })
    }
  }, [currentSong, isPlaying, next, previous, togglePlay])

  // --- Handlers para Reprodução com Fade (Suavidade) ---
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (fadeInterval.current) {
      clearInterval(fadeInterval.current)
      fadeInterval.current = null
    }

    // Don't try to play if audioUrl hasn't loaded yet — autoPlay handles it
    if (isPlaying && audioUrl) {
      audio.volume = Math.pow(volume, 2)
      audio.play().catch(e => console.error("Playback error:", e))
    } else if (!isPlaying) {
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      if (isIOS || audio.volume <= 0.01) {
        audio.pause()
      } else {
        const startVol = audio.volume
        const fadeStep = startVol / 15
        let iterations = 0
        fadeInterval.current = setInterval(() => {
          if (!audio) { clearInterval(fadeInterval.current); return }
          iterations++
          let nextVol = audio.volume - fadeStep
          if (nextVol <= 0.01 || iterations > 20) {
            clearInterval(fadeInterval.current)
            audio.pause()
            audio.volume = Math.pow(volume, 2)
          } else {
            audio.volume = nextVol
          }
        }, 15)
      }
    }

    return () => {
      if (fadeInterval.current) clearInterval(fadeInterval.current)
    }
    // NÃO depende de currentSong: a reprodução é guiada por audioUrl (a URL já
    // carregada da faixa atual), impedindo tocar a URL antiga durante a troca.
  }, [isPlaying, volume, audioUrl])

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.volume = Math.pow(volume, 2)
    }
  }, [volume, isPlaying])

  const handleLoadedData = () => {
    if (audioRef.current) {
      audioManager.element = audioRef.current
      setDuration(audioRef.current.duration)
    }
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      try {
        const savedTime = localStorage.getItem('ys_current_time')
        if (savedTime && audioRef.current) {
          const t = Number(savedTime)
          audioRef.current.currentTime = t
          setProgress(t)
        }
      } catch { }
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      const t = audioRef.current.currentTime
      setProgress(t)
      setDuration(audioRef.current.duration)
      const intT = Math.floor(t)
      if (intT !== lastSavedTimeRef.current) {
        lastSavedTimeRef.current = intT
        try { localStorage.setItem('ys_current_time', String(t)) } catch { }
      }
    }
  }

  const handleSeekChange = (e) => {
    setProgress(Number(e.target.value))
  }

  const handleSeekCommit = (e) => {
    const newTime = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setProgress(newTime)
    }
    setIsSeeking(false)
  }

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00"
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const handleShareSong = async () => {
    if (!currentSong || sharingSong) return
    setSharingSong(true)
    try {
      // Tenta gerar token (só funciona se for dono). Música pública abre sem token.
      let shareTok = null
      try { const d = await api.shareSong(currentSong.id); shareTok = d.share_token } catch {}
      const base = `${window.location.origin}/song/${currentSong.id}`
      const url = shareTok ? `${base}?share=${shareTok}` : base
      const result = await shareLink(url, {
        title: currentSong.title,
        text: `Ouça "${currentSong.title}" de ${currentSong.artist} no YourSound`,
      })
      if (result === 'copied') {
        await showAlert('Link copiado!', { title: 'Compartilhar música', icon: 'success' })
      } else if (result === 'failed') {
        await showAlert('Não foi possível compartilhar.', { title: 'Erro', icon: 'error' })
      }
    } finally {
      setSharingSong(false)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      if (document.exitFullscreen) document.exitFullscreen()
    }
  }

  const togglePiP = async () => {
    if (pipWindow) { pipWindow.close(); return }
    if (!('documentPictureInPicture' in window)) {
      await showAlert('Seu navegador não suporta Picture-in-Picture.', { title: 'Não suportado', icon: 'info' })
      return
    }
    try {
      const pip = await window.documentPictureInPicture.requestWindow({ width: 320, height: 380 })
      ;[...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((r) => r.cssText).join('')
          const style = document.createElement('style')
          style.textContent = cssRules
          pip.document.head.appendChild(style)
        } catch (e) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'; link.href = styleSheet.href
          pip.document.head.appendChild(link)
        }
      })
      pip.document.body.style.margin = '0'
      pip.document.body.style.backgroundColor = '#121212'
      pip.addEventListener('pagehide', () => setPipWindow(null))
      setPipWindow(pip)
    } catch (err) { console.error(err) }
  }

  if (!currentSong) {
    if (isMobile) return null
    return (
      <div className="w-full h-full flex items-center justify-between px-4">
        <div className="w-[30%] min-w-[180px] flex items-center gap-3">
          <div className="w-14 h-14 rounded bg-zinc-800 flex items-center justify-center shrink-0">
            <span className="text-zinc-500 font-bold">&#9835;</span>
          </div>
          <div className="flex flex-col truncate ml-1">
            <span className="text-sm font-medium text-zinc-500">--</span>
            <span className="text-[12px] text-zinc-600 tracking-wide mt-0.5">--</span>
          </div>
        </div>
        <div className="w-[40%] max-w-[722px] flex flex-col items-center gap-1.5 opacity-40">
           <div className="flex items-center gap-5 pointer-events-none">
             <SkipBack size={16} fill="currentColor" />
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black"><Play size={16} fill="currentColor" className="ml-0.5" /></div>
             <SkipForward size={16} fill="currentColor" />
           </div>
           <div className="w-full h-1 bg-[#4d4d4d] rounded-full mt-2" />
        </div>
        <div className="w-[30%] min-w-[180px]" />
      </div>
    )
  }

  // --- MOBILE MINI PLAYER ---
  if (isMobile && !isMobileFullScreen) {
    return (
      <div 
        className="relative w-full overflow-hidden rounded-[8px] bg-[#531e1e] shadow-2xl flex items-center h-[56px] px-2.5 gap-3 group active:scale-[0.98] transition-all"
        onClick={() => setIsMobileFullScreen(true)}
      >
        <audio
          ref={audioRef} src={audioUrl}
          onLoadedData={handleLoadedData} onTimeUpdate={handleTimeUpdate}
          onEnded={() => repeatMode === 'one' ? (audioRef.current.currentTime = 0, audioRef.current.play()) : next()}
          autoPlay={isPlaying}
        />
        
        <div className="w-10 h-10 rounded shrink-0 overflow-hidden shadow-lg">
          {currentSong.cover_url ? <img src={currentSong.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Music2 size={18} className="text-zinc-500" /></div>}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-sm font-bold text-white truncate leading-tight">{currentSong.title}</h4>
          <p className="text-xs text-white/70 truncate">{currentSong.artist}</p>
        </div>

        <div className="flex items-center gap-4 px-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); toggleLike(currentSong.id); useOnboardingStore.getState().completeAction('like') }} data-onboarding="like-button" className={`transition-colors ${isLiked(currentSong.id) ? 'text-spotify-green' : 'text-zinc-400'}`}>
            <Heart size={22} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); togglePlay() }} className="text-white">
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20">
          <div className="h-full bg-white transition-all duration-300 ease-linear" style={{ width: `${(progress / Math.max(duration, 1)) * 100}%` }} />
        </div>
      </div>
    )
  }

  // --- MOBILE FULL SCREEN PLAYER ---
  if (isMobile && isMobileFullScreen) {
    const pct = (progress / Math.max(duration, 1)) * 100
    return (
      <div className="fixed inset-0 z-[100] bg-black text-white select-none animate-in slide-in-from-bottom duration-300">
        <audio
          ref={audioRef} src={audioUrl}
          onLoadedData={handleLoadedData} onTimeUpdate={handleTimeUpdate}
          onEnded={() => repeatMode === 'one' ? (audioRef.current.currentTime = 0, audioRef.current.play()) : next()}
          autoPlay={isPlaying}
        />

        {addModalOpen && <AddToPlaylistModal song={currentSong} onClose={() => setAddModalOpen(false)} />}

        {/* Scroll container: now-playing + lyrics como duas telas */}
        <div className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar scroll-smooth">

          {/* ── Tela 1: Now Playing (fiel à imagem) ── */}
          <section
            className="h-[100dvh] snap-start flex flex-col px-6 pt-3 bg-gradient-to-b from-[#2a2a2a] to-[#121212]"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between py-2 shrink-0">
               <button onClick={() => setIsMobileFullScreen(false)} className="p-1 -ml-1"><ChevronDown size={26} /></button>
               <span className="text-sm font-semibold truncate max-w-[60%] text-white/90">{currentSong.title}</span>
               <button className="p-1 -mr-1"><MoreHorizontal size={22} /></button>
            </div>

            {/* Cover grande */}
            <div className="flex-1 flex items-center justify-center min-h-0 py-4">
               <div className="aspect-square w-full max-w-[360px] rounded-lg overflow-hidden shadow-2xl">
                 {currentSong.cover_url ? <img src={currentSong.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Music2 size={80} className="text-zinc-500" /></div>}
               </div>
            </div>

            {/* Título + thumbnail + adicionar */}
            <div className="flex items-center gap-3 mb-4 shrink-0">
               <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-zinc-800">
                 {currentSong.cover_url ? <img src={currentSong.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><Music2 size={16} className="text-zinc-500" /></div>}
               </div>
               <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate leading-tight">{currentSong.title}</h2>
                  <p className="text-sm text-white/60 truncate">{currentSong.artist}</p>
               </div>
               <button
                 onClick={() => { setAddModalOpen(true); useOnboardingStore.getState().completeAction('add-to-playlist') }}
                 className="text-white/80 hover:text-white shrink-0"
               >
                 <PlusCircle size={26} strokeWidth={1.5} />
               </button>
            </div>

            {/* Barra de progresso */}
            <div className="shrink-0 mb-4">
               <div className="relative h-1 w-full bg-white/25 rounded-full">
                  <div className="absolute h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                  <div className="absolute h-3 w-3 bg-white rounded-full -top-1 -ml-1.5 shadow" style={{ left: `${pct}%` }} />
                  <input
                     type="range" min="0" max={duration || 100} value={progress}
                     onPointerDown={() => setIsSeeking(true)} onChange={handleSeekChange} onPointerUp={handleSeekCommit}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
               </div>
               <div className="flex justify-between text-[11px] font-medium text-white/60 mt-1.5">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
               </div>
            </div>

            {/* Controles */}
            <div className="flex items-center justify-between mb-5 shrink-0">
               <button onClick={() => setShuffleOn(s => !s)} className={shuffleOn ? 'text-spotify-green' : 'text-white/80'}><Shuffle size={22} /></button>
               <button onClick={previous} className="text-white"><SkipBack size={34} fill="currentColor" /></button>
               <button onClick={togglePlay} className="w-[68px] h-[68px] bg-white text-black rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform">
                 {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
               </button>
               <button onClick={next} className="text-white"><SkipForward size={34} fill="currentColor" /></button>
               <button onClick={toggleRepeat} className={repeatMode !== 'off' ? 'text-spotify-green' : 'text-white/80'}>
                 {repeatMode === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
               </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between shrink-0">
               <button className="text-white/70 hover:text-white transition"><MonitorSpeaker size={19} /></button>
               <div className="flex items-center gap-5">
                  <SongOfflineButton song={currentSong} size={19} />
                  <button onClick={handleShareSong} disabled={sharingSong} className="text-white/70 hover:text-white transition disabled:opacity-50"><Share2 size={19} /></button>
                  <button
                    onClick={() => { toggleQueue(); setIsMobileFullScreen(false) }}
                    className="text-white/70 hover:text-white transition"
                  >
                    <ListMusic size={19} />
                  </button>
               </div>
            </div>

            {/* Hint para a letra */}
            <div className="flex flex-col items-center gap-0.5 pt-3 text-white/40 shrink-0 animate-pulse">
               <ChevronUp size={16} />
               <span className="text-[10px] font-bold uppercase tracking-widest">Deslize para a letra</span>
            </div>
          </section>

          {/* ── Tela 2: Letra (automática ou por vídeo) ── */}
          <section className="h-[100dvh] snap-start flex flex-col bg-black">
             <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                   <Mic2 size={18} className="text-white/70" />
                   <span className="text-sm font-bold text-white/80 uppercase tracking-wide">Letra</span>
                </div>
                <button onClick={() => setIsMobileFullScreen(false)} className="text-white/50 hover:text-white"><ChevronDown size={22} /></button>
             </div>
             <div className="flex-1 min-h-0">
                <PlayerLyricsSection song={currentSong} token={token} />
             </div>
          </section>

        </div>
      </div>
    )
  }

  // --- DESKTOP PLAYER ---
  return (
    <div className="w-full h-full flex items-center justify-between px-4">
      <audio
        ref={audioRef} src={audioUrl}
        onLoadedData={handleLoadedData} onTimeUpdate={handleTimeUpdate}
        onEnded={() => repeatMode === 'one' ? (audioRef.current.currentTime = 0, audioRef.current.play()) : next()}
        autoPlay={isPlaying}
      />

      {/* Left: Info */}
      <div className="w-[30%] min-w-[180px] flex items-center gap-3">
        {currentSong.cover_url ? <img src={currentSong.cover_url} className="w-14 h-14 rounded object-cover shadow-md shrink-0" alt="" /> : <div className="w-14 h-14 rounded bg-zinc-800 flex items-center justify-center shrink-0"><span className="text-zinc-500 font-bold">&#9835;</span></div>}
        <div className="flex flex-col truncate ml-1">
          <span className="text-sm font-medium text-white hover:underline cursor-pointer truncate">{currentSong.title}</span>
          <span className="text-[12px] text-[#b3b3b3] hover:text-white hover:underline cursor-pointer truncate tracking-wide mt-0.5">{currentSong.artist}</span>
        </div>
        <button onClick={() => { setAddModalOpen(true); useOnboardingStore.getState().completeAction('add-to-playlist') }} data-onboarding="add-to-playlist-btn" className="hidden sm:block hover:scale-105 transition-transform shrink-0 text-[#b3b3b3] hover:text-white ml-2"><PlusCircle size={16} strokeWidth={1.5} /></button>
      </div>

      {addModalOpen && <AddToPlaylistModal song={currentSong} onClose={() => setAddModalOpen(false)} />}

      {/* Center: Controls */}
      <div className="w-[40%] max-w-[722px] flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-5">
          <button onClick={previous} className="text-[#b3b3b3] hover:text-white transition"><SkipBack size={16} fill="currentColor" /></button>
          <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform">{isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}</button>
          <button onClick={next} className="text-[#b3b3b3] hover:text-white transition"><SkipForward size={16} fill="currentColor" /></button>
        </div>
        <div className="w-full flex items-center gap-2 text-[11px] text-[#a7a7a7] font-medium tracking-wide">
          <span className="w-10 text-right">{formatTime(progress)}</span>
          <div className="flex-1 group relative flex items-center h-4">
            <input type="range" min="0" max={duration || 100} value={progress} onPointerDown={() => setIsSeeking(true)} onChange={handleSeekChange} onPointerUp={handleSeekCommit} className="absolute w-full h-1 opacity-0 cursor-pointer z-10" />
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden absolute pointer-events-none group-hover:h-1.5 transition-all"><div className="h-full bg-white group-hover:bg-spotify-green transition-colors" style={{ width: `${(progress / Math.max(duration, 1)) * 100}%` }} /></div>
            <div className="absolute h-3 w-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow pointer-events-none transition-opacity" style={{ left: `calc(${(progress / Math.max(duration, 1)) * 100}% - 6px)` }} />
          </div>
          <span className="w-10 text-left">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume & Tools */}
      <div className="w-[30%] min-w-[180px] flex items-center justify-end gap-3.5 text-[#b3b3b3]">
        <button onClick={toggleLyrics} className={`transition hidden md:block ${isLyricsOpen ? 'text-spotify-green' : 'hover:text-white'}`}><Mic2 size={16} strokeWidth={1.5} /></button>
        <SongOfflineButton song={currentSong} size={16} className="hidden md:flex" />
        <button onClick={toggleQueue} className={`transition hidden md:block ${isQueueOpen ? 'text-spotify-green' : 'hover:text-white'}`}><ListMusic size={16} strokeWidth={1.5} /></button>
        <div className="flex items-center gap-2 w-[100px] group relative h-4">
          <button onClick={() => volume === 0 ? setVolume(previousVolume || 1) : (setPreviousVolume(volume), setVolume(0))} className="hover:text-white transition z-20">{volume === 0 ? <VolumeX size={16} strokeWidth={1.5} /> : <Volume2 size={16} strokeWidth={1.5} />}</button>
          <div className="flex-1 relative flex items-center h-full">
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="absolute w-full h-1 opacity-0 cursor-pointer z-10" />
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden absolute pointer-events-none group-hover:h-1.5 transition-all"><div className="h-full bg-white group-hover:bg-spotify-green" style={{ width: `${volume * 100}%` }} /></div>
          </div>
        </div>
        <button onClick={togglePiP} className={`transition hidden lg:block ${pipWindow ? 'text-spotify-green' : 'hover:text-white'}`}><PictureInPicture2 size={16} strokeWidth={1.5} /></button>
        <button onClick={toggleFullscreen} className="hover:text-white transition hidden lg:block"><Maximize2 size={16} strokeWidth={1.5} /></button>
      </div>

      {pipWindow && createPortal(
        <PipContent 
          currentSong={currentSong} 
          isPlaying={isPlaying} 
          previous={previous} 
          next={next} 
          togglePlay={togglePlay} 
        />,
        pipWindow.document.body
      )}
    </div>
  )
}

const PLAYER_API_BASE = import.meta.env.VITE_API_URL || ''

// Letra dentro do player mobile — vídeo sincronizado ou letra automática.
function PlayerLyricsSection({ song, token }) {
  const isVideoMode = song?.subtitle_mode === 'video' && !!song?.subtitle_video_url
  if (isVideoMode) {
    return <SyncedLyricVideo videoUrl={song.subtitle_video_url} token={token} />
  }
  return <MobileLyrics song={song} />
}

// Vídeo de legenda sincronizado ao áudio que está tocando (audioManager).
function SyncedLyricVideo({ videoUrl, token }) {
  const videoRef = useRef(null)
  const rafRef = useRef(null)
  const [src, setSrc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!videoUrl) return
    if (videoUrl.match(/youtube\.com\/|youtu\.be\/|tiktok\.com\//)) {
      setSrc(`${PLAYER_API_BASE}/api/songs/proxy-stream?url=${encodeURIComponent(videoUrl)}&type=video&token=${token || ''}`)
    } else {
      setSrc(videoUrl)
    }
  }, [videoUrl, token])

  // Sincroniza o vídeo com o áudio principal (corrige drift a cada frame).
  useEffect(() => {
    if (!src) return
    const audio = audioManager.element
    if (!audio) return

    // Se o vídeo for mais curto que a música, ele se repete: o tempo-alvo é
    // o tempo do áudio "dobrado" pela duração do vídeo (audioTime % videoDuration).
    // Assim o vídeo dá loop até a música terminar.
    const wrap = (t) => {
      const d = videoRef.current?.duration
      return d && isFinite(d) && d > 0 ? t % d : t
    }

    const onSeek = () => { if (videoRef.current) videoRef.current.currentTime = wrap(audio.currentTime) }
    const onPlay = () => { if (videoRef.current) { videoRef.current.currentTime = wrap(audio.currentTime); videoRef.current.play().catch(() => {}) } }
    const onPause = () => { if (videoRef.current) videoRef.current.pause() }

    const loop = () => {
      const v = videoRef.current
      if (v && audio) {
        const target = wrap(audio.currentTime)
        if (Math.abs(target - v.currentTime) > 0.15 && v.readyState >= 2) v.currentTime = target
        if (!audio.paused && v.paused && v.readyState >= 2) v.play().catch(() => {})
        if (audio.paused && !v.paused) v.pause()
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    audio.addEventListener('seeking', onSeek)
    audio.addEventListener('seeked', onSeek)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      audio.removeEventListener('seeking', onSeek)
      audio.removeEventListener('seeked', onSeek)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [src])

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="text-white/40 text-sm font-medium">Vídeo indisponível</p>
        </div>
      )}
      {src && (
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload="auto"
          className="w-full h-full object-contain transition-opacity duration-500"
          style={{ opacity: loading ? 0 : 1 }}
          onLoadedData={() => { setLoading(false); setError(false) }}
          onError={() => { setLoading(false); setError(true) }}
        />
      )}
    </div>
  )
}

const GLASS_CONFIG = {
  floating: false,
  blurAmount: 0.07,
  refraction: 1.08,
  chromAberration: 0.05,
  edgeHighlight: 0.05,
  specular: 0,
  fresnel: 1,
  distortion: 0,
  cornerRadius: 20,
  zRadius: 40,
  opacity: 1,
  saturation: 0,
  brightness: 0,
  shadowOpacity: 0.3,
  shadowSpread: 10,
  bevelMode: 0,
};

function PipContent({ currentSong, isPlaying, previous, next, togglePlay }) {
  const { rootRef, glassRef } = useLiquidGlass([isPlaying, currentSong]);

  return (
    <div ref={rootRef} className="relative w-full h-screen overflow-hidden bg-[#121212] select-none text-white">
      {currentSong?.cover_url && (
        <img 
          src={currentSong.cover_url} 
          className="absolute inset-0 w-full h-full object-cover opacity-50" 
          alt="" 
          crossOrigin="anonymous" 
        />
      )}
      
      <div 
        ref={glassRef}
        className="absolute inset-5 flex flex-col p-5 justify-end"
        data-config={JSON.stringify(GLASS_CONFIG)}
      >
        <div className="flex flex-col shrink-0 mb-5 px-1 mt-auto">
           <h3 className="font-bold text-[22px] truncate mb-1 leading-tight">{currentSong?.title}</h3>
           <p className="text-zinc-400 text-[15px] truncate">{currentSong?.artist}</p>
        </div>
        <div className="flex items-center justify-center gap-7">
          <button onClick={previous}><SkipBack size={26} fill="currentColor" /></button>
          <button onClick={togglePlay} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>
          <button onClick={next}><SkipForward size={26} fill="currentColor" /></button>
        </div>
      </div>
    </div>
  );
}
