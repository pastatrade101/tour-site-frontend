<script lang="ts">export let title='';export let note='';</script>
<section class="rounded-[12px] border border-ink/10 bg-surface p-4 shadow-sm md:p-6"><h3 class="text-xl font-bold text-heading">{title}</h3>{#if note}<p class="mt-1 text-sm text-ink/55">{note}</p>{/if}<div class="mt-5 grid gap-5"><slot/></div></section>
