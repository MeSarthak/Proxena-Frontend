import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const config: Record<AlertVariant, { icon: React.ElementType; classes: string }> = {
  info:    { icon: Info,         classes: 'bg-blue-50 border-blue-200 text-blue-800' },
  success: { icon: CheckCircle,  classes: 'bg-green-50 border-green-200 text-green-800' },
  warning: { icon: AlertCircle,  classes: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  error:   { icon: XCircle,      classes: 'bg-red-50 border-red-200 text-red-800' },
};

export function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  const { icon: Icon, classes } = config[variant];
  return (
    <div className={cn('flex gap-3 p-4 rounded-xl border text-sm', classes, className)}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
