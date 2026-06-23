import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { usePlayerStore } from '../store/usePlayerStore'
import { Play, Music2, ArrowLeft } from 'lucide-react'

export default function SongShare() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const shareToken = searchParams.get('share')
  const navigate = useNavigate()
  const { playSong } = usePlayerStore()

  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await api.getSong(id, shareToken)
        if (!cancelled) setSong(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Música não encontrada.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, shareToken])

  const handlePlay = () => {
    if (!song) return
    playSong(song, [song])
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">Carregando música...</p>
      </div>
    )
  }

  if (error || !song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <Music2 size={40} className="text-zinc-600" />
        <p className="text-zinc-400 text-sm">{error || 'Música não encontrada.'}</p>
        <button onClick={() => navigate('/')} className="text-white text-sm font-semibold hover:underline mt-2">
          Voltar ao início
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12 flex flex-col items-center text-center">
      <button onClick={() => navigate('/')} className="self-start mb-8 text-zinc-400 hover:text-white transition flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft size={18} /> Início
      </button>

      <div className="w-64 aspect-square rounded-xl overflow-hidden shadow-2xl bg-zinc-800 mb-8">
        {song.cover_url
          ? <img src={song.cover_url} className="w-full h-full object-cover" alt={song.title} />
          : <div className="w-full h-full flex items-center justify-center"><Music2 size={64} className="text-zinc-600" /></div>}
      </div>

      <h1 className="text-3xl font-black text-white tracking-tight">{song.title}</h1>
      <p className="text-zinc-400 text-lg mt-1">{song.artist}</p>

      <button
        onClick={handlePlay}
        className="mt-10 flex items-center gap-3 bg-spotify-green text-black font-extrabold rounded-full px-8 py-4 shadow-xl hover:scale-105 active:scale-95 transition-transform"
      >
        <Play size={22} fill="currentColor" />
        Reproduzir
      </button>
    </div>
  )
}
