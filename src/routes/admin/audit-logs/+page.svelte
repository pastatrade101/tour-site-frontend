<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import DataTable from '$lib/components/admin/DataTable.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  let rows: Record<string, unknown>[] = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const response = await api.auditLogs.list({ limit: 25 });
      rows = response.data.items;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load audit logs.';
    } finally {
      loading = false;
    }
  });
</script>

<div class="mb-5">
  <p class="text-sm text-ink/60">Track important CMS actions across content, users, settings, media, and bookings.</p>
</div>

{#if loading}
  <LoadingState message="Loading audit logs..." />
{:else if error}
  <ErrorState message={error} />
{:else}
  <DataTable
    columns={[
      { key: 'action', label: 'Action' },
      { key: 'entity_type', label: 'Entity' },
      { key: 'entity_id', label: 'Entity ID' },
      { key: 'ip_address', label: 'IP' },
      { key: 'created_at', label: 'Created' }
    ]}
    {rows}
  />
{/if}
