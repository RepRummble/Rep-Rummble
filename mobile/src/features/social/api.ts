import api from '../../config/api';
import type { MealSnap, WorkoutSnap } from './socialLogic';

export interface PostAuthor { _id: string; displayName: string }
export interface Post {
  _id: string; author: PostAuthor; authorStreak: number; mine: boolean; createdAt: string; content: string;
  postType: 'general' | 'workout' | 'meal' | 'achievement' | 'milestone' | 'daily' | 'challenge';
  snapshot: (Partial<WorkoutSnap> & Partial<MealSnap> & { prompt?: string }) | null;
  likeCount: number; liked: boolean; commentCount: number;
}
export interface FeedPage { posts: Post[]; nextBefore: string | null; daily: { dayKey: string; prompt: string; posted: boolean } }

export interface Story { _id: string; kind: 'text' | 'workout' | 'meal' | 'streak'; text: string; theme: number; snapshot: any; createdAt: string; expiresAt: string; viewed: boolean; viewCount?: number }
export interface StoryGroup { author: PostAuthor; isMe: boolean; seen: boolean; stories: Story[] }

export interface Comment { _id: string; author: { _id: string; displayName: string }; content: string; createdAt: string }
export interface Conversation { userId: string; displayName: string; lastText: string; lastAt: string; lastFromMe: boolean; unread: number }
export interface Message { _id: string; mine: boolean; text: string; createdAt: string; readAt: string | null }
export interface Person { _id: string; displayName: string; relation: 'none' | 'friends' | 'pending_sent' | 'pending_received' }
export interface Friend { id: string; displayName: string; friendshipId: string; streak: number }
export interface StreakRow { _id: string; displayName: string; streak: number; isMe: boolean }

const tz = () => new Date().getTimezoneOffset();
const msg = (e: any, fallback: string) => e?.response?.data?.message || e?.response?.data?.error || fallback;
export const errorMessage = msg;

export interface RecentWorkout { _id: string; exercise: string; duration: number; timestamp: string }
export interface RecentMeal { _id: string; foodName: string; calories: number; timestamp: string }

export const social = {
  recentWorkouts: async (): Promise<RecentWorkout[]> => ((await api.get('/workouts')).data.data ?? []).slice(0, 8),
  recentMeals: async (): Promise<RecentMeal[]> => ((await api.get('/meals')).data.data ?? []).slice(0, 8),

  feed: async (before?: string): Promise<FeedPage> => (await api.get('/social/feed', { params: { before, tz: tz(), limit: 20 } })).data,
  createPost: async (body: Record<string, unknown>): Promise<Post> => (await api.post('/social/posts', { ...body, tz: tz() })).data.post,
  like: async (id: string) => (await api.post(`/social/posts/${id}/like`)).data,
  comments: async (id: string): Promise<Comment[]> => (await api.get(`/social/posts/${id}/comments`)).data.comments ?? [],
  addComment: async (id: string, content: string) => (await api.post(`/social/posts/${id}/comments`, { content })).data,
  deletePost: async (id: string) => (await api.delete(`/social/posts/${id}`)).data,

  stories: async (): Promise<StoryGroup[]> => (await api.get('/stories')).data.data,
  createStory: async (body: Record<string, unknown>): Promise<Story> => (await api.post('/stories', { ...body, tz: tz() })).data.data,
  viewStory: async (id: string) => (await api.post(`/stories/${id}/view`)).data,
  storyViewers: async (id: string): Promise<{ _id: string; displayName: string }[]> => (await api.get(`/stories/${id}/viewers`)).data.data,
  deleteStory: async (id: string) => (await api.delete(`/stories/${id}`)).data,

  inbox: async (): Promise<Conversation[]> => (await api.get('/messages')).data.data,
  unread: async (): Promise<number> => (await api.get('/messages/unread')).data.data.unread,
  thread: async (userId: string, before?: string): Promise<{ with: PostAuthor; messages: Message[]; hasMore: boolean }> => (await api.get(`/messages/${userId}`, { params: { before } })).data.data,
  send: async (userId: string, text: string): Promise<Message> => (await api.post(`/messages/${userId}`, { text })).data.data,
  markRead: async (userId: string) => (await api.post(`/messages/${userId}/read`)).data,

  search: async (q: string): Promise<Person[]> => (await api.get('/people/search', { params: { q } })).data.data,
  streaks: async (): Promise<StreakRow[]> => (await api.get('/people/streaks', { params: { tz: tz() } })).data.data,
  friends: async (): Promise<Friend[]> => (await api.get('/friends')).data.friends,
  requests: async (): Promise<{ requests: { id: string; requester: PostAuthor & { id: string } }[]; sent: { id: string; recipient: { id: string; displayName: string } }[] }> => (await api.get('/friends/requests')).data,
  sendRequest: async (friendId: string) => (await api.post('/friends/request', { friendId })).data,
  accept: async (id: string) => (await api.post(`/friends/accept/${id}`)).data,
  decline: async (id: string) => (await api.post(`/friends/decline/${id}`)).data,
  removeFriend: async (friendshipId: string) => (await api.delete(`/friends/${friendshipId}`)).data,

  report: async (body: { targetType: string; targetId: string; reason: string; details?: string }) => (await api.post('/safety/report', body)).data,
  block: async (userId: string) => (await api.post(`/safety/block/${userId}`)).data,
  unblock: async (userId: string) => (await api.delete(`/safety/block/${userId}`)).data,
  blocks: async (): Promise<{ _id: string; displayName: string }[]> => (await api.get('/safety/blocks')).data.data,
};
