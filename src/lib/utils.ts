import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

export function scoreBg(score: number | null | undefined): string {
  if (score == null) return 'bg-gray-100';
  if (score >= 80) return 'bg-green-50 border-green-200';
  if (score >= 50) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

export function difficultyColor(d: string): string {
  if (d === 'easy')   return 'bg-green-100 text-green-700';
  if (d === 'medium') return 'bg-yellow-100 text-yellow-700';
  if (d === 'hard')   return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

export function categoryLabel(c: string): string {
  const map: Record<string, string> = {
    conversation:       'Conversation',
    storytelling:       'Storytelling',
    emotions:           'Emotions',
    interview:          'Interview',
    daily:              'Daily Life',
    business:           'Business',
    news:               'News',
    travel:             'Travel',
    academic:           'Academic',
    tongue_twisters:    'Tongue Twisters',
    classic_literature: 'Classic Literature',
    politics:           'Politics',
    geopolitics:        'Geopolitics',
    speech:             'Speech',
    diplomatic:         'Diplomatic',
    formal:             'Formal',
    sports:             'Sports',
    technology:         'Technology',
    diagnostic:         'Diagnostic Test',
    ielts:              'IELTS Practice',
  };
  return map[c] ?? c;
}

export function durationLabel(d: string | undefined): string {
  if (d === 'short')  return '< 30s';
  if (d === 'medium') return '30s–1m';
  if (d === 'long')   return '> 1m';
  return '';
}

export function durationColor(d: string | undefined): string {
  if (d === 'short')  return 'bg-blue-50 text-blue-600';
  if (d === 'medium') return 'bg-purple-50 text-purple-600';
  if (d === 'long')   return 'bg-orange-50 text-orange-600';
  return 'bg-gray-50 text-gray-500';
}

export function motivationalFeedback(accuracy: number): string {
  if (accuracy >= 90) return "Excellent work — your pronunciation is outstanding!";
  if (accuracy >= 75) return "Great session! You're making real progress.";
  if (accuracy >= 60) return "Good effort! Keep practising and you'll improve quickly.";
  if (accuracy >= 40) return "A solid start. Every session brings you closer to fluency.";
  return "Every expert was once a beginner. Keep going — you're building the foundation.";
}

// ─── Speech analytics helpers ─────────────────────────────────────────────────

export function speechHealthColor(score: number | null | undefined): string {
  if (score == null) return 'text-gray-400';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

export function speechHealthBg(score: number | null | undefined): string {
  if (score == null) return 'bg-gray-100';
  if (score >= 80) return 'bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'bg-blue-50 border-blue-200';
  if (score >= 40) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

export function speechHealthLabel(score: number | null | undefined): string {
  if (score == null) return 'No data';
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Developing';
  return 'Needs work';
}

export function wpmLabel(wpm: number | null | undefined): string {
  if (wpm == null) return '—';
  if (wpm < 110) return 'Too slow';
  if (wpm <= 160) return 'Ideal pace';
  return 'Too fast';
}

export function wpmColor(wpm: number | null | undefined): string {
  if (wpm == null) return 'text-gray-400';
  if (wpm < 110) return 'text-blue-600';
  if (wpm <= 160) return 'text-green-600';
  return 'text-orange-600';
}

export function fillerLabel(count: number): string {
  if (count === 0) return 'Clean speech';
  if (count <= 2) return 'Minimal fillers';
  if (count <= 5) return 'Some fillers';
  return 'Many fillers';
}

export function fillerColor(count: number): string {
  if (count === 0) return 'text-green-600';
  if (count <= 2) return 'text-green-600';
  if (count <= 5) return 'text-yellow-600';
  return 'text-red-600';
}

// ─── Hesitation / pause helpers ───────────────────────────────────────────────

export function hesitationColor(score: number | null | undefined): string {
  if (score == null) return 'text-gray-400';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

export function hesitationLabel(score: number | null | undefined): string {
  if (score == null) return 'No data';
  if (score >= 80) return 'Smooth';
  if (score >= 60) return 'Mostly fluent';
  if (score >= 40) return 'Some hesitation';
  return 'Very hesitant';
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null || ms === 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
