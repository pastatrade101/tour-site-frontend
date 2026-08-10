<script lang="ts">
  /**
   * The popup shell every enquiry form lives in.
   *
   * There was no dialog component before this — the three existing popups each
   * rolled their own and none of them trapped focus, so a keyboard user could
   * tab straight out of the form and into the page behind it. This one holds
   * focus, restores it on close, locks background scroll, and closes on Escape
   * or a backdrop click.
   */
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import { Check, X } from '@lucide/svelte';

  export let open = false;
  export let title: string;
  export let description = '';
  /** Progress rail: labels of every step, and which one is current. */
  export let steps: string[] = [];
  export let stepIndex = 0;
  export let labelledBy = 'enquiry-title';

  const dispatch = createEventDispatcher<{ close: void }>();

  let dialog: HTMLDivElement;
  let previouslyFocused: HTMLElement | null = null;
  let scrollY = 0;

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const focusables = (): HTMLElement[] =>
    dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null) : [];

  const close = () => dispatch('close');

  const onKeydown = (event: KeyboardEvent) => {
    if (!open) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') return;

    // Wrap focus at both ends so it can never leave the dialog.
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Lock the page behind the dialog without losing the reader's place.
  const lockScroll = () => {
    scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
  };

  const unlockScroll = () => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollY);
  };

  $: if (typeof document !== 'undefined') {
    if (open) {
      previouslyFocused = (document.activeElement as HTMLElement) ?? null;
      lockScroll();
      // Focus the dialog itself, not the first input: opening a popup with the
      // cursor already in a text field is disorienting for screen-reader users.
      tick().then(() => dialog?.focus());
    } else if (previouslyFocused) {
      unlockScroll();
      previouslyFocused.focus();
      previouslyFocused = null;
    }
  }

  onMount(() => {
    document.addEventListener('keydown', onKeydown);
  });

  onDestroy(() => {
    if (typeof document === 'undefined') return;
    document.removeEventListener('keydown', onKeydown);
    if (open) unlockScroll();
  });
</script>

{#if open}
  <!-- Dimmed page behind. Clicking it closes; it is not a focus target. -->
  <div
    class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px]"
    aria-hidden="true"
    on:click={close}
  ></div>

  <div class="pointer-events-none fixed inset-0 z-[101] flex items-end justify-center p-0 sm:items-center sm:p-4">
    <div
      class="pointer-events-auto flex max-h-[94svh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-[18px] bg-deep-green text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)] outline-none sm:max-h-[92svh] sm:rounded-[18px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabindex="-1"
      bind:this={dialog}
    >
      <!-- header: title, progress, close ------------------------------------->
      <div class="shrink-0 border-b border-white/12 px-5 pb-3 pt-4 sm:px-6">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 id={labelledBy} class="font-serif text-[19px] font-semibold leading-tight sm:text-[22px]">{title}</h2>
            {#if description}
              <p class="mt-1 line-clamp-2 text-[12.5px] leading-[1.45] text-white/65">{description}</p>
            {/if}
          </div>
          <button
            type="button"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green"
            aria-label="Close this form"
            on:click={close}
          >
            <X size={17} />
          </button>
        </div>

        {#if steps.length > 1}
          <!-- Numbered rail rather than a bar: it costs a third of the height
               and says which step you are on without a separate caption. -->
          <ol class="mt-3 flex items-center gap-2" aria-label="Progress">
            {#each steps as label, index}
              {@const state = index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'todo'}
              <li class="flex min-w-0 items-center gap-2" class:flex-1={index < steps.length - 1}>
                <span class="flex min-w-0 items-center gap-1.5">
                  <span
                    class="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-extrabold transition-all duration-300 step-dot"
                    class:is-done={state === 'done'}
                    class:is-current={state === 'current'}
                    class:is-todo={state === 'todo'}
                    aria-hidden="true"
                  >
                    {#if state === 'done'}
                      <Check size={12} strokeWidth={3.5} />
                    {:else}
                      {index + 1}
                    {/if}
                  </span>
                  <span
                    class="truncate text-[12px] font-bold transition-colors duration-300 {state === 'current'
                      ? 'text-goldfinch-gold'
                      : state === 'done'
                        ? 'text-white/70'
                        : 'text-white/40'} {state === 'current' ? '' : 'hidden sm:inline'}"
                  >
                    {label}
                  </span>
                </span>
                {#if index < steps.length - 1}
                  <span class="h-px flex-1 rounded-full transition-colors duration-300 step-line" class:is-done={index < stepIndex} aria-hidden="true"></span>
                {/if}
              </li>
            {/each}
          </ol>
          <p class="sr-only" aria-live="polite">Step {stepIndex + 1} of {steps.length} · {steps[stepIndex]}</p>
        {/if}
      </div>

      <!-- body: the only scrolling region ------------------------------------>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
        <slot />
      </div>

      <!-- footer: sticky, ~70px --------------------------------------------->
      <div class="shrink-0 border-t border-white/12 bg-black/15 px-5 py-3 sm:px-6">
        <slot name="footer" />
      </div>
    </div>
  </div>
{/if}

<style>
  /* Tailwind cannot express fractional-opacity colours as class: directive
     targets, so the stepper states are declared here. */
  .step-dot.is-todo {
    background-color: rgb(255 255 255 / 0.12);
    color: rgb(255 255 255 / 0.5);
  }

  .step-dot.is-done {
    background-color: rgb(255 255 255 / 0.22);
    color: #fff;
  }

  .step-dot.is-current {
    background-color: rgb(var(--c-goldfinch-gold));
    color: rgb(var(--c-heading));
    /* A quiet halo rather than a size change, so the rail never reflows. */
    box-shadow: 0 0 0 3px rgb(var(--c-goldfinch-gold) / 0.25);
  }

  .step-line {
    background-color: rgb(255 255 255 / 0.15);
  }

  .step-line.is-done {
    background-color: rgb(var(--c-goldfinch-gold) / 0.65);
  }

  @media (prefers-reduced-motion: reduce) {
    .step-dot,
    .step-line {
      transition: none;
    }
  }
</style>
