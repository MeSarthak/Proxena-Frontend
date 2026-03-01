/**
 * ChallengePage — Weekly pronunciation challenges.
 *
 * A new set of 5 challenges is available each Monday.
 * Personal best scores are stored in localStorage.
 * No backend changes required.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, Lock, CheckCircle2, Play, RefreshCw, Target } from 'lucide-react';
import { exercisesApi, sessionsApi, authApi } from '../lib/api';
import type { Exercise } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatPercent, scoreColor } from '../lib/utils';

// ─── Local storage helpers ────────────────────────────────────────────────────

interface ChallengeRecord {
  weekKey: string;
  scores: Record<string, number>; // exercisePublicId → best accuracy
}

const STORAGE_KEY = 'proxena_challenge';
const CHALLENGE_BADGE_KEY = 'proxena_challenge_badge';

function getWeekKey(): string {
  const now = new Date();
  // ISO week: Monday-based week number
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function loadRecord(): ChallengeRecord {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { weekKey: getWeekKey(), scores: {} };
    const r = JSON.parse(stored) as ChallengeRecord;
    if (r.weekKey !== getWeekKey()) return { weekKey: getWeekKey(), scores: {} };
    return r;
  } catch {
    return { weekKey: getWeekKey(), scores: {} };
  }
}

function saveRecord(r: ChallengeRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  } catch { /* ignore */ }
}

// Keep saveRecord available for future use (records are currently set inline by SessionSummaryPage)
void saveRecord;

function hasCompletedFirstChallenge(): boolean {
  try {
    return localStorage.getItem(CHALLENGE_BADGE_KEY) === '1';
  } catch { return false; }
}

function markFirstChallengeDone() {
  try {
    localStorage.setItem(CHALLENGE_BADGE_KEY, '1');
  } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChallengeExercise extends Exercise {
  bestScore?: number;
  completed: boolean;
  locked: boolean; // locked until previous is completed
}

export default function ChallengePage() {
  const navigate = useNavigate();
  const weekKey = useMemo(() => getWeekKey(), []);

  const [exercises, setExercises] = useState<ChallengeExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [record] = useState<ChallengeRecord>(loadRecord);
  const [limitReached, setLimitReached] = useState(false);

  // How many days until Monday reset
  const daysLeft = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon ...
    return day === 0 ? 1 : 8 - day;
  }, []);

  useEffect(() => {
    // Check daily limit
    authApi.me()
      .then((p) => {
        const u = p.usageToday;
        setLimitReached(u.sessionsCount >= u.dailySessionLimit);
      })
      .catch(() => {});

    // Fetch exercises for the challenge — pick 5 using week number as seed
    exercisesApi.list()
      .then((all) => {
        if (all.length === 0) { setLoading(false); return; }
        // Deterministic selection per week
        const seed = parseInt(weekKey.replace(/\D/g, ''), 10);
        const shuffled = [...all].sort((a, b) => {
          const ha = hashCode(a.publicId + seed);
          const hb = hashCode(b.publicId + seed);
          return ha - hb;
        });
        const five = shuffled.slice(0, Math.min(5, shuffled.length));

        const rec = loadRecord();
        const mapped: ChallengeExercise[] = five.map((ex, i) => ({
          ...ex,
          bestScore: rec.scores[ex.publicId],
          completed: ex.publicId in rec.scores,
          locked: i > 0 && !(five[i - 1].publicId in rec.scores),
        }));
        setExercises(mapped);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-derive locked state from record
  useEffect(() => {
    setExercises((prev) =>
      prev.map((ex, i) => ({
        ...ex,
        bestScore: record.scores[ex.publicId],
        completed: ex.publicId in record.scores,
        locked: i > 0 && !(prev[i - 1]?.publicId in record.scores),
      })),
    );
  }, [record]);

  const handleStart = async (ex: ChallengeExercise) => {
    if (ex.locked || limitReached) return;
    try {
      const resp = await sessionsApi.start(ex.publicId);
      navigate(`/session/${resp.sessionPublicId}?exercise=${ex.publicId}&challenge=1`, {
        state: { wsUrl: resp.wsUrl, maxDurationSeconds: resp.maxDurationSeconds },
      });
    } catch { /* handled by session page */ }
  };

  // Compute summary stats
  const completedCount = exercises.filter((e) => e.completed).length;
  const avgScore = completedCount > 0
    ? exercises.filter((e) => e.completed).reduce((s, e) => s + (e.bestScore ?? 0), 0) / completedCount
    : null;
  const allDone = completedCount === exercises.length && exercises.length > 0;

  // Mark first challenge badge on first completion
  useEffect(() => {
    if (completedCount >= 1 && !hasCompletedFirstChallenge()) {
      markFirstChallengeDone();
    }
  }, [completedCount]);

  const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const DIFFICULTY_COLOR: Record<string, string> = {
    easy:   'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard:   'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-2xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Challenge</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              5 exercises · resets in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-mono mt-1">{weekKey}</span>
      </div>

      {/* Progress banner */}
      {!loading && (
        <Card className={`mb-6 ${allDone ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-900 text-sm">This week's progress</span>
            </div>
            {allDone && (
              <Badge variant="warning">Week complete!</Badge>
            )}
          </div>
          {/* Progress dots */}
          <div className="flex gap-2 mb-3">
            {Array.from({ length: 5 }).map((_, i) => {
              const ex = exercises[i];
              return (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    ex?.completed ? 'bg-amber-400' : 'bg-gray-200'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{completedCount} / {exercises.length} completed</span>
            {avgScore != null && (
              <span className={`font-semibold ${scoreColor(avgScore)}`}>
                Avg {formatPercent(avgScore, 0)}
              </span>
            )}
          </div>
        </Card>
      )}

      {limitReached && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 flex items-center gap-2">
          <Star className="w-4 h-4 shrink-0" />
          You've reached today's practice limit. Come back tomorrow to continue!
        </div>
      )}

      {/* Exercise list */}
      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-5 h-20 skeleton" />
            ))
          : exercises.map((ex, i) => (
              <div
                key={ex.publicId}
                className={`card p-5 flex items-center gap-4 transition-all duration-200 ${
                  ex.locked ? 'opacity-60' : 'hover:shadow-md'
                }`}
              >
                {/* Step number / status icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                  ex.completed
                    ? 'bg-amber-100 text-amber-600'
                    : ex.locked
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-blue-50 text-blue-600'
                }`}>
                  {ex.completed
                    ? <CheckCircle2 className="w-4 h-4" />
                    : ex.locked
                    ? <Lock className="w-4 h-4" />
                    : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{ex.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[ex.difficulty]}`}>
                      {DIFFICULTY_LABEL[ex.difficulty]}
                    </span>
                    {ex.completed && ex.bestScore != null && (
                      <span className={`text-xs font-semibold ${scoreColor(ex.bestScore)}`}>
                        Best: {formatPercent(ex.bestScore, 0)}
                      </span>
                    )}
                    {ex.locked && (
                      <span className="text-xs text-gray-400">Complete previous first</span>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={ex.completed ? 'secondary' : 'primary'}
                  onClick={() => handleStart(ex)}
                  disabled={ex.locked || limitReached}
                  className="shrink-0"
                >
                  {ex.completed ? (
                    <><RefreshCw className="w-3.5 h-3.5" /> Retry</>
                  ) : (
                    <><Play className="w-3.5 h-3.5" /> Start</>
                  )}
                </Button>
              </div>
            ))}
      </div>

      {/* All done celebration */}
      {allDone && (
        <div className="mt-6 card p-6 text-center bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="font-bold text-gray-900 mb-1">Challenge complete!</h2>
          <p className="text-sm text-gray-500">
            Amazing work — you finished all 5 challenges this week.
            Come back next Monday for a new set!
          </p>
        </div>
      )}
    </div>
  );
}

// Simple deterministic hash
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
