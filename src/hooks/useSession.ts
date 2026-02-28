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
  startSession: (wsUrl: string) => void;
  stopSession: () => void;
}

const SAMPLE_RATE = 16_000;

export function useSession(): UseSessionReturn {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [liveWords, setLiveWords] = useState<LiveWord[]>([]);
  const [summary, setSummary] = useState<WsSummaryMessage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const cleanup = useCallback(() => {
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

  const startSession = useCallback(
    async (wsUrl: string) => {
      setLiveWords([]);
      setSummary(null);
      setErrorMessage(null);
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
          setLiveWords((prev) => {
            // Always append — SessionPage matches by word text against pending display tokens
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

        // Receive Int16 PCM buffers from the worklet and forward over WebSocket
        workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(e.data);
          }
        };

        source.connect(workletNode);
        // Do NOT connect workletNode to ctx.destination — we don't want speaker output

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

  return { phase, liveWords, summary, errorMessage, startSession, stopSession };
}
