<script lang="ts">
  /**
   * The copy icon that turns into a check.
   *
   * Both icons stay mounted in one grid cell and cross over in place, so the
   * control never changes width and the change reads as the same button
   * confirming rather than a new one arriving. The arriving icon eases in on
   * the base rung and the leaving one goes a rung faster, as every exit does.
   */
  import { Check, Copy } from '@lucide/svelte';

  interface Props {
    copied: boolean;
    size: number;
  }

  let { copied, size }: Props = $props();

  const SHOWN = 'scale-100 opacity-100 duration-base ease-enter';
  const HIDDEN = 'scale-50 opacity-0 duration-fast ease-exit';
</script>

<span class="grid place-items-center" data-copy-state={copied ? 'copied' : 'idle'} aria-hidden="true">
  <Copy {size} class="col-start-1 row-start-1 transition-[opacity,transform] {copied ? HIDDEN : SHOWN}" />
  <Check
    {size}
    class="col-start-1 row-start-1 text-success transition-[opacity,transform] {copied ? SHOWN : HIDDEN}"
  />
</span>
