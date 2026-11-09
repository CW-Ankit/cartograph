import { DbAnalysis } from '@/types/database';
import { formatRelativeTime } from '@/lib/format';
import { GitBranch, FolderGit2, CheckCircle2, Loader2, Clock, AlertCircle, Layers } from 'lucide-react';

interface DashboardProps {
  organizationName: string;
  analyses: DbAnalysis[];
}

export function Dashboard({ organizationName, analyses }: DashboardProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col gap-1 border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h1 className="font-mono text-sm font-semibold tracking-tight text-foreground">
                Repository Analyses
              </h1>
              <span className="rounded-[3px] border border-border bg-surface-raised px-1.5 py-0.2 font-mono text-[10px] text-foreground-muted">
                {analyses.length} {analyses.length === 1 ? 'run' : 'runs'}
              </span>
            </div>

            <div className="font-mono text-[11px] text-foreground-muted">
              Team: <span className="font-medium text-foreground">{organizationName}</span>
            </div>
          </div>
          <p className="font-mono text-xs text-foreground-muted">
            Dependency maps and real code parsing outputs for this organization.
          </p>
        </div>

        {/* Content: List or Empty State */}
        {analyses.length === 0 ? (
          /* Empty State for a team that has never run an analysis */
          <div className="my-12 flex flex-col items-center justify-center rounded-[4px] border border-border bg-surface p-12 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[4px] border border-border bg-surface-raised text-foreground-muted">
              <FolderGit2 className="h-5 w-5 text-foreground-muted" strokeWidth={1.5} />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
              WORKSPACE READY
            </div>
            <h2 className="mt-1 font-mono text-sm font-semibold text-foreground">
              No analyses recorded
            </h2>
            <p className="mt-1 max-w-sm font-mono text-xs text-foreground-muted">
              This organization has never run an analysis. When a repository is mapped, its
              dependency graph and structural metadata will appear here.
            </p>
          </div>
        ) : (
          /* Analyses List */
          <div className="rounded-[4px] border border-border bg-surface divide-y divide-border overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-surface-raised/60 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              <div className="col-span-4">Repository & Branch</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-4">Metrics & Coverage</div>
              <div className="col-span-2 text-right">Age</div>
            </div>

            {/* Rows */}
            {analyses.map((analysis) => {
              const projectName = analysis.projects?.name ?? 'Unknown Repository';
              const branch = analysis.projects?.default_branch ?? 'main';
              const shortHash = analysis.commit_hash
                ? analysis.commit_hash.slice(0, 7)
                : 'latest';

              return (
                <div
                  key={analysis.id}
                  className="grid grid-cols-12 items-center px-4 py-3 text-xs transition-colors hover:bg-surface-raised/40"
                >
                  {/* Repo + Commit */}
                  <div className="col-span-4 flex flex-col gap-0.5">
                    <span className="font-mono font-medium text-foreground flex items-center gap-1.5">
                      <FolderGit2 className="h-3.5 w-3.5 text-accent/80 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{projectName}</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground-muted pl-5">
                      <GitBranch className="h-3 w-3 shrink-0 text-foreground-muted/70" strokeWidth={1.5} />
                      <span>{branch}</span>
                      <span className="text-border">@</span>
                      <span className="text-foreground-muted/80">{shortHash}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-2">
                    <StatusBadge status={analysis.status} />
                  </div>

                  {/* Metrics / Details */}
                  <div className="col-span-4 font-mono text-xs">
                    {analysis.status === 'ready' && (
                      <div className="flex items-center gap-3 text-foreground-muted">
                        <span>
                          <strong className="font-medium text-foreground">
                            {analysis.file_count.toLocaleString()}
                          </strong>{' '}
                          files
                        </span>
                        <span className="text-border">·</span>
                        <span>
                          <strong className="font-medium text-foreground">
                            {analysis.edge_count.toLocaleString()}
                          </strong>{' '}
                          edges
                        </span>
                        {analysis.coverage_percent !== null && (
                          <>
                            <span className="text-border">·</span>
                            <span className="text-incoming">
                              {analysis.coverage_percent}% coverage
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {analysis.status === 'parsing' && (
                      <div className="flex items-center gap-2 text-[11px] text-accent">
                        <Loader2 className="h-3 w-3 animate-spin text-accent" strokeWidth={2} />
                        <span>
                          Parsing modules ({analysis.file_count} files, {analysis.edge_count} edges
                          found)
                        </span>
                      </div>
                    )}

                    {analysis.status === 'pending' && (
                      <span className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                        <Clock className="h-3 w-3 text-outgoing" strokeWidth={1.75} />
                        <span>Queued for parser execution</span>
                      </span>
                    )}

                    {analysis.status === 'fetching' && (
                      <span className="flex items-center gap-1.5 text-[11px] text-accent">
                        <Loader2 className="h-3 w-3 animate-spin text-accent" strokeWidth={2} />
                        <span>Fetching repository archive...</span>
                      </span>
                    )}

                    {analysis.status === 'failed' && (
                      <span
                        className="flex items-center gap-1.5 truncate text-[11px] text-red-400"
                        title={analysis.error_message ?? 'Analysis failed'}
                      >
                        <AlertCircle className="h-3 w-3 text-red-400 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{analysis.error_message ?? 'Analysis failed'}</span>
                      </span>
                    )}
                  </div>

                  {/* Age */}
                  <div className="col-span-2 text-right font-mono text-[11px] text-foreground-muted">
                    {formatRelativeTime(analysis.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DbAnalysis['status'] }) {
  switch (status) {
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-incoming/30 bg-incoming/10 px-2 py-0.5 font-mono text-[10px] text-incoming">
          <CheckCircle2 className="h-2.5 w-2.5 text-incoming" strokeWidth={2} />
          ready
        </span>
      );
    case 'parsing':
      return (
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
          <Loader2 className="h-2.5 w-2.5 animate-spin text-accent" strokeWidth={2} />
          parsing
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-outgoing/30 bg-outgoing/10 px-2 py-0.5 font-mono text-[10px] text-outgoing">
          <Clock className="h-2.5 w-2.5 text-outgoing" strokeWidth={2} />
          pending
        </span>
      );
    case 'fetching':
      return (
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
          <Loader2 className="h-2.5 w-2.5 animate-spin text-accent" strokeWidth={2} />
          fetching
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-[10px] text-red-400">
          <AlertCircle className="h-2.5 w-2.5 text-red-400" strokeWidth={2} />
          failed
        </span>
      );
    default:
      return null;
  }
}

