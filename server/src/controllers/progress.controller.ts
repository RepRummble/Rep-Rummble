import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middleware/auth.middleware'
import { claim, clampTz, isDayString, localDay, sanitizeTargets, snapshot } from '../services/progress.service'

/** Reads the same fields from a query string (GET) or a JSON body (POST) and checks them. */
function parse(req: AuthRequest, src: Record<string, any>) {
  const tz = clampTz(src.tz)
  const day = src.day
  if (!isDayString(day)) return { error: 'Send day as YYYY-MM-DD.' as const }
  if (day !== localDay(new Date(), tz)) return { error: 'Missions can only be read and collected for today.' as const }
  const supabaseId = req.user?.supabaseId
  const legacyId = req.user?.id
  if (!supabaseId || !legacyId || !mongoose.isValidObjectId(legacyId)) return { error: 'This account cannot collect XP.' as const }
  const targets = sanitizeTargets({ calories: src.calories ?? src.targets?.calories, protein: src.protein ?? src.targets?.protein, water: src.water ?? src.targets?.water })
  const glasses = Number(src.glasses)
  return { tz, day, supabaseId, legacyId, targets, glasses: Number.isFinite(glasses) ? glasses : 0 }
}

// @route GET /api/progress/missions?day=YYYY-MM-DD&tz=<minutes>&calories=&protein=&water=&glasses=
export const getMissions = async (req: AuthRequest, res: Response) => {
  const p = parse(req, req.query as Record<string, any>)
  if ('error' in p) return res.status(400).json({ success: false, message: p.error })
  try {
    return res.json({ success: true, data: await snapshot(p) })
  } catch (error) {
    console.error('getMissions failed:', error)
    return res.status(500).json({ success: false, message: 'Could not load your missions.' })
  }
}

// @route POST /api/progress/missions/claim   { day, tz, targets, glasses, ids: string[] }
export const claimMissions = async (req: AuthRequest, res: Response) => {
  const p = parse(req, req.body || {})
  if ('error' in p) return res.status(400).json({ success: false, message: p.error })
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 10) : []
  if (ids.length === 0) return res.status(400).json({ success: false, message: 'Say which missions to collect.' })
  try {
    return res.json({ success: true, data: await claim({ ...p, ids }) })
  } catch (error) {
    console.error('claimMissions failed:', error)
    return res.status(500).json({ success: false, message: 'Could not collect your XP. Nothing was lost; try again.' })
  }
}
