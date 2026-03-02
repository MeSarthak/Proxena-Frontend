import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Play, Clock, Info } from 'lucide-react';
import { exercisesApi, sessionsApi } from '../lib/api';
import type { Exercise } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { difficultyColor } from '../lib/utils';

export default function IeltsPage() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    exercisesApi
      .list({ category: 'ielts' })
      .then(setExercises)
      .catch(() => setError('Failed to load IELTS exercises.'))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async (publicId: string) => {
    setError(null);
    setStarting(publicId);
    try {
      const { sessionPublicId, wsUrl, maxDurationSeconds } = await sessionsApi.start(publicId);
      navigate(`/session/${sessionPublicId}?exercise=${publicId}&mode=ielts`, {
        state: { wsUrl, maxDurationSeconds },
      });
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code;
      if (code === 'DAILY_LIMIT_EXCEEDED') {
        setError("You've reached today's practice limit. Upgrade to Pro for unlimited sessions.");
      } else {
        setError('Failed to start IELTS session. Please try again.');
      }
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IELTS Speaking Practice</h1>
            <p className="text-gray-500 text-sm">Cue card prompts with band score estimation</p>
          </div>
        </div>
      </div>

      {/* How IELTS Part 2 works */}
      <Card className="mb-6 bg-gradient-to-r from-purple-50 to-violet-50 border-purple-100">
        <h2 className="font-semibold text-gray-900 mb-3">How it works</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-xs font-bold shrink-0">1</div>
            <p className="text-sm text-gray-700">Pick a cue card topic below — each has a prompt with bullet points to cover</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-xs font-bold shrink-0">2</div>
            <p className="text-sm text-gray-700">Read the prepared response text (based on real IELTS Part 2 cue card structure)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-xs font-bold shrink-0">3</div>
            <p className="text-sm text-gray-700">Get your estimated IELTS band score based on pronunciation, fluency, speed, and filler usage</p>
          </div>
        </div>
      </Card>

      {/* Band score info */}
      <Alert variant="info" className="mb-6">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">Band score estimation</p>
            <p className="text-blue-700 mt-1">
              Our band score is a rule-based estimate using pronunciation accuracy, fluency, speaking speed, and filler word frequency.
              It focuses on the pronunciation criterion — lexical resource, grammatical range, and coherence are not assessed.
            </p>
          </div>
        </div>
      </Alert>

      {error && (
        <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Exercise cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 h-32 skeleton" />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <Card className="text-center py-12">
          <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No IELTS exercises available yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Run migration 011 to seed IELTS cue card exercises.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {exercises.map((ex) => (
            <Card key={ex.publicId} className="flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="blue">IELTS Part 2</Badge>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColor(ex.difficulty)}`}>
                  {ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm flex-1 mb-3">{ex.title}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <Clock className="w-3 h-3" />
                ~2 minutes
              </div>
              <Button
                size="sm"
                className="w-full"
                loading={starting === ex.publicId}
                onClick={() => handleStart(ex.publicId)}
              >
                <Play className="w-3.5 h-3.5" />
                Start practice
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* IELTS band score reference */}
      <Card className="mt-6">
        <h2 className="font-semibold text-gray-900 mb-3">Band Score Reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Band</th>
                <th className="pb-2 font-medium">Level</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <BandRow band="8.0–9.0" level="Expert" desc="Effortless, natural pronunciation with very rare lapses" color="text-emerald-600" />
              <BandRow band="7.0–7.5" level="Very Good" desc="Clear pronunciation, good pace, minimal hesitation" color="text-green-600" />
              <BandRow band="6.0–6.5" level="Competent" desc="Generally clear, some pronunciation errors don't impede understanding" color="text-blue-600" />
              <BandRow band="5.0–5.5" level="Modest" desc="Noticeable errors, some words unclear, moderate filler usage" color="text-yellow-600" />
              <BandRow band="4.0–4.5" level="Limited" desc="Frequent mispronunciations, limited fluency" color="text-orange-600" />
              <BandRow band="< 4.0" level="Below" desc="Significant difficulty — pronunciation frequently impedes communication" color="text-red-600" />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BandRow({ band, level, desc, color }: { band: string; level: string; desc: string; color: string }) {
  return (
    <tr>
      <td className={`py-2 font-bold ${color}`}>{band}</td>
      <td className="py-2 font-medium text-gray-700">{level}</td>
      <td className="py-2 text-gray-500">{desc}</td>
    </tr>
  );
}
