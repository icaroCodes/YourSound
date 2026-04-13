import { Home, Search, Library, Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useOnboardingStore } from '../store/useOnboardingStore'

export default function MobileNav({ onAddClick }) {
  const { pathname } = useLocation()

  return (
    <div className="flex items-center justify-center h-full gap-12">
      <Link 
        to="/" 
        data-onboarding="mobile-home-btn"
        className="flex flex-col items-center gap-1 transition-transform active:scale-90"
        onClick={() => {
          useOnboardingStore.getState().completeAction('go-home')
        }}
      >
        <Home 
          size={24} 
          strokeWidth={pathname === '/' ? 2.5 : 2}
          className={pathname === '/' ? 'text-white' : 'text-zinc-500'} 
          fill={pathname === '/' ? 'currentColor' : 'none'}
        />
        <span className={`text-[10px] font-bold ${pathname === '/' ? 'text-white' : 'text-zinc-500'}`}>Início</span>
      </Link>

      <button 
        onClick={() => { onAddClick(); useOnboardingStore.getState().completeAction('create-playlist') }}
        data-onboarding="create-playlist-btn"
        className="flex flex-col items-center gap-1 transition-transform active:scale-90"
      >
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black shadow-lg">
          <Plus size={24} strokeWidth={3} />
        </div>
        <span className="text-[10px] font-bold text-zinc-500">Adicionar</span>
      </button>

      <Link 
        to="/search" 
        data-onboarding="mobile-search" 
        className="flex flex-col items-center gap-1 transition-transform active:scale-90"
        onClick={() => {
          useOnboardingStore.getState().completeAction('open-search')
        }}
      >
        <Search 
          size={24} 
          strokeWidth={pathname === '/search' ? 2.5 : 2}
          className={pathname === '/search' ? 'text-white' : 'text-zinc-500'} 
        />
        <span className={`text-[11px] font-bold ${pathname === '/search' ? 'text-white' : 'text-zinc-500'}`}>Buscar</span>
      </Link>
    </div>
  )
}
