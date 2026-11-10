<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';

  /**
   * The trail above every journal page; the last item is the page itself.
   * It stays pinned under the site header while reading (--nav-h is the
   * header's live height, published by Navbar), so it must sit directly in a
   * page-tall wrapper, not inside a short container.
   * Below xl the fixed header is 97px at the top of the page but its spacer
   * is 70px, so the bar sits 27px over what follows it: the first heading on
   * each journal page has 60px top padding there (40px from xl).
   */
  export let items: Array<{ label: string; href?: string }> = [];
</script>

<div class="sticky top-[var(--nav-h,70px)] z-30 border-b border-ink/10 bg-surface/95 backdrop-blur">
  <nav aria-label="Breadcrumb" class="container-shell py-3 text-[13px] leading-5 text-ink/60">
    <ol class="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
      {#each items as item, i (i)}
        <li class="flex items-center gap-1.5 {item.href ? 'shrink-0' : 'min-w-0'}">
          {#if i > 0}<ChevronRight size={14} aria-hidden="true" class="shrink-0" />{/if}
          {#if item.href}
            <a href={item.href} class="rounded-sm transition hover:text-heading hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heading">{item.label}</a>
          {:else}
            <span aria-current="page" class="truncate font-medium text-heading">{item.label}</span>
          {/if}
        </li>
      {/each}
    </ol>
  </nav>
</div>
