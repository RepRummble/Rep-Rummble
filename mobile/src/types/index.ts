export type PlanId = 'free' | 'pro' | 'premium';

export interface Subscription {
  plan: PlanId;
  renewsAt?: string;
  canceledAt?: string;
}

// User types
export interface User {
  _id: string;
  email: string;
  displayName?: string;
  streak: number;
  xp: number;
  level: number;
  subscription?: Subscription;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  displayName?: string;
}

// Meal types
export interface DetectedFood {
  name: string;
  confidence: number;
  portion: 'small' | 'medium' | 'large' | 'xl';
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Micronutrients {
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminB12?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  sodium?: number;
  fiber?: number;
  sugar?: number;
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients?: Micronutrients;
}

export interface NutritionSearchItem {
  fdcId: number;
  name: string;
  brand?: string | null;
  dataType?: string;
  nutrientsPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
}

export interface FoodAlternative {
  name: string;
  calories: number;
  reason: string;
}

export interface Meal {
  _id: string;
  userId: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  imageUrl?: string;
  confidence?: number;
  servingSize?: string;
  timestamp: string;

  // AI-enhanced fields
  detectedFoods?: DetectedFood[];
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  healthScore?: number;
  aiSuggestions?: string[];
  alternatives?: FoodAlternative[];
  isAIGenerated?: boolean;
}

// Food Analysis types (for AI recognition)
export interface FoodAnalysisRequest {
  imageBase64: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface FoodAnalysisResponse {
  success: boolean;
  data: {
    detectedFoods: DetectedFood[];
    totalNutrition: NutritionData;
    healthScore: number;
    suggestions: string[];
    alternatives: FoodAlternative[];
    confidence: number;
  };
}

// Workout types
export interface Workout {
  _id: string;
  userId: string;
  exercise: string;
  duration: number;
  calories?: number;
  completed: boolean;
  timestamp: string;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  oderId: string;
  userName: string;
  email: string;
  streak: number;
  xp: number;
  level: number;
}

// Wearable types
export interface HealthData {
  steps: number;
  calories: number;
  heartRate: number;
  sleepHours: number;
  hrv?: number;
  restingHR?: number;
  weight?: number;
  bodyFat?: number;
  date?: string;
}

export interface WearablePermissions {
  steps: boolean;
  calories: boolean;
  heartRate: boolean;
  sleep: boolean;
  weight: boolean;
}

export interface WearableDevice {
  id: string;
  name: string;
  type: 'apple_watch' | 'oura_ring' | 'garmin' | 'whoop' | 'fitbit';
  connected: boolean;
  lastSync?: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  FoodScanner: undefined;
  FoodSearch: undefined;
  FoodResults: {
    analysisResult: FoodAnalysisResponse['data'];
    imageUri: string;
  };
  Chat: { conversationId?: string } | undefined;
  Subscription: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Snap: undefined;
  Streak: undefined;
  Leaderboard: undefined;
  Wearables: undefined;
  Social: undefined;
  Profile: undefined;
};

export type SocialStackParamList = {
  SocialFeed: undefined;
  Friends: undefined;
  Challenges: undefined;
};
