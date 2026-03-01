import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw, LayoutDashboard, CheckCircle, AlertCircle, MinusCircle, Repeat2 } from 'lucide-react';
import { sessionsApi } from '../lib/api';
import type { SessionDetail, WsSummaryMessage } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  formatPercent,
  formatDate,
  formatDuration,
  scoreColor,
  scoreBg,
  motivationalFeedback,
} from '../lib/utils';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';

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

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);

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
    </div>
  );
}
