import { describe, expect, it } from 'vitest';
import * as kit from './index.js';

// Every component the package documents as public. Guards against an accidental
// dropped/renamed re-export in index.ts (the sole entry point consumers use).
const COMPONENTS = [
  // Layout & structure
  'Card',
  'PageHeader',
  'Divider',
  'Accordion',
  'AccordionItem',
  'Table',
  // Forms & inputs
  'Button',
  'ButtonGroup',
  'Input',
  'Textarea',
  'NumberInput',
  'SearchInput',
  'FileInput',
  'Label',
  'Select',
  'MultiSelect',
  'Autocomplete',
  'DatePicker',
  'Checkbox',
  'Radio',
  'RadioGroup',
  'Toggle',
  // Navigation
  'Breadcrumb',
  'Tabs',
  'Pagination',
  'StepIndicator',
  'Dropdown',
  // Overlays
  'Modal',
  'Drawer',
  'Tooltip',
  // Feedback & status
  'Alert',
  'Banner',
  'Badge',
  'Tag',
  'Indicator',
  'Progress',
  'Spinner',
  'Skeleton',
  'EmptyState',
  'Stat',
  'Kbd',
  // Media
  'Avatar',
  'AvatarGroup',
  // Theming & toasts
  'ThemeToggle',
  'Toaster',
  // Dialogs
  'DialogContainer',
  'Dialog',
  'ConfirmDialog',
] as const;

const FUNCTIONS = [
  'cn',
  'getTheme',
  'setTheme',
  'toggleTheme',
  'themeBootScript',
  'openDialog',
  'closeDialog',
  'dismissDialog',
  'dismissAllDialogs',
  'confirm',
  'setDialogMeta',
  'getDialogStack',
] as const;

type KitKey = keyof typeof kit;

describe('public API surface (@lyeve/ui-kit)', () => {
  it.each(COMPONENTS)('exports the %s component as a Svelte component', (name) => {
    expect(kit).toHaveProperty(name);
    // Svelte 5 components compile to functions.
    expect(typeof kit[name as KitKey]).toBe('function');
  });

  it.each(FUNCTIONS)('exports %s as a function', (name) => {
    expect(typeof kit[name as KitKey]).toBe('function');
  });

  it('exports the toast store singleton with its tone helpers', () => {
    expect(kit.toast).toBeTypeOf('object');
    for (const method of ['push', 'dismiss', 'info', 'success', 'warn', 'error'] as const) {
      expect(typeof kit.toast[method]).toBe('function');
    }
  });

  it('exports the current VERSION string', () => {
    expect(kit.VERSION).toBe('0.8.1');
  });

  it('exposes no fewer than the documented component count', () => {
    // 48 primitives + dialog components at time of writing.
    expect(COMPONENTS.length).toBe(48);
    for (const name of COMPONENTS) {
      expect(kit, `missing export: ${name}`).toHaveProperty(name);
    }
  });
});
