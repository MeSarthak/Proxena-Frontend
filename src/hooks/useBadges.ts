/**
 * useBadges — milestone badge system stored in localStorage.
 *
 * Badges are unlocked once and never revoked.
 * Call checkAndUnlock(stats) after each session to get newly unlocked badges.
 */

import { useCallback, useState } from 'react';

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
}

export const ALL_BADGES: Badge[] = [
  { id: 'first_session',   emoji: '🎙️', name: 'First Words',     description: 'Completed your first session'          },
  { id: 'sessions_5',      emoji: '🔥', name: 'On a Roll',        description: 'Completed 5 sessions'                  },
  { id: 'sessions_10',     emoji: '💪', name: 'Dedicated',        description: 'Completed 10 sessions'                 },
  { id: 'sessions_25',     emoji: '🏆', name: 'Committed',        description: 'Completed 25 sessions'                 },
  { id: 'sessions_50',     emoji: '🌟', name: 'Expert Speaker',   description: 'Completed 50 sessions'                 },
  { id: 'accuracy_80',     emoji: '🎯', name: 'Sharp Tongue',     description: 'Scored 80% accuracy in a session'      },
  { id: 'accuracy_90',     emoji: '💎', name: 'Near Perfect',     description: 'Scored 90% accuracy in a session'      },
  { id: 'streak_3',        emoji: '📅', name: 'Habit Forming',    description: '3-day practice streak'                 },
  { id: 'streak_7',        emoji: '🗓️', name: 'Week Warrior',     description: '7-day practice streak'                 },
  { id: 'streak_30',       emoji: '🏅', name: 'Unstoppable',      description: '30-day practice streak'                },
  { id: 'challenge_first', emoji: '⚔️', name: 'Challenger',       description: 'Completed your first weekly challenge' },
  { id: 'shadowing_first', emoji: '🪞', name: 'Shadow Speak',     description: 'Completed your first shadowing session' },
  { id: 'xp_500',          emoji: '⚡', name: 'Power User',       description: 'Earned 500 XP'                         },
  { id: 'xp_1000',         emoji: '🚀', name: 'Language Rocket',  description: 'Earned 1000 XP'                        },
];

export interface BadgeCheckStats {
  totalSessions: number;
  sessionAccuracy: number | null;
  streak: number;
  totalXP: number;
  completedChallenge?: boolean;
  completedShadowing?: boolean;
}

const STORAGE_KEY = 'proxena_badges';

function loadUnlocked(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored) as string[]);
  } catch {
    return new Set();
  }
}

function saveUnlocked(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

export function useBadges() {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(loadUnlocked);

  const checkAndUnlock = useCallback((stats: BadgeCheckStats): Badge[] => {
    const current = loadUnlocked();
    const newlyUnlocked: Badge[] = [];

    const candidate = (id: string, condition: boolean) => {
      if (condition && !current.has(id)) {
        const badge = ALL_BADGES.find((b) => b.id === id);
        if (badge) newlyUnlocked.push(badge);
        current.add(id);
      }
    };

    candidate('first_session',   stats.totalSessions >= 1);
    candidate('sessions_5',      stats.totalSessions >= 5);
    candidate('sessions_10',     stats.totalSessions >= 10);
    candidate('sessions_25',     stats.totalSessions >= 25);
    candidate('sessions_50',     stats.totalSessions >= 50);
    candidate('accuracy_80',     (stats.sessionAccuracy ?? 0) >= 80);
    candidate('accuracy_90',     (stats.sessionAccuracy ?? 0) >= 90);
    candidate('streak_3',        stats.streak >= 3);
    candidate('streak_7',        stats.streak >= 7);
    candidate('streak_30',       stats.streak >= 30);
    candidate('challenge_first', !!stats.completedChallenge);
    candidate('shadowing_first', !!stats.completedShadowing);
    candidate('xp_500',          stats.totalXP >= 500);
    candidate('xp_1000',         stats.totalXP >= 1000);

    if (newlyUnlocked.length > 0) {
      saveUnlocked(current);
      setUnlockedIds(new Set(current));
    }

    return newlyUnlocked;
  }, []);

  const unlockedBadges = ALL_BADGES.filter((b) => unlockedIds.has(b.id));
  const lockedBadges   = ALL_BADGES.filter((b) => !unlockedIds.has(b.id));

  return { unlockedBadges, lockedBadges, unlockedIds, checkAndUnlock };
}
