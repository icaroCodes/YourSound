/**
 * Animated equalizer bars shown when a song is active.
 * When `isPlaying` is false the bars freeze (paused state).
 */
export default function PlayingBars({ isPlaying, height = 12 }) {
  return (
    <div
      className="flex items-end gap-[2px]"
      style={{ height }}
    >
      <span className={`music-bar${isPlaying ? '' : ' paused'}`} style={{ height: '60%' }} />
      <span className={`music-bar${isPlaying ? '' : ' paused'}`} style={{ height: '100%' }} />
      <span className={`music-bar${isPlaying ? '' : ' paused'}`} style={{ height: '45%' }} />
    </div>
  )
}
