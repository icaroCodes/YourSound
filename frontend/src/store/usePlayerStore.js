import { create } from 'zustand'

export const usePlayerStore = create((set, get) => ({
  currentSong: null,
  queue: [],
  isPlaying: false,
  volume: 1, // 0 to 1
  
  playSong: (song, newQueue = null) => {
    set({ 
      currentSong: song, 
      isPlaying: true,
      ...(newQueue ? { queue: newQueue } : {})
    })
  },
  
  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }))
  },
  
  next: () => {
    const { currentSong, queue } = get()
    if (!currentSong || queue.length === 0) return
    
    const currentIndex = queue.findIndex(s => s.id === currentSong.id)
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      set({ currentSong: queue[currentIndex + 1], isPlaying: true })
    }
  },
  
  previous: () => {
    const { currentSong, queue } = get()
    if (!currentSong || queue.length === 0) return
    
    const currentIndex = queue.findIndex(s => s.id === currentSong.id)
    if (currentIndex > 0) {
      set({ currentSong: queue[currentIndex - 1], isPlaying: true })
    }
  },
  
  setVolume: (volume) => set({ volume }),
  
  clearPlayer: () => {
    set({ currentSong: null, queue: [], isPlaying: false, progress: 0 })
  }
}))
