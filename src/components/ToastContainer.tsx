import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types/attendance';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          info: <Info className="w-4 h-4 text-indigo-400 shrink-0" />,
        };

        const borderStyles = {
          success: 'border-emerald-700/50',
          error: 'border-rose-700/50',
          warning: 'border-amber-700/50',
          info: 'border-indigo-700/50',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-xl p-3.5 border ${borderStyles[toast.type]} flex items-start justify-between gap-3 transition-all duration-200 animate-in slide-in-from-top-2`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{icons[toast.type]}</div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-100">{toast.title}</div>
                <div className="text-[11px] text-slate-300 leading-relaxed">{toast.message}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
