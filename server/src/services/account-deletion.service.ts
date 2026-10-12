import { Business, BusinessFood, BusinessMealPlan, BusinessMember, BusinessPlan, BusinessStaff } from '../models/Business.model'
import { Challenge } from '../models/Challenge.model'
import { ChallengeParticipant } from '../models/ChallengeParticipant.model'
import { Contact } from '../models/Contact.model'
import { Friendship } from '../models/Friendship.model'
import { Lead } from '../models/Lead.model'
import { Meal } from '../models/Meal.model'
import { Referral, ReferralCredit, ReferralProfile } from '../models/Referral.model'
import { Review } from '../models/Review.model'
import { SocialPost } from '../models/SocialPost.model'
import { SupportConversation } from '../models/SupportConversation.model'
import { SupportMessage } from '../models/SupportMessage.model'
import { User } from '../models/User.model'
import { WearableData } from '../models/WearableData.model'
import { Workout } from '../models/Workout.model'
import { WorkoutPlan } from '../models/WorkoutPlan.model'
import { WorkoutSession } from '../models/WorkoutSession.model'

/** `{ $eq }` keeps request-derived values as plain values, never query operators. */
const eq = <T>(value: T) => ({ $eq: value })

/**
 * Permanently removes everything we hold about one person, from every collection:
 * their workouts, meals and wearable readings, referral records, friendships, challenge entries,
 * support history, anything stored against their email, and the business they own (with its
 * members, plans, foods and team). It is safe to run again: a retry just finds nothing left.
 *
 * Returns how many records were removed from each place, for the server log.
 */
export async function deleteAccountData(userId: string, email?: string): Promise<Record<string, number>> {
  const mail = email?.trim().toLowerCase()
  const removed: Record<string, number> = {}
  const count = (label: string, result: { deletedCount?: number } | undefined | null) => {
    if (result?.deletedCount) removed[label] = (removed[label] ?? 0) + result.deletedCount
  }

  // The older Mongo user record (found by email) owns records stored under an ObjectId.
  const legacy = mail ? await User.findOne({ email: eq(mail) }).select('_id') : null

  // A business they own goes with them, including its members, plans, foods and team.
  const business = await Business.findOne({ ownerId: eq(userId) }).select('_id')
  if (business) {
    count('businessMembers', await BusinessMember.deleteMany({ businessId: business._id }))
    count('businessPlans', await BusinessPlan.deleteMany({ businessId: business._id }))
    count('businessMealPlans', await BusinessMealPlan.deleteMany({ businessId: business._id }))
    count('businessFoods', await BusinessFood.deleteMany({ businessId: business._id }))
    count('businessStaff', await BusinessStaff.deleteMany({ businessId: business._id }))
    count('business', await Business.deleteOne({ _id: business._id }))
  }

  // Their own records, keyed by their sign-in id.
  count('workouts', await Workout.deleteMany({ userId: eq(userId) }))
  count('meals', await Meal.deleteMany({ userId: eq(userId) }))
  count('wearableData', await WearableData.deleteMany({ userId: eq(userId) }))
  count('referralProfile', await ReferralProfile.deleteMany({ userId: eq(userId) }))
  count('referralCredits', await ReferralCredit.deleteMany({ userId: eq(userId) }))
  count('referrals', await Referral.deleteMany({ $or: [{ referrerId: eq(userId) }, { referredId: eq(userId) }] }))
  count('friendships', await Friendship.deleteMany({ $or: [{ requester: eq(userId) }, { recipient: eq(userId) }] }))
  count('challengeEntries', await ChallengeParticipant.deleteMany({ user: eq(userId) }))
  await Challenge.updateMany({ participants: eq(userId) }, { $pull: { participants: userId } })

  // Being a member or team member of someone else's business: remove them from it.
  count('membershipsById', await BusinessMember.deleteMany({ userId: eq(userId) }))

  if (mail) {
    // Anything stored against their email address.
    count('membershipsByEmail', await BusinessMember.deleteMany({ email: eq(mail) }))
    count('teamSeats', await BusinessStaff.deleteMany({ email: eq(mail) }))
    count('contactMessages', await Contact.deleteMany({ email: eq(mail) }))
    count('leads', await Lead.deleteMany({ email: eq(mail) }))

    const conversations = await SupportConversation.find({ $or: [{ userEmail: eq(mail) }, ...(legacy ? [{ userId: legacy._id }] : [])] }).select('_id')
    if (conversations.length) {
      const ids = conversations.map((c) => c._id)
      count('supportMessages', await SupportMessage.deleteMany({ conversationId: { $in: ids } }))
      count('supportConversations', await SupportConversation.deleteMany({ _id: { $in: ids } }))
    }
  }

  if (legacy) {
    // Records stored under the older ObjectId.
    count('workoutPlans', await WorkoutPlan.deleteMany({ userId: legacy._id }))
    count('workoutSessions', await WorkoutSession.deleteMany({ userId: legacy._id }))
    count('reviews', await Review.deleteMany({ userId: legacy._id }))
    count('socialPosts', await SocialPost.deleteMany({ author: legacy._id }))
    await SocialPost.updateMany({}, { $pull: { likes: legacy._id, comments: { author: legacy._id } } })
    count('legacyUser', await User.deleteOne({ _id: legacy._id }))
  }

  return removed
}
