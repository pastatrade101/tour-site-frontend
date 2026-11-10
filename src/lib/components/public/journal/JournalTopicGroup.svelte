<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { postHref } from '$lib/journal';
  import type { BlogPost, BlogTopicGroup } from '$lib/types';
  import JournalIcon from './JournalIcon.svelte';

  export let group: BlogTopicGroup;
  export let posts: BlogPost[] = [];
</script>

<section aria-labelledby="tg-{group.id}">
  <div class="flex items-center gap-2.5 border-b border-ink/10 pb-2.5">
    <JournalIcon name={group.icon} class="shrink-0 text-clay" />
    <h3 id="tg-{group.id}" class="font-serif text-[19px] font-semibold text-heading">{group.title}</h3>
  </div>
  <ul class="mt-1">
    {#each posts as post (post.id)}
      <li class="border-b border-dashed border-ink/10 last:border-0">
        <a href={postHref(post)} class="group flex min-h-11 items-center justify-between gap-3 rounded-sm py-2.5 text-[15.5px] font-medium leading-normal text-ink transition-colors hover:text-clay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heading">
          <span>{post.title}</span>
          <ArrowRight size={16} class="shrink-0 text-ink/40 transition-transform group-hover:translate-x-0.5 group-hover:text-clay" aria-hidden="true" />
        </a>
      </li>
    {/each}
  </ul>
</section>
