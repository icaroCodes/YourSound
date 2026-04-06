import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { api } from '../lib/api'
import { Play, Check, X, BarChart3, Users, Music2, ListMusic } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const { userProfile } = useAuthStore()
  const { playSong } = usePlayerStore()
  const navigate = useNavigate()
  const [pendingSongs, setPendingSongs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/')
      return
    }
    
    fetchData()
  }, [userProfile, navigate])

  const fetchData = async () => {
    try {
      // Both calls go through the backend with admin middleware
      const [songsData, statsData] = await Promise.all([
        api.getPendingSongs(),
        api.getAdminStats()
      ])
      setPendingSongs(songsData)
      setStats(statsData)
    } catch (err) {
      console.error('[Admin] Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      // Goes through backend: verifyAuth + adminOnly middleware
      await api.updateSongStatus(id, status)
      setPendingSongs(pendingSongs.filter(s => s.id !== id))
      if (stats) {
        setStats({ ...stats, pendingSongs: stats.pendingSongs - 1 })
      }
    } catch (err) {
      console.error('[Admin] Status update error:', err.message)
    }
  }

  if (loading) return <div className="text-zinc-400">Carregando painel admin...</div>

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-indigo-400">Painel do Administrador</h1>
        <p className="text-zinc-400">Gerenciamento e aprovação de músicas públicas.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Music2 size={20} />} label="Músicas" value={stats.totalSongs} />
          <StatCard icon={<BarChart3 size={20} />} label="Pendentes" value={stats.pendingSongs} color="text-yellow-400" />
          <StatCard icon={<Users size={20} />} label="Usuários" value={stats.totalUsers} />
          <StatCard icon={<ListMusic size={20} />} label="Playlists" value={stats.totalPlaylists} />
        </div>
      )}

      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 bg-zinc-900/80 border-b border-white/5 font-semibold text-white">
          Músicas Pendentes ({pendingSongs.length})
        </div>
        
        {pendingSongs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">Nenhuma música pendente de aprovação.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {pendingSongs.map(song => (
              <div key={song.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded object-cover shadow bg-zinc-800 overflow-hidden">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">♪</div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{song.title}</h3>
                    <p className="text-sm text-zinc-400">{song.artist}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => playSong(song, [song])}
                    className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition"
                    title="Ouvir"
                  >
                    <Play fill="currentColor" size={16} />
                  </button>
                  <div className="w-px h-6 bg-white/10 mx-2"></div>
                  <button 
                    onClick={() => updateStatus(song.id, 'approved')}
                    className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded transition shadow-lg shadow-emerald-500/10"
                    title="Aprovar"
                  >
                    <Check size={20} />
                  </button>
                  <button 
                    onClick={() => updateStatus(song.id, 'rejected')}
                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition shadow-lg shadow-red-500/10"
                    title="Rejeitar"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color = 'text-white' }) {
  return (
    <div className="p-4 bg-zinc-900/40 rounded-xl border border-white/5">
      <div className="flex items-center gap-2 text-zinc-400 mb-2">{icon} <span className="text-xs font-medium uppercase tracking-wider">{label}</span></div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  )
}
