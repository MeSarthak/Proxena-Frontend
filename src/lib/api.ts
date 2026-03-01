import axios from 'axios';
import { auth } from './firebase';
import type {
  UserProfile,
  Exercise,
  ExerciseDetail,
  Category,
  Difficulty,
  Duration,
  StartSessionResponse,
  SessionHistoryResponse,
  SessionDetail,
  Subscription,
  WeakWord,
} from '../types';

// ─── Axios instance ───────────────────────────────────────────────────────────

// VITE_API_BASE_URL should be the backend origin (e.g. https://api.yourdomain.com).
// In development it defaults to '' so Vite's proxy handles /v1/* → localhost:3000.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/v1`,
  timeout: 15_000,
});

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  me: (): Promise<UserProfile> =>
    api.get<UserProfile>('/auth/me').then((r) => r.data),
};

// ─── Exercises ────────────────────────────────────────────────────────────────

export const exercisesApi = {
  list: (params?: { category?: Category; difficulty?: Difficulty; duration?: Duration }): Promise<Exercise[]> =>
    api.get<Exercise[]>('/exercises', { params }).then((r) => r.data),

  get: (publicId: string): Promise<ExerciseDetail> =>
    api.get<ExerciseDetail>(`/exercises/${publicId}`).then((r) => r.data),
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessionsApi = {
  start: (exercisePublicId: string): Promise<StartSessionResponse> =>
    api
      .post<StartSessionResponse>('/sessions/start', { exercisePublicId })
      .then((r) => r.data),

  history: (page = 1, limit = 10): Promise<SessionHistoryResponse> =>
    api
      .get<SessionHistoryResponse>('/sessions/history', { params: { page, limit } })
      .then((r) => r.data),

  get: (publicId: string): Promise<SessionDetail> =>
    api.get<SessionDetail>(`/sessions/${publicId}`).then((r) => r.data),
};

// ─── Subscription ─────────────────────────────────────────────────────────────

export const subscriptionApi = {
  get: (): Promise<Subscription> =>
    api.get<Subscription>('/subscription').then((r) => r.data),

  upgrade: (): Promise<void> =>
    api.post('/subscription/upgrade').then(() => undefined),
};

// ─── Recommendations ──────────────────────────────────────────────────────────

export const recommendationsApi = {
  weakWords: (): Promise<WeakWord[]> =>
    api.get<WeakWord[]>('/recommendations/weak-words').then((r) => r.data),
};

// ─── WebSocket URL helper ─────────────────────────────────────────────────────

// Appends a Firebase token to the wsUrl returned by POST /sessions/start.
// Using the server-provided URL ensures the correct host in all environments
// (dev proxy, staging, production split-host deployments).
export async function buildWsUrl(wsUrl: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return `${wsUrl}?token=${token}`;
}
