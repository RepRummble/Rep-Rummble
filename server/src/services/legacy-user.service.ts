import { User } from '../models/User.model'

/**
 * Sign-ins live in Supabase (ids are UUIDs), but the social features (posts, friends, challenges) were
 * built on the older Mongo User record, whose ids are ObjectIds. This finds that record by the person's
 * email, creating it the first time (for example after signing in with Google), so those features work
 * for every account. Only call it for an email the person has verified.
 */
export async function ensureLegacyUser(email: string, displayName?: string) {
  const normalized = email.trim().toLowerCase()
  const doc = await User.findOneAndUpdate(
    { email: { $eq: normalized } },
    { $setOnInsert: { email: normalized, ...(displayName ? { displayName } : {}) } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )
  return doc
}
