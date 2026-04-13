import { useEffect, useState } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useAuthStore } from '../store/useAuthStore'
import { api } from '../lib/api'
import { Play, Pause, Settings } from 'lucide-react'
import PlayingBars from '../components/PlayingBars'
import CreatePlaylistModal from '../components/CreatePlaylistModal'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

export default function Home() {
  const [songs, setSongs] = useState([])
  const [recentSongs, setRecentSongs] = useState([])
  const [recommendedSongs, setRecommendedSongs] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayerStore()
  const { user, userProfile } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [songsData, recentData, recommendedData, playlistsData] = await Promise.all([
          api.getSongs(),
          api.getRecentSongs(),
          api.getRecommendedSongs(),
          api.getPlaylists()
        ])
        setSongs(songsData)
        setRecentSongs(recentData)
        setRecommendedSongs(recommendedData)
        setPlaylists(playlistsData)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchData()
  }, [user])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return 'Bom dia'
    if (hour >= 12 && hour < 18) return 'Boa tarde'
    if (hour >= 18 && hour < 24) return 'Boa noite'
    return 'Boa madrugada'
  }

  const greeting = getGreeting()

  if (loading) return (
    <div className="relative pb-10">
      {isDesktop ? (
        /* Desktop Loading Skeleton */
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
      ) : (
        /* Mobile Loading Skeleton */
        <div className="px-4 pt-6 space-y-8">
          <div className="flex justify-between items-center mb-10">
            <div className="h-8 w-32 skeleton" />
            <div className="h-8 w-8 rounded-full skeleton" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shrink-0 w-[180px] space-y-3">
                <div className="aspect-square rounded-[8px] skeleton" />
                <div className="h-4 w-3/4 skeleton" />
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <div className="h-7 w-56 skeleton" />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="shrink-0 w-[180px] space-y-3">
                  <div className="aspect-square rounded-[8px] skeleton" />
                  <div className="h-4 w-3/4 skeleton" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="relative pb-10">
      
      {/* ─── Mobile/Tablet UI (Matching Reference Image) ─── */}
      <div className="block lg:hidden px-4 pt-6 select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
              <h1 className="text-[25px] font-black tracking-tight text-white">{greeting}</h1>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="w-8 h-8 bg-spotify-green text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
           </div>
           <button className="text-white">
              <Settings size={28} strokeWidth={1.5} />
           </button>
        </div>

        {/* Playlists Section (Normal card size) */}
        {playlists.length > 0 && (
          <section className="mb-10 overflow-hidden">
             <h2 className="text-[22px] font-black text-white mb-6">Suas Playlists</h2>
             <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
                {playlists.map(playlist => (
                  <div 
                    key={playlist.id} 
                    className="shrink-0 w-[180px] cursor-pointer group active:scale-95 transition-transform"
                    onClick={() => navigate(`/playlists/${playlist.id}`)}
                  >
                    <div className="aspect-square rounded-[8px] overflow-hidden mb-3 bg-[#1d1d1d] shadow-lg">
                      {playlist.cover_url ? (
                        <img src={playlist.cover_url} className="w-full h-full object-cover" alt={playlist.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-4xl">&#9835;</div>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-base leading-tight truncate">{playlist.name}</h3>
                    <p className="text-zinc-400 text-xs mt-1">Playlist</p>
                  </div>
                ))}
             </div>
          </section>
        )}

        {/* Horizontal Section 1 */}
        <div className="mb-10 overflow-hidden">
           <h2 className="text-[22px] font-black text-white mb-6">Tocadas recentemente</h2>
           <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
              {recentSongs.map(song => (
                <div 
                  key={song.id} 
                  className="shrink-0 w-[180px] cursor-pointer group"
                  onClick={() => currentSong?.id === song.id ? togglePlay() : playSong(song, songs)}
                >
                  <div className="relative aspect-square rounded-[8px] overflow-hidden mb-3 bg-[#1d1d1d] shadow-lg">
                    {song.cover_url ? (
                      <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-4xl">&#9835;</div>
                    )}
                    {currentSong?.id === song.id && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <PlayingBars isPlaying={isPlaying} height={20} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-base leading-tight">
                    {song.title}
                  </h3>
                </div>
              ))}
           </div>
        </div>

        {/* Horizontal Section 2: "Suas músicas estão com saudade" */}
        <section className="mb-10 overflow-hidden">
           <h2 className="text-[22px] font-black text-white mb-6">Suas músicas estão com saudade</h2>
           <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
              {(recommendedSongs.length > 0 ? recommendedSongs : recentSongs).map(song => (
                <div 
                  key={song.id} 
                  className="shrink-0 w-[180px] cursor-pointer group"
                  onClick={() => currentSong?.id === song.id ? togglePlay() : playSong(song, songs)}
                >
                  <div className="aspect-square rounded-[8px] overflow-hidden mb-3 bg-[#1d1d1d] shadow-lg">
                    {song.cover_url ? (
                      <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-4xl">&#9835;</div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-base leading-tight truncate">{song.title}</h3>
                </div>
              ))}
           </div>
        </section>

        {/* Section 3: More (Placeholder for extra content) */}
        <section className="mb-10">
           <h2 className="text-[22px] font-black text-white mb-6">Álbuns com as músicas que você adora</h2>
           <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
              {songs.map(song => (
                <div 
                  key={song.id} 
                  className="shrink-0 w-[140px] cursor-pointer"
                  onClick={() => currentSong?.id === song.id ? togglePlay() : playSong(song, songs)}
                >
                  <div className="aspect-square rounded-[4px] overflow-hidden mb-2 bg-[#282828] shadow-lg">
                    {song.cover_url ? <img src={song.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xl">&#9835;</div>}
                  </div>
                  <h3 className="text-white font-bold text-sm truncate">{song.title}</h3>
                  <p className="text-zinc-400 text-xs truncate">Álbum • {song.artist}</p>
                </div>
              ))}
           </div>
        </section>
      </div>

      {/* ─── Desktop UI (Preserved) ─── */}
      <div className="hidden lg:block px-6 mt-4 space-y-10">
        <div className="flex items-center justify-between mb-8">
           <h1 className="text-3xl font-black tracking-tight text-white">{greeting}</h1>
        </div>

        {/* Recent Grid */}
        {recentSongs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {recentSongs.map(song => {
              const isActive = currentSong?.id === song.id
              const playing = isActive && isPlaying
              return (
                <div
                  key={song.id}
                  className={`group flex items-center rounded overflow-hidden transition-colors cursor-pointer pr-4 ${isActive ? 'bg-white/10' : 'bg-white/4 hover:bg-white/10'}`}
                  onClick={() => isActive ? togglePlay() : playSong(song, songs)}
                >
                  <div className="relative w-16 h-16 shrink-0 bg-zinc-800 shadow">
                    {song.cover_url ? (
                      <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                    ) : <div className="w-full h-full flex items-center justify-center text-zinc-500">&#9835;</div>}
                    {isActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <PlayingBars isPlaying={playing} height={14} />
                      </div>
                    )}
                  </div>
                  <div className={`px-4 font-bold text-sm tracking-wide truncate flex-1 ${isActive ? 'text-spotify-green' : ''}`}>
                    {song.title}
                  </div>
                  <button
                    className="w-10 h-10 bg-spotify-green text-black rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:scale-105 transition-all shrink-0"
                    onClick={(e) => { e.stopPropagation(); isActive ? togglePlay() : playSong(song, songs) }}
                  >
                    {playing
                      ? <Pause fill="currentColor" size={18} />
                      : <Play fill="currentColor" size={18} className="ml-0.5" />}
                  </button>
                </div>
              )
            })}
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
              {(recommendedSongs.length > 0 ? recommendedSongs : recentSongs).map((song) => {
                const isActive = currentSong?.id === song.id
                const playing = isActive && isPlaying
                return (
                  <div
                    key={song.id}
                    className={`group p-4 rounded-lg transition duration-300 flex flex-col cursor-pointer ${isActive ? 'bg-white/8' : 'bg-white/3 hover:bg-white/8'}`}
                    onClick={() => isActive ? togglePlay() : playSong(song, songs)}
                  >
                    <div className="relative aspect-square rounded-md overflow-hidden mb-4 shadow-xl bg-zinc-800">
                      {song.cover_url ? (
                        <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                          <span className="text-zinc-500 text-3xl">&#9835;</span>
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute inset-0 bg-black/40 flex items-end justify-start p-2">
                          <PlayingBars isPlaying={playing} height={16} />
                        </div>
                      )}
                      <button
                        className="absolute bottom-2 right-2 w-12 h-12 bg-spotify-green text-black rounded-full flex items-center justify-center shadow-xl transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 hover:bg-spotify-green-hover"
                        onClick={(e) => { e.stopPropagation(); isActive ? togglePlay() : playSong(song, songs) }}
                      >
                        {playing
                          ? <Pause fill="currentColor" size={22} />
                          : <Play fill="currentColor" size={22} className="ml-0.5" />}
                      </button>
                    </div>
                    <h3 className={`font-bold truncate text-base mb-1 ${isActive ? 'text-spotify-green' : 'text-white'}`}>{song.title}</h3>
                    <p className="text-zinc-400 text-sm truncate font-medium">{song.artist}</p>

                    {song.user_id === user?.id && song.status === 'pending' && (
                      <span className="mt-2 text-[10px] uppercase font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded inline-block self-start">Pendente de aprovação</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
      <CreatePlaylistModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onCreated={() => {
          // Re-fetch data to show new playlist
          api.getPlaylists().then(setPlaylists).catch(console.error)
        }}
      />
    </div>
  )
}
