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
  | 'tongue_twisters'
  | 'classic_literature'
  | 'politics'
  | 'geopolitics'
  | 'speech'
  | 'diplomatic'
  | 'formal'
  | 'sports'
  | 'technology'
  | 'diagnostic'
  | 'ielts';

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
  completenessScore: number | null;
  prosodyScore: number | null;
  pronunciationScore: number | null;
  durationSeconds: number | null;
  fillerCount: number;
  wordsPerMinute: number | null;
  speechHealthScore: number | null;
  pauseCount: number;
  totalPauseMs: number;
  avgPauseMs: number;
  longestPauseMs: number;
  hesitationScore: number | null;
  mispronunciationCount: number;
  omissionCount: number;
  insertionCount: number;
  createdAt: string;
  exerciseTitle?: string;
}

export interface WordResult {
  word: string;
  accuracy: number | null;
  errorType: string | null;
  phonemes: { phoneme: string; accuracy: number }[] | null;
  syllables: { syllable: string; accuracy: number; durationMs: number }[] | null;
  durationMs: number | null;
}

export interface SessionDetail {
  publicId: string;
  status: 'pending' | 'completed' | 'failed';
  overallAccuracy: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  pronunciationScore: number | null;
  durationSeconds: number | null;
  fillerCount: number;
  wordsPerMinute: number | null;
  speechHealthScore: number | null;
  pauseCount: number;
  totalPauseMs: number;
  avgPauseMs: number;
  longestPauseMs: number;
  hesitationScore: number | null;
  mispronunciationCount: number;
  omissionCount: number;
  insertionCount: number;
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
  completenessScore: number;
  prosodyScore: number;
  pronunciationScore: number;
  durationSeconds: number;
  fillerCount: number;
  wordsPerMinute: number;
  speechHealthScore: number;
  fillerWords: string[];
  pauseCount: number;
  totalPauseMs: number;
  avgPauseMs: number;
  longestPauseMs: number;
  hesitationScore: number;
  mispronunciationCount: number;
  omissionCount: number;
  insertionCount: number;
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
