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
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      set({ session, user: session.user, userProfile: profile, isLoading: false })
    } else {
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
