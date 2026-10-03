import type { ParsedFile } from '@/lib/parser/types';

export interface FileCategory {
  id: string;
  name: string;
  count: number;
  color: string;
  swatchClass: string;
}

/**
 * Derives architectural categories of files for the left rail.
 * Spec: "The left rail lists categories of file — a colour swatch, a name, and how many files are in it.
 * Nothing happens when you click one yet."
 */
export function deriveFileCategories(files: ParsedFile[]): FileCategory[] {
  const counts: Record<string, number> = {
    source: 0,
    router: 0,
    adapter: 0,
    client: 0,
    test: 0,
    config: 0,
    types: 0,
  };

  for (const file of files) {
    const p = file.path.toLowerCase();
    if (p.includes('.test.') || p.includes('.spec.') || p.includes('/test/') || p.includes('/__tests__/')) {
      counts.test++;
    } else if (p.includes('/router') || p.includes('router.') || p.includes('/routes/')) {
      counts.router++;
    } else if (p.includes('/adapter') || p.includes('adapter.')) {
      counts.adapter++;
    } else if (p.startsWith('client') || p.includes('/client/')) {
      counts.client++;
    } else if (file.extension === '.d.ts' || p.includes('/types') || p.endsWith('types.ts')) {
      counts.types++;
    } else if (p.includes('.config.') || p.endsWith('.json') || p.endsWith('.yaml') || p.endsWith('.yml')) {
      counts.config++;
    } else {
      counts.source++;
    }
  }

  const categories: FileCategory[] = [
    {
      id: 'source',
      name: 'Source & Core',
      count: counts.source,
      color: '#3b82f6', // blue
      swatchClass: 'bg-blue-500',
    },
    {
      id: 'router',
      name: 'Routers & Procedures',
      count: counts.router,
      color: '#8b5cf6', // purple
      swatchClass: 'bg-purple-500',
    },
    {
      id: 'adapter',
      name: 'Adapters & Transports',
      count: counts.adapter,
      color: '#06b6d4', // cyan
      swatchClass: 'bg-cyan-500',
    },
    {
      id: 'client',
      name: 'Client & SDK',
      count: counts.client,
      color: '#10b981', // emerald
      swatchClass: 'bg-emerald-500',
    },
    {
      id: 'test',
      name: 'Tests & Fixtures',
      count: counts.test,
      color: '#f59e0b', // amber
      swatchClass: 'bg-amber-500',
    },
    {
      id: 'types',
      name: 'Types & Interfaces',
      count: counts.types,
      color: '#ec4899', // pink
      swatchClass: 'bg-pink-500',
    },
  ];

  if (counts.config > 0) {
    categories.push({
      id: 'config',
      name: 'Configurations',
      count: counts.config,
      color: '#64748b', // slate
      swatchClass: 'bg-slate-500',
    });
  }

  return categories.filter((c) => c.count > 0);
}
