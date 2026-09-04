import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as kit from './index.js';

// Every component the package documents as public. Guards against an accidental
// dropped/renamed re-export in index.ts (the sole entry point consumers use).
const COMPONENTS = [
  // Layout & structure
  'Card',
  'Panel',
  'PageShell',
  'PageHeader',
  'SectionHeading',
  'Divider',
  'Accordion',
  'AccordionItem',
  'Collapsible',
  'Table',
  'DescriptionList',
  'Toolbar',
  'TreeView',
  // Forms & inputs
  'Button',
  'ButtonGroup',
  'Input',
  'PasswordInput',
  'Textarea',
  'NumberInput',
  'SearchInput',
  'FileInput',
  'Label',
  'Field',
  'FormMessage',
  'SegmentedControl',
  'Select',
  'MultiSelect',
  'Autocomplete',
  'DatePicker',
  'TimePicker',
  'DateTimePicker',
  'Checkbox',
  'CheckboxGroup',
  'Radio',
  'RadioGroup',
  'Toggle',
  // Navigation
  'Breadcrumb',
  'Tabs',
  'Pagination',
  'StepIndicator',
  'Dropdown',
  'SidebarNav',
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
  'CopyButton',
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

describe('public API surface (@lyeve-labs/ui-kit)', () => {
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

  it('exports the VERSION that package.json declares', () => {
    // Resolved from the runner's cwd, the package root, because the jsdom
    // environment hands modules an http import.meta.url that readFileSync rejects.
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    expect(kit.VERSION).toBe(pkg.version);
  });

  it('exports every component the list names', () => {
    for (const name of COMPONENTS) {
      expect(kit, `missing export: ${name}`).toHaveProperty(name);
    }
  });

  it('names every component it exports', () => {
    // The list used to be checked in one direction only, against a hardcoded
    // count. A component added to index.ts and not to the list was exported,
    // untested and invisible, and the count had to be hand-edited on every
    // change, which is a step that gets skipped. Comparing the two sets makes
    // the list complete by construction and retires the magic number.
    const exported = Object.keys(kit)
      .filter((name) => !FUNCTIONS.includes(name as (typeof FUNCTIONS)[number]))
      .filter((name) => name !== 'VERSION' && name !== 'toast')
      .sort();
    expect(exported).toEqual([...COMPONENTS].sort());
  });
});
