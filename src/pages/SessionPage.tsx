import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Mic, Square, ArrowLeft, AlertCircle, Clock, Volume2, VolumeX, Repeat } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { useSpeechDemo } from '../hooks/useSpeechDemo';
import { exercisesApi, authApi } from '../lib/api';
import type { ExerciseDetail } from '../types';
import { Waveform } from '../components/ui/Waveform';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const WORDS_PER_CHUNK = 18;       // ~3-4 visual lines at text-2xl/3xl
const GUIDE_WPM = 130;            // karaoke guide speed
const GUIDE_INTERVAL_MS = Math.round(60000 / GUIDE_WPM); // ~462ms per word
const GUIDE_MAX_AHEAD = 8;        // pause guide if this many words ahead of last scored

// ─── Types ────────────────────────────────────────────────────────────────────
type WordStatus = 'correct' | 'partial' | 'incorrect' | 'skipped' | 'pending';

interface DisplayWord {
  word: string;
  status: WordStatus;
  accuracy?: number;
  /** Monotonic counter incremented each time status changes from pending → scored.
   *  Used to trigger the pop animation via a key change. */
  scoreGen?: number;
}

// ─── WordToken ────────────────────────────────────────────────────────────────
function WordToken({
  word,
  status,
  isGuide,
  isBehind,
  scoreGen,
}: {
  word: string;
  status: WordStatus;
  isGuide: boolean;
  isBehind: boolean;
  scoreGen?: number;
}) {
  const statusCls: Record<WordStatus, string> = {
    correct:   'word-correct',
    partial:   'word-partial',
    incorrect: 'word-incorrect',
    skipped:   'word-skipped',
    pending:   'word-pending',
  };
  const title: Record<WordStatus, string> = {
    correct:   'Correct',
    partial:   'Needs some refinement',
    incorrect: "Let's work on this word",
    skipped:   'Skipped',
    pending:   '',
  };

  const isScored = status !== 'pending';

  return (
    <span
      // key on scoreGen forces remount → triggers pop animation
      key={scoreGen}
      className={cn(
        'word-token text-2xl md:text-3xl leading-relaxed font-medium',
        statusCls[status],
        isGuide && !isScored && 'word-guide',
        isBehind && !isScored && 'word-behind',
        isScored && scoreGen && 'word-scored-pop',
      )}
      title={title[status]}
    >
      {word}
    </span>
  );
}

// ─── CountdownTimer ───────────────────────────────────────────────────────────
function CountdownTimer({
  running,
  maxSeconds,
}: {
  running: boolean;
  maxSeconds: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const remaining = Math.max(0, maxSeconds - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = (elapsed / maxSeconds) * 100;
  const isLow = remaining < 20;

  return (
    <div className={cn('flex items-center gap-2 text-sm font-mono', isLow ? 'text-red-500' : 'text-gray-500')}>
      <Clock className="w-4 h-4" />
      <span>{mm}:{ss}</span>
      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', isLow ? 'bg-red-400' : 'bg-blue-400')}
          style={{ width: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Split an array into chunks of `size`. */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── SessionPage ──────────────────────────────────────────────────────────────
export default function SessionPage() {
  const { sessionPublicId } = useParams<{ sessionPublicId: string }>();
  const [searchParams] = useSearchParams();
  const exercisePublicId = searchParams.get('exercise');
  const isShadowMode = searchParams.get('mode') === 'shadow';
  const isIeltsMode = searchParams.get('mode') === 'ielts';
  const isChallenge = searchParams.get('challenge') === '1';
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { wsUrl?: string; maxDurationSeconds?: number } | null;

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [displayWords, setDisplayWords] = useState<DisplayWord[]>([]);
  const [targetAccent, setTargetAccent] = useState<string>('en-US');
  const maxSeconds = locationState?.maxDurationSeconds ?? 1800;

  // Karaoke state
  const [guideIndex, setGuideIndex] = useState(0);           // global word index the guide cursor is on
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [chunkKey, setChunkKey] = useState(0);                // bumped to trigger crossfade animation
  const guideRef = useRef<number | null>(null);               // interval handle
  const scoreGenCounter = useRef(0);                          // monotonic counter for pop animation keys

  // Shadowing mode state
  const [shadowPhase, setShadowPhase] = useState<'listening' | 'ready'>('listening');

  const { phase, liveWords, summary, errorMessage, startSession, stopSession } = useSession();
  const { speak, stop, speaking, supported: ttsSupported } = useSpeechDemo();

  // Compute chunks from displayWords
  const chunks = chunkArray(displayWords, WORDS_PER_CHUNK);
  const totalChunks = chunks.length;
  const currentChunk = chunks[currentChunkIndex] ?? [];
  const chunkStartIndex = currentChunkIndex * WORDS_PER_CHUNK; // global index offset for current chunk

  // Scored word count (for progress bar)
  const scoredCount = displayWords.filter((w) => w.status !== 'pending').length;
  const totalWords = displayWords.length;

  // ── Load exercise text + user's target accent ─────────────────────────────
  useEffect(() => {
    if (!exercisePublicId) return;
    exercisesApi
      .get(exercisePublicId)
      .then((ex) => {
        setExercise(ex);
        const words = ex.textContent.trim().split(/\s+/);
        setDisplayWords(words.map((w) => ({ word: w, status: 'pending' as WordStatus })));
      })
      .finally(() => setLoadingExercise(false));

    authApi.me()
      .then((profile) => {
        if (profile.targetAccent) setTargetAccent(profile.targetAccent);
      })
      .catch(() => {});
  }, [exercisePublicId]);

  // ── Shadowing mode: auto-play TTS when exercise loads ─────────────────────
  useEffect(() => {
    if (!isShadowMode || !exercise || !ttsSupported) return;
    setShadowPhase('listening');
    speak(exercise.textContent, targetAccent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, isShadowMode]);

  // ── Shadowing mode: when TTS finishes, move to 'ready' ───────────────────
  useEffect(() => {
    if (!isShadowMode) return;
    if (!speaking && shadowPhase === 'listening' && exercise) {
      setShadowPhase('ready');
    }
  }, [speaking, isShadowMode, shadowPhase, exercise]);

  // ── Sync live word results → display words ────────────────────────────────
  useEffect(() => {
    if (liveWords.length === 0) return;
    setDisplayWords((prev) => {
      const updated = [...prev];
      liveWords.forEach((lw) => {
        const clean = (w: string) => w.toLowerCase().replace(/[^a-z]/g, '');
        const idx = updated.findIndex(
          (dw) => dw.status === 'pending' && clean(dw.word) === clean(lw.word),
        );
        if (idx !== -1) {
          scoreGenCounter.current += 1;
          updated[idx] = {
            word: updated[idx].word,
            status: lw.status,
            accuracy: lw.accuracy,
            scoreGen: scoreGenCounter.current,
          };
        }
      });
      return updated;
    });
  }, [liveWords]);

  // ── Karaoke guide interval ────────────────────────────────────────────────
  // Runs during recording. Advances guideIndex at GUIDE_WPM pace.
  // Pauses if guide gets too far ahead of the last scored word.
  const startGuide = useCallback(() => {
    setGuideIndex(0);
    setCurrentChunkIndex(0);
    setChunkKey(0);
  }, []);

  const stopGuide = useCallback(() => {
    if (guideRef.current) {
      clearInterval(guideRef.current);
      guideRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase === 'recording' && totalWords > 0) {
      guideRef.current = window.setInterval(() => {
        setDisplayWords((currentWords) => {
          setGuideIndex((prevGuide) => {
            // Find last scored word index
            let lastScoredIdx = -1;
            for (let i = currentWords.length - 1; i >= 0; i--) {
              if (currentWords[i].status !== 'pending') {
                lastScoredIdx = i;
                break;
              }
            }

            // If guide is too far ahead of last scored, pause
            if (lastScoredIdx >= 0 && prevGuide - lastScoredIdx > GUIDE_MAX_AHEAD) {
              return prevGuide; // don't advance
            }

            // If user is speaking faster than guide, snap guide forward
            if (lastScoredIdx >= prevGuide) {
              return Math.min(lastScoredIdx + 1, currentWords.length - 1);
            }

            // Normal advance
            const next = prevGuide + 1;
            if (next >= currentWords.length) return currentWords.length - 1;
            return next;
          });
          return currentWords; // don't mutate displayWords here
        });
      }, GUIDE_INTERVAL_MS);
    } else {
      stopGuide();
    }
    return stopGuide;
  }, [phase, totalWords, stopGuide]);

  // ── Auto-advance chunk when guide passes into next chunk ──────────────────
  useEffect(() => {
    if (totalChunks <= 1) return;
    const targetChunk = Math.floor(guideIndex / WORDS_PER_CHUNK);
    if (targetChunk !== currentChunkIndex && targetChunk < totalChunks) {
      setCurrentChunkIndex(targetChunk);
      setChunkKey((k) => k + 1); // trigger crossfade
    }
  }, [guideIndex, currentChunkIndex, totalChunks]);

  // Also auto-advance chunk when all words in current chunk are scored
  useEffect(() => {
    if (phase !== 'recording' || totalChunks <= 1) return;
    const chunk = chunks[currentChunkIndex];
    if (!chunk) return;
    const allScored = chunk.every((w) => w.status !== 'pending');
    if (allScored && currentChunkIndex < totalChunks - 1) {
      setCurrentChunkIndex((c) => c + 1);
      setChunkKey((k) => k + 1);
    }
  }, [displayWords, phase, currentChunkIndex, totalChunks, chunks]);

  // ── Auto-stop when every word has been scored ─────────────────────────────
  useEffect(() => {
    if (phase !== 'recording') return;
    if (displayWords.length === 0) return;
    const allScored = displayWords.every((dw) => dw.status !== 'pending');
    if (allScored) {
      stopSession();
    }
  }, [displayWords, phase, stopSession]);

  // ── Navigate to summary when done ─────────────────────────────────────────
  useEffect(() => {
    if (phase === 'done' && summary && sessionPublicId) {
      if (isIeltsMode) {
        navigate(`/ielts/summary/${sessionPublicId}`, { state: { summary } });
        return;
      }
      const params = new URLSearchParams();
      if (isChallenge) params.set('challenge', '1');
      if (isShadowMode) params.set('mode', 'shadow');
      const query = params.toString() ? `?${params.toString()}` : '';
      navigate(`/sessions/${sessionPublicId}${query}`, { state: { summary } });
    }
  }, [phase, summary, sessionPublicId, navigate, isChallenge, isShadowMode, isIeltsMode]);

  // ── Space bar shortcut ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      e.preventDefault();
      if (phase === 'idle') handleStart();
      else if (phase === 'recording') stopSession();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStart = () => {
    const wsUrl = locationState?.wsUrl;
    if (!wsUrl) {
      navigate('/exercises');
      return;
    }
    stop(); // stop any demo speech
    setDisplayWords((prev) => prev.map((w) => ({ ...w, status: 'pending' as WordStatus, scoreGen: undefined })));
    startGuide();
    startSession(wsUrl);
  };

  const handleDemo = () => {
    if (!exercise) return;
    if (speaking) {
      stop();
      if (isShadowMode) setShadowPhase('ready');
    } else {
      speak(exercise.textContent, targetAccent);
      if (isShadowMode) setShadowPhase('listening');
    }
  };

  const handleReplay = () => {
    if (!exercise) return;
    stop();
    setShadowPhase('listening');
    speak(exercise.textContent, targetAccent);
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const isIdle       = phase === 'idle';
  const isRecording  = phase === 'recording';
  const isProcessing = phase === 'processing';
  const isConnecting = phase === 'connecting';

  const ACCENT_LABELS: Record<string, string> = {
    'en-US': 'American',
    'en-GB': 'British',
    'en-AU': 'Australian',
    'en-IN': 'Indian',
    'en-CA': 'Canadian',
    'en-IE': 'Irish',
  };
  const accentLabel = ACCENT_LABELS[targetAccent] ?? targetAccent;

  // Progress bar percentage
  const progressPct = totalWords > 0 ? (scoredCount / totalWords) * 100 : 0;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loadingExercise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading exercise...</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate('/exercises')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to exercises
        </button>

        <div className="flex items-center gap-4">
          <CountdownTimer running={isRecording} maxSeconds={maxSeconds} />
          {isShadowMode && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
              <Repeat className="w-3.5 h-3.5" /> Shadowing Mode
            </span>
          )}
          {exercise && (
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {exercise.title}
            </span>
          )}
        </div>
      </header>

      {/* Progress bar — thin line under header, visible during/after recording */}
      {(isRecording || isProcessing || phase === 'done') && totalWords > 0 && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl">
          {/* Phase states */}
          {phase === 'error' && errorMessage && (
            <Alert variant="error" className="mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-medium">Session error</p>
                  <p className="text-sm mt-0.5">{errorMessage}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => navigate('/exercises')}
              >
                Try another exercise
              </Button>
            </Alert>
          )}

          {isProcessing && (
            <Alert variant="info" className="mb-6">
              Analysing your pronunciation... This may take a few seconds.
            </Alert>
          )}

          {/* Exercise card */}
          <div className="card p-8 mb-8">
            {/* Header */}
            {exercise && (
              <div className="mb-6 pb-5 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{exercise.title}</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Read the text below clearly and at a natural pace
                  </p>
                </div>

                {/* Demo speech button / Shadowing controls */}
                {ttsSupported && (isIdle || phase === 'error') && (
                  isShadowMode ? (
                    <div className="flex items-center gap-2 shrink-0">
                      {shadowPhase === 'listening' ? (
                        <button
                          onClick={() => { stop(); setShadowPhase('ready'); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                          Stop listening
                        </button>
                      ) : (
                        <button
                          onClick={handleReplay}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          Replay demo
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={handleDemo}
                      title={speaking ? 'Stop demo' : `Hear ${accentLabel} accent demo`}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all duration-150',
                        speaking
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                      )}
                    >
                      {speaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          Stop demo
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          Hear {accentLabel} demo
                        </>
                      )}
                    </button>
                  )
                )}
              </div>
            )}

            {/* ─── Word display (karaoke windowed view) ──────────────────── */}
            {isRecording || isProcessing || phase === 'done' ? (
              // During/after recording: show only the current chunk with karaoke guide
              <div
                key={chunkKey}
                className="chunk-enter leading-loose text-center min-h-24 flex flex-wrap justify-center gap-x-2 gap-y-1"
              >
                {currentChunk.map((dw, i) => {
                  const globalIdx = chunkStartIndex + i;
                  const isGuide = globalIdx === guideIndex && isRecording;
                  const isBehind = globalIdx < guideIndex && isRecording;
                  return (
                    <WordToken
                      key={`${globalIdx}-${dw.scoreGen ?? 0}`}
                      word={dw.word}
                      status={dw.status}
                      isGuide={isGuide}
                      isBehind={isBehind}
                      scoreGen={dw.scoreGen}
                    />
                  );
                })}
              </div>
            ) : (
              // Before recording: show ALL words (so user can preview the full text)
              <div className="leading-loose text-center min-h-24 flex flex-wrap justify-center gap-x-2 gap-y-1">
                {displayWords.map((dw, i) => (
                  <WordToken
                    key={i}
                    word={dw.word}
                    status={dw.status}
                    isGuide={false}
                    isBehind={false}
                  />
                ))}
              </div>
            )}

            {/* Chunk indicator — shown during recording when multiple chunks exist */}
            {isRecording && totalChunks > 1 && (
              <div className="mt-3 text-center">
                <span className="text-xs text-gray-400 tabular-nums">
                  Section {currentChunkIndex + 1} of {totalChunks}
                </span>
              </div>
            )}

            {/* Legend */}
            {(isRecording || phase === 'done') && (
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-200 inline-block" /> Correct
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-yellow-200 inline-block" /> Needs refinement
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-200 inline-block" /> Let's work on this
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> Skipped
                </span>
                {isRecording && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 rounded bg-blue-500 inline-block" /> Guide
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-4">
            {/* Word count progress — shown while recording */}
            {isRecording && totalWords > 0 && (
              <p className="text-xs text-gray-400 tabular-nums">
                {scoredCount} / {totalWords} words
              </p>
            )}

            {/* Waveform */}
            <Waveform active={isRecording} />

            {/* Mic / stop button */}
            {isIdle || phase === 'error' ? (
              <button
                onClick={handleStart}
                disabled={!exercise || phase === 'error' || (isShadowMode && shadowPhase === 'listening')}
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200',
                  isShadowMode && shadowPhase === 'ready'
                    ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-lg'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <Mic className="w-8 h-8 text-white" />
              </button>
            ) : isConnecting ? (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isRecording ? (
              <button
                onClick={stopSession}
                className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 flex items-center justify-center shadow-lg mic-pulse transition-all duration-200"
              >
                <Square className="w-7 h-7 text-white fill-white" />
              </button>
            ) : isProcessing ? (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null}

            {/* Status label */}
            <p className="text-sm text-gray-500 text-center">
              {isIdle && isShadowMode && shadowPhase === 'listening' && 'Listen carefully to the model pronunciation...'}
              {isIdle && isShadowMode && shadowPhase === 'ready'    && 'Now try to shadow it — tap the microphone when ready'}
              {isIdle && !isShadowMode && (speaking ? `Listening to ${accentLabel} accent demo...` : 'Tap the microphone to start — or press Space')}
              {isConnecting && 'Connecting to AI coach...'}
              {isRecording  && 'Listening — follow the blue guide and speak clearly'}
              {isProcessing && 'Analysing your pronunciation...'}
              {phase === 'error' && 'Something went wrong'}
            </p>

            {/* Mic permission note */}
            {isIdle && !speaking && shadowPhase !== 'listening' && (
              <p className="text-xs text-gray-400 text-center max-w-sm">
                {isShadowMode
                  ? 'Try to copy the exact rhythm, tone, and sounds you just heard.'
                  : 'Your browser will ask for microphone permission. Audio is processed securely and never stored.'}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
