'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Settings, Building2, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { ThemeToggle } from './theme-toggle';

export function UserProfileMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sessionResult = authClient.useSession();
  const session = sessionResult?.data;
  const isPending = sessionResult?.isPending;

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const user = session?.user;
  const initial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/auth/sign-in');
            router.refresh();
          },
        },
      });
    } catch {
      router.push('/auth/sign-in');
      router.refresh();
    }
  };

  if (isPending) {
    return (
      <div className="h-7 w-7 rounded-[4px] border border-border bg-surface-raised animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth/sign-in"
        className="h-7 inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-surface px-2.5 font-mono text-xs text-foreground hover:bg-surface-raised transition-colors"
      >
        <span>Sign in</span>
      </Link>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="user-profile-menu-button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-7 inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-surface px-1.5 font-mono text-xs text-foreground hover:bg-surface-raised hover:border-accent/60 transition-all select-none"
      >
        {user.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={user.image}
            alt={displayName}
            className="h-4.5 w-4.5 rounded-[2px] object-cover border border-border"
          />
        ) : (
          <div className="flex h-4.5 w-4.5 items-center justify-center rounded-[2px] bg-accent/15 border border-accent/30 font-mono text-[10px] font-semibold text-accent">
            {initial}
          </div>
        )}
        <span className="max-w-[100px] truncate font-medium text-[11px] text-foreground">
          {displayName}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-foreground-muted transition-transform duration-100 ${
            isOpen ? 'rotate-180' : ''
          }`}
          strokeWidth={1.75}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-profile-menu-button"
          className="absolute right-0 mt-1 w-64 origin-top-right rounded-[4px] border border-border bg-surface p-1.5 shadow-2xl z-50 font-mono text-xs animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* User Profile Header */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            {user.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.image}
                alt={displayName}
                className="h-7 w-7 rounded-[3px] object-cover border border-border shrink-0"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-accent/15 border border-accent/30 font-mono text-xs font-semibold text-accent shrink-0">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-sans font-medium text-xs text-foreground">
                {user.name || displayName}
              </div>
              <div className="truncate font-mono text-[10px] text-foreground-muted">
                {user.email}
              </div>
            </div>
          </div>

          <div className="my-1 h-px bg-border" />

          {/* Settings Navigation Links */}
          <div className="flex flex-col gap-0.5">
            <Link
              href="/account"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-[3px] px-2 py-1.5 text-[11px] text-foreground hover:bg-surface-raised transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-foreground-muted" strokeWidth={1.75} />
                <span>Account Settings</span>
              </div>
              <span className="text-[9px] text-foreground-muted font-mono">/account</span>
            </Link>

            <Link
              href="/organization"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-[3px] px-2 py-1.5 text-[11px] text-foreground hover:bg-surface-raised transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-foreground-muted" strokeWidth={1.75} />
                <span>Organization Settings</span>
              </div>
              <span className="text-[9px] text-foreground-muted font-mono">/organization</span>
            </Link>
          </div>

          <div className="my-1.5 h-px bg-border" />

          {/* Theme Settings inside Profile Dropdown */}
          <div className="px-1 py-1">
            <div className="mb-1 flex items-center justify-between px-1 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">
              <span>Theme</span>
            </div>
            <ThemeToggle fullWidth={true} />
          </div>

          <div className="my-1.5 h-px bg-border" />

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-[11px] text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

