import type { TemplateOptions } from './types';

export const kanbanTemplates: Record<string, TemplateOptions> = {
  'kanban-simple': {
    design: {
      title: 'default',
      structure: { type: 'kanban' },
      item: { type: 'simple' },
    },
  },
  'kanban-compact-card': {
    design: {
      title: 'default',
      structure: { type: 'kanban' },
      item: { type: 'compact-card' },
    },
  },
  'kanban-badge-card': {
    design: {
      title: 'default',
      structure: { type: 'kanban' },
      item: { type: 'badge-card' },
    },
  },
};
