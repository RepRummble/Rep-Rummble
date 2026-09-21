import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { verifyToken } from '../services/supabase.service'

export interface AuthUser {
  id: string
  email?: string
  displayName?: string
  isBypass?: boolean
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    // Temporary: allow bypass token for local development
    const BYPASS_TOKEN = process.env.TEMP_BYPASS_TOKEN || 'dev-bypass-token'

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      })
      return
    }

    if (token === BYPASS_TOKEN) {
      // Attach a fake bypass user for local testing
      req.user = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'dev@local',
        displayName: 'Dev Bypass User',
        isBypass: true,
      }
      console.log('[auth.middleware] bypass token used, user set to', req.user)
      next()
      return
    }

    // Try Supabase token verification first
    const supabaseResult = await verifyToken(token)

    if (supabaseResult.success && supabaseResult.user) {
      req.user = {
        id: supabaseResult.user.id,
        email: supabaseResult.user.email,
        displayName: supabaseResult.user.user_metadata?.displayName
      }
      next()
      return
    }

    // Fallback to JWT verification
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string }

      req.user = {
        id: decoded.id
      }
      next()
      return
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
      return
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    })
    return
  }
}

// Optional auth - doesn't require token but will attach user if present
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    void res
    let token: string | undefined

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      next()
      return
    }

    // Try Supabase token verification
    const supabaseResult = await verifyToken(token)

    if (supabaseResult.success && supabaseResult.user) {
      req.user = {
        id: supabaseResult.user.id,
        email: supabaseResult.user.email,
        displayName: supabaseResult.user.user_metadata?.displayName
      }
    } else {
      // Fallback to JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string }
        req.user = { id: decoded.id }
      } catch {
        // Token invalid but optional, continue without user
      }
    }

    next()
  } catch (error) {
    // Don't fail, just continue without user
    next()
  }
}

// Admin check middleware
export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authorized'
    })
    return
  }

  // TODO: Check admin status from database
  // For now, allow all authenticated users
  next()
}

// Agent check middleware - ensures user is a support agent
export const agentOnly = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authorized'
    })
    return
  }

  try {
    // Dynamic import to avoid circular dependency
    const { SupportAgent } = await import('../models/SupportAgent.model')

    const agent = await SupportAgent.findOne({ userId: req.user.id })

    if (!agent) {
      res.status(403).json({
        success: false,
        message: 'Agent access required'
      })
      return
    }

    // Attach agent to request for use in controllers
    ;(req as any).agent = agent
    next()
  } catch (error) {
    console.error('Agent middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during agent verification'
    })
  }
}
