import { NextFunction, Response } from 'express'
import { AuthRequest } from './auth.middleware'
import { isDBConnected } from '../config/database'
import { Business, BusinessStaff, IBusiness } from '../models/Business.model'

export type BusinessRole = 'Owner' | 'Coach' | 'Nutritionist' | 'Viewer'
export type Area = 'members' | 'plans' | 'nutrition' | 'reports' | 'settings'

export interface BusinessRequest extends AuthRequest {
  business?: IBusiness
  role?: BusinessRole
}

// What each role may do. 'rw' = read and write, 'r' = read only. Missing = no access.
const ACCESS: Record<BusinessRole, Partial<Record<Area, 'r' | 'rw'>>> = {
  Owner: { members: 'rw', plans: 'rw', nutrition: 'rw', reports: 'rw', settings: 'rw' },
  Coach: { members: 'rw', plans: 'rw', nutrition: 'r', reports: 'r' },
  Nutritionist: { members: 'r', plans: 'r', nutrition: 'rw', reports: 'r' },
  Viewer: { members: 'r', plans: 'r', nutrition: 'r', reports: 'r' },
}

export const can = (role: BusinessRole, area: Area, mode: 'read' | 'write') => {
  const level = ACCESS[role]?.[area]
  return mode === 'read' ? !!level : level === 'rw'
}

/** Finds the business the signed-in user owns, or works for as staff. */
export async function findBusinessFor(user: { id: string; email?: string; emailVerified?: boolean }) {
  const owned = await Business.findOne({ ownerId: { $eq: user.id } })
  if (owned) return { business: owned, role: 'Owner' as BusinessRole }
  // The same person can reach us through a different sign-in (email and password, Google, ...), which
  // Supabase may keep as separate accounts. The application records the email it was made with, so a
  // verified address that matches it is the owner too. Unverified addresses never count.
  if (user.email && user.emailVerified) {
    const byEmail = await Business.findOne({ ownerEmail: { $eq: user.email.toLowerCase() } })
    if (byEmail) return { business: byEmail, role: 'Owner' as BusinessRole }
  }
  // Team access is granted by email, so only for people who have proven they own that address.
  if (user.email && user.emailVerified) {
    const staff = await BusinessStaff.findOne({ email: { $eq: user.email.toLowerCase() } })
    if (staff) {
      const business = await Business.findById(staff.businessId)
      if (business) return { business, role: staff.role as BusinessRole }
    }
  }
  return null
}

/** Loads the caller's business. Only approved businesses get through. */
export const loadApprovedBusiness = async (req: BusinessRequest, res: Response, next: NextFunction) => {
  if (!isDBConnected()) return res.status(503).json({ success: false, message: 'Service temporarily unavailable' })
  try {
    const found = await findBusinessFor(req.user!)
    if (!found) return res.status(404).json({ success: false, code: 'no_business', message: 'No business account found' })
    if (found.business.status !== 'approved') {
      return res.status(403).json({ success: false, code: found.business.status, message: 'Your business account is not approved yet' })
    }
    req.business = found.business
    req.role = found.role
    return next()
  } catch (error) {
    console.error('loadApprovedBusiness error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const requireAccess = (area: Area, mode: 'read' | 'write') =>
  (req: BusinessRequest, res: Response, next: NextFunction) => {
    if (!req.role || !can(req.role, area, mode)) {
      return res.status(403).json({ success: false, message: 'Your role does not allow this action' })
    }
    return next()
  }

/** Reviewers are listed by email in ADMIN_EMAILS (comma-separated). Their email must be verified,
 *  or anyone could sign up with a reviewer's address and approve applications. */
export const adminEmails = () => (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

export const isAdminUser = (user?: { email?: string; emailVerified?: boolean }) => {
  const email = user?.email?.toLowerCase()
  return !!email && !!user?.emailVerified && adminEmails().includes(email)
}

export const adminByEmail = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ success: false, message: 'Admin access required' })
  }
  return next()
}
