<script lang="ts">
  import DataTable from '$lib/components/admin/DataTable.svelte';

  const rows = [
    { id: 'ai-001', lead: 'Safari family lead', persona: 'family safari', status: 'handoff_ready', updated: 'CMS-ready placeholder' },
    { id: 'ai-002', lead: 'Kilimanjaro trek lead', persona: 'adventure', status: 'in_progress', updated: 'CMS-ready placeholder' }
  ];
</script>

<svelte:head>
  <title>AI Conversations | Goldfinch CMS</title>
</svelte:head>

<section class="grid gap-6">
  <div>
    <p class="text-sm font-semibold uppercase tracking-[0.14em] text-clay">AI System</p>
    <h1 class="mt-2 text-3xl font-bold tracking-normal text-ink">Goldfinch AI Conversations</h1>
    <p class="mt-2 text-sm leading-6 text-ink/65">Prepared CMS queue for AI transcripts, lead context, handoff status, and tour match results.</p>
  </div>

  <DataTable
    columns={[
      { key: 'lead', label: 'Lead' },
      { key: 'persona', label: 'Persona' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'updated', label: 'Updated' }
    ]}
    {rows}
  />
</section>
