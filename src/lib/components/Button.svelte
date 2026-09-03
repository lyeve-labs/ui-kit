<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import Spinner from './Spinner.svelte';

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

  const variants: Record<Variant, string> = {
    primary: 'bg-brand text-ink hover:bg-brand-light active:bg-brand shadow-sm shadow-brand/20',
    violet:
      'bg-violet text-ink hover:brightness-110 active:brightness-100 shadow-sm shadow-violet/20',
    secondary: 'bg-surface-2 text-fg border border-line-strong hover:bg-line',
    danger: 'bg-danger text-ink hover:brightness-110 active:brightness-100',
    ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
    outline: 'border border-line-strong text-fg hover:border-brand hover:text-brand',
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

  // Reject javascript: and data: URIs - only allow standard schemes and relative URLs.
  let safeHref = $derived(href && !/^(javascript|data):/i.test(href) ? href : undefined);

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
    href={inert ? undefined : safeHref}
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
