import { useEffect, useState, useRef, useCallback } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'
import { audioManager } from '../lib/audioRef'
import { fetchLyrics } from '../lib/lyrics'
import { Mic2 } from 'lucide-react'

export default function Lyrics({ centered = false }) {
  const currentSong = usePlayerStore(s => s.currentSong)

  const [lines, setLines] = useState(null)
  const [plain, setPlain] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef(null)
  const lineRefs = useRef([])
  const lastScrolledIndex = useRef(-1)
  const rafRef = useRef(null)
  const linesRef = useRef(null)

  linesRef.current = lines

  // Wait for the audio duration, then fetch lyrics with it
  useEffect(() => {
    if (!currentSong) return

    let cancelled = false
    setLines(null)
    setPlain(null)
    setError(false)
    setLoading(true)
    setActiveIndex(-1)
    lastScrolledIndex.current = -1

    // Manual lyrics support
    if (currentSong.subtitle_mode === 'manual' && currentSong.subtitle_data) {
      setLines(currentSong.subtitle_data)
      setLoading(false)
      return
    }

    const doFetch = (audioDuration) => {
      if (cancelled) return

      fetchLyrics(currentSong.artist, currentSong.title, audioDuration)
        .then(({ synced, plain, lrcDuration }) => {
          if (cancelled) return
          if (!synced && !plain) { setError(true); return }

          if (synced && lrcDuration > 0 && audioDuration > 0) {
            const ratio = audioDuration / lrcDuration
            if (Math.abs(ratio - 1) > 0.03) {
              setLines(synced.map(l => ({ ...l, time: l.time * ratio })))
            } else {
              setLines(synced)
            }
          } else {
            setLines(synced)
          }
          setPlain(plain)
        })
        .catch(() => { if (!cancelled) setError(true) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }

    const audio = audioManager.element
    if (audio && audio.src && isFinite(audio.duration) && audio.duration > 0) {
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
  }, [currentSong?.id, currentSong?.subtitle_mode, currentSong?.subtitle_data])

  // RAF loop: read audio.currentTime directly for frame-accurate sync
  const tick = useCallback(() => {
    const syncedLines = linesRef.current
    const audio = audioManager.element
    if (!syncedLines || !audio) {
      rafRef.current = requestAnimationFrame(tick)
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
    rafRef.current = requestAnimationFrame(tick)
  }, [currentSong?.subtitle_mode])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [tick])

  // Auto-scroll to active line
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">Buscando letra...</p>
      </div>
    )
  }

  if (error || (!lines && !plain)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
        <Mic2 size={36} className="text-zinc-600" />
        <p className="text-zinc-400 text-sm">Letra não disponível para esta música.</p>
      </div>
    )
  }

  if (lines) {
    return (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scroll-smooth custom-scrollbar"
        style={{ padding: centered ? '3rem 2rem' : '2rem 1.5rem' }}
      >
        <div className={`flex flex-col gap-1 pb-40 ${centered ? 'items-center text-center' : ''}`}>
          {lines.map((line, i) => {
            const isActive = i === activeIndex
            const isPast = i < activeIndex
            if (!line.text) return <div key={i} className="h-6" />

            return (
              <p
                key={i}
                ref={el => lineRefs.current[i] = el}
                className={`font-bold leading-relaxed transition-all duration-300 cursor-default select-none ${
                  centered ? 'text-[28px]' : 'text-[22px]'
                } ${
                  isActive
                    ? 'text-white scale-[1.02] origin-center'
                    : isPast
                      ? 'text-zinc-600'
                      : 'text-zinc-500'
                }`}
              >
                {line.text}
              </p>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-8 custom-scrollbar">
      <div className="flex flex-col gap-2 pb-20">
        {plain.split('\n').map((line, i) => (
          <p key={i} className={`text-lg font-semibold leading-relaxed ${line.trim() ? 'text-zinc-300' : 'h-4'}`}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
