// ─── Auth / User ──────────────────────────────────────────────────────────────

export interface UserProfile {
  publicId: string;
  email: string;
  nativeLanguage: string | null;
  targetAccent: string | null;
  subscription: {
    planType: 'free' | 'pro';
    status: 'active' | 'expired' | 'cancelled';
    expiresAt: string | null;
  };
  usageToday: {
    minutesUsed: number;
    sessionsCount: number;
    dailySessionLimit: number;
  };
}

// ─── Exercises ────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Category =
  | 'conversation'
  | 'storytelling'
  | 'emotions'
  | 'interview'
  | 'daily'
  | 'business'
  | 'news'
  | 'travel'
  | 'academic'
  | 'tongue_twisters';

export type Duration = 'short' | 'medium' | 'long';

export interface Exercise {
  publicId: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  duration?: Duration;
  estimatedSeconds?: number;
}

export interface ExerciseDetail extends Exercise {
  textContent: string;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface SessionSummary {
  publicId: string;
  overallAccuracy: number | null;
  fluencyScore: number | null;
  durationSeconds: number | null;
  createdAt: string;
  exerciseTitle?: string;
}

export interface WordResult {
  word: string;
  accuracy: number | null;
  errorType: string | null;
}

export interface SessionDetail {
  publicId: string;
  status: 'pending' | 'completed' | 'failed';
  overallAccuracy: number | null;
  fluencyScore: number | null;
  durationSeconds: number | null;
  createdAt: string;
  words: WordResult[];
  exercisePublicId?: string;
}

export interface StartSessionResponse {
  sessionPublicId: string;
  wsUrl: string;
  maxDurationSeconds: number;
}

export interface SessionHistoryResponse {
  sessions: SessionSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface Subscription {
  planType: 'free' | 'pro';
  displayName: string;
  status: 'active' | 'expired' | 'cancelled';
  dailySessionLimit: number;
  expiresAt: string | null;
}

// ─── AI Recommendations ───────────────────────────────────────────────────────

export interface WeakWord {
  word: string;
  avgAccuracy: number;
  occurrences: number;
  errorTypes: string[];
}

export interface WordRecommendation {
  word: string;
  avgAccuracy: number;
  occurrences: number;
  tip: string;
  phonetic: string;
  similarWords: string[];
}

// ─── WebSocket messages ───────────────────────────────────────────────────────

export type WordStatus = 'correct' | 'partial' | 'incorrect' | 'skipped';

export interface WsWordMessage {
  type: 'word';
  word: string;
  accuracy: number;
  status: WordStatus;
}

export interface WsSummaryMessage {
  type: 'summary';
  overallAccuracy: number;
  fluencyScore: number;
  durationSeconds: number;
}

export interface WsErrorMessage {
  type: 'error';
  message: string;
}

export type WsServerMessage = WsWordMessage | WsSummaryMessage | WsErrorMessage;

export interface WsStopMessage {
  type: 'stop';
}

// ─── API error ────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
}
