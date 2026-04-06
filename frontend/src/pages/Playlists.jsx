import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { api } from '../lib/api'
import { Plus, ListMusic, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Playlists() {
  const { user } = useAuthStore()
  const [playlists, setPlaylists] = useState([])
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        setLoading(true)
        const data = await api.getPlaylists()
        setPlaylists(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchPlaylists()
    }
  }, [user])

  const createPlaylist = async (e) => {
    e.preventDefault()
    if (!newPlaylistName.trim()) return

    try {
      const data = await api.createPlaylist(newPlaylistName)
      setPlaylists([data, ...playlists])
      setNewPlaylistName('')
    } catch (err) {
      console.error(err)
    }
  }

  const deletePlaylist = async (id) => {
    try {
      await api.deletePlaylist(id)
      setPlaylists(playlists.filter(p => p.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Suas Playlists</h1>
        <p className="text-zinc-400">Crie listas personalizadas para os seus estudos e momentos de foco.</p>
      </div>

      <form onSubmit={createPlaylist} className="flex gap-4">
        <input 
          type="text" 
          value={newPlaylistName} 
          onChange={e => setNewPlaylistName(e.target.value)}
          placeholder="Nome da nova playlist..."
          className="flex-1 max-w-md px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition shadow-lg shadow-indigo-500/20 flex items-center gap-2">
          <Plus size={18} /> Criar
        </button>
      </form>

      {loading ? (
        <div className="text-zinc-400">Carregando...</div>
      ) : playlists.length === 0 ? (
        <div className="text-zinc-500 py-10 px-4 border border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-3">
          <ListMusic size={40} className="text-zinc-700" />
          <span>Você ainda não tem playlists.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map(pl => (
            <div key={pl.id} className="p-5 bg-zinc-900/40 rounded-2xl border border-white/5 flex flex-col items-start hover:border-white/10 transition relative group">
              <Link to={`/playlists/${pl.id}`} className="absolute inset-0 z-10"></Link>
              <div className="w-full aspect-video bg-zinc-800 rounded-lg mb-4 flex items-center justify-center">
                <ListMusic size={32} className="text-zinc-600" />
              </div>
              <h3 className="font-semibold text-lg text-white w-full truncate">{pl.name}</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-4">{pl.is_public ? 'Pública' : 'Privada'}</p>
              
              <button 
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); deletePlaylist(pl.id); }} 
                className="mt-auto self-end text-zinc-500 hover:text-red-400 transition relative z-20" 
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
