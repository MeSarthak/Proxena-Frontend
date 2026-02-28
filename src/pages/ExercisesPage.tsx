import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, BookOpen } from 'lucide-react';
import { exercisesApi, sessionsApi } from '../lib/api';
import type { Exercise, Category, Difficulty } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { difficultyColor, categoryLabel } from '../lib/utils';

const CATEGORIES: { value: Category | ''; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'storytelling',  label: 'Storytelling' },
  { value: 'emotions',      label: 'Emotions' },
  { value: 'interview',     label: 'Interview' },
  { value: 'daily',         label: 'Daily Life' },
];

const DIFFICULTIES: { value: Difficulty | ''; label: string }[] = [
  { value: '', label: 'All levels' },
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
];

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

  useEffect(() => {
    setLoading(true);
    exercisesApi
      .list({
        ...(category ? { category } : {}),
        ...(difficulty ? { difficulty } : {}),
      })
      .then(setExercises)
      .catch(() => setError('Failed to load exercises. Please refresh.'))
      .finally(() => setLoading(false));
  }, [category, difficulty]);

  const filtered = exercises.filter((ex) =>
    !search || ex.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleStart = async (publicId: string) => {
    setError(null);
    setStarting(publicId);
    try {
      const { sessionPublicId, wsUrl, maxDurationSeconds } = await sessionsApi.start(publicId);
      navigate(`/session/${sessionPublicId}?exercise=${publicId}`, {
        state: { wsUrl, maxDurationSeconds },
      });
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code;
      if (code === 'DAILY_LIMIT_EXCEEDED') {
        setError("You've reached today's practice limit. Upgrade to Pro for unlimited sessions.");
      } else {
        setError('Failed to start session. Please try again.');
      }
    } finally {
      setStarting(null);
    }
  };

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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
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

        {/* Category */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | '')}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

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
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-gray-500 mb-4">
          {filtered.length} exercise{filtered.length !== 1 ? 's' : ''} found
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
              {/* Category + difficulty */}
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="blue">{categoryLabel(ex.category)}</Badge>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColor(ex.difficulty)}`}>
                  {ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 text-sm flex-1 mb-4">{ex.title}</h3>

              {/* CTA */}
              <Button
                size="sm"
                className="w-full"
                loading={starting === ex.publicId}
                onClick={() => handleStart(ex.publicId)}
              >
                <Play className="w-3.5 h-3.5" />
                Start practice
              </Button>
            </div>
          ))}
      </div>
    </div>
  );
}
