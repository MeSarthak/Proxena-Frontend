import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Stethoscope, Play, CheckCircle2 } from 'lucide-react';
import { exercisesApi, sessionsApi } from '../lib/api';
import type { Exercise } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { difficultyColor } from '../lib/utils';

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    exercisesApi
      .list({ category: 'diagnostic' })
      .then(setExercises)
      .catch(() => setError('Failed to load diagnostic exercises.'))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async (publicId: string) => {
    setError(null);
    setStarting(publicId);
    try {
      const { sessionPublicId, wsUrl, maxDurationSeconds } = await sessionsApi.start(publicId);
      navigate(`/session/${sessionPublicId}?exercise=${publicId}`, {
        state: { wsUrl, maxDurationSeconds },
      });
    } catch {
      setError('Failed to start diagnostic session. Please try again.');
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
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diagnostic Test</h1>
            <p className="text-gray-500 text-sm">Discover your pronunciation baseline</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
        <h2 className="font-semibold text-gray-900 mb-3">How it works</h2>
        <div className="flex flex-col gap-3">
          <Step num={1} text="Choose a diagnostic passage below (about 2 minutes of reading)" />
          <Step num={2} text="Read the passage aloud clearly and at a natural pace" />
          <Step num={3} text="Get a detailed proficiency report with your Speech Health Score, WPM, fluency, and accuracy" />
          <Step num={4} text="Retake periodically to track your improvement over time" />
        </div>
      </Card>

      {/* Exercises */}
      {error && (
        <Card className="mb-4 bg-red-50 border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-6 h-24 skeleton" />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <Card className="text-center py-12">
          <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No diagnostic exercises available yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Run migration 011 to seed diagnostic exercises.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((ex) => (
            <Card key={ex.publicId} className="flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{ex.title}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="blue">Diagnostic</Badge>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColor(ex.difficulty)}`}>
                    {ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                loading={starting === ex.publicId}
                onClick={() => handleStart(ex.publicId)}
              >
                <Play className="w-3.5 h-3.5" />
                Start
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Tips */}
      <Card className="mt-6">
        <h2 className="font-semibold text-gray-900 mb-3">Tips for best results</h2>
        <ul className="flex flex-col gap-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            Find a quiet environment with minimal background noise
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            Use a headset or keep the microphone about 15 cm from your mouth
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            Speak at your natural pace — don't rush or slow down artificially
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            Take the test again every 2–4 weeks to measure progress
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
        {num}
      </div>
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
}
