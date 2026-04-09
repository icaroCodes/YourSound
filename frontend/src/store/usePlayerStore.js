import { create } from 'zustand'

const saveSession = (song, queue) => {
  try {
    localStorage.setItem('ys_current_song', song ? JSON.stringify(song) : '')
    localStorage.setItem('ys_queue', queue?.length ? JSON.stringify(queue) : '')
  } catch {}
}

export const usePlayerStore = create((set, get) => ({
  currentSong: (() => {
    try {
      const saved = localStorage.getItem('ys_current_song')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })(),
  queue: (() => {
    try {
      const saved = localStorage.getItem('ys_queue')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })(),
  isPlaying: false,
  isQueueOpen: false,
  volume: (() => {
    try {
      const saved = localStorage.getItem('ys_volume')
      return saved !== null ? Number(saved) : 1
    } catch { return 1 }
  })(),

  playSong: (song, newQueue = null) => {
    const queue = newQueue ?? get().queue
    try { localStorage.setItem('ys_current_time', '0') } catch {}
    saveSession(song, queue)
    set({
      currentSong: song,
      isPlaying: true,
      ...(newQueue ? { queue: newQueue } : {})
    })
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }))
  },

  toggleQueue: () => {
    set((state) => ({ isQueueOpen: !state.isQueueOpen }))
  },

  next: () => {
    const { currentSong, queue } = get()
    if (!currentSong || queue.length === 0) return

    const currentIndex = queue.findIndex(s => s.id === currentSong.id)
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      const nextSong = queue[currentIndex + 1]
      try { localStorage.setItem('ys_current_time', '0') } catch {}
      saveSession(nextSong, queue)
      set({ currentSong: nextSong, isPlaying: true })
    }
  },

  previous: () => {
    const { currentSong, queue } = get()
    if (!currentSong || queue.length === 0) return

    const currentIndex = queue.findIndex(s => s.id === currentSong.id)
    if (currentIndex > 0) {
      const prevSong = queue[currentIndex - 1]
      try { localStorage.setItem('ys_current_time', '0') } catch {}
      saveSession(prevSong, queue)
      set({ currentSong: prevSong, isPlaying: true })
    }
  },

  setVolume: (volume) => {
    try { localStorage.setItem('ys_volume', volume) } catch {}
    set({ volume })
  },

  clearPlayer: () => {
    try {
      localStorage.removeItem('ys_current_song')
      localStorage.removeItem('ys_queue')
      localStorage.removeItem('ys_current_time')
    } catch {}
    set({ currentSong: null, queue: [], isPlaying: false, progress: 0 })
  }
}))
