import { create } from 'zustand'
import { supabase } from '../lib/supabase'

import { usePlayerStore } from './usePlayerStore'

export const useAuthStore = create((set) => ({
  session: null,
  user: null,
  userProfile: null,
  isLoading: true,
  
  initialize: async () => {
    set({ isLoading: true })
    
    try {
      // Timeout de 6s para não travar em tela de loading para sempre
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 6000)
      )
      
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
      
      if (session?.user) {
        // Buscar perfil com timeout próprio
        const profilePromise = supabase.from('users').select('*').eq('id', session.user.id).single()
        const profileTimeout = new Promise((resolve) =>
          setTimeout(() => resolve({ data: null }), 4000)
        )
        
        const { data: profile } = await Promise.race([profilePromise, profileTimeout])
        set({ session, user: session.user, userProfile: profile, isLoading: false })
      } else {
        set({ session: null, user: null, userProfile: null, isLoading: false })
      }
    } catch (err) {
      console.warn('[Auth] Initialization failed or timed out:', err.message)
      set({ session: null, user: null, userProfile: null, isLoading: false })
    }
    
    // Listener de mudança de auth (fora do try/catch para sempre registrar)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single()
        set({ session, user: session.user, userProfile: profile })
      } else {
        set({ session: null, user: null, userProfile: null })
      }
    })
  },
  
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },
  
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  },
  
  signOut: async () => {
    await supabase.auth.signOut()
    usePlayerStore.getState().clearPlayer()
    set({ session: null, user: null, userProfile: null })
  }
}))
