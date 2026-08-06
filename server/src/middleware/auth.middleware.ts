import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { verifyToken } from '../services/supabase.service'
import { JWT_SECRET } from '../config/security'

export interface AuthUser {
  id: string
  email?: string
  displayName?: string
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

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      })
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
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string }

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
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string }
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

// Admin check middleware - requires the authenticated user's role to be 'admin' in the DB
export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authorized'
    })
    return
  }

  try {
    // Dynamic import to avoid circular dependency, matching agentOnly below
    const { User } = await import('../models/User.model')

    const dbUser = await User.findById(req.user.id).select('role')

    if (!dbUser || dbUser.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      })
      return
    }

    next()
  } catch (error) {
    console.error('Admin middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during admin verification'
    })
  }
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
