import { Request, Response } from "express"
import jwt from "jsonwebtoken"
import { AuthRequest } from "../middleware/auth.middleware"
import { ApiError } from "../types"
import * as supabaseService from "../services/supabase.service"
import { User } from "../models/User.model"
import nodemailer from "nodemailer"

// Generate JWT Token
const generateToken = (id: string): string => {
  const options = { expiresIn: process.env.JWT_EXPIRE || "7d" } as jwt.SignOptions
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret", options)
}

// @route POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" })
    }

    const result = await supabaseService.signUpWithEmail(email, password, { displayName })

    if (!result.success || !result.user) {
      return res.status(400).json({ success: false, message: result.error || "Registration failed" })
    }

    // Also create in MongoDB
    await User.findOneAndUpdate(
      { email: result.user.email },
      { email: result.user.email, displayName: displayName || "" },
      { upsert: true, new: true }
    )

    const token = generateToken(result.user.id)

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: displayName || result.user.user_metadata?.displayName,
        },
        token,
      },
    })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({ success: false, message: err.message || "Server error" })
  }
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
export const getOAuthUrl = async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as 'google' | 'facebook' | 'apple' | 'twitter'
    const redirectTo = (req.query.redirect as string) || process.env.CLIENT_URL + '/auth/callback'

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
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userEmail = req.user?.email

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    // Delete from Supabase auth
    const result = await supabaseService.deleteUser(userId)
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || "Failed to delete account" })
    }

    // Delete from MongoDB
    if (userEmail) {
      await User.deleteOne({ email: userEmail })
    }

    // Send confirmation email if configured
    if (userEmail && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        })
        await transporter.sendMail({
          from: `"Reprummble" <${process.env.GMAIL_USER}>`,
          to: userEmail,
          subject: 'Your Reprummble account has been deleted',
          text: `Hi,\n\nYour Reprummble account (${userEmail}) has been permanently deleted as requested.\n\nAll your personal data, health logs, and workout records have been removed from our systems within the timeframes described in our Privacy Policy.\n\nIf you did not request this, please contact us immediately at support@reprummble.com.\n\nTake care,\nThe Reprummble Team`,
        })
        // Also notify admin
        await transporter.sendMail({
          from: `"Reprummble" <${process.env.GMAIL_USER}>`,
          to: process.env.GMAIL_USER,
          subject: `Account deletion: ${userEmail}`,
          text: `User ${userEmail} (ID: ${userId}) has deleted their account.\n\nTimestamp: ${new Date().toISOString()}`,
        })
      } catch (_) {
        // Email failure should not block account deletion
      }
    }

    return res.json({ success: true, message: "Account deleted successfully" })
  } catch (error) {
    const err = error as ApiError
    return res.status(500).json({ success: false, message: err.message || "Server error" })
  }
}
