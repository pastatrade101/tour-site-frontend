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
  $: currentLabel = steps[current]?.label ?? '';
</script>

<div class="gf-stepper-shell min-w-0 w-full" data-tone={tone}>
  <div class="gf-stepper-content">
    <div class="gf-stepper-current mb-3 flex items-center justify-between gap-3 sm:hidden" data-tone={tone} aria-live="polite">
      <span class={`text-[11px] font-bold uppercase tracking-[0.16em] ${mutedText}`}>
        Step {current + 1} of {steps.length}
      </span>
      <span class={`min-w-0 flex-1 truncate text-right text-sm font-semibold ${activeText}`}>
        {currentLabel}
      </span>
    </div>

    <div class="gf-stepper-scroll -mx-2 flex w-full justify-start overflow-x-auto px-2 pb-1 sm:mx-0 sm:justify-center sm:px-0 sm:pb-0">
      <ol class="flex min-w-max items-start gap-1.5 sm:gap-2">
      {#each steps as st, i (st.key)}
        {@const done = i < current}
        {@const active = i === current}
        <li class="flex shrink-0 items-start">
          <div class="flex min-w-0 flex-col items-center gap-2">
            <button
              type="button"
              class={`gf-step-button grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold sm:h-10 sm:w-10 sm:text-sm ${
                active
                  ? 'border-goldfinch-gold bg-goldfinch-gold text-heading'
                  : done
                    ? 'border-goldfinch-gold text-goldfinch-gold'
                    : mutedRing
              } ${done ? 'cursor-pointer' : 'cursor-default'}`}
              data-active={active}
              data-done={done}
              disabled={!done}
              aria-current={active ? 'step' : undefined}
              aria-label={`Step ${i + 1}: ${st.label}`}
              on:click={() => done && onStep?.(i)}
            >
              {#if done}<Check size={15} strokeWidth={3} />{:else}{i + 1}{/if}
            </button>
            <span
              class={`hidden max-w-[8rem] text-center text-[10px] font-bold uppercase leading-tight tracking-[0.12em] transition-colors duration-300 sm:block sm:text-[11px] ${
                active ? activeText : mutedText
              }`}
            >
              {st.label}
            </span>
          </div>

          {#if i < steps.length - 1}
            <span class="gf-stepper-line mt-4 h-0.5 w-9 shrink-0 overflow-hidden rounded-full sm:mt-5 sm:w-20" data-done={done} aria-hidden="true">
              <span></span>
            </span>
          {/if}
        </li>
      {/each}
      </ol>
    </div>
  </div>
</div>

<style>
  .gf-stepper-shell {
    --gf-step-border: rgb(255 255 255 / 0.11);
    --gf-step-bg: linear-gradient(135deg, rgb(255 255 255 / 0.07), rgb(255 255 255 / 0.025));
    --gf-step-line: rgb(255 255 255 / 0.16);
    --gf-step-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08), 0 18px 40px rgb(0 0 0 / 0.12);
    position: relative;
    overflow: hidden;
    border: 1px solid var(--gf-step-border);
    border-radius: 14px;
    background: var(--gf-step-bg);
    box-shadow: var(--gf-step-shadow);
    padding: 0.75rem;
  }

  .gf-stepper-shell[data-tone='light'] {
    --gf-step-border: rgb(45 48 39 / 0.1);
    --gf-step-bg: linear-gradient(135deg, rgb(255 255 255 / 0.92), rgb(246 241 230 / 0.74));
    --gf-step-line: rgb(45 48 39 / 0.12);
    --gf-step-shadow: 0 14px 32px rgb(57 61 50 / 0.07);
  }

  .gf-stepper-shell::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 18% 0%, rgb(212 175 55 / 0.2), transparent 32%),
      linear-gradient(90deg, transparent, rgb(255 255 255 / 0.055), transparent);
    pointer-events: none;
  }

  .gf-stepper-content {
    position: relative;
    z-index: 1;
  }

  .gf-stepper-current {
    border: 1px solid rgb(255 255 255 / 0.1);
    border-radius: 10px;
    background: rgb(0 0 0 / 0.12);
    padding: 0.6rem 0.7rem;
  }

  .gf-stepper-current[data-tone='light'] {
    border-color: rgb(45 48 39 / 0.1);
    background: rgb(255 255 255 / 0.7);
  }

  .gf-stepper-scroll {
    scrollbar-width: none;
  }

  .gf-stepper-scroll::-webkit-scrollbar {
    display: none;
  }

  .gf-step-button {
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.16);
    transition:
      transform 180ms ease,
      box-shadow 220ms ease,
      border-color 220ms ease,
      background-color 220ms ease,
      color 220ms ease;
  }

  .gf-step-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgb(212 175 55 / 0.14), inset 0 1px 0 rgb(255 255 255 / 0.2);
  }

  .gf-step-button[data-active='true'] {
    box-shadow:
      0 0 0 4px rgb(212 175 55 / 0.16),
      0 12px 26px rgb(212 175 55 / 0.22),
      inset 0 1px 0 rgb(255 255 255 / 0.24);
    animation: gf-step-breathe 3.2s ease-in-out infinite;
  }

  .gf-step-button[data-done='true']:not([data-active='true']) {
    background: rgb(255 255 255 / 0.055);
  }

  .gf-stepper-line {
    background: var(--gf-step-line);
  }

  .gf-stepper-line > span {
    display: block;
    height: 100%;
    width: 0;
    border-radius: inherit;
    background: linear-gradient(90deg, rgb(212 175 55 / 0.7), rgb(212 175 55));
    transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .gf-stepper-line[data-done='true'] > span {
    width: 100%;
  }

  @keyframes gf-step-breathe {
    0%,
    100% {
      box-shadow:
        0 0 0 4px rgb(212 175 55 / 0.14),
        0 12px 26px rgb(212 175 55 / 0.18),
        inset 0 1px 0 rgb(255 255 255 / 0.24);
    }
    50% {
      box-shadow:
        0 0 0 6px rgb(212 175 55 / 0.2),
        0 16px 34px rgb(212 175 55 / 0.26),
        inset 0 1px 0 rgb(255 255 255 / 0.28);
    }
  }

  @media (min-width: 640px) {
    .gf-stepper-shell {
      padding: 1rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-step-button,
    .gf-stepper-line > span {
      transition: none;
    }

    .gf-step-button[data-active='true'] {
      animation: none;
    }
  }
</style>
