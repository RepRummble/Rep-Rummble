import mongoose from 'mongoose'
import { Friendship } from '../models/Friendship.model'
import { Block } from '../models/Block.model'
import { User } from '../models/User.model'
import { Workout } from '../models/Workout.model'
import { localDay, streakFromDays } from './progress.service'

export const isId = (s: unknown): s is string => typeof s === 'string' && mongoose.isValidObjectId(s)

/** Strips control characters and tags' angle brackets, collapses blank space, and caps the length. */
export const cleanText = (input: unknown, max: number): string =>
  String(input ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)

/** Everyone the person is friends with (an accepted friend request, in either direction). */
export async function friendIdsOf(userId: string): Promise<string[]> {
  const rows = await Friendship.find({ status: 'accepted', $or: [{ requester: userId }, { recipient: userId }] }).select('requester recipient').lean()
  return [...new Set(rows.map((r) => (r.requester === userId ? r.recipient : r.requester)))]
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  return !!(await Friendship.exists({ status: 'accepted', $or: [{ requester: a, recipient: b }, { requester: b, recipient: a }] }))
}

/** Everyone who is blocked by the person, or who has blocked them. Either way the two must not see each other. */
export async function blockedWith(userId: string): Promise<Set<string>> {
  const rows = await Block.find({ $or: [{ blocker: userId }, { blocked: userId }] }).select('blocker blocked').lean()
  return new Set(rows.map((r) => (String(r.blocker) === userId ? String(r.blocked) : String(r.blocker))))
}

/** Current workout streak for each person (by account-record id), from their real logged workouts. */
export async function streaksFor(userIds: string[], tz = 0, now: Date = new Date()): Promise<Map<string, number>> {
  const out = new Map<string, number>(userIds.map((id) => [id, 0]))
  if (userIds.length === 0) return out
  const users = await User.find({ _id: { $in: userIds } }).select('supabaseId').lean()
  const bySupabase = new Map(users.filter((u) => u.supabaseId).map((u) => [u.supabaseId as string, String(u._id)]))
  if (bySupabase.size === 0) return out
  const since = new Date(now.getTime() - 400 * 24 * 3600_000)
  const rows = await Workout.find({ userId: { $in: [...bySupabase.keys()] }, timestamp: { $gte: since } }).select('userId timestamp').lean()
  const days = new Map<string, Set<string>>()
  for (const r of rows) { const set = days.get(r.userId) ?? new Set<string>(); set.add(localDay(new Date(r.timestamp), tz)); days.set(r.userId, set) }
  const today = localDay(now, tz)
  for (const [sid, uid] of bySupabase) out.set(uid, streakFromDays(days.get(sid) ?? new Set(), today))
  return out
}
