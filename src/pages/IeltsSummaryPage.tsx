import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, GraduationCap, LayoutDashboard, RefreshCw, CheckCircle, AlertCircle, MinusCircle } from 'lucide-react';
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
  speechHealthLabel,
  wpmColor,
  wpmLabel,
  fillerColor,
  fillerLabel,
} from '../lib/utils';

// ─── Rule-based IELTS band score estimation ───────────────────────────────────
// Weighted composite: 30% accuracy + 20% fluency + 15% completeness + 15% prosody
//   + 10% speed score + 10% filler score
// Then map composite → band using IELTS-style thresholds.
//
// Speed score: 100 if 110-160 WPM, linear decay outside.
// Filler score: max(0, 100 - fillersPerMinute * 20)
//
// Composite → Band mapping:
//   95+ → 9.0, 90+ → 8.5, 85+ → 8.0, 80+ → 7.5, 75+ → 7.0,
//   70+ → 6.5, 65+ → 6.0, 58+ → 5.5, 50+ → 5.0, 42+ → 4.5,
//   35+ → 4.0, else 3.5

function computeSpeedScore(wpm: number | null): number {
  if (wpm == null) return 50;
  if (wpm >= 110 && wpm <= 160) return 100;
  if (wpm < 110) return Math.max(0, 100 - (110 - wpm) * 2);
  return Math.max(0, 100 - (wpm - 160) * 2);
}

function computeFillerScore(fillerCount: number, durationSeconds: number | null): number {
  if (durationSeconds == null || durationSeconds <= 0) return 100;
  const minutes = durationSeconds / 60;
  const fillersPerMinute = fillerCount / minutes;
  return Math.max(0, 100 - fillersPerMinute * 20);
}

function computeComposite(
  accuracy: number | null,
  fluency: number | null,
  completeness: number | null,
  prosody: number | null,
  wpm: number | null,
  fillerCount: number,
  durationSeconds: number | null,
): number {
  const a = accuracy ?? 0;
  const f = fluency ?? 0;
  const c = completeness ?? 0;
  const p = prosody ?? 0;
  const s = computeSpeedScore(wpm);
  const fc = computeFillerScore(fillerCount, durationSeconds);
  return a * 0.30 + f * 0.20 + c * 0.15 + p * 0.15 + s * 0.10 + fc * 0.10;
}

function compositeToBand(composite: number): number {
  if (composite >= 95) return 9.0;
  if (composite >= 90) return 8.5;
  if (composite >= 85) return 8.0;
  if (composite >= 80) return 7.5;
  if (composite >= 75) return 7.0;
  if (composite >= 70) return 6.5;
  if (composite >= 65) return 6.0;
  if (composite >= 58) return 5.5;
  if (composite >= 50) return 5.0;
  if (composite >= 42) return 4.5;
  if (composite >= 35) return 4.0;
  return 3.5;
}

function bandLabel(band: number): string {
  if (band >= 8.0) return 'Expert';
  if (band >= 7.0) return 'Very Good';
  if (band >= 6.0) return 'Competent';
  if (band >= 5.0) return 'Modest';
  if (band >= 4.0) return 'Limited';
  return 'Below';
}

function bandColor(band: number): string {
  if (band >= 8.0) return 'text-emerald-600';
  if (band >= 7.0) return 'text-green-600';
  if (band >= 6.0) return 'text-blue-600';
  if (band >= 5.0) return 'text-yellow-600';
  if (band >= 4.0) return 'text-orange-600';
  return 'text-red-600';
}

function bandBg(band: number): string {
  if (band >= 8.0) return 'bg-emerald-50 border-emerald-200';
  if (band >= 7.0) return 'bg-green-50 border-green-200';
  if (band >= 6.0) return 'bg-blue-50 border-blue-200';
  if (band >= 5.0) return 'bg-yellow-50 border-yellow-200';
  if (band >= 4.0) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CriterionRow({
  label,
  weight,
  rawScore,
  color,
}: {
  label: string;
  weight: string;
  rawScore: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{weight}</span>
            <span className={`text-sm font-bold tabular-nums ${color}`}>
              {rawScore.toFixed(0)}
            </span>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              rawScore >= 80 ? 'bg-emerald-500' :
              rawScore >= 60 ? 'bg-blue-500' :
              rawScore >= 40 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, rawScore)}%` }}
          />
        </div>
      </div>
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
    Omission: 'Skipped',
    Insertion: 'Extra sound',
    None: 'Correct',
  };
  return errorType ? (map[errorType] ?? errorType) : 'Correct';
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IeltsSummaryPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const inlineSummary = (location.state as { summary?: WsSummaryMessage } | null)?.summary;

  useEffect(() => {
    if (!publicId) return;
    sessionsApi
      .get(publicId)
      .then(setSession)
      .finally(() => setLoading(false));
  }, [publicId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Calculating your band score...</p>
        </div>
      </div>
    );
  }

  const accuracy       = session?.overallAccuracy ?? inlineSummary?.overallAccuracy ?? null;
  const fluency        = session?.fluencyScore ?? inlineSummary?.fluencyScore ?? null;
  const completeness   = session?.completenessScore ?? inlineSummary?.completenessScore ?? null;
  const prosody        = session?.prosodyScore ?? inlineSummary?.prosodyScore ?? null;
  const duration       = session?.durationSeconds ?? inlineSummary?.durationSeconds ?? null;
  const wpm            = session?.wordsPerMinute ?? inlineSummary?.wordsPerMinute ?? null;
  const fillerCount    = session?.fillerCount ?? inlineSummary?.fillerCount ?? 0;
  const speechHealth   = session?.speechHealthScore ?? inlineSummary?.speechHealthScore ?? null;
  const fillerWords    = inlineSummary?.fillerWords ?? [];
  const words          = session?.words ?? [];

  // Compute scores
  const speedScore  = computeSpeedScore(wpm);
  const fillerScore = computeFillerScore(fillerCount, duration);
  const composite   = computeComposite(accuracy, fluency, completeness, prosody, wpm, fillerCount, duration);
  const band        = compositeToBand(composite);

  const problematic = words.filter(
    (w) => w.errorType && w.errorType !== 'None' && w.errorType !== 'Omission',
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/ielts')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          IELTS Practice
        </button>
        <h1 className="text-sm font-semibold text-gray-900">IELTS Band Score Report</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 fade-in">
        {/* Band Score Hero */}
        <Card className={`mb-6 border ${bandBg(band)}`}>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-purple-600" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 font-medium mb-1">Estimated Band Score</p>
              <p className={`text-6xl font-black tabular-nums ${bandColor(band)}`}>
                {band.toFixed(1)}
              </p>
              <p className={`text-lg font-semibold mt-1 ${bandColor(band)}`}>
                {bandLabel(band)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Pronunciation criterion only</Badge>
              {session && <Badge variant="default">{formatDate(session.createdAt)}</Badge>}
            </div>
          </div>
        </Card>

        {/* Composite breakdown */}
        <Card className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Score Breakdown</h2>
          <p className="text-xs text-gray-500 mb-4">
            Composite score: {composite.toFixed(1)} / 100
          </p>

          <div className="divide-y divide-gray-50">
            <CriterionRow
              label="Pronunciation Accuracy"
              weight="30%"
              rawScore={accuracy ?? 0}
              color={scoreColor(accuracy)}
            />
            <CriterionRow
              label="Fluency & Coherence"
              weight="20%"
              rawScore={fluency ?? 0}
              color={scoreColor(fluency)}
            />
            <CriterionRow
              label="Completeness"
              weight="15%"
              rawScore={completeness ?? 0}
              color={scoreColor(completeness)}
            />
            <CriterionRow
              label="Prosody (Rhythm & Intonation)"
              weight="15%"
              rawScore={prosody ?? 0}
              color={scoreColor(prosody)}
            />
            <CriterionRow
              label="Speaking Speed"
              weight="10%"
              rawScore={speedScore}
              color={wpmColor(wpm)}
            />
            <CriterionRow
              label="Filler Word Control"
              weight="10%"
              rawScore={fillerScore}
              color={fillerColor(fillerCount)}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
            <span>WPM: {wpm != null ? `${wpm.toFixed(0)} (${wpmLabel(wpm)})` : '—'}</span>
            <span>Fillers: {fillerCount} ({fillerLabel(fillerCount)})</span>
            <span>Health Score: {speechHealth != null ? `${speechHealth.toFixed(0)} (${speechHealthLabel(speechHealth)})` : '—'}</span>
          </div>
        </Card>

        {/* Filler words detail */}
        {fillerWords.length > 0 && (
          <Card className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Detected Filler Words</h2>
            <div className="flex flex-wrap gap-2">
              {fillerWords.map((fw, i) => (
                <span key={i} className="px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 text-sm rounded-full font-medium">
                  {fw}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Areas to refine */}
        {problematic.length > 0 && (
          <Card className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">Areas to Refine</h2>
            <p className="text-xs text-gray-500 mb-4">
              These words pulled your pronunciation score down
            </p>
            <div className="flex flex-wrap gap-2">
              {problematic.map((w, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-sm rounded-full font-medium"
                >
                  {w.word}
                  <span className="ml-1 text-red-400 text-xs">
                    {w.accuracy != null ? `${w.accuracy.toFixed(0)}%` : ''}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Word-by-word breakdown */}
        {words.length > 0 && (
          <Card className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Word-by-word Breakdown</h2>
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

        {/* Band score interpretation */}
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-violet-50 border-purple-100">
          <h2 className="font-semibold text-gray-900 mb-3">What does Band {band.toFixed(1)} mean?</h2>
          {band >= 7.0 ? (
            <p className="text-sm text-gray-700">
              Your pronunciation is clear and effective. Most words are accurately pronounced with good rhythm and minimal hesitation.
              To push higher, focus on natural intonation and reducing any remaining filler words.
            </p>
          ) : band >= 6.0 ? (
            <p className="text-sm text-gray-700">
              You communicate clearly despite some pronunciation errors. Words are generally understandable.
              To improve, work on the specific problem sounds identified above and practice at a steady, natural pace.
            </p>
          ) : band >= 5.0 ? (
            <p className="text-sm text-gray-700">
              Some pronunciation errors are noticeable and may occasionally cause confusion.
              Focus on drilling your weak sounds, slowing down to articulate clearly, and reducing filler words.
            </p>
          ) : (
            <p className="text-sm text-gray-700">
              Pronunciation frequently makes it difficult for the listener to understand.
              Start with the Diagnostic Test to identify your core weak areas, then use the Weak Sound Intelligence drills to build up your accuracy.
            </p>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Note: This estimate covers pronunciation only. A full IELTS speaking score also assesses lexical resource, grammatical range, and coherence.
          </p>
        </Card>

        {/* Duration info */}
        <div className="flex flex-wrap gap-2 mb-6">
          {session && (
            <Badge variant={session.status === 'completed' ? 'success' : 'warning'}>
              {session.status}
            </Badge>
          )}
          <Badge variant="default">Duration: {formatDuration(duration)}</Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="primary"
            onClick={() => navigate('/ielts')}
          >
            <RefreshCw className="w-4 h-4" />
            Try another topic
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
