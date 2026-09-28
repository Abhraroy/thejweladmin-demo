'use server'

import { createClient } from '@/lib/supabase-Utils/server'
import supabaseAdmin from '@/lib/supabase-Utils/admin'
import { ADMIN_SECRET_KEY } from '@/lib/admin-config'
import { revalidatePath } from 'next/cache'

interface LoginFormData {
  email: string
  password: string
  key: string
}

function isValidAdminKey(key: string): boolean {
  return key === ADMIN_SECRET_KEY && key.length > 0
}

export async function adminLogin(formData: LoginFormData) {
  try {
    // Step 1: Verify server-side admin key
    if (!isValidAdminKey(formData.key)) {
      return {
        success: false,
        error: 'Invalid admin key'
      }
    }

    const supabase = await createClient()

    // Clear any previous or stale session/chunks before signing in
    await supabase.auth.signOut()

    // Step 2: Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })

    if (authError) {
      console.error('Authentication error:', authError.message)
      return {
        success: false,
        error: 'Invalid email or password'
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Authentication failed'
      }
    }

    // Step 3: Verify user has ADMIN type metadata
    const userMetadata = authData.user.user_metadata
    if (!userMetadata || userMetadata.TYPE !== 'ADMIN') {
      console.error('User is not an admin:', authData.user.id)
      await supabase.auth.signOut()
      return {
        success: false,
        error: 'Access denied: Admin privileges required'
      }
    }

    // Step 4: Successful login
    console.log('Admin login successful for user:', authData.user.id)
    revalidatePath('/')
    return {
      success: true
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }
  }
}

export async function createAdmin(formData: LoginFormData) {
  try {
    // Step 1: Verify server-side admin key
    if (!isValidAdminKey(formData.key)) {
      return {
        success: false,
        error: 'Invalid admin key'
      }
    }

    // Step 2: Create user with Supabase Admin API
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: { TYPE: 'ADMIN' },
    })

    if (createError) {
      if (createError.message?.toLowerCase().includes('already registered')) {
        return {
          success: false,
          error: 'An account with this email already exists. Use Login instead.'
        }
      }
      console.error('Admin creation error:', createError.message)
      return {
        success: false,
        error: createError.message || 'Failed to create admin account'
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Failed to create admin account'
      }
    }

    console.log('Admin created successfully:', authData.user.email)
    revalidatePath('/login')
    return {
      success: true,
      message: 'Admin account created. You can now log in.'
    }
  } catch (error) {
    console.error('Admin creation error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }
  }
}

// Server action to check if user is authenticated as admin
export async function checkAdminAuth() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { authenticated: false }
    }

    // Check if user has admin metadata
    const userMetadata = user.user_metadata
    if (!userMetadata || userMetadata.TYPE !== 'ADMIN') {
      return { authenticated: false }
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: userMetadata
      }
    }
  } catch (error) {
    console.error('Auth check error:', error)
    return { authenticated: false, authError: true as const }
  }
}

// Server action for logout
export async function adminLogout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/login')
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: false, error: 'Logout failed' }
  }
}
