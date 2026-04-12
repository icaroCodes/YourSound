import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { usePlayerStore } from './usePlayerStore'

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  userProfile: null,
  isLoading: true,

  initialize: async () => {
    set({ isLoading: true })

    try {
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 6000)
      )

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])

      if (session?.user) {
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

  signUp: async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || null }
      }
    })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    usePlayerStore.getState().clearPlayer()
    set({ session: null, user: null, userProfile: null })
  },

  // Atualiza o perfil local no store após edição
  setUserProfile: (updates) => {
    set(state => ({
      userProfile: state.userProfile ? { ...state.userProfile, ...updates } : updates
    }))
  }
}))
