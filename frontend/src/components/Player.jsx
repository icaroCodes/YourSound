import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLikeStore } from '../store/useLikeStore'
import { audioManager } from '../lib/audioRef'
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Mic2, ListMusic, Maximize2, Heart, PictureInPicture2, 
  PlusCircle, Music2, ChevronDown, Share2, MoreHorizontal 
} from 'lucide-react'
import AddToPlaylistModal from './AddToPlaylistModal'
import { useDialogStore } from '../store/useDialogStore'

export default function Player({ isMobile = false }) {
  const { 
    currentSong, isPlaying, togglePlay, next, previous, 
    volume, setVolume, queue, isQueueOpen, toggleQueue, 
    isLyricsOpen, toggleLyrics, repeatMode 
  } = usePlayerStore()
  
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

    if (isPlaying) {
      audio.volume = Math.pow(volume, 2)
      audio.play().catch(e => console.error("Playback error:", e))
    } else {
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
  }, [isPlaying, currentSong, volume])

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.volume = Math.pow(volume, 2)
    }
  }, [volume, isPlaying])

  const handleLoadedData = () => {
    if (audioRef.current) {
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
          ref={audioRef} src={currentSong.file_url}
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
          <button onClick={(e) => { e.stopPropagation(); toggleLike(currentSong.id) }} className={`transition-colors ${isLiked(currentSong.id) ? 'text-spotify-green' : 'text-zinc-400'}`}>
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
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-b from-[#531e1e] to-[#121212] flex flex-col px-8 pt-4 pb-10 text-white select-none animate-in slide-in-from-bottom duration-300">
        <audio
          ref={audioRef} src={currentSong.file_url}
          onLoadedData={handleLoadedData} onTimeUpdate={handleTimeUpdate}
          onEnded={() => repeatMode === 'one' ? (audioRef.current.currentTime = 0, audioRef.current.play()) : next()}
          autoPlay={isPlaying}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
           <button onClick={() => setIsMobileFullScreen(false)} className="p-2"><ChevronDown size={32} /></button>
           <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/60">Tocando de</span>
              <span className="text-xs font-bold truncate max-w-[150px]">Sua Biblioteca</span>
           </div>
           <button className="p-2"><MoreHorizontal size={24} /></button>
        </div>

        {/* Cover */}
        <div className="flex-1 flex items-center justify-center mb-10 px-2 lg:px-4">
           <div className="aspect-square w-full max-w-[340px] rounded-xl overflow-hidden shadow-2xl">
             {currentSong.cover_url ? <img src={currentSong.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Music2 size={80} className="text-zinc-500" /></div>}
           </div>
        </div>

        {/* Info & Like */}
        <div className="flex items-center justify-between gap-4 mb-8">
           <div className="flex flex-col min-w-0">
              <h2 className="text-2xl font-black truncate leading-tight">{currentSong.title}</h2>
              <p className="text-lg text-white/70 truncate">{currentSong.artist}</p>
           </div>
           <button onClick={() => toggleLike(currentSong.id)} className={`${isLiked(currentSong.id) ? 'text-spotify-green' : 'text-white'}`}>
             <Heart size={32} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
           </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
           <div className="relative h-1.5 w-full bg-white/20 rounded-full mb-3">
              <div 
                 className="absolute h-full bg-white rounded-full" 
                 style={{ width: `${(progress / Math.max(duration, 1)) * 100}%` }}
              />
              <div 
                 className="absolute h-4 w-4 bg-white rounded-full -top-[5px] -ml-2 shadow-lg"
                 style={{ left: `${(progress / Math.max(duration, 1)) * 100}%` }}
              />
              <input 
                 type="range" min="0" max={duration || 100} value={progress}
                 onPointerDown={() => setIsSeeking(true)} onChange={handleSeekChange} onPointerUp={handleSeekCommit}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
           </div>
           <div className="flex justify-between text-[11px] font-bold text-white/60">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
           </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-10 px-2">
           <button className="text-spotify-green"><Shuffle size={24} /></button>
           <button onClick={previous}><SkipBack size={36} fill="currentColor" /></button>
           <button onClick={togglePlay} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-xl">
             {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
           </button>
           <button onClick={next}><SkipForward size={36} fill="currentColor" /></button>
           <button className="text-white/60"><Repeat size={24} /></button>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-2">
           <button className="text-white/60 hover:text-white transition"><MonitorSpeaker size={20} /></button>
           <div className="flex items-center gap-6">
              <button 
                onClick={() => { toggleLyrics(); setIsMobileFullScreen(false) }}
                className={`transition ${isLyricsOpen ? 'text-spotify-green' : 'text-white/60 hover:text-white'}`}
              >
                <Mic2 size={20} />
              </button>
              <button className="text-white/60 hover:text-white transition"><Share2 size={20} /></button>
              <button 
                onClick={() => { toggleQueue(); setIsMobileFullScreen(false) }}
                className={`transition ${isQueueOpen ? 'text-spotify-green' : 'text-white/60 hover:text-white'}`}
              >
                <ListMusic size={20} />
              </button>
           </div>
        </div>
      </div>
    )
  }

  // --- DESKTOP PLAYER ---
  return (
    <div className="w-full h-full flex items-center justify-between px-4">
      <audio
        ref={audioRef} src={currentSong.file_url}
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
        <button onClick={() => setAddModalOpen(true)} className="hidden sm:block hover:scale-105 transition-transform shrink-0 text-[#b3b3b3] hover:text-white ml-2"><PlusCircle size={16} strokeWidth={1.5} /></button>
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
        <div className="w-full h-screen flex flex-col p-5 bg-[#121212] overflow-hidden text-white select-none">
          <div className="flex-1 w-full min-h-0 mb-6 flex items-center justify-center">
            {currentSong.cover_url ? <img src={currentSong.cover_url} className="w-full h-full max-w-[400px] object-cover rounded-xl shadow-2xl" alt="" /> : <div className="w-full h-full max-w-[400px] bg-zinc-800 rounded-xl flex items-center justify-center shadow-2xl"><span className="text-zinc-500 text-6xl">&#9835;</span></div>}
          </div>
          <div className="flex flex-col shrink-0 mb-5 px-1">
             <h3 className="font-bold text-[22px] truncate mb-1 leading-tight">{currentSong.title}</h3>
             <p className="text-zinc-400 text-[15px] truncate">{currentSong.artist}</p>
          </div>
          <div className="flex items-center justify-center gap-7">
            <button onClick={previous}><SkipBack size={26} fill="currentColor" /></button>
            <button onClick={togglePlay} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg">{isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}</button>
            <button onClick={next}><SkipForward size={26} fill="currentColor" /></button>
          </div>
        </div>,
        pipWindow.document.body
      )}
    </div>
  )
}
