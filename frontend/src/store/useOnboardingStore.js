import { create } from 'zustand'

/**
 * YourSound Command-Based Onboarding (v7)
 * Focus: Direct commands, step-by-step navigation.
 */
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'YourSound',
    description: 'Vamos configurar seu player em 1 minuto. Siga as instruções passo a passo.',
    target: null,
    action: null,
  },
  {
    id: 'search',
    title: '1. Abrir Busca',
    description: 'Toque no ícone de lupa na barra inferior para começar.',
    target: 'mobile-search',
    action: 'open-search',
  },
  {
    id: 'search-input',
    title: '2. Pesquisar',
    description: 'Digite o nome de um artista ou música agora.',
    target: 'search-input-mobile',
    action: 'search',
  },
  {
    id: 'select-song',
    title: '3. Dar o Play',
    description: 'Toque na música para iniciar a reprodução.',
    target: 'search-result-item',
    action: 'play-song',
  },
  {
    id: 'like-song',
    title: '4. Favoritar',
    description: 'Toque no coração para salvar na sua coleção.',
    target: 'like-button',
    action: 'like',
  },
  {
    id: 'go-home',
    title: '5. Voltar ao Início',
    description: 'Toque no ícone de "Início" para sair da busca.',
    target: 'mobile-home-btn',
    action: 'go-home',
  },
  {
    id: 'create-playlist',
    title: '6. Nova Playlist',
    description: 'Toque no botão verde "+" no topo da tela.',
    target: 'create-playlist-btn',
    action: 'create-playlist',
  },
  {
    id: 'modal-cover',
    title: '7. Adicionar Foto',
    description: 'Toque na área de "Adicionar Capa" para escolher uma foto.',
    target: 'modal-cover-upload',
    action: 'modal-upload-image',
  },
  {
    id: 'modal-privacy',
    title: '8. Privacidade',
    description: 'Toque na chave para definir se a playlist é Pública ou Privada.',
    target: 'modal-privacy-toggle',
    action: 'modal-toggle-privacy',
  },
  {
    id: 'modal-submit',
    title: '9. Confirmar',
    description: 'Toque em "Criar Playlist" para finalizar o processo.',
    target: 'modal-submit-btn',
    action: 'modal-submit',
  },
  {
    id: 'settings',
    title: '10. Perfil',
    description: 'Toque na engrenagem para ver suas configurações.',
    target: 'profile-menu-btn',
    action: 'open-settings',
  },
  {
    id: 'conclusion',
    title: 'Pronto!',
    description: 'Você dominou o YourSound. Aproveite sua música!',
    target: null,
    action: null,
  },
]

const STORAGE_KEY = 'yoursound_onboarding_v7'

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export const useOnboardingStore = create((set, get) => {
  const saved = loadState()

  return {
    steps: ONBOARDING_STEPS,
    currentStep: saved?.currentStep ?? 0,
    isActive: saved?.isActive ?? false,
    isCompleted: saved?.isCompleted ?? false,

    start: () => {
      if (window.innerWidth > 768) return
      set({ isActive: true, currentStep: 0, isCompleted: false })
      saveState({ isActive: true, currentStep: 0, isCompleted: false })
    },

    nextStep: () => {
      const { currentStep, steps } = get()
      const next = currentStep + 1
      if (next >= steps.length) {
        set({ isActive: false, isCompleted: true, currentStep: 0 })
        saveState({ isActive: false, currentStep: 0, isCompleted: true })
      } else {
        set({ currentStep: next })
        saveState({ isActive: true, currentStep: next, isCompleted: false })
      }
    },

    prevStep: () => {
      const { currentStep } = get()
      if (currentStep > 0) {
        set({ currentStep: currentStep - 1 })
        saveState({ isActive: true, currentStep: currentStep - 1, isCompleted: false })
      }
    },

    skip: () => {
      set({ isActive: false, isCompleted: true, currentStep: 0 })
      saveState({ isActive: false, currentStep: 0, isCompleted: true })
    },

    completeAction: (actionId) => {
      const { steps, currentStep, isActive } = get()
      if (!isActive) return
      
      const step = steps[currentStep]
      if (step?.action === actionId) {
        setTimeout(() => get().nextStep(), 400)
      }
    },

    restart: () => {
      set({ isActive: true, currentStep: 0, isCompleted: false })
      saveState({ isActive: true, currentStep: 0, isCompleted: false })
    },
  }
})
