import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

// Initialize Supabase client
let supabase: SupabaseClient | null = null

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    console.log('✅ Supabase initialized')
  } catch (err) {
    // @supabase/realtime-js requires native WebSocket (Node.js 21+) or a
    // ws polyfill. On Node.js 20 without a polyfill, createClient throws.
    // The server still starts; auth routes return 503 until upgraded.
    console.warn('⚠️  WARNING: Supabase initialization failed. Auth features will be limited.')
    console.warn(err instanceof Error ? err.message : String(err))
  }
} else {
  console.warn('⚠️  WARNING: Supabase credentials not set. Auth features will be limited.')
}

// Types
export interface AuthResult {
  success: boolean
  user?: User
  session?: any
  error?: string
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { displayName?: string }
): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, user: data.user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Use the anon client for sign in
    const anonClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      user: data.user,
      session: data.session
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Verify JWT token from Supabase
 */
export async function verifyToken(token: string): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return { success: false, error: error?.message || 'Invalid token' }
    }

    return { success: true, user: data.user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get OAuth URL for social login
 */
export async function getOAuthUrl(
  provider: 'google' | 'facebook' | 'apple' | 'twitter',
  redirectTo: string
): Promise<{ url: string | null; error?: string }> {
  if (!supabase) {
    return { url: null, error: 'Supabase not configured' }
  }

  try {
    const anonClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    const { data, error } = await anonClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo
      }
    })

    if (error) {
      return { url: null, error: error.message }
    }

    return { url: data.url }
  } catch (error: any) {
    return { url: null, error: error.message }
  }
}

/**
 * Sign out user
 */
export async function signOut(token: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase.auth.admin.signOut(token)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !data.user) {
      return { success: false, error: error?.message || 'User not found' }
    }

    return { success: true, user: data.user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(
  userId: string,
  metadata: Record<string, any>
): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: metadata
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, user: data.user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Export client for direct usage if needed
export { supabase }

export default {
  signUpWithEmail,
  signInWithEmail,
  verifyToken,
  getOAuthUrl,
  signOut,
  getUserById,
  updateUserMetadata,
  deleteUser
}
