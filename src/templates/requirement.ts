import type { TemplateOptions } from './types';

const base = { type: 'requirement', rankdir: 'TB' } as const;

export const requirementTemplates: Record<string, TemplateOptions> = {
  'requirement-simple': {
    design: { title: 'default', structure: base, item: { type: 'simple' } },
  },
  'requirement-compact-card': {
    design: { title: 'default', structure: base, item: { type: 'compact-card' } },
  },
  'requirement-lr-simple': {
    design: { title: 'default', structure: { ...base, rankdir: 'LR' }, item: { type: 'simple' } },
  },
};
