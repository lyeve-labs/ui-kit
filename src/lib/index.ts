/**
 * @lyeve-labs/ui-kit - public API.
 *
 * Every component, utility, and store the library exposes is re-exported
 * from this single entry point. Consumers should import from
 * `'@lyeve-labs/ui-kit'` and never reach into deep paths - the directory layout
 * is an implementation detail.
 */

// ── Layout & structure ─────────────────────────────────────────────────────
export { default as Card } from './components/Card.svelte';
export { default as PageHeader } from './components/PageHeader.svelte';
export { default as Divider } from './components/Divider.svelte';
export { default as Accordion } from './components/Accordion.svelte';
export { default as AccordionItem } from './components/AccordionItem.svelte';
export { default as Table } from './components/Table.svelte';

// ── Forms & inputs ─────────────────────────────────────────────────────────
export { default as Button } from './components/Button.svelte';
export { default as ButtonGroup } from './components/ButtonGroup.svelte';
export { default as Input } from './components/Input.svelte';
export { default as Textarea } from './components/Textarea.svelte';
export { default as NumberInput } from './components/NumberInput.svelte';
export { default as SearchInput } from './components/SearchInput.svelte';
export { default as FileInput } from './components/FileInput.svelte';
export { default as Label } from './components/Label.svelte';
export { default as Select } from './components/Select.svelte';
export { default as MultiSelect } from './components/MultiSelect.svelte';
export { default as Autocomplete } from './components/Autocomplete.svelte';
export { default as DatePicker } from './components/DatePicker.svelte';
export { default as Checkbox } from './components/Checkbox.svelte';
export { default as Radio } from './components/Radio.svelte';
export { default as RadioGroup } from './components/RadioGroup.svelte';
export { default as Toggle } from './components/Toggle.svelte';

// ── Navigation ─────────────────────────────────────────────────────────────
export { default as Breadcrumb } from './components/Breadcrumb.svelte';
export { default as Tabs } from './components/Tabs.svelte';
export { default as Pagination } from './components/Pagination.svelte';
export { default as StepIndicator } from './components/StepIndicator.svelte';
export { default as Dropdown } from './components/Dropdown.svelte';

// ── Overlays ───────────────────────────────────────────────────────────────
export { default as Modal } from './components/Modal.svelte';
export { default as Drawer } from './components/Drawer.svelte';
export { default as Tooltip } from './components/Tooltip.svelte';

// ── Feedback & status ──────────────────────────────────────────────────────
export { default as Alert } from './components/Alert.svelte';
export { default as Banner } from './components/Banner.svelte';
export { default as Badge } from './components/Badge.svelte';
export { default as Tag } from './components/Tag.svelte';
export { default as Indicator } from './components/Indicator.svelte';
export { default as Progress } from './components/Progress.svelte';
export { default as Spinner } from './components/Spinner.svelte';
export { default as Skeleton } from './components/Skeleton.svelte';
export { default as EmptyState } from './components/EmptyState.svelte';
export { default as Stat } from './components/Stat.svelte';
export { default as Kbd } from './components/Kbd.svelte';

// ── Media ──────────────────────────────────────────────────────────────────
export { default as Avatar } from './components/Avatar.svelte';
export { default as AvatarGroup } from './components/AvatarGroup.svelte';

// ── Theming & toasts ───────────────────────────────────────────────────────
export { default as ThemeToggle } from './components/ThemeToggle.svelte';
export { default as Toaster } from './components/Toaster.svelte';

// ── Stores ─────────────────────────────────────────────────────────────────
export { toast } from './stores/toast.svelte.js';
export type { Toast, ToastTone } from './stores/toast.svelte.js';

// ── Dialogs (imperative stack: openDialog / confirm) ────────────────────────
export { default as DialogContainer } from './components/dialog/DialogContainer.svelte';
export { default as Dialog } from './components/dialog/Dialog.svelte';
export { default as ConfirmDialog } from './components/dialog/ConfirmDialog.svelte';
export {
  openDialog,
  closeDialog,
  dismissDialog,
  dismissAllDialogs,
  confirm,
  setDialogMeta,
  getDialogStack,
} from './components/dialog/dialog-manager.svelte.js';
export type { DialogOptions, DialogEntry, DialogSize } from './components/dialog/types.js';

// ── Utilities ──────────────────────────────────────────────────────────────
export { cn, type ClassValue } from './utils/cn.js';
export { getTheme, setTheme, toggleTheme, themeBootScript, type Theme } from './utils/theme.js';

// ── Version ────────────────────────────────────────────────────────────────
// Generated from package.json by `pnpm version:sync`. Bump package.json, never
// this line; the build and the test suite fail when the two disagree.
export const VERSION = '0.9.4';
