import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, LayoutDashboard, CheckCircle, AlertCircle, MinusCircle, Repeat2, Star, Zap } from 'lucide-react';
import { sessionsApi } from '../lib/api';
import type { SessionDetail, WsSummaryMessage } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { WordRecommendations } from '../components/WordRecommendations';
import { WeakSoundIntelligence } from '../components/WeakSoundIntelligence';
import { WeakWordDrill } from '../components/WeakWordDrill';
import { MilestoneToast, useToasts } from '../components/MilestoneToast';
import { useXP, xpForSession } from '../hooks/useXP';
import { useBadges } from '../hooks/useBadges';
import {
  formatPercent,
  formatDate,
  formatDuration,
  scoreColor,
  scoreBg,
  motivationalFeedback,
  speechHealthColor,
  speechHealthLabel,
  wpmColor,
  wpmLabel,
  fillerColor,
  fillerLabel,
} from '../lib/utils';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';

// ─── Challenge score recording ────────────────────────────────────────────────
function recordChallengeScore(exercisePublicId: string, accuracy: number) {
  try {
    const stored = localStorage.getItem('proxena_challenge');
    const record = stored
      ? (JSON.parse(stored) as { weekKey: string; scores: Record<string, number> })
      : { weekKey: '', scores: {} };
    const prev = record.scores[exercisePublicId];
    if (prev == null || accuracy > prev) {
      record.scores[exercisePublicId] = accuracy;
      localStorage.setItem('proxena_challenge', JSON.stringify(record));
    }
  } catch { /* ignore */ }
}

function ScoreRing({
  value,
  label,
  color,
}: {
  value: number | null;
  label: string;
  color: string;
}) {
  const pct = value ?? 0;
  const data = [{ value: pct, fill: color }];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            data={data}
            barSize={10}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              background={{ fill: '#f3f4f6' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${value != null ? scoreColor(value) : 'text-gray-300'}`}>
            {value != null ? `${value.toFixed(0)}` : '—'}
          </span>
        </div>
      </div>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}

function WordStatusIcon({ errorType }: { errorType: string | null }) {
  if (!errorType || errorType === 'None') {
    return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
  }
  if (errorType === 'Omission') {
    return <MinusCircle className="w-4 h-4 text-gray-400 shrink-0" />;
  }
  return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
}

function errorLabel(errorType: string | null): string {
  const map: Record<string, string> = {
    Mispronunciation: 'Needs refinement',
    Omission:         'Skipped',
    Insertion:        'Extra sound',
    None:             'Correct',
  };
  return errorType ? (map[errorType] ?? errorType) : 'Correct';
}

export default function SessionSummaryPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isChallenge = searchParams.get('challenge') === '1';
  const isShadowing = searchParams.get('mode') === 'shadow';

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const { toasts, addToast, dismiss } = useToasts();
  const { addXP, totalXP } = useXP();
  const { checkAndUnlock } = useBadges();

  // The speaking page may pass summary inline via state to avoid extra fetch
  const inlineSummary = (location.state as { summary?: WsSummaryMessage } | null)?.summary;

  useEffect(() => {
    if (!publicId) return;
    sessionsApi
      .get(publicId)
      .then(setSession)
      .finally(() => setLoading(false));
  }, [publicId]);

  const handlePractiseSame = async () => {
    if (!session?.exercisePublicId) return;
    setRestarting(true);
    try {
      const { sessionPublicId, wsUrl, maxDurationSeconds } = await sessionsApi.start(session.exercisePublicId);
      navigate(`/session/${sessionPublicId}?exercise=${session.exercisePublicId}`, {
        state: { wsUrl, maxDurationSeconds },
      });
    } catch {
      setRestarting(false);
    }
  };

  // Award XP + check badges once session loads
  const hasAwarded = useState(false);
  useEffect(() => {
    if (!session || hasAwarded[0]) return;
    hasAwarded[1](true);

    const acc = session.overallAccuracy;
    const earned = xpForSession(acc);
    setXpEarned(earned);
    const { didLevelUp, newLevel } = addXP(earned);

    // Record challenge best score
    if (isChallenge && session.exercisePublicId && acc != null) {
      recordChallengeScore(session.exercisePublicId, acc);
    }

    // Fetch streak + total sessions for badge check
    Promise.all([
      sessionsApi.history(1, 100),
    ]).then(([hist]) => {
      const days = new Set(
        hist.sessions.map((s) => new Date(s.createdAt).toLocaleDateString('en-CA')),
      );
      let streak = 0;
      const cursor = new Date();
      while (true) {
        const key = cursor.toLocaleDateString('en-CA');
        if (days.has(key)) { streak++; cursor.setDate(cursor.getDate() - 1); }
        else break;
      }

      const newBadges = checkAndUnlock({
        totalSessions: hist.pagination.total,
        sessionAccuracy: acc,
        streak,
        totalXP: totalXP + earned,
        completedChallenge: isChallenge,
        completedShadowing: isShadowing,
      });

      // Show toasts
      if (didLevelUp) {
        addToast({ emoji: '⬆️', title: 'Level up!', message: `You reached ${newLevel}!`, color: 'purple' });
      }
      for (const badge of newBadges) {
        addToast({ emoji: badge.emoji, title: badge.name, message: badge.description, color: 'amber' });
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading results...</p>
        </div>
      </div>
    );
  }

  const accuracy = session?.overallAccuracy ?? inlineSummary?.overallAccuracy ?? null;
  const fluency  = session?.fluencyScore   ?? inlineSummary?.fluencyScore    ?? null;
  const duration = session?.durationSeconds?? inlineSummary?.durationSeconds ?? null;
  const words    = session?.words ?? [];

  const fillerCount      = session?.fillerCount ?? inlineSummary?.fillerCount ?? 0;
  const wordsPerMinute   = session?.wordsPerMinute ?? inlineSummary?.wordsPerMinute ?? null;
  const speechHealth     = session?.speechHealthScore ?? inlineSummary?.speechHealthScore ?? null;
  const completeness     = session?.completenessScore ?? inlineSummary?.completenessScore ?? null;
  const prosody          = session?.prosodyScore ?? inlineSummary?.prosodyScore ?? null;
  const fillerWords      = inlineSummary?.fillerWords ?? [];

  const feedback = accuracy != null ? motivationalFeedback(accuracy) : null;

  // Separate words by status
  const problematic = words.filter(
    (w) => w.errorType && w.errorType !== 'None' && w.errorType !== 'Omission',
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <h1 className="text-sm font-semibold text-gray-900">Session Results</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 fade-in">
        {/* Feedback banner */}
        {feedback && (
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
            <p className="text-blue-800 font-medium text-sm">{feedback}</p>
          </div>
        )}

        {/* XP earned banner */}
        {xpEarned != null && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm text-amber-800 font-medium">+{xpEarned} XP earned this session</span>
            {isChallenge && <span className="ml-auto text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Star className="w-3 h-3" />Challenge</span>}
            {isShadowing && <span className="ml-auto text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full font-medium">Shadowing</span>}
          </div>
        )}

        {/* Score overview */}
        <Card className={`mb-6 ${scoreBg(accuracy)}`}>
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
            <ScoreRing value={accuracy} label="Accuracy" color="#3b82f6" />
            <ScoreRing value={fluency}  label="Fluency"  color="#22c55e" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-gray-700">
                {formatDuration(duration)}
              </span>
              <span className="text-xs text-gray-500 font-medium">Duration</span>
            </div>
          </div>
        </Card>

        {/* Speech Intelligence */}
        <Card className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Speech Intelligence</h2>
          <p className="text-xs text-gray-500 mb-4">Deep analytics from your session</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Speech Health Score */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50">
              <div className="relative w-20 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="70%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    data={[{ value: speechHealth ?? 0, fill: '#10b981' }]}
                    barSize={8}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={8}
                      background={{ fill: '#f3f4f6' }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${speechHealthColor(speechHealth)}`}>
                    {speechHealth != null ? speechHealth.toFixed(0) : '—'}
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium text-gray-700">Health Score</span>
              <span className={`text-xs font-medium ${speechHealthColor(speechHealth)}`}>
                {speechHealthLabel(speechHealth)}
              </span>
            </div>

            {/* Completeness */}
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50">
              <span className={`text-3xl font-bold ${scoreColor(completeness)}`}>
                {completeness != null ? completeness.toFixed(0) : '—'}
              </span>
              <span className="text-xs font-medium text-gray-700">Completeness</span>
              <span className={`text-xs font-medium ${
                completeness != null && completeness >= 80 ? 'text-green-600' :
                completeness != null && completeness >= 50 ? 'text-yellow-600' :
                completeness != null ? 'text-red-600' : 'text-gray-400'
              }`}>
                {completeness == null ? 'N/A' : completeness >= 80 ? 'Thorough' : completeness >= 50 ? 'Partial' : 'Incomplete'}
              </span>
              <span className="text-xs text-gray-400 mt-1">Words covered</span>
            </div>

            {/* Prosody */}
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50">
              <span className={`text-3xl font-bold ${scoreColor(prosody)}`}>
                {prosody != null ? prosody.toFixed(0) : '—'}
              </span>
              <span className="text-xs font-medium text-gray-700">Prosody</span>
              <span className={`text-xs font-medium ${
                prosody != null && prosody >= 80 ? 'text-green-600' :
                prosody != null && prosody >= 50 ? 'text-yellow-600' :
                prosody != null ? 'text-red-600' : 'text-gray-400'
              }`}>
                {prosody == null ? 'N/A' : prosody >= 80 ? 'Natural' : prosody >= 50 ? 'Developing' : 'Monotone'}
              </span>
              <span className="text-xs text-gray-400 mt-1">Rhythm & intonation</span>
            </div>

            {/* Speaking Speed */}
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50">
              <span className={`text-3xl font-bold ${wpmColor(wordsPerMinute)}`}>
                {wordsPerMinute != null ? wordsPerMinute.toFixed(0) : '—'}
              </span>
              <span className="text-xs font-medium text-gray-700">Words per minute</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                wordsPerMinute != null && wordsPerMinute >= 110 && wordsPerMinute <= 160
                  ? 'bg-green-100 text-green-700'
                  : wordsPerMinute != null
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {wpmLabel(wordsPerMinute)}
              </span>
              <span className="text-xs text-gray-400 mt-1">Ideal: 110–160 WPM</span>
            </div>

            {/* Filler Words */}
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50">
              <span className={`text-3xl font-bold ${fillerColor(fillerCount)}`}>
                {fillerCount}
              </span>
              <span className="text-xs font-medium text-gray-700">Filler words</span>
              <span className={`text-xs font-medium ${fillerColor(fillerCount)}`}>
                {fillerLabel(fillerCount)}
              </span>
              {fillerWords.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-1">
                  {fillerWords.slice(0, 6).map((fw, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs rounded-full">
                      {fw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Health score breakdown legend */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Health score = 30% Accuracy + 20% Fluency + 15% Completeness + 15% Prosody + 10% Speed + 10% Filler control
            </p>
          </div>
        </Card>

        {/* Meta info */}
        {session && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant="default">{formatDate(session.createdAt)}</Badge>
            <Badge variant={session.status === 'completed' ? 'success' : 'warning'}>
              {session.status}
            </Badge>
          </div>
        )}

        {/* Areas to improve */}
        {problematic.length > 0 && (
          <Card className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">Areas to refine</h2>
            <p className="text-xs text-gray-500 mb-4">
              Focus on these words in your next session to build confidence
            </p>
            <div className="flex flex-wrap gap-2">
              {problematic.map((w, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-sm rounded-full font-medium"
                >
                  {w.word}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Word-level breakdown */}
        {words.length > 0 && (
          <Card className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Word-by-word breakdown</h2>
            <div className="flex flex-col divide-y divide-gray-50">
              {words.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <WordStatusIcon errorType={w.errorType} />
                  <span className="font-medium text-gray-900 w-20 sm:w-24 truncate">{w.word}</span>
                  <span className="text-xs text-gray-400 flex-1">{errorLabel(w.errorType)}</span>
                  <span className={`text-sm font-semibold tabular-nums ${scoreColor(w.accuracy)}`}>
                    {formatPercent(w.accuracy, 0)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI Word Coach */}
        <div className="mb-6">
          <WordRecommendations />
        </div>

        {/* Weak Sound Intelligence */}
        <div className="mb-6">
          <WeakSoundIntelligence />
        </div>

        {/* Weak Word Drill */}
        <div className="mb-6">
          <WeakWordDrill onPractice={() => navigate('/exercises')} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          {session?.exercisePublicId && (
            <Button
              variant="primary"
              loading={restarting}
              onClick={handlePractiseSame}
            >
              <Repeat2 className="w-4 h-4" />
              Practice same exercise
            </Button>
          )}
          <Button
            variant={session?.exercisePublicId ? 'secondary' : 'primary'}
            onClick={() => navigate('/exercises')}
          >
            <RefreshCw className="w-4 h-4" />
            {session?.exercisePublicId ? 'Try another exercise' : 'Practice again'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard className="w-4 h-4" />
            Back to dashboard
          </Button>
        </div>
      </main>

      {/* Milestone toasts */}
      <MilestoneToast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
