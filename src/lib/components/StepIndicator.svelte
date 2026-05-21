<script lang="ts">
  interface Step {
    label: string;
    description?: string;
  }

  interface Props {
    steps: Step[];
    current: number; // 1-based
    orientation?: 'horizontal' | 'vertical';
    class?: string;
  }

  let { steps, current, orientation = 'horizontal', class: cls = '' }: Props = $props();
</script>

{#if orientation === 'horizontal'}
  <nav aria-label="Progress" class="w-full {cls}">
    <ol class="flex items-start">
      {#each steps as step, i}
        {@const idx = i + 1}
        {@const done = idx < current}
        {@const active = idx === current}
        <li class="flex flex-1 flex-col items-center">
          <div class="flex w-full items-center">
            <!-- Left connector -->
            <div class="flex-1 {i === 0 ? '' : done || active ? 'bg-brand' : 'bg-line'} h-px transition-colors"></div>

            <!-- Step circle -->
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2
                font-bold text-sm transition-all
                {done
                  ? 'border-brand bg-brand text-ink'
                  : active
                    ? 'border-brand bg-surface text-brand'
                    : 'border-line bg-surface text-faint'}"
            >
              {#if done}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  aria-hidden="true"
                ><path d="M20 6L9 17l-5-5" /></svg>
              {:else}{idx}{/if}
            </div>

            <!-- Right connector -->
            <div class="flex-1 {i === steps.length - 1 ? '' : done ? 'bg-brand' : 'bg-line'} h-px transition-colors"></div>
          </div>

          <div class="mt-2 px-1 text-center">
            <p class="text-xs font-medium {active ? 'text-fg' : done ? 'text-muted' : 'text-faint'} transition-colors">
              {step.label}
            </p>
            {#if step.description}
              <p class="mt-0.5 text-[10px] text-faint">{step.description}</p>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  </nav>
{:else}
  <nav aria-label="Progress" class={cls}>
    <ol class="flex flex-col">
      {#each steps as step, i}
        {@const idx = i + 1}
        {@const done = idx < current}
        {@const active = idx === current}
        <li class="flex gap-4">
          <div class="flex flex-col items-center">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2
                font-bold text-sm transition-all
                {done
                  ? 'border-brand bg-brand text-ink'
                  : active
                    ? 'border-brand bg-surface text-brand'
                    : 'border-line bg-surface text-faint'}"
            >
              {#if done}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  aria-hidden="true"
                ><path d="M20 6L9 17l-5-5" /></svg>
              {:else}{idx}{/if}
            </div>
            {#if i < steps.length - 1}
              <div class="my-1 w-px flex-1 {done ? 'bg-brand/40' : 'bg-line'} transition-colors"></div>
            {/if}
          </div>
          <div class="pb-6 pt-1">
            <p class="text-sm font-medium {active ? 'text-fg' : done ? 'text-muted' : 'text-faint'} transition-colors">
              {step.label}
            </p>
            {#if step.description}
              <p class="mt-0.5 text-xs text-faint">{step.description}</p>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  </nav>
{/if}
