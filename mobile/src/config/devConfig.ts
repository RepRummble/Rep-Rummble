import { User } from '../types';

// Toggle to skip login and use mock API data during development
export const DEV_BYPASS_AUTH = true;

export const DEV_DUMMY_USER: User = {
  _id: 'dev-user-001',
  email: 'dev@reprummble.com',
  displayName: 'Dev User',
  streak: 7,
  xp: 1250,
  level: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Mock data ───────────────────────────────────────────────────────────────

const today = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();

const MOCK_MEALS = [
  { _id: 'm1', userId: 'dev-user-001', foodName: 'Oatmeal with Berries', calories: 320, protein: 12, carbs: 54, fat: 6, mealType: 'breakfast', timestamp: today },
  { _id: 'm2', userId: 'dev-user-001', foodName: 'Grilled Chicken Salad', calories: 480, protein: 42, carbs: 18, fat: 24, mealType: 'lunch', timestamp: today },
  { _id: 'm3', userId: 'dev-user-001', foodName: 'Protein Shake', calories: 200, protein: 30, carbs: 12, fat: 4, mealType: 'snack', timestamp: yesterday },
];

const MOCK_WORKOUTS = [
  { _id: 'w1', userId: 'dev-user-001', exercise: 'Running', duration: 30, calories: 280, completed: true, timestamp: today },
  { _id: 'w2', userId: 'dev-user-001', exercise: 'Push-ups', duration: 15, calories: 90, completed: true, timestamp: today },
  { _id: 'w3', userId: 'dev-user-001', exercise: 'Cycling', duration: 45, calories: 350, completed: true, timestamp: yesterday },
];

const MOCK_LEADERBOARD = [
  { rank: 1, oderId: 'u1', userName: 'Alex Kim', email: 'alex@example.com', streak: 21, xp: 4800, level: 12 },
  { rank: 2, oderId: 'u2', userName: 'Jordan Lee', email: 'jordan@example.com', streak: 14, xp: 3200, level: 9 },
  { rank: 3, oderId: 'u3', userName: 'Sam Rivera', email: 'sam@example.com', streak: 10, xp: 2600, level: 7 },
  { rank: 4, oderId: 'u4', userName: 'Taylor Wong', email: 'taylor@example.com', streak: 9, xp: 2100, level: 6 },
  { rank: 5, oderId: 'dev-user-001', userName: 'Dev User', email: 'dev@reprummble.com', streak: 7, xp: 1250, level: 5 },
];

const MOCK_POSTS = [
  {
    _id: 'p1',
    author: { _id: 'u1', displayName: 'Alex Kim', email: 'alex@example.com' },
    postType: 'workout',
    content: 'Just crushed a 10K run! Feeling unstoppable 💪',
    likes: ['u2', 'u3'],
    comments: [],
    tags: ['running', 'cardio'],
    createdAt: today,
    updatedAt: today,
  },
  {
    _id: 'p2',
    author: { _id: 'u2', displayName: 'Jordan Lee', email: 'jordan@example.com' },
    postType: 'meal',
    content: 'Meal prepped for the whole week. Chicken, rice and veggies on repeat 🥗',
    likes: ['u1'],
    comments: [
      { _id: 'c1', author: { _id: 'u3', displayName: 'Sam Rivera', email: 'sam@example.com' }, content: 'Goals!', createdAt: today },
    ],
    tags: ['mealprep', 'nutrition'],
    createdAt: yesterday,
    updatedAt: yesterday,
  },
];

const MOCK_FRIENDS = [
  { id: 'u1', displayName: 'Alex Kim', email: 'alex@example.com', friendshipId: 'f1' },
  { id: 'u2', displayName: 'Jordan Lee', email: 'jordan@example.com', friendshipId: 'f2' },
];

const MOCK_CHALLENGES = [
  {
    _id: 'ch1',
    title: '7-Day Step Challenge',
    description: 'Walk 10,000 steps every day for 7 days.',
    challengeType: 'steps',
    targetValue: 10000,
    targetUnit: 'steps/day',
    duration: 7,
    startDate: yesterday,
    endDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    isPublic: true,
    participants: ['dev-user-001', 'u1', 'u2'],
    creator: { _id: 'u1', displayName: 'Alex Kim', email: 'alex@example.com' },
    status: 'active',
    createdAt: yesterday,
  },
  {
    _id: 'ch2',
    title: 'Burn 500 Calories',
    description: 'Hit 500 calories burned in a single workout.',
    challengeType: 'calories',
    targetValue: 500,
    targetUnit: 'kcal',
    duration: 1,
    startDate: today,
    endDate: new Date(Date.now() + 86400000).toISOString(),
    isPublic: true,
    participants: ['u2', 'u3'],
    creator: { _id: 'u2', displayName: 'Jordan Lee', email: 'jordan@example.com' },
    status: 'active',
    createdAt: today,
  },
];

const PAGINATION = { page: 1, limit: 20, total: 2, pages: 1 };

// ─── Custom axios adapter ────────────────────────────────────────────────────

function makeResponse(config: any, data: any, status = 200) {
  return Promise.resolve({ data, status, statusText: 'OK', headers: {}, config });
}

export function devAdapter(config: any): Promise<any> {
  const method = (config.method || 'get').toLowerCase();
  const url: string = config.url || '';
  const path = url.split('?')[0];

  // Meals
  if (method === 'get' && path.endsWith('/meals')) return makeResponse(config, { data: MOCK_MEALS });
  if (method === 'post' && path.endsWith('/meals')) {
    const body = JSON.parse(config.data || '{}');
    const meal = { _id: `m${Date.now()}`, userId: 'dev-user-001', timestamp: today, ...body };
    return makeResponse(config, { data: meal });
  }
  if (method === 'delete' && /\/meals\//.test(path)) return makeResponse(config, { success: true });

  // Workouts
  if (method === 'get' && path.endsWith('/workouts')) return makeResponse(config, { data: MOCK_WORKOUTS });
  if (method === 'post' && path.endsWith('/workouts')) {
    const body = JSON.parse(config.data || '{}');
    const workout = { _id: `w${Date.now()}`, userId: 'dev-user-001', completed: true, timestamp: today, ...body };
    return makeResponse(config, { data: workout });
  }
  if (method === 'delete' && /\/workouts\//.test(path)) return makeResponse(config, { success: true });

  // Leaderboard
  if (method === 'get' && path.endsWith('/leaderboard')) return makeResponse(config, { data: MOCK_LEADERBOARD });

  // Social feed
  if (method === 'get' && path.includes('/social/feed')) {
    return makeResponse(config, { success: true, posts: MOCK_POSTS, pagination: PAGINATION });
  }
  if (method === 'post' && path.endsWith('/social/posts')) {
    const body = JSON.parse(config.data || '{}');
    const post = { _id: `p${Date.now()}`, author: { _id: 'dev-user-001', displayName: 'Dev User', email: 'dev@reprummble.com' }, likes: [], comments: [], createdAt: today, updatedAt: today, ...body };
    return makeResponse(config, { success: true, post });
  }
  if (method === 'post' && /\/posts\/.*\/like/.test(path)) {
    return makeResponse(config, { success: true, liked: true, likesCount: 1 });
  }
  if (method === 'post' && /\/posts\/.*\/comments/.test(path)) {
    const body = JSON.parse(config.data || '{}');
    const comment = { _id: `c${Date.now()}`, author: { _id: 'dev-user-001', displayName: 'Dev User', email: 'dev@reprummble.com' }, createdAt: today, ...body };
    return makeResponse(config, { success: true, comment });
  }
  if (method === 'delete' && /\/posts\//.test(path)) return makeResponse(config, { success: true });

  // Friends
  if (method === 'get' && path.endsWith('/friends')) return makeResponse(config, { success: true, friends: MOCK_FRIENDS });
  if (method === 'get' && path.endsWith('/friends/requests')) return makeResponse(config, { success: true, requests: [] });
  if (method === 'post' && path.endsWith('/friends/request')) return makeResponse(config, { success: true });
  if (method === 'post' && /\/friends\/accept\//.test(path)) return makeResponse(config, { success: true });
  if (method === 'post' && /\/friends\/decline\//.test(path)) return makeResponse(config, { success: true });
  if (method === 'delete' && /\/friends\//.test(path)) return makeResponse(config, { success: true });

  // Challenges
  if (method === 'get' && (path.endsWith('/challenges') || path.includes('/challenges?'))) {
    return makeResponse(config, { success: true, challenges: MOCK_CHALLENGES, pagination: PAGINATION });
  }
  if (method === 'post' && path.endsWith('/challenges')) {
    const body = JSON.parse(config.data || '{}');
    const challenge = { _id: `ch${Date.now()}`, participants: ['dev-user-001'], creator: { _id: 'dev-user-001', displayName: 'Dev User', email: 'dev@reprummble.com' }, status: 'active', createdAt: today, ...body };
    return makeResponse(config, { success: true, challenge });
  }
  if (method === 'post' && /\/challenges\/.*\/join/.test(path)) {
    return makeResponse(config, { success: true, message: 'Joined!', challenge: MOCK_CHALLENGES[0], participant: {} });
  }

  // User profile
  if (method === 'put' && path.includes('/users/profile')) return makeResponse(config, { success: true, data: DEV_DUMMY_USER });
  if (method === 'get' && path.includes('/users/profile')) return makeResponse(config, { success: true, data: DEV_DUMMY_USER });

  // User search
  if (method === 'get' && path.includes('/users/search')) return makeResponse(config, { success: true, users: [] });

  // Chat
  if (method === 'post' && path.endsWith('/chat/start')) {
    return makeResponse(config, {
      success: true,
      data: {
        conversation: { _id: `conv-${Date.now()}`, status: 'active' },
        sessionId: `sess-${Date.now()}`,
        welcomeMessage: {
          _id: `msg-${Date.now()}`,
          conversationId: `conv-${Date.now()}`,
          senderType: 'ai',
          senderName: 'AI Assistant',
          content: "Hi! I'm your Rep Rummble AI fitness assistant. Ask me anything about workouts, nutrition, or the app!",
          contentType: 'text',
          createdAt: new Date().toISOString(),
        },
      },
    });
  }
  if (method === 'post' && path.includes('/chat/message')) return makeResponse(config, { success: true });
  if (method === 'get' && path.includes('/chat/history')) return makeResponse(config, { success: true, data: { messages: [] } });

  // AI / food analysis — return a plausible empty result so the scanner doesn't crash
  if (method === 'post' && path.includes('/ai/analyze-food')) {
    return makeResponse(config, {
      success: true,
      data: { detectedFoods: [], totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 }, healthScore: 0, suggestions: [], alternatives: [], confidence: 0 },
    });
  }
  if (method === 'get' && path.includes('/ai/nutrition')) return makeResponse(config, { success: true, data: { results: [] } });

  // Fallback
  console.warn('[DEV] Unhandled mock route:', method.toUpperCase(), url);
  return makeResponse(config, { success: true, data: [] });
}
