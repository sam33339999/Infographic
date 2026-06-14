import type { TemplateOptions } from './types';

const base = { type: 'c4', rankdir: 'TB' } as const;

export const c4Templates: Record<string, TemplateOptions> = {
  'c4-simple': {
    design: { title: 'default', structure: base, item: { type: 'simple' } },
  },
  'c4-compact-card': {
    design: { title: 'default', structure: base, item: { type: 'compact-card' } },
  },
  'c4-lr-simple': {
    design: { title: 'default', structure: { ...base, rankdir: 'LR' }, item: { type: 'simple' } },
  },
};
