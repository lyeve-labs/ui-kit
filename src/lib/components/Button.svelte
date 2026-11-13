<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { on } from 'svelte/events';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import Spinner from './Spinner.svelte';
  import Tooltip from './Tooltip.svelte';
  import { safeHref } from '../internal/href.js';
  import { TOUCH_GROW } from '../internal/touch.js';

  type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'violet';
  type Size = 'sm' | 'md' | 'lg' | 'icon';

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
    /**
     * The words shown on hover and focus. Defaults to the button's own
     * aria-label, so an icon-only button names itself to a sighted reader the
     * way it already does to a screen reader. A string replaces those words,
     * and `false` keeps the button silent.
     */
    hint?: string | false;
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
    hint = undefined,
    class: klass = '',
    onclick,
    children,
    ...rest
  }: Props = $props();

  /** The hint text, or nothing: an explicit string, else the aria-label, unless switched off. */
  const hintText = $derived(
    hint === false ? undefined : (hint ?? (rest['aria-label'] || undefined)),
  );

  /**
   * Color per variant, in three states: at rest, under a pointer, and held.
   *
   * The pressed step is the one a touch screen depends on. `hover:` compiles
   * inside `@media (hover: hover)`, which is false on a finger, so a tap ran
   * rest to rest with the action already fired and the control never
   * acknowledged the press. `active:` matches under a finger as well as under a
   * mouse, and Tailwind emits it after `hover:` at equal specificity, so the
   * held color wins on a device that has both.
   *
   * primary and violet had a pressed state already and neither one showed:
   * `active:bg-brand` on a `bg-brand` button and `active:brightness-100` on an
   * unfiltered one are both the resting appearance spelled twice.
   *
   * Every pressed step moves the same way in both palettes. brand-deep sits
   * below brand-light on the dark ramp and below it again on the light one, and
   * the filtered variants darken rather than brighten, so a press does not read
   * as one gesture in one theme and its opposite in the other.
   *
   * Chromium matches :active on a natively disabled button while it is held,
   * and a loading button stays enabled, so every pressed step waits for both
   * `not-disabled` and `not-aria-disabled`. A held disabled or loading button
   * showing its pressed color read as a press accepted. `enabled:` would not
   * do, because :enabled never matches the link variant.
   *
   * The filled and secondary variants are raised: a bright edge along the top
   * and a short drop under them. The primary action is marked by its fill
   * alone, with no pool of light around it: a glow under the one bright
   * button on a screen read as glare. Its fill is lifted, white falling off
   * faintly from the top over the brand color, and the hover and held colors
   * change under the lift. The shadow stays the same in every state, so the
   * color change carries the state, which also holds where shadows and
   * gradients are not drawn.
   *
   * A filled button's boundary is its fill, and a forced colors scheme
   * replaces the fill with the canvas, so the button read as loose text.
   * There it draws an outline in the button text color, inset by its own
   * width. An outline takes no space, so nothing moves, and the focus
   * outline in theme.css replaces it while the button has focus.
   */
  const FILLED_EDGE =
    'forced-colors:outline-solid forced-colors:outline-1 forced-colors:-outline-offset-1 ' +
    'forced-colors:outline-[color:ButtonText] forced-colors:disabled:outline-[color:GrayText] ' +
    'forced-colors:aria-disabled:outline-[color:GrayText]';

  /*
   * Every variant carries a 1px border, transparent where it draws none, so
   * every variant at one size is one height. Only the outlined variants had
   * one, and a filled button drew 2px shorter than a secondary button beside
   * it. The lift starts at the border edge, or its gradient would repeat into
   * the bottom pixel as a light line.
   *
   * The secondary and outline borders are the soft line a card draws. The
   * label marks the button, so SC 1.4.11 asks nothing of its edge, and
   * line-strong drew a gray frame round every one.
   */
  const variants: Record<Variant, string> = {
    primary:
      'bg-brand bg-lift bg-origin-border text-ink border border-transparent hover:bg-brand-light ' +
      `not-disabled:not-aria-disabled:active:bg-brand-deep inset-shadow-bevel shadow-raised ${FILLED_EDGE}`,
    violet: `bg-violet text-ink hover:brightness-110 not-disabled:not-aria-disabled:active:brightness-90 border border-transparent inset-shadow-bevel shadow-raised ${FILLED_EDGE}`,
    secondary:
      'bg-surface-2 text-fg border border-line hover:bg-line not-disabled:not-aria-disabled:active:bg-line-strong/30 inset-shadow-highlight shadow-raised',
    danger: `bg-danger text-ink hover:brightness-110 not-disabled:not-aria-disabled:active:brightness-90 border border-transparent inset-shadow-bevel shadow-raised ${FILLED_EDGE}`,
    ghost:
      'text-muted border border-transparent hover:bg-surface-2 hover:text-fg not-disabled:not-aria-disabled:active:bg-line not-disabled:not-aria-disabled:active:text-fg',
    outline:
      'border border-line text-fg hover:border-brand hover:text-brand not-disabled:not-aria-disabled:active:bg-brand/10',
  };

  /*
   * `icon` is a square for a button whose only content is an icon: the icon
   * sets the size and the box adds 8px round it, 7px of padding and the 1px
   * border, so a 16px icon makes the 32px
   * square the header controls use. Without it, an icon-only control beside
   * ThemeToggle had to copy ThemeToggle's classes, and every copy drifted on
   * its own. Name the button with `aria-label`, which also becomes its hint.
   */
  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-md',
    md: 'px-4 py-2 text-sm gap-2 rounded-lg',
    lg: 'px-5 py-2.5 text-base gap-2 rounded-lg',
    icon: 'p-1.75 rounded-lg',
  };

  const spinnerSize = $derived(size === 'lg' ? 16 : 14);
  /*
   * whitespace-nowrap: a label never breaks inside itself. Under a Table's
   * `overflow-wrap: anywhere` a two-word ghost button in a flex row rendered
   * on two lines, and a status badge beside it as `dra ft`. A caller that
   * caps the width wraps its label in a `truncate` span. The button cannot
   * do that for it, because the label and any icon before it are flex items
   * and text-overflow does not reach into one.
   *
   * TOUCH_GROW: under a coarse pointer the button takes the control height,
   * which is 44px there, so a button and the input beside it grow together.
   * A mouse sees 34px, 38px and 46px by size, md level with the 38px
   * control height, and an icon-only button its icon plus 16px.
   *
   * aria-disabled: a loading button stays enabled and is marked this way, so
   * it draws the way a disabled one does. In forced colors the browser draws
   * a natively disabled button in GrayText and does nothing for
   * aria-disabled, so the label and the border take GrayText here.
   */
  const cls = $derived(
    `inline-flex items-center justify-center font-medium whitespace-nowrap ` +
      `transition-colors ` +
      `disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 ` +
      `aria-disabled:cursor-not-allowed forced-colors:aria-disabled:text-[color:GrayText] ` +
      `forced-colors:aria-disabled:border-[color:GrayText] select-none ${TOUCH_GROW} ` +
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
   *
   * Loading is not disabled. A browser moves focus off a control that turns
   * disabled or loses its href, which left a person who pressed the button
   * from the keyboard on the page body while the action ran. A loading
   * control keeps its focus and refuses activation here instead. A click,
   * Enter and Space all arrive as a click, and so does the Enter in a field
   * that submits a form through its submit button, so canceling the click
   * also stops a second submit.
   *
   * The guard listens on the element. Svelte delegates a declared onclick to
   * the root, so an ancestor that stopped the click on its way up kept the
   * guard from running and the form submitted again.
   */
  const inert = $derived(disabled || loading);

  const activate: Attachment<HTMLElement> = (node) =>
    on(node, 'click', (e) => {
      if (inert) {
        e.preventDefault();
        return;
      }
      onclick?.(e);
    });
</script>

{#snippet control()}
  {#if href}
    <a
      href={disabled ? undefined : resolvedHref}
      class="{cls} {inert ? 'pointer-events-none opacity-50' : ''}"
      aria-disabled={inert ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      tabindex={disabled ? -1 : undefined}
      {@attach activate}
      {...rest}
    >
      {#if loading}<Spinner size={spinnerSize} />{/if}
      {@render children()}
    </a>
  {:else}
    <button
      {type}
      {disabled}
      aria-disabled={loading ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      {@attach activate}
      class={cls}
      {...rest}
    >
      {#if loading}<Spinner size={spinnerSize} />{/if}
      {@render children()}
    </button>
  {/if}
{/snippet}

<!-- The hint repeats the name, so it does not describe the control a second
     time. The aria-label already announces it. The wrapper takes the full
     width along with the button, or a full button would shrink to its text. -->
{#if hintText}
  <Tooltip text={hintText} describe={false} class={full ? 'w-full' : ''}>
    {@render control()}
  </Tooltip>
{:else}
  {@render control()}
{/if}
