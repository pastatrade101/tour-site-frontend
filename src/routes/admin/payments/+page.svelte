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
      const response = await api.payments.list({ limit: 25 });
      rows = response.data.items;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load payments.';
    } finally {
      loading = false;
    }
  });
</script>

<div class="mb-5">
  <p class="text-sm text-ink/60">Payments-ready records for deposits, balances, refunds, and provider references.</p>
</div>

{#if loading}
  <LoadingState message="Loading payments..." />
{:else if error}
  <ErrorState message={error} />
{:else}
  <DataTable
    columns={[
      { key: 'amount', label: 'Amount' },
      { key: 'currency', label: 'Currency' },
      { key: 'payment_method', label: 'Method' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'transaction_reference', label: 'Reference' }
    ]}
    {rows}
  />
{/if}
