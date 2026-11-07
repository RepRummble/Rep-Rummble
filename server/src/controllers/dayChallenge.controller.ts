import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { DayChallenge, DayChallengeMember, IDayChallenge } from '../models/DayChallenge.model'
import { User } from '../models/User.model'
import { Workout } from '../models/Workout.model'
import { clampTz, localDay } from '../services/progress.service'
import { areFriends, blockedWith, cleanText, isId } from '../services/social.service'
import {
  MAX_ACTIVE_PER_PERSON, MAX_MEMBERS, MemberProgress, daysBetween, dayNumber, endKeyFor, isLength, isPace, progressFor, stateOf, targetFor,
} from '../services/challenge.logic'

const oid = (v: unknown) => String(v)

type Row = Awaited<ReturnType<typeof loadChallenges>>[number]

/**
 * Loads challenges with everyone's real progress. One query reads the workouts of every joined member in the span
 * of these challenges, then each person's days are worked out in their own timezone.
 */
async function loadChallenges(challenges: IDayChallenge[], me: string, now = new Date()) {
  if (!challenges.length) return []
  const ids = challenges.map((c) => c._id)
  const members = await DayChallengeMember.find({ challenge: { $in: ids } }).lean()
  const blocked = await blockedWith(me)
  const visible = members.filter((m) => !blocked.has(oid(m.user)) || oid(m.user) === me)
  const users = await User.find({ _id: { $in: [...new Set(visible.map((m) => m.user))] } }).select('displayName').lean()
  const names = new Map(users.map((u) => [oid(u._id), u.displayName || 'Member']))

  const joined = visible.filter((m) => m.status === 'joined' && m.supabaseId)
  const from = new Date(Date.parse(`${challenges.reduce((a, c) => (c.startKey < a ? c.startKey : a), challenges[0].startKey)}T00:00:00Z`) - 2 * 86_400_000)
  const workouts = joined.length
    ? await Workout.find({ userId: { $in: [...new Set(joined.map((m) => m.supabaseId as string))] }, timestamp: { $gte: from }, completed: { $ne: false } }).select('userId timestamp').lean()
    : []
  const bySid = new Map<string, Date[]>()
  for (const w of workouts) { const l = bySid.get(w.userId) ?? []; l.push(new Date(w.timestamp)); bySid.set(w.userId, l) }

  return challenges.map((c) => {
    const people = visible.filter((m) => oid(m.challenge) === oid(c._id) && m.status !== 'declined').map((m) => {
      let progress: MemberProgress | null = null
      if (m.status === 'joined') {
        const keys = new Set((bySid.get(m.supabaseId ?? '') ?? []).map((d) => localDay(d, m.tz)))
        progress = progressFor(keys, c.startKey, c.days, c.perWeek, localDay(now, m.tz))
      }
      return {
        _id: oid(m.user), displayName: names.get(oid(m.user)) || 'Member', isMe: oid(m.user) === me, status: m.status as 'invited' | 'joined', progress,
        invitedBy: m.invitedBy ? names.get(oid(m.invitedBy)) ?? undefined : undefined,
      }
    }).sort((a, b) => Number(b.isMe) - Number(a.isMe) || (b.progress?.done ?? -1) - (a.progress?.done ?? -1))
    return { c, people }
  })
}

function shape(row: Row, me: string, tz: number, now = new Date()) {
  const { c, people } = row
  const today = localDay(now, tz)
  const mine = people.find((p) => p.isMe)
  return {
    _id: oid(c._id), title: c.title, days: c.days, perWeek: c.perWeek, target: c.target, startKey: c.startKey, endKey: c.endKey,
    state: stateOf(c.startKey, c.days, today), dayNumber: Math.min(c.days, Math.max(1, dayNumber(c.startKey, today))),
    daysLeft: Math.max(0, daysBetween(today, c.endKey) + (today <= c.endKey ? 1 : 0)),
    isCreator: oid(c.creator) === me,
    myStatus: mine?.status ?? 'joined',
    members: people,
  }
}

async function myMemberships(me: string) { return DayChallengeMember.find({ user: me, status: { $in: ['joined', 'invited'] } }).lean() }

// @route POST /api/day-challenges   { days: 30|60|90, perWeek: 3|5|7, title?, friendIds?: string[], tz? }
export const createChallenge = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id, sid = req.user!.supabaseId
  const { days, perWeek } = req.body ?? {}
  if (!isLength(days) || !isPace(perWeek)) return res.status(400).json({ success: false, message: 'Choose 30, 60 or 90 days, and 3, 5 or 7 training days a week.' })
  if (!sid) return res.status(400).json({ success: false, message: 'Your account is not ready yet. Please try again.' })
  const tz = clampTz(req.body?.tz)

  const mine = await DayChallengeMember.find({ user: me, status: 'joined' }).select('challenge').lean()
  if (mine.length) {
    const active = await DayChallenge.countDocuments({ _id: { $in: mine.map((m) => m.challenge) }, endKey: { $gte: localDay(new Date(), tz) } })
    if (active >= MAX_ACTIVE_PER_PERSON) return res.status(429).json({ success: false, message: `You can be in ${MAX_ACTIVE_PER_PERSON} challenges at a time. Finish or leave one first.` })
  }

  const friendIds: string[] = Array.isArray(req.body?.friendIds) ? [...new Set<string>(req.body.friendIds.filter(isId))].slice(0, MAX_MEMBERS - 1) : []
  const blocked = await blockedWith(me)
  for (const f of friendIds) {
    if (f === me || blocked.has(f) || !(await areFriends(me, f))) return res.status(400).json({ success: false, message: 'You can only invite your friends.' })
  }

  const startKey = localDay(new Date(), tz)
  const title = cleanText(req.body?.title, 60) || `${days}-day challenge`
  const challenge = await DayChallenge.create({ creator: me, title, days, perWeek, target: targetFor(days, perWeek), startKey, endKey: endKeyFor(startKey, days) })
  await DayChallengeMember.create({ challenge: challenge._id, user: me, supabaseId: sid, tz, status: 'joined' })
  if (friendIds.length) await DayChallengeMember.insertMany(friendIds.map((f) => ({ challenge: challenge._id, user: f, status: 'invited', invitedBy: me })))

  const [row] = await loadChallenges([challenge], me)
  res.status(201).json({ success: true, data: shape(row, me, tz) })
}

// @route GET /api/day-challenges?tz=   Mine (joined and invited), active first.
export const listChallenges = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  const tz = clampTz(req.query.tz)
  const mems = await myMemberships(me)
  const challenges = await DayChallenge.find({ _id: { $in: mems.map((m) => m.challenge) } }).sort({ createdAt: -1 }).limit(40)
  const rows = (await loadChallenges(challenges, me)).map((r) => shape(r, me, tz))
  rows.sort((a, b) => Number(a.state === 'finished') - Number(b.state === 'finished') || Number(b.myStatus === 'invited') - Number(a.myStatus === 'invited'))
  res.json({ success: true, data: rows })
}

async function membershipOf(challengeId: string, me: string) {
  if (!isId(challengeId)) return null
  return DayChallengeMember.findOne({ challenge: challengeId, user: me, status: { $in: ['joined', 'invited'] } })
}

// @route GET /api/day-challenges/:id?tz=
export const getChallenge = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  const m = await membershipOf(String(req.params.id), me)
  if (!m) return res.status(404).json({ success: false, message: 'Challenge not found.' })
  const c = await DayChallenge.findById(m.challenge)
  if (!c) return res.status(404).json({ success: false, message: 'Challenge not found.' })
  const [row] = await loadChallenges([c], me)
  res.json({ success: true, data: shape(row, me, clampTz(req.query.tz)) })
}

// @route POST /api/day-challenges/:id/invite   { friendIds }
export const inviteFriends = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  const m = await membershipOf(String(req.params.id), me)
  if (!m || m.status !== 'joined') return res.status(404).json({ success: false, message: 'Challenge not found.' })
  const c = await DayChallenge.findById(m.challenge)
  if (!c) return res.status(404).json({ success: false, message: 'Challenge not found.' })
  if (stateOf(c.startKey, c.days, localDay(new Date(), clampTz(req.body?.tz ?? m.tz))) === 'finished') return res.status(400).json({ success: false, message: 'This challenge is over.' })

  const ids: string[] = Array.isArray(req.body?.friendIds) ? [...new Set<string>(req.body.friendIds.filter(isId))] : []
  if (!ids.length) return res.status(400).json({ success: false, message: 'Choose who to invite.' })
  const blocked = await blockedWith(me)
  const existing = await DayChallengeMember.find({ challenge: c._id }).lean()
  const by = new Map(existing.map((e) => [oid(e.user), e]))
  const slotsTaken = existing.filter((e) => e.status !== 'declined').length
  const fresh = ids.filter((f) => !by.has(f) || by.get(f)!.status === 'declined')
  if (slotsTaken + fresh.length > MAX_MEMBERS) return res.status(400).json({ success: false, message: `A challenge can have up to ${MAX_MEMBERS} people.` })
  for (const f of fresh) {
    if (f === me || blocked.has(f) || !(await areFriends(me, f))) return res.status(400).json({ success: false, message: 'You can only invite your friends.' })
  }
  for (const f of fresh) {
    await DayChallengeMember.updateOne({ challenge: c._id, user: f }, { $set: { status: 'invited', invitedBy: me } }, { upsert: true })
  }
  const [row] = await loadChallenges([c], me)
  res.json({ success: true, data: shape(row, me, clampTz(req.body?.tz ?? m.tz)) })
}

// @route POST /api/day-challenges/:id/accept   { tz }  and  /decline
export const respond = (accept: boolean) => async (req: AuthRequest, res: Response) => {
  const me = req.user!.id, sid = req.user!.supabaseId
  const id = String(req.params.id)
  const m = isId(id) ? await DayChallengeMember.findOne({ challenge: id, user: me, status: 'invited' }) : null
  if (!m) return res.status(404).json({ success: false, message: 'No invitation found.' })
  const c = await DayChallenge.findById(m.challenge)
  if (!c) return res.status(404).json({ success: false, message: 'Challenge not found.' })
  const tz = clampTz(req.body?.tz)
  if (!accept) { m.status = 'declined'; await m.save(); return res.json({ success: true, data: { declined: true } }) }
  if (stateOf(c.startKey, c.days, localDay(new Date(), tz)) === 'finished') return res.status(400).json({ success: false, message: 'This challenge is already over.' })
  if (!sid) return res.status(400).json({ success: false, message: 'Your account is not ready yet. Please try again.' })
  m.status = 'joined'; m.supabaseId = sid; m.tz = tz
  await m.save()
  const [row] = await loadChallenges([c], me)
  res.json({ success: true, data: shape(row, me, tz) })
}

// @route POST /api/day-challenges/:id/leave   Anyone but the creator.
export const leave = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  const m = await membershipOf(String(req.params.id), me)
  if (!m) return res.status(404).json({ success: false, message: 'Challenge not found.' })
  const c = await DayChallenge.findById(m.challenge)
  if (c && oid(c.creator) === me) return res.status(400).json({ success: false, message: 'You started this challenge. End it for everyone instead.' })
  await DayChallengeMember.deleteOne({ _id: m._id })
  res.json({ success: true })
}

// @route DELETE /api/day-challenges/:id   The creator ends it for everyone.
export const endChallenge = async (req: AuthRequest, res: Response) => {
  const me = req.user!.id
  const id = String(req.params.id)
  const c = isId(id) ? await DayChallenge.findOne({ _id: id, creator: me }) : null
  if (!c) return res.status(404).json({ success: false, message: 'Challenge not found.' })
  await DayChallengeMember.deleteMany({ challenge: c._id })
  await DayChallenge.deleteOne({ _id: c._id })
  res.json({ success: true })
}

