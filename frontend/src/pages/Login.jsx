import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { signIn, signUp } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password, displayName.trim())
      }
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError(null)
    setDisplayName('')
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-5">
            <img src="/yoursound.svg" alt="YourSound" className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isLogin ? 'Entrar no YourSound' : 'Criar sua conta'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            {isLogin ? 'Bem-vindo de volta.' : 'Comece a ouvir agora.'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Nome</label>
              <input
                type="text"
                required
                maxLength={50}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1ED45E] focus:border-[#1ED45E] transition placeholder:text-zinc-600"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como você quer ser chamado?"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1ED45E] focus:border-[#1ED45E] transition placeholder:text-zinc-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1ED45E] focus:border-[#1ED45E] transition placeholder:text-zinc-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-1 bg-[#1ED45E] hover:bg-[#17c054] text-black font-bold rounded-full text-sm transition-all shadow-lg shadow-[#1ED45E]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-600">ou</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Switch mode */}
        <div className="text-center text-sm">
          <span className="text-zinc-500">
            {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
          </span>
          <button
            type="button"
            onClick={switchMode}
            className="text-white font-semibold hover:text-[#1ED45E] transition"
          >
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </div>
      </div>
    </div>
  )
}
