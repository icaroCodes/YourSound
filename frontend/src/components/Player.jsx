import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLikeStore } from '../store/useLikeStore'
import { audioManager } from '../lib/audioRef'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Mic2, ListMusic, MonitorSpeaker, Maximize2, Heart, PictureInPicture2, X, PlusCircle } from 'lucide-react'
import AddToPlaylistModal from './AddToPlaylistModal'
import { useDialogStore } from '../store/useDialogStore'

export default function Player() {
  const { currentSong, isPlaying, togglePlay, next, previous, volume, setVolume, queue, playSong, isQueueOpen, toggleQueue, isLyricsOpen, toggleLyrics, repeatMode, toggleRepeat } = usePlayerStore()
  const { isLiked } = useLikeStore()
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

  const currentIndex = queue?.findIndex(s => s.id === currentSong?.id) ?? -1
  const nextSongs = currentIndex >= 0 && queue ? queue.slice(currentIndex + 1, currentIndex + 11) : []

  // Share audio element for direct access (Lyrics, etc.)
  useEffect(() => {
    audioManager.element = audioRef.current
    return () => { audioManager.element = null }
  }, [])

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
        try { navigator.mediaSession.setActionHandler(action, null) } catch {}
      })
    }
  }, [currentSong, isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Handlers para Reprodução com Fade (Suavidade) ---
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Limpar qualquer fade out que ainda esteja ocorrendo
    if (fadeInterval.current) {
      clearInterval(fadeInterval.current)
      fadeInterval.current = null
    }

    if (isPlaying) {
      // Define volume logarítimico (Math.pow(2)) para soar natural e evitar o efeito estrondoso
      audio.volume = Math.pow(volume, 2)
      audio.play().catch(e => console.error("Playback error:", e))
    } else {
      // iOS Safari ignora audio.volume (read-only), então o fade nunca chegaria
      // a 0 e audio.pause() nunca seria chamado. Nesse caso, pausa direto.
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      if (isIOS || audio.volume <= 0.01) {
        audio.pause()
      } else {
        // Fade out suave - 250ms de decaimento (apenas desktop)
        const startVol = audio.volume
        const fadeStep = startVol / 15
        let iterations = 0
        fadeInterval.current = setInterval(() => {
          if (!audio) { clearInterval(fadeInterval.current); return }
          iterations++
          let nextVol = audio.volume - fadeStep
          // Se o volume não está mudando (iOS ignorando) ou chegou no fim, pausa
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
  }, [isPlaying, currentSong]) // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza o volume naturalmente durante a reprodução
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.volume = Math.pow(volume, 2)
    }
  }, [volume, isPlaying])

  const handleLoadedData = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration
      setDuration(dur)
      // Persist duration to DB for songs that don't have it yet
      if (currentSong && (!currentSong.duration) && dur && isFinite(dur)) {
        import('../lib/api').then(({ api }) => {
          api.updateSongDuration?.(currentSong.id, dur).catch(() => {})
        })
      }
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
      } catch {}
    }
  }

  const handleTimeUpdate = () => {
    // Apenas atualiza a barra recarregando se não estivermos arrastando o mouse
    if (audioRef.current && !isSeeking) {
      const t = audioRef.current.currentTime
      setProgress(t)
      setDuration(audioRef.current.duration)
      // Salva o tempo a cada segundo inteiro
      const intT = Math.floor(t)
      if (intT !== lastSavedTimeRef.current) {
        lastSavedTimeRef.current = intT
        try { localStorage.setItem('ys_current_time', String(t)) } catch {}
      }
    }
  }

  const handleSeekChange = (e) => {
    // Muda visualmente o progress, evitando modificar o source de áudio imediatamente para barrar ruídos e repetições brutas 
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
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const togglePiP = async () => {
    if (pipWindow) {
      pipWindow.close()
      return
    }

    if (!('documentPictureInPicture' in window)) {
      await showAlert('Seu navegador não suporta Picture-in-Picture.', { title: 'Não suportado', icon: 'info' })
      return
    }

    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 380,
      })
      
      // Copiar todos os estilos (Tailwind) para a janela PiP
      ;[...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((r) => r.cssText).join('')
          const style = document.createElement('style')
          style.textContent = cssRules
          pip.document.head.appendChild(style)
        } catch (e) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.type = styleSheet.type
          link.media = styleSheet.media
          link.href = styleSheet.href
          pip.document.head.appendChild(link)
        }
      })

      // Resetar margins/bg da nova janela
      pip.document.body.style.margin = '0'
      pip.document.body.style.backgroundColor = '#121212'

      pip.addEventListener('pagehide', () => {
        setPipWindow(null)
      })

      setPipWindow(pip)
    } catch (err) {
      console.error(err)
    }
  }

  /* ─── Empty State ─── */
  if (!currentSong) {
    return (
      <div className="w-full h-full flex items-center justify-between px-4">
        <div className="w-[30%] min-w-[180px] flex items-center gap-3">
          <div className="w-14 h-14 rounded bg-zinc-800 flex items-center justify-center shrink-0">
            <span className="text-zinc-500">&#9835;</span>
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium text-zinc-500">--</span>
            <span className="text-xs text-zinc-600">--</span>
          </div>
        </div>

        <div className="w-[40%] max-w-[722px] flex flex-col items-center gap-1">
          <div className="flex items-center gap-6 opacity-40 pointer-events-none">
            <button className="text-zinc-400"><SkipBack size={18} fill="currentColor" /></button>
            <button className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full">
               <Play size={16} fill="currentColor" className="ml-0.5" />
            </button>
            <button className="text-zinc-400"><SkipForward size={18} fill="currentColor" /></button>
          </div>
          <div className="w-full flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
            <span className="w-8 text-right">0:00</span>
            <div className="flex-1 h-1 bg-zinc-700/50 rounded-full" />
            <span className="w-8">--:--</span>
          </div>
        </div>

        <div className="w-[30%] min-w-[180px] flex items-center justify-end gap-3 text-zinc-600">
          <Mic2 size={16} className="hidden md:block" />
          <ListMusic size={16} className="hidden md:block" />
          <MonitorSpeaker size={16} className="hidden md:block" />
          <div className="flex items-center gap-2 w-[100px] group relative h-4">
            <button className="text-zinc-500 z-20"><Volume2 size={16} /></button>
            <div className="flex-1 relative flex items-center h-full">
              <div className="w-full h-1 bg-zinc-600 rounded-full" />
            </div>
          </div>
          <Maximize2 size={16} className="hidden lg:block cursor-pointer hover:text-white transition" onClick={toggleFullscreen} />
        </div>
      </div>
    )
  }

  /* ─── Active Player ─── */
  return (
    <div className="w-full h-full flex items-center justify-between px-4">
      <audio
        ref={audioRef}
        src={currentSong.file_url}
        onLoadedData={handleLoadedData}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (repeatMode === 'one' && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => {})
          } else {
            next()
          }
        }}
        autoPlay={isPlaying}
      />

      {/* Left: Now Playing */}
      <div className="w-[30%] min-w-[180px] flex items-center gap-3">
        {currentSong.cover_url ? (
          <img src={currentSong.cover_url} alt="" className="w-14 h-14 rounded object-cover shadow-md shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded bg-zinc-800 flex items-center justify-center shrink-0">
            <span className="text-zinc-500">&#9835;</span>
          </div>
        )}
        <div className="flex flex-col truncate">
          <span className="text-sm font-medium text-white hover:underline cursor-pointer truncate">{currentSong.title}</span>
          <span className="text-xs text-zinc-400 hover:text-white hover:underline cursor-pointer truncate">{currentSong.artist}</span>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="hidden sm:block hover:scale-110 transition-transform shrink-0 text-zinc-400 hover:text-white"
          title="Adicionar à playlist"
        >
          <PlusCircle size={18} />
        </button>
      </div>

      {/* Add to Playlist Modal */}
      {addModalOpen && (
        <AddToPlaylistModal song={currentSong} onClose={() => setAddModalOpen(false)} />
      )}

      {/* Center: Controls + Progress */}
      <div className="w-[40%] max-w-[722px] flex flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleRepeat}
            title={repeatMode === 'off' ? 'Repetir' : repeatMode === 'all' ? 'Repetir tudo' : 'Repetir uma'}
            className={`relative transition ${repeatMode !== 'off' ? 'text-spotify-green' : 'text-zinc-400 hover:text-white'}`}
          >
            {repeatMode === 'one'
              ? <span className="relative"><Repeat size={16} /><span className="absolute -top-1 -right-1 text-[8px] font-bold leading-none">1</span></span>
              : <Repeat size={16} />}
          </button>
          <button onClick={previous} className="text-zinc-400 hover:text-white transition"><SkipBack size={18} fill="currentColor" /></button>
          <button
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={next} className="text-zinc-400 hover:text-white transition"><SkipForward size={18} fill="currentColor" /></button>
          <div className="w-4" />
        </div>

        <div className="w-full flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
          <span className="w-8 text-right">{formatTime(progress)}</span>
          <div className="flex-1 group relative flex items-center h-4">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onPointerDown={() => setIsSeeking(true)}
              onChange={handleSeekChange}
              onPointerUp={handleSeekCommit}
              className="absolute w-full h-1 opacity-0 cursor-pointer z-10"
            />
            <div className="w-full h-1 bg-zinc-600 rounded-full overflow-hidden absolute pointer-events-none group-hover:h-1.5 transition-all">
              <div
                className="h-full bg-white group-hover:bg-spotify-green transition-colors"
                style={{ width: `${(progress / Math.max(duration, 1)) * 100}%` }}
              />
            </div>
            <div
              className="absolute h-3 w-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow pointer-events-none transition-opacity"
              style={{ left: `calc(${(progress / Math.max(duration, 1)) * 100}% - 6px)` }}
            />
          </div>
          <span className="w-8">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume + Extras */}
      <div className="w-[30%] min-w-[180px] flex items-center justify-end gap-3 text-zinc-400 relative">
        <button
          onClick={toggleLyrics}
          className={`transition hidden md:block ${isLyricsOpen ? 'text-spotify-green' : 'hover:text-white'}`}
          title="Letras"
        >
          <Mic2 size={16} />
        </button>
        <button 
          onClick={toggleQueue}
          className={`transition hidden md:block ${isQueueOpen ? 'text-spotify-green' : 'hover:text-white'}`}
          title="Fila"
        >
          <ListMusic size={16} />
        </button>
        <button className="hover:text-white transition hidden md:block"><MonitorSpeaker size={16} /></button>

        {/* --- Queue now lives in RightPanel --- */}

        <div className="flex items-center gap-2 w-[100px] group relative h-4">
          <button onClick={() => {
            if (volume === 0) {
              setVolume(previousVolume > 0 ? previousVolume : 1)
            } else {
              setPreviousVolume(volume)
              setVolume(0)
            }
          }} className="hover:text-white transition z-20">
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="flex-1 relative flex items-center h-full">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="absolute w-full h-1 opacity-0 cursor-pointer z-10"
            />
            <div className="w-full h-1 bg-zinc-600 rounded-full overflow-hidden absolute pointer-events-none group-hover:h-1.5 transition-all">
              <div className="h-full bg-white group-hover:bg-spotify-green" style={{ width: `${volume * 100}%` }} />
            </div>
            <div className="absolute h-3 w-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow pointer-events-none" style={{ left: `calc(${volume * 100}% - 6px)` }} />
          </div>
        </div>

        <button onClick={togglePiP} title="Mini Player" className={`transition hidden lg:block ${pipWindow ? 'text-spotify-green' : 'hover:text-white'}`}>
          <PictureInPicture2 size={16} />
        </button>
        <button onClick={toggleFullscreen} className="hover:text-white transition hidden lg:block"><Maximize2 size={16} /></button>
      </div>

      {/* ─── PiP Portal ─── */}
      {pipWindow && createPortal(
        <div className="w-full h-screen flex flex-col p-5 bg-[#121212] overflow-hidden text-white select-none">
          {/* Cover */}
          <div className="flex-1 w-full min-h-0 mb-6 flex items-center justify-center">
            {currentSong.cover_url ? (
              <img src={currentSong.cover_url} className="w-full h-full max-w-[400px] object-cover rounded-xl shadow-2xl" alt="" />
            ) : (
              <div className="w-full h-full max-w-[400px] bg-zinc-800 rounded-xl flex items-center justify-center shadow-2xl">
                <span className="text-zinc-500 text-6xl">&#9835;</span>
              </div>
            )}
          </div>
          
          {/* Info & Like */}
          <div className="flex flex-col shrink-0 mb-5 px-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <h3 className="font-bold text-[22px] truncate hover:underline cursor-pointer tracking-tight leading-tight mb-1">{currentSong.title}</h3>
                <p className="text-zinc-400 text-[15px] truncate hover:underline cursor-pointer hover:text-white transition-colors">{currentSong.artist}</p>
              </div>
              <button onClick={() => setAddModalOpen(true)} className="shrink-0 hover:scale-110 transition-transform text-zinc-400 hover:text-white">
                <PlusCircle size={26} />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-7 shrink-0 pb-4">
            <button onClick={previous} className="text-zinc-400 hover:text-white transition">
              <SkipBack size={26} fill="currentColor" />
            </button>
            <button onClick={togglePlay} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={next} className="text-zinc-400 hover:text-white transition">
              <SkipForward size={26} fill="currentColor" />
            </button>
          </div>
        </div>,
        pipWindow.document.body
      )}
    </div>
  )
}
