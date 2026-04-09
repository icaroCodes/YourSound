import { useState, useEffect } from 'react'
import { X, Check, Trash2 } from 'lucide-react'
import { api } from '../lib/api'

export default function AdminRequestsModal({ onClose }) {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSongs()
  }, [])

  async function loadSongs() {
    setLoading(true)
    try {
      const data = await api.getPendingSongs()
      setSongs(data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(songId, status) {
    try {
      await api.updateSongStatus(songId, status)
      setSongs(prev => prev.filter(s => s.id !== songId))
    } catch (err) {
      console.error('Action failed:', err)
      alert('Erro ao atualizar status: ' + err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121212] w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-full border border-white/10">
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Pedidos de Músicas</h2>
            <p className="text-sm text-zinc-400 mt-1">Nesta área você pode aprovar ou rejeitar as músicas enviadas pelos usuários da plataforma.</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors self-start">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-10">{error}</div>
          ) : songs.length === 0 ? (
            <div className="text-zinc-500 text-center py-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Check size={32} className="text-zinc-400" />
              </div>
              <p>Nenhum pedido pendente.</p>
              <p className="text-sm mt-1">Todas as músicas já foram revisadas!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {songs.map(song => (
                <div key={song.id} className="bg-white/5 border border-white/10 p-4 rounded-lg flex items-center gap-4 hover:bg-white/10 transition-colors">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-14 h-14 object-cover rounded shadow" />
                  ) : (
                    <div className="w-14 h-14 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                      <span className="text-zinc-500 text-xl">&#9835;</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate text-base">{song.title}</h3>
                    <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
                    <div className="text-[11px] text-zinc-500 mt-1 uppercase tracking-widest font-semibold flex items-center gap-2">
                       <span>Public: {song.is_public ? 'Sim' : 'Não'}</span>
                       {song.is_public && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => handleAction(song.id, 'approved')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-md transition-colors flex items-center justify-center px-4 gap-2 text-sm font-semibold"
                      title="Aprovar"
                    >
                      <Check size={16} /> Aprovar
                    </button>
                    <button 
                      onClick={() => handleAction(song.id, 'rejected')}
                      className="bg-transparent hover:bg-red-500/20 text-red-400 p-2 rounded-md transition-colors flex items-center justify-center px-4 gap-2 text-sm font-semibold"
                      title="Rejeitar"
                    >
                      <Trash2 size={16} /> Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
