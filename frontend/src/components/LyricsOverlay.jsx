import { useEffect, useState, useRef, useCallback } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useAuthStore } from '../store/useAuthStore'
import { audioManager } from '../lib/audioRef'
import { fetchLyrics } from '../lib/lyrics'
import { X, Mic2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function LyricsOverlay() {
  const { currentSong, toggleLyrics } = usePlayerStore()

  const videoUrl = currentSong?.subtitle_video_url
  const isVideoMode = currentSong?.subtitle_mode === 'video' && !!videoUrl

  // Lyrics state
  const [lines, setLines] = useState(null)
  const [plain, setPlain] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  // Video state
  const [videoBlobUrl, setVideoBlobUrl] = useState(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const containerRef = useRef(null)
  const lineRefs = useRef([])
  const lastScrolledIndex = useRef(-1)
  const lyricsRafRef = useRef(null)
  const linesRef = useRef(null)
  const videoRef = useRef(null)
  const syncRafRef = useRef(null)

  linesRef.current = lines

  // ── 1. Fetch lyrics ──
  useEffect(() => {
    if (!currentSong) return

    let cancelled = false
    setLines(null)
    setPlain(null)
    setError(false)
    setLoading(true)
    setActiveIndex(-1)
    lastScrolledIndex.current = -1

    if (isVideoMode || currentSong.subtitle_mode === 'manual') {
      if (currentSong.subtitle_mode === 'manual' && currentSong.subtitle_data) {
        setLines(currentSong.subtitle_data)
      }
      setLoading(false)
      return
    }

    const doFetch = (audioDuration) => {
      if (cancelled) return
      fetchLyrics(currentSong.artist, currentSong.title, audioDuration)
        .then(({ synced, plain: p, lrcDuration }) => {
          if (cancelled) return
          if (!synced && !p) { setError(true); return }
          if (synced && lrcDuration > 0 && audioDuration > 0) {
            const ratio = audioDuration / lrcDuration
            setLines(Math.abs(ratio - 1) > 0.03
              ? synced.map(l => ({ ...l, time: l.time * ratio }))
              : synced)
          } else {
            setLines(synced)
          }
          setPlain(p)
        })
        .catch(() => { if (!cancelled) setError(true) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }

    const audio = audioManager.element
    if (audio?.src && isFinite(audio.duration) && audio.duration > 0) {
      doFetch(audio.duration)
    } else if (audio) {
      const onReady = () => {
        if (!cancelled && isFinite(audio.duration)) doFetch(audio.duration)
        audio.removeEventListener('loadedmetadata', onReady)
        audio.removeEventListener('durationchange', onReady)
      }
      audio.addEventListener('loadedmetadata', onReady)
      audio.addEventListener('durationchange', onReady)
      return () => { cancelled = true; audio.removeEventListener('loadedmetadata', onReady); audio.removeEventListener('durationchange', onReady) }
    } else {
      doFetch(currentSong.duration || 0)
    }
    return () => { cancelled = true }
  }, [currentSong?.id, currentSong?.subtitle_mode])

  // ── 2. Set video URL (proxy supports range requests, browser can seek natively) ──
  const token = useAuthStore(state => state.session?.access_token)
  useEffect(() => {
    if (!isVideoMode || !videoUrl) {
      setVideoBlobUrl(null)
      setVideoLoading(false)
      setVideoError(false)
      return
    }

    setVideoLoading(true)
    setVideoError(false)
    if (videoUrl.match(/youtube\.com\/|youtu\.be\/|tiktok\.com\//)) {
      setVideoBlobUrl(`${API_BASE}/api/songs/proxy-stream?url=${encodeURIComponent(videoUrl)}&type=video&token=${token || ''}`)
    } else {
      setVideoBlobUrl(videoUrl)
    }
  }, [isVideoMode, videoUrl, token])

  // ── 3. Audio ↔ Video sync via RAF + event listeners ──
  useEffect(() => {
    if (!isVideoMode || !videoBlobUrl) return

    const audio = audioManager.element
    if (!audio) return

    // Wait for video ref
    const waitId = setInterval(() => {
      const video = videoRef.current
      if (!video) return
      clearInterval(waitId)

      // -- RAF sync loop: correct drift every frame --
      const syncLoop = () => {
        const v = videoRef.current
        if (!v || !audio) {
          syncRafRef.current = requestAnimationFrame(syncLoop)
          return
        }

        const drift = audio.currentTime - v.currentTime

        if (Math.abs(drift) > 0.1 && v.readyState >= 2) {
          v.currentTime = audio.currentTime
        }

        if (!audio.paused && v.paused && v.readyState >= 2) {
          v.play().catch(() => {})
        }
        if (audio.paused && !v.paused) {
          v.pause()
        }

        syncRafRef.current = requestAnimationFrame(syncLoop)
      }

      // -- Instant event-driven sync --
      const onSeeking = () => {
        if (videoRef.current) videoRef.current.currentTime = audio.currentTime
      }
      const onSeeked = () => {
        if (videoRef.current) videoRef.current.currentTime = audio.currentTime
      }
      const onPlay = () => {
        if (videoRef.current) {
          videoRef.current.currentTime = audio.currentTime
          videoRef.current.play().catch(() => {})
        }
      }
      const onPause = () => {
        if (videoRef.current) videoRef.current.pause()
      }

      audio.addEventListener('seeking', onSeeking)
      audio.addEventListener('seeked', onSeeked)
      audio.addEventListener('play', onPlay)
      audio.addEventListener('pause', onPause)

      // Initial sync
      const initSync = () => {
        video.currentTime = audio.currentTime
        if (!audio.paused) video.play().catch(() => {})
      }

      if (video.readyState >= 2) {
        initSync()
      } else {
        video.addEventListener('loadeddata', initSync, { once: true })
      }

      syncRafRef.current = requestAnimationFrame(syncLoop)

      // Store cleanup
      video._cleanup = () => {
        if (syncRafRef.current) cancelAnimationFrame(syncRafRef.current)
        audio.removeEventListener('seeking', onSeeking)
        audio.removeEventListener('seeked', onSeeked)
        audio.removeEventListener('play', onPlay)
        audio.removeEventListener('pause', onPause)
      }
    }, 30)

    return () => {
      clearInterval(waitId)
      if (syncRafRef.current) cancelAnimationFrame(syncRafRef.current)
      if (videoRef.current?._cleanup) videoRef.current._cleanup()
    }
  }, [isVideoMode, videoBlobUrl])

  // ── 4. Lyrics RAF sync ──
  const tick = useCallback(() => {
    const syncedLines = linesRef.current
    const audio = audioManager.element
    if (!syncedLines || !audio) {
      lyricsRafRef.current = requestAnimationFrame(tick)
      return
    }
    const delay = currentSong?.subtitle_mode === 'manual' ? 0 : 7.5
    const t = audio.currentTime - delay
    let idx = -1
    for (let i = 0; i < syncedLines.length; i++) {
      if (t >= syncedLines[i].time) idx = i
      else break
    }
    setActiveIndex(prev => prev === idx ? prev : idx)
    lyricsRafRef.current = requestAnimationFrame(tick)
  }, [currentSong?.subtitle_mode])

  useEffect(() => {
    lyricsRafRef.current = requestAnimationFrame(tick)
    return () => { if (lyricsRafRef.current) cancelAnimationFrame(lyricsRafRef.current) }
  }, [tick])

  // ── 5. Auto-scroll ──
  useEffect(() => {
    if (activeIndex < 0 || activeIndex === lastScrolledIndex.current) return
    lastScrolledIndex.current = activeIndex
    const el = lineRefs.current[activeIndex]
    const container = containerRef.current
    if (el && container) {
      container.scrollTo({
        top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2,
        behavior: 'smooth'
      })
    }
  }, [activeIndex])

  // ── 6. Escape ──
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') toggleLyrics() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleLyrics])

  // ── Render lyrics ──
  let content
  if (loading) {
    content = (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-10 h-10 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-base">Buscando letra...</p>
      </div>
    )
  } else if (!isVideoMode && (error || (!lines && !plain))) {
    content = (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <Mic2 size={48} className="text-white/20" />
        <p className="text-white/40 text-lg font-medium">Letra não disponível para esta música.</p>
      </div>
    )
  } else if (lines) {
    content = (
      <div className="flex flex-col gap-2 py-[25vh]">
        {lines.map((line, i) => {
          const isActive = i === activeIndex
          const isPast = i < activeIndex
          if (!line.text) return <div key={i} className="h-8" />
          return (
            <p
              key={i}
              ref={el => lineRefs.current[i] = el}
              className={`text-[28px] md:text-[34px] font-extrabold leading-snug transition-all duration-500 cursor-default select-none ${
                isActive
                  ? 'text-white scale-[1.01] origin-left'
                  : isPast ? 'text-white/30' : 'text-white/50'
              }`}
            >
              {line.text}
            </p>
          )
        })}
      </div>
    )
  } else if (plain) {
    content = (
      <div className="flex flex-col gap-2 py-[25vh]">
        {plain.split('\n').map((line, i) => (
          <p key={i} className={`text-[28px] md:text-[34px] font-extrabold leading-snug ${line.trim() ? 'text-white/60' : 'h-8'}`}>
            {line}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden rounded-lg">
      {/* Background */}
      <div className="absolute inset-0 bg-black" />

      {isVideoMode ? (
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-black">
          {videoLoading && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {videoError && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40">
                <p className="text-white/30 text-xs font-mono uppercase tracking-widest">Vídeo indisponível</p>
             </div>
          )}
          {videoBlobUrl && (
            <video
              ref={videoRef}
              src={videoBlobUrl}
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: videoLoading ? 0 : 1 }}
              onLoadedData={() => { 
                setVideoLoading(false); 
                setVideoError(false);
              }}
              onError={() => {
                console.error('[LyricsOverlay] Video playback failed');
                setVideoLoading(false);
                setVideoError(true);
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />
        </div>
      ) : (
        currentSong?.cover_url && (
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${currentSong.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(80px) brightness(0.2) saturate(2)',
                transform: 'scale(1.3)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
          </div>
        )
      )}

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between p-6 shrink-0">
        <div className="flex flex-col min-w-0">
          <h3 className="text-white font-bold text-lg leading-tight truncate max-w-[200px] sm:max-w-[400px]">
            {currentSong?.title}
          </h3>
          <p className="text-white/60 text-sm truncate">{currentSong?.artist}</p>
        </div>
        <button
          onClick={toggleLyrics}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white backdrop-blur-md border border-white/10 shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      {/* Lyrics */}
      <div
        ref={containerRef}
        className="relative z-10 flex-1 overflow-y-auto px-10 scroll-smooth lyrics-overlay-scroll select-none"
      >
        <div className="max-w-3xl mx-auto h-full">
          {content}
        </div>
      </div>

      {currentSong?.subtitle_mode === 'manual' && (
        <div className="relative z-20 p-4 flex justify-center shrink-0">
          <div className="px-4 py-1.5 bg-red-500/20 rounded-full border border-red-500/30 backdrop-blur-sm">
            <span className="text-red-400 text-[10px] uppercase font-bold tracking-widest">Legenda Manual</span>
          </div>
        </div>
      )}
    </div>
  )
}
