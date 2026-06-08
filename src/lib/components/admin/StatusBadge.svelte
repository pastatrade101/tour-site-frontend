<script lang="ts">
  export let status = 'draft';

  const color = (value: string) => {
    if (['available', 'published', 'confirmed', 'completed', 'replied'].includes(value)) return 'bg-forest/10 text-forest ring-forest/20';
    if (['limited', 'pending', 'new', 'draft'].includes(value)) return 'bg-goldfinch-gold/15 text-deep-green ring-goldfinch-gold/25';
    if (['full', 'cancelled', 'archived'].includes(value)) return 'bg-slate-100 text-slate-700 ring-slate-200';
    return 'bg-sand text-ink ring-ink/10';
  };
</script>

<span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${color(status)}`}>{status}</span>
