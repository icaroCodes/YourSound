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
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-[-20%] inset-x-0 h-[60vh] bg-gradient-to-b from-[#1ED45E]/20 to-transparent pointer-events-none blur-3xl opacity-50" />
      
      <div className="w-full max-w-[420px] relative z-10">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/yoursound.svg" alt="YourSound" className="w-16 h-16 mb-6 drop-shadow-lg" />
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight text-center">
            {isLogin ? 'Entrar no YourSound' : 'Criar sua conta'}
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium mb-6 text-center animate-in fade-in zoom-in duration-300">
            {error}
          </div>
        )}

        {/* Form Container */}
        <div className="bg-[#121212]/80 backdrop-blur-xl p-6 sm:p-10 rounded-2xl shadow-2xl border border-white/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-white mb-2">Como devemos chamar você?</label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  className="w-full px-4 py-3.5 bg-black border border-zinc-700 hover:border-zinc-500 focus:border-white rounded-lg text-white text-base focus:outline-none transition-colors placeholder:text-zinc-600 shadow-inner"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome ou apelido"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-white mb-2">E-mail</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3.5 bg-black border border-zinc-700 hover:border-zinc-500 focus:border-white rounded-lg text-white text-base focus:outline-none transition-colors placeholder:text-zinc-600 shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full px-4 py-3.5 bg-black border border-zinc-700 hover:border-zinc-500 focus:border-white rounded-lg text-white text-base focus:outline-none transition-colors placeholder:text-zinc-600 shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="No mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-spotify-green hover:brightness-110 active:scale-95 text-black font-black rounded-full text-base transition-all shadow-xl shadow-spotify-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Aguarde...' : (isLogin ? 'Entrar agora' : 'Criar conta grátis')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Switch mode */}
          <div className="text-center">
            <p className="text-zinc-400 font-medium mb-3">
              {isLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
            </p>
            <button
              type="button"
              onClick={switchMode}
              className="w-full py-3.5 border-2 border-zinc-600 hover:border-white text-white font-bold rounded-full transition-colors"
            >
              {isLogin ? 'Inscrever-se no YourSound' : 'Fazer login no YourSound'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
