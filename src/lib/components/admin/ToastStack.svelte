<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  type Toast = {
    id: string;
    message: string;
    type: 'error' | 'success';
  };

  export let toasts: Toast[] = [];

  const dispatch = createEventDispatcher<{ dismiss: string }>();
</script>

{#if toasts.length}
  <div class="fixed right-4 top-4 z-[80] grid w-[min(380px,calc(100vw-32px))] gap-3">
    {#each toasts as toast (toast.id)}
      <button
        class={`rounded-lg border px-4 py-3 text-left text-sm shadow-soft ${
          toast.type === 'success'
            ? 'border-forest/15 bg-forest text-white'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}
        type="button"
        on:click={() => dispatch('dismiss', toast.id)}
        in:fly={{ y: -8, duration: 150 }}
        out:fade={{ duration: 120 }}
      >
        {toast.message}
      </button>
    {/each}
  </div>
{/if}
