import { useEffect, useState } from 'react';
import { Target, Volume2, RotateCcw } from 'lucide-react';
import { sessionsApi } from '../lib/api';
import { useSpeechDemo } from '../hooks/useSpeechDemo';
import { scoreColor, formatPercent } from '../lib/utils';
import { Button } from './ui/Button';

interface DrillWord {
  word: string;
  avgAccuracy: number;
  occurrences: number;
  errorTypes: string[];
}

function buildDrillList(
  wordResults: { word: string; accuracy: number | null; errorType: string | null }[],
): DrillWord[] {
  const map: Record<string, { totalAcc: number; count: number; errors: Set<string> }> = {};

  for (const wr of wordResults) {
    if (wr.errorType === 'None' || !wr.errorType) continue;
    const key = wr.word.toLowerCase().replace(/[^a-z]/g, '');
    if (!key) continue;
    if (!map[key]) map[key] = { totalAcc: 0, count: 0, errors: new Set() };
    map[key].totalAcc += wr.accuracy ?? 0;
    map[key].count++;
    map[key].errors.add(wr.errorType);
  }

  return Object.entries(map)
    .map(([word, { totalAcc, count, errors }]) => ({
      word,
      avgAccuracy: totalAcc / count,
      occurrences: count,
      errorTypes: Array.from(errors),
    }))
    .sort((a, b) => {
      // Sort by worst accuracy first, then by most occurrences
      if (a.avgAccuracy !== b.avgAccuracy) return a.avgAccuracy - b.avgAccuracy;
      return b.occurrences - a.occurrences;
    })
    .slice(0, 10); // top 10 worst words
}

interface WeakWordDrillProps {
  targetAccent?: string;
  /** Navigate to exercise page callback */
  onPractice?: () => void;
}

export function WeakWordDrill({ targetAccent = 'en-US', onPractice }: WeakWordDrillProps) {
  const [drillWords, setDrillWords] = useState<DrillWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [practisedSet, setPractisedSet] = useState<Set<string>>(new Set());
  const { speak, stop, speaking } = useSpeechDemo();
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  useEffect(() => {
    sessionsApi.history(1, 10)
      .then(async (hist) => {
        const allWords: { word: string; accuracy: number | null; errorType: string | null }[] = [];
        const details = await Promise.allSettled(
          hist.sessions.map((s) => sessionsApi.get(s.publicId)),
        );
        for (const d of details) {
          if (d.status === 'fulfilled') {
            allWords.push(...d.value.words);
          }
        }
        setDrillWords(buildDrillList(allWords));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSpeak = (word: string) => {
    if (playingWord === word) {
      stop();
      setPlayingWord(null);
      return;
    }
    stop();
    setPlayingWord(word);
    speak(word, targetAccent);
    // Mark as practised
    setPractisedSet((prev) => new Set(prev).add(word));
  };

  useEffect(() => {
    if (!speaking) setPlayingWord(null);
  }, [speaking]);

  const practisedCount = drillWords.filter((w) => practisedSet.has(w.word)).length;

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
            <Target className="w-4 h-4 text-rose-500" />
          </div>
          <div className="skeleton h-4 w-44" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (drillWords.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
            <Target className="w-4 h-4 text-rose-500" />
          </div>
          <h2 className="font-semibold text-gray-900">Weak Words Drill</h2>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Complete a few sessions and your personalised word drill will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-rose-500" />
        </div>
        <h2 className="font-semibold text-gray-900">Weak Words Drill</h2>
      </div>
      <p className="text-xs text-gray-500 mb-2 ml-10">
        Your 10 weakest words from the last 10 sessions — tap to hear and practise
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-4 ml-10">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-400 rounded-full transition-all duration-500"
            style={{ width: `${drillWords.length > 0 ? (practisedCount / drillWords.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 tabular-nums shrink-0">
          {practisedCount}/{drillWords.length} practised
        </span>
      </div>

      {/* Word list */}
      <div className="flex flex-col gap-1.5">
        {drillWords.map((dw, i) => {
          const isPractised = practisedSet.has(dw.word);
          return (
            <div
              key={dw.word}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isPractised ? 'bg-green-50 border border-green-100' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {/* Rank */}
              <span className="text-xs text-gray-400 font-medium w-5 text-right shrink-0">
                {i + 1}
              </span>

              {/* Listen button */}
              <button
                onClick={() => handleSpeak(dw.word)}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  playingWord === dw.word
                    ? 'bg-rose-200 text-rose-700'
                    : 'text-gray-400 hover:bg-rose-100 hover:text-rose-600'
                }`}
                title={`Hear "${dw.word}"`}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              {/* Word */}
              <span className={`text-sm font-semibold capitalize flex-1 min-w-0 truncate ${
                isPractised ? 'text-green-800' : 'text-gray-900'
              }`}>
                {dw.word}
              </span>

              {/* Error type badge */}
              <span className="text-xs text-gray-400 hidden sm:inline">
                {dw.errorTypes[0] === 'Mispronunciation' ? 'pronunciation' : dw.errorTypes[0]?.toLowerCase()}
              </span>

              {/* Stats */}
              <span className="text-xs text-gray-400 tabular-nums shrink-0">
                {dw.occurrences}x
              </span>
              <span className={`text-sm font-bold tabular-nums shrink-0 ${scoreColor(dw.avgAccuracy)}`}>
                {formatPercent(dw.avgAccuracy, 0)}
              </span>

              {/* Practised check */}
              {isPractised && (
                <span className="text-xs text-green-600 font-medium shrink-0">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4 ml-10">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setPractisedSet(new Set());
            // Speak all words in sequence
            drillWords.forEach((dw, i) => {
              setTimeout(() => handleSpeak(dw.word), i * 2000);
            });
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Drill all words
        </Button>
        {onPractice && (
          <Button size="sm" variant="primary" onClick={onPractice}>
            Practice in a session
          </Button>
        )}
      </div>
    </div>
  );
}
