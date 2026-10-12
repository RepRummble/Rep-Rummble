import { Request, Response } from "express"
import jwt from "jsonwebtoken"
import { AuthRequest } from "../middleware/auth.middleware"
import { ApiError } from "../types"
import { isEmail } from "../utils/validation"
import { isDBConnected } from "../config/database"
import { sendMail } from "../services/mail.service"
import { deleteAccountData } from "../services/account-deletion.service"
import * as supabaseService from "../services/supabase.service"
import { User } from "../models/User.model"
import { JWT_SECRET } from "../config/security"

// Generate JWT Token
const generateToken = (id: string): string => {
  const options = { expiresIn: process.env.JWT_EXPIRE || "7d" } as jwt.SignOptions
  return jwt.sign({ id }, JWT_SECRET, options)
}

// @route POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" })
    }
    const normalizedEmail = email.trim().toLowerCase()
    if (!isEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" })
    }

    const result = await supabaseService.signUpWithEmail(normalizedEmail, password, { displayName })

    if (!result.success || !result.user) {
      return res.status(400).json({ success: false, message: result.error || "Registration failed" })
    }

    // Verification is on: the person has to click the link in their inbox before they can sign in.
    // No token is issued yet, otherwise anyone could use an email address they do not own.
    // The same answer is given whether or not the email already has an account.
    if (result.needsVerification) {
      if (!result.alreadyRegistered) {
        await User.findOneAndUpdate(
          { email: { $eq: normalizedEmail } },
          { email: normalizedEmail, displayName: typeof displayName === 'string' ? displayName : "" },
          { upsert: true, new: true }
        )
      }
      return res.status(202).json({
        success: true,
        data: { emailVerificationRequired: true, email: result.user.email },
      })
    }

    // Verification is switched off in Supabase: the account is usable straight away.
    await User.findOneAndUpdate(
      { email: { $eq: normalizedEmail } },
      { email: normalizedEmail, displayName: typeof displayName === 'string' ? displayName : "" },
      { upsert: true, new: true }
    )

    return res.status(201).json({
      success: true,
      data: {
        emailVerificationRequired: false,
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: displayName || result.user.user_metadata?.displayName,
        },
        token: result.session?.access_token,
        refreshToken: result.session?.refresh_token,
      },
    })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({ success: false, message: err.message || "Server error" })
  }
}

// @route POST /api/auth/resend-verification
export const resendVerification = async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (isEmail(email)) {
    await supabaseService.resendVerification(email)
  }
  // Always the same answer, so this cannot be used to find out who has an account.
  return res.json({ success: true, message: 'If that address needs verifying, we have sent a new link.' })
}

// @route POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" })
    }

    const result = await supabaseService.signInWithEmail(email, password)

    if (!result.success || !result.user) {
      if (/not confirmed/i.test(result.error || '')) {
        return res.status(403).json({
          success: false,
          code: 'email_not_verified',
          message: 'Please verify your email address first. Check your inbox for the link we sent.',
        })
      }
      return res.status(401).json({ success: false, message: result.error || "Invalid credentials" })
    }

    // Get MongoDB user data
    const mongoUser = await User.findOne({ email: result.user.email })

    const userData = {
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.user_metadata?.displayName || mongoUser?.displayName,
      streak: mongoUser?.streak || 0,
      xp: mongoUser?.xp || 0,
      level: mongoUser?.level || 1,
    }

    return res.json({
      success: true,
      data: {
        user: userData,
        token: result.session?.access_token || generateToken(result.user.id),
        refreshToken: result.session?.refresh_token,
      },
    })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({ success: false, message: err.message || "Server error" })
  }
}

// @route GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    const supabaseResult = await supabaseService.getUserById(userId)
    const mongoUser = await User.findOne({ email: supabaseResult.user?.email })

    const userData = {
      id: userId,
      email: supabaseResult.user?.email,
      displayName: supabaseResult.user?.user_metadata?.displayName || mongoUser?.displayName,
      streak: mongoUser?.streak || 0,
      xp: mongoUser?.xp || 0,
      level: mongoUser?.level || 1,
    }

    return res.json({ success: true, data: userData })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({ success: false, message: err.message || "Server error" })
  }
}

// @route GET /api/auth/oauth/:provider
// Only our own sites may receive the OAuth result. Anything else falls back to the
// default, so this endpoint can't be used as an open redirect in phishing links.
const OAUTH_REDIRECT_ORIGINS = new Set(
  ['https://reprummble.com', 'https://www.reprummble.com', 'http://localhost:5173', process.env.CLIENT_URL]
    .filter(Boolean)
    .map((u) => { try { return new URL(u as string).origin } catch { return '' } })
)

function safeOAuthRedirect(requested: unknown): string {
  const fallback = `${(process.env.CLIENT_URL || 'https://reprummble.com').replace(/\/$/, '')}/auth/callback`
  if (typeof requested !== 'string') return fallback
  try {
    const url = new URL(requested)
    return OAUTH_REDIRECT_ORIGINS.has(url.origin) && url.pathname === '/auth/callback' ? url.toString() : fallback
  } catch {
    return fallback
  }
}

export const getOAuthUrl = async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as 'google' | 'facebook' | 'apple' | 'twitter'
    const redirectTo = safeOAuthRedirect(req.query.redirect)

    const validProviders = ['google', 'facebook', 'apple', 'twitter']
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ success: false, message: "Invalid OAuth provider" })
    }

    const result = await supabaseService.getOAuthUrl(provider, redirectTo)

    if (!result.url) {
      return res.status(500).json({ success: false, message: result.error || "Failed to generate OAuth URL" })
    }

    return res.redirect(result.url)
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({ success: false, message: err.message || "Server error" })
  }
}

// @route POST /api/auth/logout
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (token) await supabaseService.signOut(token)
    return res.json({ success: true, message: "Logged out successfully" })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({ success: false, message: err.message || "Server error" })
  }
}

// @route PUT /api/auth/profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const body = req.body || {}
    console.log('[auth.controller] updateProfile user=', req.user)
    console.log('[auth.controller] updateProfile body=', body)

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    // Accept arbitrary profile metadata (displayName, photoUrl, goal, activity, diets, etc.)
    const metadata: Record<string, any> = {}
    const allowed = ['displayName', 'photoUrl', 'goal', 'activity', 'diets', 'devices', 'notifications']
    Object.keys(body).forEach((k) => {
      if (allowed.includes(k)) metadata[k] = body[k]
    })

    if (Object.keys(metadata).length > 0) {
      if (req.user?.isBypass) {
        // Local bypass mode: skip Supabase update and return success
        return res.json({ success: true, message: "Profile updated successfully (bypass mode)" })
      }

      const result = await supabaseService.updateUserMetadata(userId, metadata)
      if (!result.success) {
        return res.status(500).json({ success: false, message: result.error || 'Failed to update profile' })
      }
    }

    return res.json({ success: true, message: "Profile updated successfully" })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({ success: false, message: err.message || "Server error" })
  }
}

// @route DELETE /api/auth/account
// Deletes the signed-in person: first everything we hold about them, then their sign-in.
// Safe to retry. If the sign-in cannot be removed the data is already gone, and we say so.
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id
  const userEmail = req.user?.email

  if (!userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" })
  }
  if (!isDBConnected()) {
    return res.status(503).json({ success: false, code: 'unavailable', message: "Service temporarily unavailable. Please try again shortly." })
  }

  try {
    // Make sure we are able to close the sign-in before removing anything, so a misconfigured
    // server cannot leave someone with their data deleted and their account still open.
    const check = await supabaseService.getUserById(userId)
    if (!check.success) {
      console.error(`[deleteAccount] cannot reach Supabase for ${userId}: ${check.error}`)
      return res.status(503).json({
        success: false,
        code: 'unavailable',
        message: "We could not reach our sign-in service, so nothing was deleted. Please try again in a few minutes.",
      })
    }

    const removed = await deleteAccountData(userId, userEmail)

    const result = await supabaseService.deleteUser(userId)
    if (!result.success) {
      // Usually a database rule in the Supabase project (a table linked to auth.users without
      // ON DELETE CASCADE). The log has the exact reason for whoever runs the project.
      console.error(`[deleteAccount] Supabase refused to delete user ${userId}: ${result.error}. Their data was already removed:`, removed)
      return res.status(502).json({
        success: false,
        code: 'auth_delete_failed',
        message: "Your data has been deleted, but we could not close your sign-in. Please email support@reprummble.com and we will finish it for you.",
      })
    }

    console.log(`[deleteAccount] deleted ${userId}:`, removed)

    if (userEmail) {
      void sendMail(
        userEmail,
        'Your Reprummble account has been deleted',
        `Hi,\n\nYour Reprummble account (${userEmail}) has been permanently deleted as requested, along with your workouts, meals, and other data.\n\nIf you did not request this, please contact us immediately at support@reprummble.com.\n\nTake care,\nThe Reprummble Team\n`,
      )
      if (process.env.GMAIL_USER) {
        void sendMail(process.env.GMAIL_USER, `Account deletion: ${userEmail}`, `User ${userEmail} (ID: ${userId}) deleted their account.\n\nTimestamp: ${new Date().toISOString()}\n`)
      }
    }

    return res.json({ success: true, message: "Account deleted successfully" })
  } catch (error) {
    console.error('[deleteAccount] failed:', error)
    return res.status(500).json({
      success: false,
      code: 'delete_failed',
      message: "Something went wrong while deleting your data. Nothing about your sign-in was changed, so you can try again.",
    })
  }
}
