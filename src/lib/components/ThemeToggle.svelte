<script lang="ts">
  /**
   * The control that picks the palette.
   *
   * Three states, not two. It offered `dark` and `light` and had no way to say
   * "whatever the operating system is on", which is the state a reader who
   * already answered that question at the OS level expects to find, and the
   * reason one console shipped its own copy of this file rather than adopt it.
   *
   * One button rather than three radios: it sits in the header bar of every
   * authed screen in three applications, next to the account menu, and a
   * segmented control there costs the width of the section name beside it. The
   * cost of the cycle is that the button's name has to carry the current state
   * as well as the action, because with three states the action no longer
   * implies the state.
   */
  import { Monitor, Moon, Sun } from '@lucide/svelte';
  import {
    THEME_PREFERENCES,
    getThemePreference,
    nextThemePreference,
    setThemePreference,
    watchSystemTheme,
    type ThemePreference,
  } from '../utils/theme.js';

  interface Props {
    /**
     * Which preferences to offer, in the order the button cycles through them.
     *
     * A surface that must not offer `system` - a screen printed to a fixed
     * palette, a kiosk - passes `['light', 'dark']` and gets the two-state
     * control back with no other change.
     */
    order?: readonly ThemePreference[];
    class?: string;
  }

  let { order = THEME_PREFERENCES, class: klass = '' }: Props = $props();

  /**
   * `system` until the browser says otherwise, which is what an unanswered
   * question resolves to. The server cannot read storage or the OS, so a
   * hardcoded `dark` here would render the wrong icon on every light-OS
   * reader's first paint.
   */
  let preference = $state<ThemePreference>('system');

  $effect(() => {
    preference = getThemePreference();
  });

  /**
   * A reader on `system` whose OS flips at dusk gets the new palette without
   * touching anything. Without this the preference is honoured once, at load,
   * and reads as ignored for the rest of the session.
   */
  $effect(() =>
    watchSystemTheme(() => {
      if (preference === 'system') setThemePreference('system');
    }),
  );

  const upcoming = $derived(nextThemePreference(preference, order));

  const LABEL: Record<ThemePreference, string> = {
    light: 'light',
    dark: 'dark',
    system: 'system',
  };

  function advance() {
    preference = upcoming;
    setThemePreference(preference);
  }
</script>

<button
  type="button"
  onclick={advance}
  data-print="hide"
  data-theme-preference={preference}
  aria-label="Theme: {LABEL[preference]}. Switch to {LABEL[upcoming]}."
  class="rounded-lg p-2 text-faint transition-colors duration-150 hover:bg-surface-2 hover:text-fg {klass}"
>
  <!-- The icon shows the state the control is in, not the one it moves to. It
       showed the destination while the label named the same destination, which
       said the action twice and the state not at all. -->
  {#if preference === 'system'}
    <Monitor size={16} aria-hidden="true" />
  {:else if preference === 'dark'}
    <Moon size={16} aria-hidden="true" />
  {:else}
    <Sun size={16} aria-hidden="true" />
  {/if}
</button>
