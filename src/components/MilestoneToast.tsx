/**
 * MilestoneToast — animated popup for badge unlocks and level-ups.
 * Appears in the bottom-right corner, auto-dismisses after 5s.
 * Supports a queue of multiple toasts shown sequentially.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface ToastItem {
  id: string;
  emoji: string;
  title: string;
  message: string;
  color?: 'amber' | 'blue' | 'purple' | 'green';
}

interface MilestoneToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function MilestoneToast({ toasts, onDismiss }: MilestoneToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <SingleToast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function SingleToast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 350);
    }, 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const colorMap: Record<string, string> = {
    amber:  'border-amber-200 bg-amber-50',
    blue:   'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50',
    green:  'border-green-200 bg-green-50',
  };
  const textMap: Record<string, string> = {
    amber:  'text-amber-900',
    blue:   'text-blue-900',
    purple: 'text-purple-900',
    green:  'text-green-900',
  };
  const color = toast.color ?? 'amber';

  return (
    <div
      className={`
        pointer-events-auto w-72 rounded-2xl border shadow-lg p-4
        flex items-start gap-3 transition-all duration-350
        ${colorMap[color]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <span className="text-2xl shrink-0 leading-none mt-0.5">{toast.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${textMap[color]}`}>{toast.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 350); }}
        className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Hook to manage toast queue ───────────────────────────────────────────────

import { useCallback } from 'react';

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismiss };
}
