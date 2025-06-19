// ===================================
// SAPORI & COLORI - AUTH CONTEXT DEBUG DETTAGLIATO
// ===================================

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  isAuthenticated: false
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  console.log('🚀 AuthProvider render - loading:', loading)

  // 🔍 DEBUGGING: Verifica struttura tabella
  const checkProfilesTable = async () => {
    try {
      console.log('🔍 Checking profiles table structure...')
      
      // Test 1: Query semplice per vedere se tabella esiste
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .limit(1)
      
      console.log('📊 Profiles table check:', { data, error, count })
      
      if (error) {
        console.error('❌ Profiles table error:', error)
        return false
      }
      
      console.log('✅ Profiles table exists, records count:', count)
      return true
      
    } catch (error) {
      console.error('❌ Table check failed:', error)
      return false
    }
  }

  // ⚡ FUNZIONE DEBUG: Carica profilo con logging dettagliato
  const loadUserProfile = useCallback(async (authUser) => {
    const startTime = performance.now()
    console.log('⏱️ === STARTING PROFILE LOAD ===')
    console.log('👤 User ID:', authUser.id)
    console.log('📧 User Email:', authUser.email)
    
    try {
      // Step 1: Verifica tabella
      console.log('🔍 Step 1: Checking table...')
      const tableExists = await checkProfilesTable()
      if (!tableExists) {
        console.log('❌ Table check failed, using fallback')
        const fallbackProfile = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.email.split('@')[0],
          role: 'admin',
          active: true
        }
        setProfile(fallbackProfile)
        setUser(authUser)
        setLoading(false)
        return
      }

      // Step 2: Query profilo esistente
      console.log('🔍 Step 2: Querying existing profile...')
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      console.log('📊 Profile query result:', { data, error })

      if (error) {
        console.log('⚠️ Profile not found, error code:', error.code)
        console.log('📝 Error details:', error)
        
        if (error.code === 'PGRST116') {
          // Step 3: Crea nuovo profilo
          console.log('🔍 Step 3: Creating new profile...')
          const newProfileData = {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.email.split('@')[0],
            role: 'admin',
            active: true
          }
          
          console.log('📝 Creating profile with data:', newProfileData)
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfileData)
            .select()
            .single()

          console.log('📊 Profile creation result:', { newProfile, createError })

          if (createError) {
            console.error('❌ Error creating profile:', createError)
            console.log('🔍 Create error details:', createError)
            
            // Fallback con profilo in memoria
            setUser(authUser)
            setProfile(newProfileData)
            setLoading(false)
            return
          }

          setProfile(newProfile)
          setUser(authUser)
          console.log('✅ Profile created successfully:', newProfile)
          console.log('⏱️ Total time:', performance.now() - startTime, 'ms')
          setLoading(false)
          return
        }

        // Altri errori
        console.error('❌ Other profile error:', error)
        setUser(authUser)
        setProfile({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.email.split('@')[0],
          role: 'admin',
          active: true
        })
        setLoading(false)
        return
      }

      // Step 4: Profilo trovato
      console.log('✅ Profile found:', data)
      
      // Verifica account attivo
      if (!data.active) {
        console.error('❌ Account disabled')
        setLoading(false)
        await signOut()
        return
      }

      setProfile(data)
      setUser(authUser)
      console.log('✅ Profile loaded successfully')
      console.log('⏱️ Total time:', performance.now() - startTime, 'ms')
      setLoading(false)

    } catch (error) {
      console.error('❌ === PROFILE LOAD ERROR ===')
      console.error('Error details:', error)
      console.error('Error stack:', error.stack)
      
      // Fallback finale
      setUser(authUser)
      setProfile({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.email.split('@')[0],
        role: 'admin',
        active: true
      })
      setLoading(false)
    }
  }, [])

  // ⚡ Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      return { error: null }
    } catch (error) {
      console.error('❌ Sign out error:', error)
      setLoading(false)
      return { error }
    }
  }, [])

  // ⚡ INIZIALIZZAZIONE
  useEffect(() => {
    console.log('🔄 === INITIALIZING AUTH ===')
    let mounted = true

    const initAuth = async () => {
      try {
        const timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('⏰ === AUTH TIMEOUT REACHED ===')
            setLoading(false)
          }
        }, 5000) // 5 secondi per debug

        console.log('🔍 Getting session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        clearTimeout(timeoutId)
        
        if (!mounted) return

        console.log('📊 Session result:', { session: !!session, error })

        if (error) {
          console.error('❌ Session error:', error)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log('✅ Found session for:', session.user.email)
          await loadUserProfile(session.user)
        } else {
          console.log('ℹ️ No session - showing login')
          setLoading(false)
        }

      } catch (error) {
        console.error('❌ === INIT AUTH ERROR ===')
        console.error(error)
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [loadUserProfile])

  // ⚡ AUTH STATE LISTENER
  useEffect(() => {
    console.log('👂 Setting up auth listener...')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email || 'no user')
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // ⚡ SIGN IN CON DEBUG
  const signIn = async (email, password) => {
    const startTime = performance.now()
    console.log('🔐 === STARTING SIGN IN ===')
    console.log('📧 Email:', email)
    
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      })

      if (error) {
        console.error('❌ Sign in error:', error)
        setLoading(false)
        throw error
      }

      console.log('✅ Auth successful for:', data.user.email)
      console.log('🔍 Loading profile...')
      
      await loadUserProfile(data.user)
      
      console.log('✅ === SIGN IN COMPLETED ===')
      console.log('⏱️ Total login time:', performance.now() - startTime, 'ms')
      return { user: data.user, error: null }

    } catch (error) {
      console.error('❌ === SIGN IN FAILED ===')
      console.error(error)
      setLoading(false)
      return { user: null, error }
    }
  }

  // Context value
  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user && !!profile,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager', 
    isOperator: profile?.role === 'operator',
    userRole: profile?.role || null,
    userName: profile?.full_name || user?.email || 'Unknown User'
  }

  console.log('📊 === CURRENT AUTH STATE ===')
  console.log('User:', !!user)
  console.log('Profile:', !!profile) 
  console.log('Loading:', loading)
  console.log('Authenticated:', value.isAuthenticated)

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext