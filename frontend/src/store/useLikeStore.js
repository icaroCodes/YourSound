import { create } from 'zustand'
import { api } from '../lib/api'

export const useLikeStore = create((set, get) => ({
  likedIds: new Set(),
  likedSongs: [],
  loaded: false,

  initialize: async () => {
    try {
      const songs = await api.getLikedSongs()
      set({
        likedSongs: songs,
        likedIds: new Set(songs.map(s => s.id)),
        loaded: true
      })
    } catch (err) {
      console.error('Erro ao carregar curtidas:', err)
      set({ loaded: true })
    }
  },

  isLiked: (songId) => get().likedIds.has(songId),

  toggleLike: async (song) => {
    const { likedIds, likedSongs } = get()
    const isCurrentlyLiked = likedIds.has(song.id)

    // Optimistic update
    const newIds = new Set(likedIds)
    let newSongs

    if (isCurrentlyLiked) {
      newIds.delete(song.id)
      newSongs = likedSongs.filter(s => s.id !== song.id)
    } else {
      newIds.add(song.id)
      newSongs = [song, ...likedSongs]
    }

    set({ likedIds: newIds, likedSongs: newSongs })

    try {
      if (isCurrentlyLiked) {
        await api.unlikeSong(song.id)
      } else {
        await api.likeSong(song.id)
      }
    } catch (err) {
      // Revert on error
      console.error('Erro ao curtir/descurtir:', err)
      set({ likedIds, likedSongs })
    }
  }
}))
