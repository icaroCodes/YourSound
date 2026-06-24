import { useEffect, useRef, useState, useCallback } from 'react'
import { audioManager } from '../lib/audioRef'
import { fetchLyrics } from '../lib/lyrics'
import { Mic2 } from 'lucide-react'

/**
 * Legenda automática estilo "karaokê" para o player mobile.
 * - A lista acompanha a música sozinha (sem scroll interno → sem dois scrolls).
 * - A linha atual fica grande e branca; as demais ficam apagadas.
 * - Tocar numa linha pula o áudio para aquele trecho.
 */
export default function MobileLyrics({ song }) {
  const [lines, setLines] = useState(null)
  const [plain, setPlain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [offsetY, setOffsetY] = useState(0)

  const containerRef = useRef(null)
  const lineRefs = useRef([])
  const rafRef = useRef(null)
  const linesRef = useRef(null)
  linesRef.current = lines

  // ── Busca a letra (espera a duração do áudio para alinhar os tempos) ──
  useEffect(() => {
    if (!song) return
    let cancelled = false
    setLines(null); setPlain(null); setError(false); setLoading(true); setActiveIndex(-1)

    const doFetch = (audioDuration) => {
      if (cancelled) return
      fetchLyrics(song.artist, song.title, audioDuration)
        .then(({ synced, plain, lrcDuration }) => {
          if (cancelled) return
          if (!synced && !plain) { setError(true); return }
          if (synced && lrcDuration > 0 && audioDuration > 0) {
            const ratio = audioDuration / lrcDuration
            setLines(Math.abs(ratio - 1) > 0.03 ? synced.map(l => ({ ...l, time: l.time * ratio })) : synced)
          } else {
            setLines(synced)
          }
          setPlain(plain)
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
      doFetch(song.duration || 0)
    }
    return () => { cancelled = true }
  }, [song?.id])

  // ── Linha ativa sincronizada com o tempo real do áudio (sem offset artificial) ──
  const tick = useCallback(() => {
    const synced = linesRef.current
    const audio = audioManager.element
    if (synced && audio) {
      const t = audio.currentTime
      let idx = -1
      for (let i = 0; i < synced.length; i++) {
        if (t >= synced[i].time) idx = i
        else break
      }
      setActiveIndex(prev => (prev === idx ? prev : idx))
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [tick])

  // ── Centraliza a linha ativa via transform (sem scrollbar) ──
  useEffect(() => {
    const container = containerRef.current
    const el = lineRefs.current[activeIndex]
    if (container && el) {
      setOffsetY(container.clientHeight / 2 - (el.offsetTop + el.clientHeight / 2))
    }
  }, [activeIndex, lines])

  const seekTo = (time) => {
    const audio = audioManager.element
    if (audio && isFinite(time)) audio.currentTime = time
  }

  // ── Estados de loading / erro ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Buscando letra...</p>
      </div>
    )
  }

  if (error || (!lines && !plain)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <Mic2 size={40} className="text-white/20" />
        <p className="text-white/40 text-base font-medium">Letra não disponível para esta música.</p>
      </div>
    )
  }

  // ── Letra sincronizada (karaokê auto-follow) ──
  if (lines) {
    return (
      <div ref={containerRef} className="relative h-full overflow-hidden">
        <div
          className="absolute left-0 right-0 top-0 px-6 transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {lines.map((line, i) => {
            const isActive = i === activeIndex
            const isPast = i < activeIndex
            if (!line.text) return <div key={i} ref={el => (lineRefs.current[i] = el)} className="h-5" />
            return (
              <p
                key={i}
                ref={el => (lineRefs.current[i] = el)}
                onClick={() => seekTo(line.time)}
                className={`text-center font-extrabold leading-snug py-2.5 transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'text-white text-[27px] scale-100'
                    : isPast
                      ? 'text-white/25 text-[21px]'
                      : 'text-white/40 text-[21px]'
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

  // ── Letra sem sincronização (texto simples) — único scroll ──
  return (
    <div className="h-full overflow-y-auto px-6 py-6 no-scrollbar text-center">
      <div className="flex flex-col gap-2 pb-24">
        {plain.split('\n').map((line, i) => (
          <p key={i} className={`text-[19px] font-bold leading-relaxed ${line.trim() ? 'text-white/80' : 'h-4'}`}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
