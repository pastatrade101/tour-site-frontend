<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import type { FAQ } from '$lib/types';
  import { slide } from 'svelte/transition';

  export let faqs: FAQ[] = [];
  let openId = '';
</script>

<div class="grid gap-3">
  {#each faqs as faq}
    <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-card">
      <button class="flex w-full items-center justify-between gap-4 px-5 py-4 text-start font-semibold text-ink transition hover:bg-canvas" type="button" on:click={() => (openId = openId === faq.id ? '' : faq.id)}>
        <span>{faq.question}</span>
        <span class={`grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-forest/10 text-forest transition ${openId === faq.id ? 'rotate-180' : ''}`}>
          <ChevronDown size={16} strokeWidth={2.6} />
        </span>
      </button>
      {#if openId === faq.id}
        <p class="border-t border-ink/10 px-5 pb-5 pt-4 text-sm leading-6 text-ink/70" transition:slide={{ duration: 180 }}>{faq.answer}</p>
      {/if}
    </div>
  {/each}
</div>
