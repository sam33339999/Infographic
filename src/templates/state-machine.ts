// src/templates/state-machine.ts
import type { TemplateOptions } from './types';

const base = { type: 'state-machine', rankdir: 'TB' } as const;

export const stateMachineTemplates: Record<string, TemplateOptions> = {
  'state-machine-simple': {
    design: { title: 'default', structure: base, item: { type: 'simple' } },
  },
  'state-machine-badge-card': {
    design: { title: 'default', structure: base, item: { type: 'badge-card' } },
  },
  'state-machine-compact-card': {
    design: { title: 'default', structure: base, item: { type: 'compact-card' } },
  },
  'state-machine-lr-simple': {
    design: { title: 'default', structure: { ...base, rankdir: 'LR' }, item: { type: 'simple' } },
  },
};
