<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import Spinner from './Spinner.svelte';
  import { safeHref } from '../internal/href.js';

  type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'violet';
  type Size = 'sm' | 'md' | 'lg';

  /**
   * Attributes forwarded to whichever element renders. Naming them, rather than
   * accepting an open index signature, means a prop the component does not
   * define fails the build instead of reaching the DOM as a stray attribute.
   */
  type Forwarded = Omit<
    HTMLButtonAttributes & HTMLAnchorAttributes,
    'type' | 'href' | 'disabled' | 'class' | 'onclick' | 'children'
  >;

  interface Props extends Forwarded {
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    href?: string;
    full?: boolean;
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    href = undefined,
    full = false,
    class: klass = '',
    onclick,
    children,
    ...rest
  }: Props = $props();

  /**
   * Colour per variant, in three states: at rest, under a pointer, and held.
   *
   * The pressed step is the one a touch screen depends on. `hover:` compiles
   * inside `@media (hover: hover)`, which is false on a finger, so a tap ran
   * rest to rest with the action already fired and the control never
   * acknowledged the press. `active:` matches under a finger as well as under a
   * mouse, and Tailwind emits it after `hover:` at equal specificity, so the
   * held colour wins on a device that has both.
   *
   * primary and violet had a pressed state already and neither one showed:
   * `active:bg-brand` on a `bg-brand` button and `active:brightness-100` on an
   * unfiltered one are both the resting appearance spelled twice.
   *
   * Every pressed step moves the same way in both palettes. brand-deep sits
   * below brand-light on the dark ramp and below it again on the light one, and
   * the filtered variants darken rather than brighten, so a press does not read
   * as one gesture in one theme and its opposite in the other.
   */
  const variants: Record<Variant, string> = {
    primary:
      'bg-brand text-ink hover:bg-brand-light active:bg-brand-deep shadow-sm shadow-brand/20',
    violet:
      'bg-violet text-ink hover:brightness-110 active:brightness-90 shadow-sm shadow-violet/20',
    secondary:
      'bg-surface-2 text-fg border border-line-strong hover:bg-line active:bg-line-strong/30',
    danger: 'bg-danger text-ink hover:brightness-110 active:brightness-90',
    ghost: 'text-muted hover:bg-surface-2 hover:text-fg active:bg-line active:text-fg',
    outline:
      'border border-line-strong text-fg hover:border-brand hover:text-brand active:bg-brand/10',
  };

  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-md',
    md: 'px-4 py-2 text-sm gap-2 rounded-lg',
    lg: 'px-5 py-2.5 text-base gap-2 rounded-lg',
  };

  const spinnerSize = $derived(size === 'lg' ? 18 : 15);
  const cls = $derived(
    `inline-flex items-center justify-center font-medium transition-colors duration-150 ` +
      `disabled:opacity-50 disabled:cursor-not-allowed select-none ` +
      `${full ? 'w-full' : ''} ${variants[variant]} ${sizes[size]} ${klass}`,
  );

  // Only standard schemes and relative URLs reach the DOM. The rule itself
  // lives in internal/href.ts, because Pagination applies the same one to the
  // hrefs its caller builds and two copies of it would drift.
  let resolvedHref = $derived(safeHref(href));

  /**
   * An anchor has no `disabled`. The prop was accepted and then dropped on this
   * branch, so `<Button href="..." disabled>` rendered a link that looked
   * ordinary and navigated on click, and `disabled:opacity-50` never matched
   * because that pseudo-class does not apply to `a`. Dropping the href is what
   * actually takes it out of the tab order and stops activation.
   */
  const inert = $derived(disabled || loading);
</script>

{#if href}
  <a
    href={inert ? undefined : resolvedHref}
    class="{cls} {inert ? 'pointer-events-none opacity-50' : ''}"
    aria-disabled={inert ? 'true' : undefined}
    tabindex={inert ? -1 : undefined}
    {...rest}
  >
    {#if loading}<Spinner size={spinnerSize} />{/if}
    {@render children()}
  </a>
{:else}
  <button
    {type}
    disabled={disabled || loading}
    aria-busy={loading ? 'true' : undefined}
    {onclick}
    class={cls}
    {...rest}
  >
    {#if loading}<Spinner size={spinnerSize} />{/if}
    {@render children()}
  </button>
{/if}
