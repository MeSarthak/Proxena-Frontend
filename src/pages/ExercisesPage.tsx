import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, BookOpen, Volume2, VolumeX, Clock, Repeat } from 'lucide-react';
import { exercisesApi, sessionsApi, authApi } from '../lib/api';
import type { Exercise, Category, Difficulty, Duration } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { difficultyColor, categoryLabel, durationLabel, durationColor } from '../lib/utils';
import { useSpeechDemo } from '../hooks/useSpeechDemo';

const CATEGORIES: { value: Category | ''; label: string; emoji: string }[] = [
  { value: '',                  label: 'All categories',      emoji: '🗂️' },
  { value: 'conversation',      label: 'Conversation',        emoji: '💬' },
  { value: 'storytelling',      label: 'Storytelling',        emoji: '📖' },
  { value: 'emotions',          label: 'Emotions',            emoji: '💭' },
  { value: 'interview',         label: 'Interview',           emoji: '🎙️' },
  { value: 'daily',             label: 'Daily Life',          emoji: '☀️' },
  { value: 'business',          label: 'Business',            emoji: '💼' },
  { value: 'news',              label: 'News',                emoji: '📰' },
  { value: 'travel',            label: 'Travel',              emoji: '✈️' },
  { value: 'academic',          label: 'Academic',            emoji: '🎓' },
  { value: 'tongue_twisters',   label: 'Tongue Twisters',     emoji: '🌀' },
  { value: 'classic_literature', label: 'Classic Literature', emoji: '📜' },
  { value: 'politics',          label: 'Politics',            emoji: '🏛️' },
  { value: 'geopolitics',       label: 'Geopolitics',         emoji: '🌍' },
  { value: 'speech',            label: 'Speech',              emoji: '🎤' },
  { value: 'diplomatic',        label: 'Diplomatic',          emoji: '🤝' },
  { value: 'formal',            label: 'Formal',              emoji: '🎩' },
  { value: 'sports',            label: 'Sports',              emoji: '⚽' },
  { value: 'technology',        label: 'Technology',          emoji: '💻' },
  { value: 'diagnostic',        label: 'Diagnostic',          emoji: '🩺' },
  { value: 'ielts',             label: 'IELTS',               emoji: '🎓' },
];

const DIFFICULTIES: { value: Difficulty | ''; label: string }[] = [
  { value: '',       label: 'All levels' },
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
];

const DURATIONS: { value: Duration | ''; label: string; sub: string }[] = [
  { value: '',       label: 'Any length', sub: '' },
  { value: 'short',  label: 'Short',  sub: '< 30s' },
  { value: 'medium', label: 'Medium', sub: '30s–1m' },
  { value: 'long',   label: 'Long',   sub: '> 1m' },
];

const ACCENT_LABELS: Record<string, string> = {
  'en-US': 'American',
  'en-GB': 'British',
  'en-AU': 'Australian',
  'en-IN': 'Indian',
  'en-CA': 'Canadian',
  'en-IE': 'Irish',
};

function ExerciseCardSkeleton() {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-8 w-full mt-2" />
    </div>
  );
}

export default function ExercisesPage() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [duration, setDuration] = useState<Duration | ''>('');
  const [targetAccent, setTargetAccent] = useState<string>('en-US');
  const [limitReached, setLimitReached] = useState(false);
  // Per-card demo loading & playing state
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [demoPlaying, setDemoPlaying] = useState<string | null>(null);
  // Cache fetched full text so repeat taps don't re-fetch
  const textCache = useRef<Record<string, string>>({});

  const { speak, stop, speaking, supported: ttsSupported } = useSpeechDemo();

  useEffect(() => {
    setLoading(true);
    exercisesApi
      .list({
        ...(category ? { category } : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(duration ? { duration } : {}),
      })
      .then(setExercises)
      .catch(() => setError('Failed to load exercises. Please refresh.'))
      .finally(() => setLoading(false));
  }, [category, difficulty, duration]);

  // Fetch user's target accent and usage limit once
  useEffect(() => {
    authApi.me()
      .then((p) => {
        if (p.targetAccent) setTargetAccent(p.targetAccent);
        const u = p.usageToday;
        if (u && u.sessionsCount >= u.dailySessionLimit) {
          setLimitReached(true);
        }
      })
      .catch(() => {});
  }, []);

  // When speech ends naturally, clear the playing indicator
  useEffect(() => {
    if (!speaking) setDemoPlaying(null);
  }, [speaking]);

  const filtered = exercises.filter((ex) =>
    !search || ex.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleStart = async (publicId: string, mode?: 'shadow') => {
    setError(null);
    setStarting(publicId);
    stop();
    setDemoPlaying(null);
    try {
      const { sessionPublicId, wsUrl, maxDurationSeconds } = await sessionsApi.start(publicId);
      const modeParam = mode ? `&mode=${mode}` : '';
      navigate(`/session/${sessionPublicId}?exercise=${publicId}${modeParam}`, {
        state: { wsUrl, maxDurationSeconds },
      });
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code;
      if (code === 'DAILY_LIMIT_EXCEEDED') {
        setError("You've reached today's practice limit. Upgrade to Pro for unlimited sessions.");
        setLimitReached(true);
      } else {
        setError('Failed to start session. Please try again.');
      }
    } finally {
      setStarting(null);
    }
  };

  const handleDemo = async (publicId: string) => {
    if (demoPlaying === publicId) {
      stop();
      setDemoPlaying(null);
      return;
    }
    stop();
    setDemoPlaying(null);

    let text = textCache.current[publicId];
    if (!text) {
      setDemoLoading(publicId);
      try {
        const detail = await exercisesApi.get(publicId);
        text = detail.textContent;
        textCache.current[publicId] = text;
      } catch {
        setDemoLoading(null);
        return;
      }
      setDemoLoading(null);
    }

    setDemoPlaying(publicId);
    speak(text, targetAccent);
  };

  const accentLabel = ACCENT_LABELS[targetAccent] ?? targetAccent;

  return (
    <div className="max-w-5xl mx-auto fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Exercise Library</h1>
        <p className="text-gray-500 text-sm mt-1">
          Choose an exercise and start speaking — AI analysis happens in real time
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {limitReached && !error && (
        <Alert variant="warning" className="mb-6">
          You've reached today's practice limit.{' '}
          <button
            onClick={() => navigate('/subscription')}
            className="font-medium underline hover:no-underline"
          >
            Upgrade to Pro
          </button>{' '}
          for unlimited sessions.
        </Alert>
      )}

      {/* Category genre pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value as Category | '')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              category === c.value
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
          />
        </div>

        {/* Difficulty */}
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>

        {/* Duration */}
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value as Duration | '')}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
        >
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}{d.sub ? ` (${d.sub})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-gray-500 mb-4">
          {filtered.length} exercise{filtered.length !== 1 ? 's' : ''} found
          {ttsSupported && (
            <span className="ml-2 text-gray-400">
              · tap <Volume2 className="w-3 h-3 inline-block mx-0.5 -mt-0.5" /> to hear a {accentLabel} accent demo
            </span>
          )}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => <ExerciseCardSkeleton key={i} />)
          : filtered.length === 0
          ? (
            <div className="col-span-full card py-16 text-center">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No exercises found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          )
          : filtered.map((ex) => (
            <div
              key={ex.publicId}
              className="card p-5 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Top row: category badge + demo button */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="blue">{categoryLabel(ex.category)}</Badge>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColor(ex.difficulty)}`}>
                    {ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}
                  </span>
                </div>

                {/* Demo button */}
                {ttsSupported && (
                  <button
                    onClick={() => handleDemo(ex.publicId)}
                    disabled={demoLoading === ex.publicId}
                    title={demoPlaying === ex.publicId ? 'Stop demo' : `Hear ${accentLabel} accent demo`}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                      demoPlaying === ex.publicId
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    } disabled:opacity-40`}
                  >
                    {demoLoading === ex.publicId ? (
                      <div className="w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : demoPlaying === ex.publicId ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Duration badge */}
              {ex.duration && (
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${durationColor(ex.duration)}`}>
                    <Clock className="w-3 h-3" />
                    {durationLabel(ex.duration)}
                  </span>
                </div>
              )}

              {/* Title */}
              <h3 className="font-semibold text-gray-900 text-sm flex-1 mb-4">{ex.title}</h3>

              {/* CTA */}
              <div className="flex gap-2 mt-auto">
                <Button
                  size="sm"
                  className="flex-1"
                  loading={starting === ex.publicId}
                  disabled={limitReached}
                  onClick={() => handleStart(ex.publicId)}
                >
                  <Play className="w-3.5 h-3.5" />
                  {limitReached ? 'Limit reached' : 'Start'}
                </Button>
                {ttsSupported && (
                  <button
                    title="Shadowing mode — listen first, then repeat"
                    disabled={limitReached || starting === ex.publicId}
                    onClick={() => handleStart(ex.publicId, 'shadow')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    Shadow
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
