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
        setTimeout(() => reject(new Error('Auth Timeout')), 10000)
      )

      const response = await Promise.race([sessionPromise, timeoutPromise])
      const session = response?.data?.session

      if (response?.error) {
        console.error('[Auth] Session error:', response.error.message)
        // If the error is about an invalid refresh token, we MUST clear the session
        if (response.error.status === 400 || response.error.message?.includes('Refresh Token')) {
          await supabase.auth.signOut()
          set({ session: null, user: null, userProfile: null, isLoading: false })
          return
        }
      }

      if (session?.user) {
        const profilePromise = supabase.from('users').select('*').eq('id', session.user.id).single()
        const profileTimeout = new Promise((resolve) =>
          setTimeout(() => resolve({ data: null }), 6000)
        )

        const { data: profile } = await Promise.race([profilePromise, profileTimeout])
        set({ session, user: session.user, userProfile: profile, isLoading: false })
      } else {
        set({ session: null, user: null, userProfile: null, isLoading: false })
      }
    } catch (err) {
      console.warn('[Auth] Initialization failed:', err.message)
      set({ session: null, user: null, userProfile: null, isLoading: false })
    }

    // Auth events listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Event: ${event}`)
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        usePlayerStore.getState().clearPlayer()
        set({ session: null, user: null, userProfile: null })
      } else if (session?.user) {
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
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('[Auth] SignOut error (likely already signed out):', e.message)
    } finally {
      usePlayerStore.getState().clearPlayer()
      set({ session: null, user: null, userProfile: null })
    }
  },

  // Atualiza o perfil local no store após edição
  setUserProfile: (updates) => {
    set(state => ({
      userProfile: state.userProfile ? { ...state.userProfile, ...updates } : updates
    }))
  }
}))
