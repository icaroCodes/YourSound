import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLikeStore } from '../store/useLikeStore'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Mic2, ListMusic, MonitorSpeaker, Maximize2, Heart, PictureInPicture2 } from 'lucide-react'

export default function Player() {
  const { currentSong, isPlaying, togglePlay, next, previous, volume, setVolume } = usePlayerStore()
  const { isLiked, toggleLike } = useLikeStore()
  const audioRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback error:", e))
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, currentSong])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime)
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e) => {
    const newTime = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setProgress(newTime)
    }
  }

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00"
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
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
            <button className="text-zinc-400"><Shuffle size={16} /></button>
            <button className="text-zinc-400"><SkipBack size={18} fill="currentColor" /></button>
            <button className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full">
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </button>
            <button className="text-zinc-400"><SkipForward size={18} fill="currentColor" /></button>
            <button className="text-zinc-400"><Repeat size={16} /></button>
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
          <Maximize2 size={16} className="hidden lg:block" />
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
        onTimeUpdate={handleTimeUpdate}
        onEnded={next}
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
          onClick={() => toggleLike(currentSong)}
          className={`hidden sm:block hover:scale-110 transition-transform shrink-0 ${isLiked(currentSong.id) ? 'text-spotify-green' : 'text-zinc-400 hover:text-white'}`}
        >
          <Heart size={16} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Center: Controls + Progress */}
      <div className="w-[40%] max-w-[722px] flex flex-col items-center gap-1">
        <div className="flex items-center gap-6">
          <button className="text-zinc-400 hover:text-white transition"><Shuffle size={16} /></button>
          <button onClick={previous} className="text-zinc-400 hover:text-white transition"><SkipBack size={18} fill="currentColor" /></button>
          <button
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={next} className="text-zinc-400 hover:text-white transition"><SkipForward size={18} fill="currentColor" /></button>
          <button className="text-zinc-400 hover:text-white transition"><Repeat size={16} /></button>
        </div>

        <div className="w-full flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
          <span className="w-8 text-right">{formatTime(progress)}</span>
          <div className="flex-1 group relative flex items-center h-4">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
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
      <div className="w-[30%] min-w-[180px] flex items-center justify-end gap-3 text-zinc-400">
        <button className="hover:text-white transition hidden md:block"><Mic2 size={16} /></button>
        <button className="hover:text-white transition hidden md:block"><ListMusic size={16} /></button>
        <button className="hover:text-white transition hidden md:block"><MonitorSpeaker size={16} /></button>

        <div className="flex items-center gap-2 w-[100px] group relative h-4">
          <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="hover:text-white transition z-20">
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

        <button className="hover:text-white transition hidden lg:block"><PictureInPicture2 size={16} /></button>
        <button className="hover:text-white transition hidden lg:block"><Maximize2 size={16} /></button>
      </div>
    </div>
  )
}
