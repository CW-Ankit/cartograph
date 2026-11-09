'use client';

import { useEffect, useRef } from 'react';
import { authClient } from '@/lib/auth/client';

interface AutoActivateOrgProps {
  targetOrgId: string;
}

export function AutoActivateOrg({ targetOrgId }: AutoActivateOrgProps) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    // Better Auth organization plugin sets active organization
    void (authClient as unknown as { organization?: { setActive: (args: { organizationId: string }) => Promise<unknown> } })
      .organization?.setActive({ organizationId: targetOrgId })
      .then(() => {
        window.location.reload();
      })
      .catch((err: unknown) => {
        console.error('Failed to set active organization:', err);
      });
  }, [targetOrgId]);

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-foreground-muted font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
        <span>Initializing organization workspace...</span>
      </div>
    </div>
  );
}
