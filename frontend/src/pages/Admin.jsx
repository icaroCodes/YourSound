import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { useDialogStore } from '../store/useDialogStore'
import { api } from '../lib/api'
import { Play, Check, X, BarChart3, Users, Music2, ListMusic, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const { userProfile } = useAuthStore()
  const { playSong } = usePlayerStore()
  const { showAlert, showConfirm } = useDialogStore()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'all'
  const [pendingSongs, setPendingSongs] = useState([])
  const [allSongs, setAllSongs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Edit Modal State
  const [editSong, setEditSong] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [editSubtitleMode, setEditSubtitleMode] = useState('none')
  const [editSubtitleData, setEditSubtitleData] = useState([])
  const [editSubtitleVideoUrl, setEditSubtitleVideoUrl] = useState('')
  const [editManualText, setEditManualText] = useState('')
  const [savingAction, setSavingAction] = useState(false)

  // Feedback Messages
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/')
      return
    }
    
    fetchData()
  }, [userProfile, navigate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [pendingData, statsData, allData] = await Promise.all([
        api.getPendingSongs(),
        api.getAdminStats(),
        api.getAdminAllSongs()
      ])
      setPendingSongs(pendingData)
      setStats(statsData)
      setAllSongs(allData)
    } catch (err) {
      console.error('[Admin] Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 3000)
  }

  const updateStatus = async (id, status) => {
    try {
      await api.updateSongStatus(id, status)
      setPendingSongs(pendingSongs.filter(s => s.id !== id))
      if (stats) {
        setStats({ ...stats, pendingSongs: stats.pendingSongs - 1 })
      }
      showFeedback(`Música ${status === 'approved' ? 'aprovada' : 'rejeitada'}.`)
      
      // se aprovar, recarrega allSongs pra mostrar na aba
      if (status === 'approved') {
        const allData = await api.getAdminAllSongs()
        setAllSongs(allData)
      }
    } catch (err) {
      console.error('[Admin] Status update error:', err.message)
    }
  }

  const openEditModal = (song) => {
    setEditSong(song)
    setEditTitle(song.title)
    setEditArtist(song.artist)
    setEditSubtitleMode(song.subtitle_mode || 'none')
    setEditSubtitleData(song.subtitle_data || [])
    setEditSubtitleVideoUrl(song.subtitle_video_url || '')
    setEditManualText(song.subtitle_data ? song.subtitle_data.map(l => l.text).join('\n') : '')
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editArtist.trim()) return

    setSavingAction(true)
    try {
      const data = { 
        title: editTitle, 
        artist: editArtist,
        subtitle_mode: editSubtitleMode,
        subtitle_data: editSubtitleMode === 'manual' ? editSubtitleData : null,
        subtitle_video_url: editSubtitleMode === 'video' ? editSubtitleVideoUrl : null
      }
      await api.editAdminSong(editSong.id, data)
      const updatedSong = { ...editSong, ...data }
      setAllSongs(allSongs.map(s => s.id === editSong.id ? updatedSong : s))
      setPendingSongs(pendingSongs.map(s => s.id === editSong.id ? updatedSong : s))
      setEditSong(null)
      showFeedback('Música editada com sucesso.')
    } catch (err) {
      console.error('[Admin] Edit error:', err.message)
      await showAlert('Não foi possível editar a música. Tente novamente.', { title: 'Erro', icon: 'error' })
    } finally {
      setSavingAction(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await showConfirm(
      'Esta música será deletada permanentemente para todos os usuários.',
      { title: 'Excluir música', confirmText: 'Excluir', destructive: true }
    )
    if (!confirmed) return

    try {
      await api.deleteAdminSong(id)
      setAllSongs(allSongs.filter(s => s.id !== id))
      setPendingSongs(pendingSongs.filter(s => s.id !== id))
      if (stats) setStats({ ...stats, totalSongs: stats.totalSongs - 1 })
      showFeedback('Música deletada permanentemente.')
    } catch (err) {
      console.error('[Admin] Delete error:', err.message)
      await showAlert('Não foi possível excluir a música. Tente novamente.', { title: 'Erro', icon: 'error' })
    }
  }

  if (loading) return <div className="text-zinc-400">Carregando painel admin...</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-indigo-400">Painel do Administrador</h1>
        <p className="text-zinc-400">Gerenciamento e aprovação de músicas públicas.</p>
      </div>

      {feedback && (
        <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 p-3 rounded-lg text-sm text-center sticky top-4 z-50">
          {feedback}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Music2 size={20} />} label="Músicas" value={stats.totalSongs} />
          <StatCard icon={<BarChart3 size={20} />} label="Pendentes" value={stats.pendingSongs} color="text-yellow-400" />
          <StatCard icon={<Users size={20} />} label="Usuários" value={stats.totalUsers} />
          <StatCard icon={<ListMusic size={20} />} label="Playlists" value={stats.totalPlaylists} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-px">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-spotify-green text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          Pendentes ({pendingSongs.length})
        </button>
        <button 
          onClick={() => setActiveTab('all')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'all' ? 'border-spotify-green text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          Todas Músicas Públicas ({allSongs.length})
        </button>
      </div>

      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        {activeTab === 'pending' && (
          <>
            <div className="p-4 bg-zinc-900/80 border-b border-white/5 font-semibold text-white">
              Aprovação de Envios
            </div>
            {pendingSongs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">Nenhuma música pendente de aprovação.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {pendingSongs.map(song => (
                  <SongRow 
                    key={song.id} 
                    song={song} 
                    playSong={playSong}
                    onApprove={() => updateStatus(song.id, 'approved')}
                    onReject={() => updateStatus(song.id, 'rejected')}
                    onEdit={() => openEditModal(song)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'all' && (
          <>
            <div className="p-4 bg-zinc-900/80 border-b border-white/5 font-semibold text-white flex justify-between items-center">
              <span>Gerenciar Músicas Públicas</span>
            </div>
            {allSongs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">Nenhuma música pública.</div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                {allSongs.map(song => (
                  <SongRow 
                    key={song.id} 
                    song={song} 
                    playSong={playSong}
                    onDelete={() => handleDelete(song.id)}
                    onEdit={() => openEditModal(song)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-white/10">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Editar Música</h2>
                <button onClick={() => setEditSong(null)} className="text-zinc-400 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Título</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-4 text-white focus:outline-none focus:ring-2 disabled:opacity-50"
                    placeholder="Título da música"
                    disabled={savingAction}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Artista / Banda</label>
                  <input
                    type="text"
                    value={editArtist}
                    onChange={(e) => setEditArtist(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-4 text-white focus:outline-none focus:ring-2 disabled:opacity-50"
                    placeholder="Nome do artista"
                    disabled={savingAction}
                  />
                </div>

                <div className="pt-2 space-y-3">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Legendas / Fundo</label>
                  <select 
                    value={editSubtitleMode} 
                    onChange={e => setEditSubtitleMode(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="none">Automática (LRCLIB)</option>
                    <option value="manual">Manual Sincronizada</option>
                    <option value="video">Vídeo de Fundo</option>
                  </select>

                  {editSubtitleMode === 'manual' && (
                    <div className="space-y-2">
                      <textarea
                        value={editManualText}
                        onChange={e => setEditManualText(e.target.value)}
                        placeholder="Cole a letra..."
                        className="w-full h-24 bg-black/40 border border-white/10 rounded-md py-2 px-3 text-white text-xs resize-none"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const lines = editManualText.split('\n').filter(l => l.trim()).map((t, i) => ({ time: i * 3.5, text: t.trim() }))
                          setEditSubtitleData(lines)
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase transition"
                      >
                        Processar Letras
                      </button>
                    </div>
                  )}

                  {editSubtitleMode === 'video' && (
                    <input
                      type="url"
                      value={editSubtitleVideoUrl}
                      onChange={e => setEditSubtitleVideoUrl(e.target.value)}
                      placeholder="URL do YT/TikTok"
                      className="w-full bg-black/40 border border-white/10 rounded-md py-2 px-3 text-white text-sm"
                    />
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    onClick={() => setEditSong(null)}
                    disabled={savingAction}
                    className="px-4 py-2 rounded-md font-bold text-sm text-white hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    disabled={savingAction || !editTitle.trim() || !editArtist.trim()}
                    className="bg-white text-black px-6 py-2 rounded-md font-bold text-sm hover:scale-105 transition disabled:opacity-50 flex items-center"
                  >
                    {savingAction ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

function SongRow({ song, playSong, onApprove, onReject, onEdit, onDelete }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition">
      <div className="flex items-center gap-4 min-w-0 pr-4">
        <div className="w-12 h-12 rounded object-cover shadow bg-zinc-800 shrink-0 overflow-hidden">
          {song.cover_url ? (
            <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">♪</div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-medium text-white truncate">{song.title}</h3>
          <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={() => playSong(song, [song])}
          className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition mx-1"
          title="Ouvir"
        >
          <Play fill="currentColor" size={16} />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {onEdit && (
          <button 
            onClick={onEdit}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition"
            title="Editar (Admin)"
          >
            <Pencil size={18} />
          </button>
        )}

        {onDelete && (
          <button 
            onClick={onDelete}
            className="p-1.5 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded transition"
            title="Excluir (Admin)"
          >
            <Trash2 size={18} />
          </button>
        )}

        {onApprove && onReject && (
          <>
            <button 
              onClick={onApprove}
              className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded transition shadow-lg shadow-emerald-500/10 ml-1"
              title="Aprovar"
            >
              <Check size={18} />
            </button>
            <button 
              onClick={onReject}
              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition shadow-lg shadow-red-500/10"
              title="Rejeitar"
            >
              <X size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
