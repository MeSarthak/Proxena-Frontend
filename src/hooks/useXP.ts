/**
 * useXP — client-side XP & level system stored in localStorage.
 *
 * XP is awarded when a session summary is recorded:
 *   - Base 10 XP per session
 *   - +1 XP per accuracy % point above 50
 *   - e.g. 80% accuracy → 10 + 30 = 40 XP
 *
 * Levels:
 *   Beginner   0–199 XP
 *   Learner    200–499 XP
 *   Speaker    500–999 XP
 *   Fluent     1000–1999 XP
 *   Expert     2000+ XP
 */

import { useCallback, useEffect, useState } from 'react';

export interface XPState {
  totalXP: number;
  level: string;
  levelIndex: number;   // 0-4
  nextLevelXP: number;  // XP needed for next level (0 if max)
  progressPct: number;  // 0-100 within current level
}

const LEVELS = [
  { name: 'Beginner', min: 0,    max: 200  },
  { name: 'Learner',  min: 200,  max: 500  },
  { name: 'Speaker',  min: 500,  max: 1000 },
  { name: 'Fluent',   min: 1000, max: 2000 },
  { name: 'Expert',   min: 2000, max: Infinity },
];

const STORAGE_KEY = 'proxena_xp';

function computeState(totalXP: number): XPState {
  const idx = LEVELS.findIndex((l) => totalXP < l.max);
  const levelIndex = idx === -1 ? LEVELS.length - 1 : idx;
  const level = LEVELS[levelIndex];
  const nextLevelXP = level.max === Infinity ? 0 : level.max;
  const rangeSize = level.max === Infinity ? 1 : level.max - level.min;
  const progressPct =
    level.max === Infinity
      ? 100
      : Math.min(100, ((totalXP - level.min) / rangeSize) * 100);
  return {
    totalXP,
    level: level.name,
    levelIndex,
    nextLevelXP,
    progressPct,
  };
}

export function xpForSession(accuracy: number | null): number {
  const acc = accuracy ?? 0;
  return 10 + Math.max(0, Math.round(acc - 50));
}

export function useXP() {
  const [state, setState] = useState<XPState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const xp = stored ? parseInt(stored, 10) : 0;
      return computeState(isNaN(xp) ? 0 : xp);
    } catch {
      return computeState(0);
    }
  });

  const addXP = useCallback((amount: number): { didLevelUp: boolean; newLevel: string } => {
    let didLevelUp = false;
    let newLevel = state.level;

    setState((prev) => {
      const newTotal = prev.totalXP + amount;
      const next = computeState(newTotal);
      if (next.levelIndex > prev.levelIndex) {
        didLevelUp = true;
        newLevel = next.level;
      }
      try {
        localStorage.setItem(STORAGE_KEY, String(newTotal));
      } catch { /* ignore */ }
      return next;
    });

    return { didLevelUp, newLevel };
  }, [state.level]);

  // Keep state fresh if localStorage changes in another tab
  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const xp = stored ? parseInt(stored, 10) : 0;
        setState(computeState(isNaN(xp) ? 0 : xp));
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { ...state, addXP };
}
