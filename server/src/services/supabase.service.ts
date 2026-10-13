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

const clientUrl = () => (process.env.CLIENT_URL || 'https://www.reprummble.com').replace(/\/$/, '')

/** A throwaway client with the public (anon) key: the same thing a browser would use. */
function anonClient(): SupabaseClient | null {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface SignUpResult extends AuthResult {
  /** True when the person must click the link we emailed before they can sign in. */
  needsVerification?: boolean
  /** True when the email already has an account (Supabase hides this from the response on purpose). */
  alreadyRegistered?: boolean
}

/**
 * Sign up with email and password.
 *
 * This uses the normal sign-up flow, so when "Confirm email" is on in the Supabase
 * dashboard Supabase emails a verification link and gives no session until it is clicked.
 * (The old admin createUser call marked every email as verified without checking.)
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { displayName?: string }
): Promise<SignUpResult> {
  const client = anonClient()
  if (!supabase || !client) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: `${clientUrl()}/auth/callback` },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      user: data.user ?? undefined,
      session: data.session,
      needsVerification: !data.session,
      alreadyRegistered: !!data.user && (data.user.identities?.length ?? 0) === 0,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/** Sends the verification email again. Callers should not reveal whether the address exists. */
export async function resendVerification(email: string): Promise<void> {
  const client = anonClient()
  if (!client) return
  try {
    await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${clientUrl()}/auth/callback` } })
  } catch (error) {
    console.error('resendVerification error:', error instanceof Error ? error.message : error)
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
  resendVerification,
  signInWithEmail,
  verifyToken,
  getOAuthUrl,
  signOut,
  getUserById,
  updateUserMetadata,
  deleteUser
}


export type KeyStatus = 'valid' | 'rejected' | 'missing' | 'unreachable'

async function probe(url: string, headers: Record<string, string>): Promise<KeyStatus> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) })
    if (res.ok) return 'valid'
    return res.status === 401 || res.status === 403 ? 'rejected' : 'unreachable'
  } catch {
    return 'unreachable'
  }
}

let keyCheck: { at: number; result: { anon: KeyStatus; service: KeyStatus } } | null = null

/**
 * Whether Supabase actually accepts the keys this server holds. "Configured" only means a value is
 * set; a rotated or mistyped key still looks configured and then fails every sign-in with
 * "Invalid API key". Checked at most once a minute, and the keys themselves are never reported.
 */
export async function checkSupabaseKeys(): Promise<{ anon: KeyStatus; service: KeyStatus }> {
  if (keyCheck && Date.now() - keyCheck.at < 60_000) return keyCheck.result
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const [anon, service] = await Promise.all([
    base && anonKey ? probe(`${base}/auth/v1/settings`, { apikey: anonKey }) : ('missing' as KeyStatus),
    base && serviceKey ? probe(`${base}/auth/v1/admin/users?per_page=1`, { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }) : ('missing' as KeyStatus),
  ])
  keyCheck = { at: Date.now(), result: { anon, service } }
  return keyCheck.result
}


/**
 * Trades a refresh token for a new access token. Supabase rotates refresh tokens, so the new one in
 * the result replaces the old one, which cannot be used again.
 */
export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const client = anonClient()
  if (!client) return { success: false, error: 'Supabase not configured' }
  try {
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data.session || !data.user) {
      return { success: false, error: error?.message || 'Could not refresh the session' }
    }
    return { success: true, user: data.user, session: data.session }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
