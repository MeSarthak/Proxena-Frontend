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
    conversation:    'Conversation',
    storytelling:    'Storytelling',
    emotions:        'Emotions',
    interview:       'Interview',
    daily:           'Daily Life',
    business:        'Business',
    news:            'News',
    travel:          'Travel',
    academic:        'Academic',
    tongue_twisters: 'Tongue Twisters',
  };
  return map[c] ?? c;
}

export function durationLabel(d: string | undefined): string {
  if (d === 'short')  return '~1 min';
  if (d === 'medium') return '~3 min';
  if (d === 'long')   return '~5 min+';
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
