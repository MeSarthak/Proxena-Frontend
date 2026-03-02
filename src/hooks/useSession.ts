import { useCallback, useEffect, useRef, useState } from 'react';
import type { WsServerMessage, WsWordMessage, WsSummaryMessage, WsStopMessage, WordStatus } from '../types';
import { buildWsUrl } from '../lib/api';

export interface LiveWord {
  word: string;
  accuracy: number;
  status: WordStatus;
}

export type SessionPhase =
  | 'idle'       // before start
  | 'connecting' // WebSocket connecting
  | 'recording'  // mic open, audio streaming
  | 'processing' // sent stop, waiting for summary
  | 'done'       // summary received
  | 'error';     // terminal error

export interface UseSessionReturn {
  phase: SessionPhase;
  liveWords: LiveWord[];
  summary: WsSummaryMessage | null;
  errorMessage: string | null;
  silenceWarning: boolean;
  startSession: (wsUrl: string) => void;
  stopSession: () => void;
}

const SAMPLE_RATE = 16_000;

// ─── Silence detection thresholds ──────────────────────────────────────────
// RMS below this is considered silence (after noiseSuppression, ambient ~0.001-0.005)
const SILENCE_RMS_THRESHOLD = 0.01;
// Show "are you still speaking?" warning after this many seconds of silence
const SILENCE_WARNING_MS = 5_000;
// Auto-stop the session after this many seconds of continuous silence
const SILENCE_AUTO_STOP_MS = 10_000;

export function useSession(): UseSessionReturn {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [liveWords, setLiveWords] = useState<LiveWord[]>([]);
  const [summary, setSummary] = useState<WsSummaryMessage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [silenceWarning, setSilenceWarning] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // Silence detection refs
  const lastSpeechTimeRef = useRef(0);
  const silenceTimerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setSilenceWarning(false);
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const stopSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const stopMsg: WsStopMessage = { type: 'stop' };
      wsRef.current.send(JSON.stringify(stopMsg));
      setPhase('processing');
    }
    cleanup();
  }, [cleanup]);

  // We need a ref to stopSession so the silence timer can call it without re-creating the interval
  const stopSessionRef = useRef(stopSession);
  stopSessionRef.current = stopSession;

  const startSession = useCallback(
    async (wsUrl: string) => {
      setLiveWords([]);
      setSummary(null);
      setErrorMessage(null);
      setSilenceWarning(false);
      setPhase('connecting');

      let fullWsUrl: string;
      try {
        fullWsUrl = await buildWsUrl(wsUrl);
      } catch {
        setPhase('error');
        setErrorMessage('Authentication failed. Please refresh and try again.');
        return;
      }

      const ws = new WebSocket(fullWsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        let msg: WsServerMessage;
        try {
          msg = JSON.parse(event.data as string) as WsServerMessage;
        } catch {
          return;
        }

        if (msg.type === 'word') {
          const word = msg as WsWordMessage;
          // Any word from Azure means user is speaking — reset silence timer
          lastSpeechTimeRef.current = Date.now();
          setSilenceWarning(false);
          setLiveWords((prev) => {
            return [...prev, { word: word.word, accuracy: word.accuracy, status: word.status }];
          });
        } else if (msg.type === 'summary') {
          setSummary(msg as WsSummaryMessage);
          setPhase('done');
          cleanup();
          ws.close();
        } else if (msg.type === 'error') {
          const humanMap: Record<string, string> = {
            UNAUTHORIZED: 'Session authentication failed.',
            INVALID_TOKEN: 'Your session token expired. Please refresh.',
            SESSION_NOT_FOUND: 'Session not found.',
            SESSION_ALREADY_COMPLETED: 'This session has already been completed.',
            DAILY_LIMIT_EXCEEDED: "You've reached today's practice limit. Come back tomorrow!",
            INTERNAL_SERVER_ERROR: 'Something went wrong on our end. Please try again.',
          };
          setErrorMessage(humanMap[msg.message] ?? 'An unexpected error occurred.');
          setPhase('error');
          cleanup();
        }
      };

      ws.onerror = () => {
        setErrorMessage('Connection failed. Please check your internet and try again.');
        setPhase('error');
        cleanup();
      };

      ws.onclose = (e) => {
        if (e.code === 1008) {
          // policy violation — already handled via error message
        }
        cleanup();
      };

      ws.onopen = async () => {
        // Request mic access
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: SAMPLE_RATE,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
        } catch {
          setErrorMessage(
            'Microphone access denied. Please allow microphone permissions and try again.',
          );
          setPhase('error');
          ws.close();
          return;
        }

        mediaStreamRef.current = stream;

        const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioContextRef.current = ctx;

        // Load the AudioWorklet processor (served from /public)
        try {
          await ctx.audioWorklet.addModule('/pcm-processor.js');
        } catch {
          setErrorMessage('Audio processor failed to load. Please refresh and try again.');
          setPhase('error');
          ws.close();
          cleanup();
          return;
        }

        const source = ctx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
        workletNodeRef.current = workletNode;

        // Receive PCM buffers + RMS energy from the worklet and forward PCM over WebSocket.
        // The RMS is used client-side for silence detection.
        workletNode.port.onmessage = (e: MessageEvent<{ pcm: ArrayBuffer; rms: number }>) => {
          const { pcm, rms } = e.data;

          // Track speech activity based on audio energy
          if (rms >= SILENCE_RMS_THRESHOLD) {
            lastSpeechTimeRef.current = Date.now();
            setSilenceWarning(false);
          }

          // Forward PCM to server
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(pcm);
          }
        };

        source.connect(workletNode);
        // Do NOT connect workletNode to ctx.destination — we don't want speaker output

        // ── Start silence detection timer ──────────────────────────────
        lastSpeechTimeRef.current = Date.now();
        silenceTimerRef.current = window.setInterval(() => {
          const silenceDuration = Date.now() - lastSpeechTimeRef.current;

          if (silenceDuration >= SILENCE_AUTO_STOP_MS) {
            // Auto-stop after prolonged silence
            stopSessionRef.current();
          } else if (silenceDuration >= SILENCE_WARNING_MS) {
            // Show warning after shorter silence
            setSilenceWarning(true);
          }
        }, 500);

        setPhase('recording');
      };
    },
    [cleanup],
  );

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      cleanup();
    };
  }, [cleanup]);

  return { phase, liveWords, summary, errorMessage, silenceWarning, startSession, stopSession };
}
