import { useEffect, useState } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useAuthStore } from '../store/useAuthStore'
import { api } from '../lib/api'
import { Play } from 'lucide-react'

export default function Home() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const { playSong } = usePlayerStore()
  const { user, userProfile } = useAuthStore()

  useEffect(() => {
    async function fetchSongs() {
      try {
        const data = await api.getSongs()
        setSongs(data)
      } catch (err) {
        console.error("Fetch error:", err.message)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchSongs()
    }
  }, [user])

  const recentSongs = songs.slice(0, 6)
  const recommendedSongs = songs.slice(6)

  if (loading) return (
    <div className="relative pb-10">
      <div className="sticky top-0 z-10 bg-[#121212]/95 backdrop-blur-md px-6 py-3 flex items-center gap-2">
        <div className="h-8 w-16 rounded-full skeleton" />
        <div className="h-8 w-20 rounded-full skeleton" />
        <div className="h-8 w-20 rounded-full skeleton" />
      </div>
      <div className="px-6 mt-4 space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center bg-white/[0.04] rounded overflow-hidden h-16">
              <div className="w-16 h-16 skeleton shrink-0" style={{ borderRadius: 0 }} />
              <div className="px-4 flex-1"><div className="h-3.5 w-3/4 skeleton" /></div>
            </div>
          ))}
        </div>
        <div>
          <div className="h-7 w-52 skeleton mb-5" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-white/[0.03] flex flex-col gap-3">
                <div className="aspect-square rounded-md skeleton" />
                <div className="h-4 w-3/4 skeleton" />
                <div className="h-3 w-1/2 skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative pb-10">
      {/* Sticky Filter Header */}
      <div className="sticky top-0 z-10 bg-[#121212]/95 backdrop-blur-md px-6 py-3 flex items-center gap-2">
        <button className="px-4 py-1.5 bg-white text-black font-medium text-sm rounded-full transition hover:scale-105">Tudo</button>
        <button className="px-4 py-1.5 bg-white/10 text-white font-medium text-sm rounded-full transition hover:bg-white/20">Música</button>
        <button className="px-4 py-1.5 bg-white/10 text-white font-medium text-sm rounded-full transition hover:bg-white/20">Podcasts</button>
      </div>

      <div className="px-6 mt-4 space-y-10">

        {/* Recent Grid */}
        {recentSongs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {recentSongs.map(song => (
              <div
                key={song.id}
                className="group flex items-center bg-white/[0.04] hover:bg-white/10 rounded overflow-hidden transition-colors cursor-pointer pr-4"
                onClick={() => playSong(song, songs)}
              >
                <div className="w-16 h-16 shrink-0 bg-zinc-800 shadow">
                  {song.cover_url ? (
                    <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                  ) : <div className="w-full h-full flex items-center justify-center text-zinc-500">&#9835;</div>}
                </div>
                <div className="px-4 font-bold text-sm tracking-wide truncate flex-1">
                  {song.title}
                </div>
                <button
                  className="w-10 h-10 bg-spotify-green text-black rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:scale-105 transition-all shrink-0"
                  onClick={(e) => { e.stopPropagation(); playSong(song, songs) }}
                >
                  <Play fill="currentColor" size={18} className="ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Personalized Grid */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight hover:underline cursor-pointer">
              Feito para {userProfile?.email?.split('@')[0] || 'você'}
            </h2>
            <button className="text-sm font-bold text-zinc-400 hover:underline">Mostrar tudo</button>
          </div>

          {songs.length === 0 ? (
            <div className="text-zinc-500 py-10 px-4 border border-dashed border-white/10 rounded-lg text-center">
              Você ainda não enviou músicas.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {(recommendedSongs.length > 0 ? recommendedSongs : recentSongs).map((song) => (
                <div
                  key={song.id}
                  className="group p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] transition duration-300 flex flex-col cursor-pointer"
                  onClick={() => playSong(song, songs)}
                >
                  <div className="relative aspect-square rounded-md overflow-hidden mb-4 shadow-xl bg-zinc-800">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <span className="text-zinc-500 text-3xl">&#9835;</span>
                      </div>
                    )}
                    <button
                      className="absolute bottom-2 right-2 w-12 h-12 bg-spotify-green text-black rounded-full flex items-center justify-center shadow-xl transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 hover:bg-spotify-green-hover"
                      onClick={(e) => { e.stopPropagation(); playSong(song, songs) }}
                    >
                      <Play fill="currentColor" size={22} className="ml-0.5" />
                    </button>
                  </div>
                  <h3 className="font-bold text-white truncate text-base mb-1">{song.title}</h3>
                  <p className="text-zinc-400 text-sm truncate font-medium">{song.artist}</p>

                  {song.user_id === user?.id && song.status === 'pending' && (
                    <span className="mt-2 text-[10px] uppercase font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded inline-block self-start">Pendente de aprovação</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
