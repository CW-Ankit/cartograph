'use client';

import { useSyncExternalStore } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';

let currentTheme: ThemePreference = 'system';
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateThemeInDom(nextTheme: ThemePreference) {
  if (typeof window === 'undefined') return;

  document.cookie = `cartograph_theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
  localStorage.setItem('cartograph_theme', nextTheme);
  currentTheme = nextTheme;

  const root = document.documentElement;
  let isDark = false;

  if (nextTheme === 'dark') {
    isDark = true;
  } else if (nextTheme === 'light') {
    isDark = false;
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  emitChange();
}

function subscribe(callback: () => void) {
  listeners.add(callback);

  if (typeof window === 'undefined') {
    return () => {
      listeners.delete(callback);
    };
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'cartograph_theme') {
      const val = e.newValue;
      if (val === 'light' || val === 'dark' || val === 'system') {
        currentTheme = val;
        emitChange();
      }
    }
  };

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMedia = () => {
    if (currentTheme === 'system') {
      const root = document.documentElement;
      if (mediaQuery.matches) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
      emitChange();
    }
  };

  window.addEventListener('storage', handleStorage);
  mediaQuery.addEventListener('change', handleMedia);

  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
    mediaQuery.removeEventListener('change', handleMedia);
  };
}

function getSnapshot(): ThemePreference {
  if (typeof document === 'undefined') return 'system';
  const match = document.cookie.match(/(?:^|; )cartograph_theme=([^;]*)/);
  const cookieVal = match ? decodeURIComponent(match[1]) : null;
  const stored = cookieVal || localStorage.getItem('cartograph_theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    currentTheme = stored;
    return stored;
  }
  return currentTheme;
}

function getServerSnapshot(): ThemePreference {
  return 'system';
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const options: Array<{ id: ThemePreference; label: string }> = [
    { id: 'system', label: 'system' },
    { id: 'light', label: 'light' },
    { id: 'dark', label: 'dark' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className="h-7 inline-flex items-center rounded-[4px] border border-border bg-surface p-0.5 font-mono text-[10px]"
    >
      {options.map((opt) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => updateThemeInDom(opt.id)}
            className={`h-full rounded-[2px] px-2 transition-all duration-100 uppercase tracking-wider text-[9px] ${
              active
                ? 'bg-accent font-semibold text-accent-foreground shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
