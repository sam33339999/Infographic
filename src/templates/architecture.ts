import type { TemplateOptions } from './types';

const base = {
  type: 'architecture',
  showBoundary: true,
  rankdir: 'LR',
} as const;

export const architectureTemplates: Record<string, TemplateOptions> = {
  'architecture-simple-circle-node': {
    design: { title: 'default', structure: base, item: { type: 'simple-circle-node' } },
  },
  'architecture-badge-card': {
    design: { title: 'default', structure: base, item: { type: 'badge-card' } },
  },
  'architecture-compact-card': {
    design: { title: 'default', structure: base, item: { type: 'compact-card' } },
  },
  'architecture-tb-simple-circle-node': {
    design: { title: 'default', structure: { ...base, rankdir: 'TB' }, item: { type: 'simple-circle-node' } },
  },
};
