<script lang="ts">
  // A page that reveals its content in a stagger: one block plays an entrance
  // after a delay, and one fades in on a delayed transition once it is shown.
  let shown = $state(false);
</script>

<button type="button" onclick={() => (shown = true)}>Show</button>
<p
  data-testid="enters"
  class="animate-popover-in [animation-delay:600ms] [animation-fill-mode:both]"
>
  Staggered entrance
</p>
<p
  data-testid="fades"
  class="transition-opacity [transition-delay:600ms] {shown ? 'opacity-100' : 'opacity-0'}"
>
  Delayed fade
</p>
