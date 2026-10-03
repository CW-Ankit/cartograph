'use client';

import { useEffect, useRef } from 'react';
import { useOrganizationList } from '@clerk/nextjs';

interface AutoActivateOrgProps {
  targetOrgId: string;
}

export function AutoActivateOrg({ targetOrgId }: AutoActivateOrgProps) {
  const { setActive, isLoaded } = useOrganizationList();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || attemptedRef.current || !setActive) return;

    attemptedRef.current = true;
    void setActive({ organization: targetOrgId })
      .then(() => {
        window.location.reload();
      })
      .catch((err: unknown) => {
        console.error('Failed to set active organization:', err);
      });
  }, [isLoaded, setActive, targetOrgId]);

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-foreground-muted font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
        <span>Initializing organization workspace...</span>
      </div>
    </div>
  );
}
