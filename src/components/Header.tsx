import React, { useEffect, useState } from 'react';
import { Clock, ShieldCheck, MapPin, Sun, Moon, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'punch' | 'manager';
  setActiveTab: (tab: 'dashboard' | 'punch' | 'manager') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  todayActiveCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  theme,
  onToggleTheme,
  todayActiveCount = 0,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-sky-500/10 border border-sky-400/30 flex items-center justify-center shadow-xs">
            <img
              src="/assets/img/WhatsApp_Image_2026-10-29_at_11.52.03_ee88581e.jpeg"
              alt="Runbd Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap block leading-none">
              Runbd Attendance
            </span>
            <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap block mt-0.5">
              Smart Attendance System
            </span>
          </div>
        </div>

        {/* Zone 2: Single-line Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Live Dashboard</span>
            {todayActiveCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                {todayActiveCount} active
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('punch')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'punch'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Punch Desk
          </button>

          <button
            onClick={() => setActiveTab('manager')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'manager'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Manager Portal
          </button>
        </nav>

        {/* Zone 3: Live Clock & Theme Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {timeStr || '00:00:00 AM'}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {dateStr}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shrink-0"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden items-center justify-around border-t border-slate-100 dark:border-slate-800 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-2.5 py-1 font-semibold rounded ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('punch')}
          className={`px-2.5 py-1 font-semibold rounded ${
            activeTab === 'punch'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Punch Desk
        </button>
        <button
          onClick={() => setActiveTab('manager')}
          className={`px-3 py-1 font-semibold rounded ${
            activeTab === 'manager'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Manager Portal
        </button>
      </div>
    </header>
  );
};
