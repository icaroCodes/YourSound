import { useState, useRef } from 'react'
import { Camera, Check, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useDialogStore } from '../store/useDialogStore'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

export default function Profile() {
  const navigate = useNavigate()
  const { userProfile, user, setUserProfile } = useAuthStore()

  const { showAlert, showConfirm } = useDialogStore()

  const [displayName, setDisplayName] = useState(userProfile?.display_name || '')
  const [avatarPreview, setAvatarPreview] = useState(userProfile?.avatar_url || null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const avatarLetter = (displayName || userProfile?.email || 'Y')[0].toUpperCase()

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('A foto deve ter no máximo 5MB.')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      let avatarUrl = userProfile?.avatar_url || null

      // 1. Upload avatar to Supabase Storage if a new file was selected
      if (avatarFile && user?.id) {
        const ext = avatarFile.name.split('.').pop()
        const filePath = `${user.id}/avatar.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true })

        if (uploadError) throw new Error('Erro ao enviar foto: ' + uploadError.message)

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        avatarUrl = publicUrl
      }

      // 2. Update profile via backend
      const updated = await api.updateProfile({
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl
      })

      setUserProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full pb-16 px-6 pt-8 max-w-lg mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-10 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold text-white tracking-tight mb-8">Perfil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative group">
          <div
            className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold text-black shadow-xl"
            style={{ background: avatarPreview ? 'transparent' : '#1ED45E' }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              avatarLetter
            )}
          </div>

          {/* Upload overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera size={20} className="text-white mb-1" />
            <span className="text-white text-xs font-medium">Alterar</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 text-sm text-[#1ED45E] hover:opacity-80 transition font-medium"
        >
          {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Nome de exibição
          </label>
          <input
            type="text"
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Como você quer ser chamado?"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1ED45E] focus:border-[#1ED45E] transition placeholder:text-zinc-600"
          />
          <p className="text-xs text-zinc-600 mt-1.5">{displayName.length}/50</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Email
          </label>
          <input
            type="email"
            value={userProfile?.email || ''}
            disabled
            className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-zinc-500 text-sm cursor-not-allowed"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-8 w-full py-3 rounded-full font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: saved ? '#17c054' : '#1ED45E', color: 'black' }}
      >
        {saved ? (
          <><Check size={16} strokeWidth={3} /> Salvo!</>
        ) : saving ? (
          'Salvando...'
        ) : (
          'Salvar alterações'
        )}
      </button>

      {/* Danger zone */}
      <div className="mt-12 pt-8 border-t border-zinc-900">
        <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-3">Zona de perigo</p>
        <button
          onClick={async () => {
            const confirmed = await showConfirm(
              'Esta ação é permanente e não pode ser desfeita. Todos os seus dados serão removidos.',
              { title: 'Excluir conta', confirmText: 'Excluir', destructive: true }
            )
            if (!confirmed) return
            try {
              await api.deleteAccount()
              useAuthStore.getState().signOut()
            } catch (err) {
              setError(err.message)
            }
          }}
          className="text-red-500 text-sm hover:text-red-400 transition"
        >
          Excluir conta
        </button>
      </div>
    </div>
  )
}
