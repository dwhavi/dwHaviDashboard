import { useEffect } from 'react';

export default function Toast({ toasts, onRemove }) {
  useEffect(() => {
    toasts.forEach((t) => {
      const timer = setTimeout(() => onRemove(t.id), 3000);
      return () => clearTimeout(timer);
    });
  }, [toasts, onRemove]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] space-y-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg animate-[slideIn_0.2s_ease-out] ${
            t.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <span className="text-sm flex-1">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
