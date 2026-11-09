'use client';

import { useState } from 'react';
import { UserPlus, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { inviteMember } from '@/app/actions/org';

interface InviteModalProps {
  orgName: string;
}

export function InviteModal({ orgName }: InviteModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'org:member' | 'org:admin'>('org:member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStatus(null);

    const result = await inviteMember(email.trim(), role);
    setIsSubmitting(false);

    if (result.success) {
      setStatus({
        type: 'success',
        message: `Invitation sent to ${email.trim()}. The recipient will accept from the login page.`,
      });
      setEmail('');
    } else {
      setStatus({
        type: 'error',
        message: result.message || 'Failed to send invitation.',
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setStatus(null);
        }}
        className="h-7 inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-surface px-2.5 py-0 font-mono text-xs text-foreground transition-all duration-100 hover:bg-surface-raised hover:border-accent"
        title="Invite team member"
      >
        <UserPlus className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
        <span>invite</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-[6px] border border-border bg-surface p-4 shadow-2xl text-foreground font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
              <div>
                <h3 className="text-xs font-semibold text-foreground">Invite to {orgName}</h3>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  Accepting directs the invitee to sign in
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="font-mono text-xs text-foreground-muted hover:text-foreground p-1 rounded-[3px] hover:bg-surface-raised"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="invite-email"
                  className="block text-[11px] font-mono text-foreground-muted mb-1"
                >
                  email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full rounded-[3px] border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-foreground-muted/60 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="invite-role"
                  className="block text-[11px] font-mono text-foreground-muted mb-1"
                >
                  role
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'org:member' | 'org:admin')}
                  className="w-full rounded-[3px] border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="org:member">Member (org:member)</option>
                  <option value="org:admin">Admin (org:admin)</option>
                </select>
              </div>

              {status && (
                <div
                  className={`flex items-start gap-2 rounded-[3px] p-2 text-[11px] font-mono ${
                    status.type === 'success'
                      ? 'border border-incoming/30 bg-incoming/10 text-incoming'
                      : 'border border-outgoing/30 bg-outgoing/10 text-outgoing'
                  }`}
                >
                  {status.type === 'success' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-incoming" strokeWidth={1.75} />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-outgoing" strokeWidth={1.75} />
                  )}
                  <span>{status.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-[3px] border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground-muted hover:text-foreground hover:bg-surface-raised"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="inline-flex items-center gap-1.5 rounded-[3px] bg-accent px-3 py-1 font-mono text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />}
                  <span>{isSubmitting ? 'sending...' : 'send invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
