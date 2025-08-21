// ===================================
// SAPORI & COLORI - AUTH CONTEXT SEMPLIFICATO
// ===================================

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Context creation
const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  isAuthenticated: false
})

// Custom hook per usare auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// AuthProvider component SEMPLIFICATO
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Inizializza auth all'avvio - ONCE ONLY
  useEffect(() => {
    if (initialized) {
      console.log('⚠️ Auth already initialized, skipping')
      return // Evita doppia inizializzazione
    }
    
    console.log('🚀 Starting auth initialization...')
    initializeAuth()
  }, []) // NESSUNA DIPENDENZA - solo al mount

  // Listen to auth changes - VERSIONE SEMPLIFICATA ANTI-LOOP
  useEffect(() => {
    let isProcessingAuth = false
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      // Evita doppia elaborazione simultanea
      if (isProcessingAuth) {
        console.log('⚠️ Skipping auth change - already processing')
        return
      }
      
      isProcessingAuth = true
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await loadUserProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in auth state change:', error)
        setLoading(false)
      } finally {
        isProcessingAuth = false
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, []) // NESSUNA DIPENDENZA

  // Inizializza auth session esistente
  const initializeAuth = async () => {
    try {
      console.log('Initializing auth...')
      setLoading(true)
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        setLoading(false)
        return
      }

      if (session?.user) {
        console.log('Found existing session for:', session.user.email)
        setUser(session.user)
        await loadUserProfile(session.user)
      } else {
        console.log('No existing session')
        setLoading(false)
      }
      
      setInitialized(true)
    } catch (error) {
      console.error('Initialize auth error:', error)
      setLoading(false)
    }
  }

  // Carica profilo utente ANTI-LOOP
  const loadUserProfile = async (authUser) => {
    // Evita chiamate doppie
    if (isLoadingProfile) {
      console.log('⚠️ Profile loading already in progress')
      return
    }
    
    try {
      setIsLoadingProfile(true)
      console.log('Loading profile for user:', authUser.id)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        
        // Se non trova il profilo, crea uno di default
        console.log('Creating default profile...')
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.email.split('@')[0],
            role: 'admin', // Default admin per test
            active: true
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          return
        }

        console.log('Profile created successfully:', newProfile)
        setProfile(newProfile)
        setLoading(false)
        return
      }

      // Verifica se account è attivo
      if (!data.active) {
        console.error('Account disattivato')
        // Non chiamare signOut qui per evitare loop
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      console.log('Profile loaded successfully:', data)
      setProfile(data)
      setLoading(false)
    } catch (error) {
      console.error('Load profile error:', error)
      setLoading(false)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  // Sign in con email/password
  const signIn = async (email, password) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      })

      if (error) {
        console.error('Sign in error:', error)
        throw error
      }

      // Non chiamare loadUserProfile qui, lo farà l'auth state change
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      setLoading(false)
      return { user: null, error }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }

      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  // Context value
  const value = {
    // State
    user,
    profile,
    loading,
    
    // Actions
    signIn,
    signOut,
    
    // Computed properties
    isAuthenticated: !!user && !!profile,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager',
    isOperator: profile?.role === 'operator',
    userRole: profile?.role || null,
    userName: profile?.full_name || user?.email?.split('@')[0] || user?.email || 'Utente'
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext