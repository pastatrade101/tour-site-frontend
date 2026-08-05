<script lang="ts">
  import { Check } from '@lucide/svelte';

  // Shared step rail: numbered circles joined by rules, with the label beneath.
  // Completed steps show a gold ring + tick and can be clicked to go back;
  // the current step is a filled gold disc. Used by every multi-step form so
  // they all read the same.
  export let steps: { key: string; label: string }[] = [];
  export let current = 0;
  /** Called when a COMPLETED step is clicked (going forward stays blocked by validation). */
  export let onStep: ((index: number) => void) | null = null;
  /** `dark` sits on the deep-green panel; `light` on a surface card. */
  export let tone: 'dark' | 'light' = 'dark';

  $: mutedText = tone === 'dark' ? 'text-white/55' : 'text-ink/45';
  $: activeText = tone === 'dark' ? 'text-white' : 'text-heading';
  $: mutedRing = tone === 'dark' ? 'border-white/30 text-white/55' : 'border-ink/20 text-ink/45';
  $: lineIdle = tone === 'dark' ? 'bg-white/20' : 'bg-ink/15';
</script>

<ol class="flex items-start justify-center gap-1 sm:gap-2">
  {#each steps as st, i (st.key)}
    {@const done = i < current}
    {@const active = i === current}
    <li class="flex items-start {i < steps.length - 1 ? 'flex-1' : ''}">
      <div class="flex min-w-0 flex-col items-center gap-2">
        <button
          type="button"
          class={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition ${
            active
              ? 'border-goldfinch-gold bg-goldfinch-gold text-heading'
              : done
                ? 'border-goldfinch-gold text-goldfinch-gold'
                : mutedRing
          } ${done ? 'cursor-pointer' : 'cursor-default'}`}
          disabled={!done}
          aria-current={active ? 'step' : undefined}
          aria-label={`Step ${i + 1}: ${st.label}`}
          on:click={() => done && onStep?.(i)}
        >
          {#if done}<Check size={17} strokeWidth={3} />{:else}{i + 1}{/if}
        </button>
        <span
          class={`max-w-[8rem] text-center text-[10px] font-bold uppercase leading-tight tracking-[0.12em] sm:text-[11px] ${
            active ? activeText : mutedText
          }`}
        >
          {st.label}
        </span>
      </div>

      {#if i < steps.length - 1}
        <span class={`mt-5 h-px flex-1 ${done ? 'bg-goldfinch-gold' : lineIdle}`} aria-hidden="true"></span>
      {/if}
    </li>
  {/each}
</ol>
