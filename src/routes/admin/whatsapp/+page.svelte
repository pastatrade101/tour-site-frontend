<script lang="ts">
  /**
   * WhatsApp inbox.
   *
   * Deliberately one screen: threads on the left, the conversation in the
   * middle, who the traveller is on the right. An agent should be able to
   * answer without opening anything else, which is the whole point of holding
   * the lead and the assistant's captured context beside the messages.
   */
  import { onMount, onDestroy } from 'svelte';
  import { AlertTriangle, Bot, Check, CheckCheck, Clock, MessageCircle, Plus, Search, Send, User, UserCog } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { quotationMoney, quotationStatusChip, quotationStatusLabel } from '$lib/quotations';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminQuotationEditor from '$lib/components/admin/AdminQuotationEditor.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Row = Record<string, any>;
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  let conversations: Row[] = [];
  let agents: Array<{ id: string; full_name: string }> = [];
  let activeId = '';
  let detail: Row | null = null;
  let loadingList = true;
  let loadingThread = false;
  let sending = false;
  let search = '';
  let stateFilter = '';
  let draft = '';
  let noteDraft = '';
  let toasts: Toast[] = [];
  let poller: ReturnType<typeof setInterval> | undefined;
  let quoteOpen = false;
  let quoteLoading = false;
  let editingQuote: Row | null = null;
  let quotePrefill: Row = {};
  let tours: Row[] = [];

  const STATES = [
    { value: '', label: 'All conversations' },
    { value: 'AI_ACTIVE', label: 'AI handling' },
    { value: 'HUMAN_REQUESTED', label: 'Human requested' },
    { value: 'AGENT_ASSIGNED', label: 'Assigned' },
    { value: 'HUMAN_ACTIVE', label: 'Agent replying' },
    { value: 'RESOLVED', label: 'Resolved' }
  ];

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => (toasts = toasts.filter((t) => t.id !== id)), 4000);
  };

  const loadList = async () => {
    try {
      const res = await api.whatsapp.conversations({ search, state: stateFilter, limit: 60 });
      conversations = res.data as Row[];
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load conversations.', 'error');
    } finally {
      loadingList = false;
    }
  };

  const openConversation = async (id: string) => {
    activeId = id;
    loadingThread = true;
    try {
      const res = await api.whatsapp.conversation(id);
      detail = res.data as Row;
      // Opening a thread is what marks it read — the badge clears here rather
      // than on some separate action an agent has to remember.
      await api.whatsapp.markRead(id);
      const row = conversations.find((c) => c.id === id);
      if (row) row.unread_count = 0;
      conversations = conversations;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to open the conversation.', 'error');
    } finally {
      loadingThread = false;
    }
  };

  const reply = async () => {
    const body = draft.trim();
    if (!body || !detail || sending) return;
    sending = true;
    try {
      await api.whatsapp.send({ to: detail.conversation.visitor_phone, body });
      draft = '';
      await openConversation(activeId);
      showToast('Message sent.');
    } catch (error) {
      // The 24-hour window rejection arrives here as a readable sentence.
      showToast(error instanceof Error ? error.message : 'Unable to send.', 'error');
    } finally {
      sending = false;
    }
  };

  const setState = async (handoffState: string) => {
    if (!detail) return;
    try {
      await api.whatsapp.updateState(activeId, { handoff_state: handoffState });
      await Promise.all([openConversation(activeId), loadList()]);
      showToast(`Conversation set to ${handoffState.replace('_', ' ').toLowerCase()}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update.', 'error');
    }
  };

  const assign = async (agentId: string) => {
    if (!detail) return;
    try {
      await api.whatsapp.updateState(activeId, { assigned_to: agentId || null });
      await Promise.all([openConversation(activeId), loadList()]);
      showToast(agentId ? 'Assigned. The assistant will stop replying.' : 'Unassigned.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to assign.', 'error');
    }
  };

  const addNote = async () => {
    const body = noteDraft.trim();
    if (!body || !detail) return;
    try {
      await api.whatsapp.addNote(activeId, body);
      noteDraft = '';
      await openConversation(activeId);
      showToast('Note added.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to add the note.', 'error');
    }
  };

  // Quoting from the inbox only earns its place if the agent retypes nothing, so the
  // thread hands over everything it already knows. Keys without a real value are
  // dropped rather than sent as blanks the editor would show as answered fields.
  const newQuotation = () => {
    if (!detail) return;
    const prefill: Row = {
      conversation_id: activeId,
      booking_request_id: lead?.id,
      tour_id: detail.tour?.id,
      // `||`, not `??`: the webhook stores a missing WhatsApp profile name as an
      // empty string, which `??` would keep — and the filter below would then
      // drop the key entirely instead of falling back to the lead's name.
      customer_name: detail.conversation.visitor_name || lead?.full_name,
      customer_phone: detail.conversation.visitor_phone,
      customer_email: lead?.email,
      adults: lead?.number_of_adults,
      children: lead?.number_of_children,
      travel_date: lead?.travel_date,
      title: detail.tour?.title
    };
    quotePrefill = Object.fromEntries(Object.entries(prefill).filter(([, value]) => value !== null && value !== undefined && value !== ''));
    editingQuote = null;
    quoteOpen = true;
  };

  /**
   * The thread only carries a summary of each quotation — `getConversation`
   * selects eleven display columns and nothing else, so this row has no items,
   * notes, travel date, tour or contact details. The editor expects the whole
   * record, and the update endpoint patches every field the form submits, so
   * handing it the summary would blank the line items and the traveller-visible
   * notes on a live commercial document. Fetch the real row first.
   */
  const editQuotation = async (quotation: Row) => {
    if (quoteLoading) return;
    quoteLoading = true;
    try {
      const res = await api.quotations.get(String(quotation.id));
      editingQuote = res.data as Row;
      quotePrefill = {};
      quoteOpen = true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to open that quotation.', 'error');
    } finally {
      quoteLoading = false;
    }
  };

  const closeQuote = () => {
    quoteOpen = false;
    editingQuote = null;
    quotePrefill = {};
  };

  // Refresh the thread but leave the editor up, the same way the quotations
  // page does: `saved` means "there is a new version to reload", not "the agent
  // is finished". Closing here would break saving a draft and then sending it,
  // and would force a second save to raise a second quotation.
  const quotationSaved = async () => {
    await openConversation(activeId);
  };

  // A skipped send is neither a success nor an error: the opt-in check and the
  // 24-hour window both land here, and the backend deliberately leaves the quotation
  // unsent. Repeat its reason word for word instead of implying the traveller has it.
  const quotationSent = async (event: CustomEvent<Row>) => {
    const outcome = event.detail?.outcome;
    closeQuote();
    await openConversation(activeId);
    if (outcome?.status === 'sent') showToast('Quotation sent to the traveller.');
    else showToast(outcome?.detail ?? 'The quotation was not sent.', 'error');
  };

  const time = (value?: string) =>
    value ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '';

  onMount(async () => {
    await Promise.all([
      loadList(),
      api.whatsapp.agents().then((r) => (agents = r.data)).catch(() => undefined),
      // Feeds the composer's tour picker. Optional — without it the editor
      // falls back to a quotation with no tour attached, which is still valid.
      api.tours
        .list({ status: 'all', limit: 200 })
        .then((r) => (tours = r.data.items as Row[]))
        .catch(() => undefined)
    ]);
    // A quiet refresh so an agent sees new messages without reloading.
    poller = setInterval(() => void loadList(), 20000);
  });
  onDestroy(() => poller && clearInterval(poller));

  $: void (search, stateFilter, loadList());
  $: lead = detail?.lead ?? null;
  $: context = (lead?.lead_context ?? detail?.conversation?.lead_context ?? {}) as Record<string, unknown>;
  $: contextEntries = Object.entries(context).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length));
</script>

<ToastStack {toasts} on:dismiss={(e) => (toasts = toasts.filter((t) => t.id !== e.detail))} />

<AdminPageHeader
  title="WhatsApp Inbox"
  description="Traveller conversations on WhatsApp, with the lead and the assistant's captured context beside each thread."
/>

<div class="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
  <!-- ── Threads ──────────────────────────────────────────────────────────── -->
  <section class="rounded-[10px] border border-ink/10 bg-surface">
    <div class="grid gap-2 border-b border-ink/10 p-3">
      <label class="flex h-10 items-center gap-2 rounded-md border border-ink/15 px-3">
        <Search size={15} class="text-ink/40" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Name or number…" bind:value={search} />
      </label>
      <select class="h-9 rounded-md border border-ink/15 bg-surface px-2 text-xs font-semibold text-ink" bind:value={stateFilter}>
        {#each STATES as option}<option value={option.value}>{option.label}</option>{/each}
      </select>
    </div>

    <div class="max-h-[70vh] overflow-y-auto">
      {#if loadingList}
        <div class="p-6"><LoadingState message="Loading conversations…" /></div>
      {:else if !conversations.length}
        <p class="p-6 text-sm text-ink/55">No WhatsApp conversations yet. They appear here as soon as a traveller messages you.</p>
      {:else}
        {#each conversations as conversation (conversation.id)}
          <button
            class={`flex w-full flex-col gap-1 border-b border-ink/[0.06] p-3 text-left transition hover:bg-sand/40 ${activeId === conversation.id ? 'bg-sand/60' : ''}`}
            type="button"
            on:click={() => openConversation(conversation.id)}
          >
            <span class="flex items-center justify-between gap-2">
              <span class="truncate text-sm font-bold text-heading">{conversation.visitor_name || conversation.visitor_phone}</span>
              {#if conversation.unread_count}
                <span class="shrink-0 rounded-full bg-clay px-1.5 py-0.5 text-[10px] font-bold text-white">{conversation.unread_count}</span>
              {/if}
            </span>
            <span class="truncate text-xs text-ink/55">{conversation.last_message?.content ?? 'No messages yet'}</span>
            <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink/40">
              {#if conversation.handoff_state === 'AI_ACTIVE'}<Bot size={11} />{:else}<UserCog size={11} />{/if}
              {conversation.handoff_state?.replace('_', ' ')}
              {#if conversation.assigned_to_name}· {conversation.assigned_to_name}{/if}
            </span>
          </button>
        {/each}
      {/if}
    </div>
  </section>

  <!-- ── Thread ───────────────────────────────────────────────────────────── -->
  <section class="flex min-h-[70vh] flex-col rounded-[10px] border border-ink/10 bg-surface">
    {#if !detail}
      <div class="grid flex-1 place-items-center p-10 text-center text-sm text-ink/50">
        <div><MessageCircle size={26} class="mx-auto mb-2 text-ink/25" />Select a conversation to read and reply.</div>
      </div>
    {:else}
      <header class="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 p-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-bold text-heading">{detail.conversation.visitor_name || detail.conversation.visitor_phone}</p>
          <p class="text-xs text-ink/50">{detail.conversation.visitor_phone}</p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <select
            class="h-8 rounded-md border border-ink/15 bg-surface px-2 text-xs font-semibold"
            value={detail.conversation.assigned_to ?? ''}
            on:change={(event) => assign(event.currentTarget.value)}
          >
            <option value="">Unassigned</option>
            {#each agents as agent}<option value={agent.id}>{agent.full_name}</option>{/each}
          </select>
          {#if detail.conversation.handoff_state !== 'RESOLVED'}
            <AdminButton variant="secondary" type="button" on:click={() => setState('RESOLVED')}>Resolve</AdminButton>
          {:else}
            <AdminButton variant="secondary" type="button" on:click={() => setState('AI_ACTIVE')}>Reopen</AdminButton>
          {/if}
        </div>
      </header>

      {#if !detail.conversation.ai_enabled}
        <p class="flex items-center gap-2 border-b border-ink/10 bg-sand/40 px-3 py-2 text-xs font-semibold text-ink/70">
          <UserCog size={13} /> A person has this conversation — the assistant will not reply automatically.
        </p>
      {/if}

      <div class="flex-1 space-y-3 overflow-y-auto p-4">
        {#if loadingThread}
          <LoadingState message="Loading messages…" />
        {:else}
          {#each detail.messages as message (message.id)}
            {@const mine = message.role !== 'user'}
            <div class={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div class={`max-w-[78%] rounded-[10px] px-3 py-2 text-sm ${mine ? 'bg-deep-green text-white' : 'bg-sand/60 text-ink'}`}>
                <p class="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">
                  {#if message.role === 'user'}<User size={10} /> Traveller
                  {:else if message.role === 'agent'}<UserCog size={10} /> Agent
                  {:else}<Bot size={10} /> Assistant{/if}
                </p>
                <p class="whitespace-pre-wrap leading-6">{message.content}</p>
                <p class="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-60">
                  {time(message.created_at)}
                  {#if message.delivery?.direction === 'outbound'}
                    {#if message.delivery.status === 'read'}<CheckCheck size={12} />
                    {:else if message.delivery.status === 'delivered'}<CheckCheck size={12} class="opacity-60" />
                    {:else if message.delivery.status === 'failed'}<AlertTriangle size={12} class="text-goldfinch-gold" />
                    {:else}<Check size={12} />{/if}
                  {/if}
                </p>
                {#if message.delivery?.status === 'failed' && message.delivery.error_message}
                  <p class="mt-1 text-[10px] text-goldfinch-gold">{message.delivery.error_message}</p>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <footer class="border-t border-ink/10 p-3">
        {#if detail.session_window_open}
          <div class="flex gap-2">
            <textarea
              class="min-h-[44px] flex-1 rounded-md border border-ink/15 bg-black/[0.02] px-3 py-2 text-sm outline-none focus:border-forest"
              rows="2"
              placeholder="Write a reply…"
              bind:value={draft}
              on:keydown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) reply(); }}
            ></textarea>
            <AdminButton type="button" disabled={sending || !draft.trim()} on:click={reply}>
              <Send size={15} /> {sending ? 'Sending…' : 'Send'}
            </AdminButton>
          </div>
          <p class="mt-1 text-[11px] text-ink/40">⌘/Ctrl + Enter to send.</p>
        {:else}
          <p class="flex items-start gap-2 rounded-md border border-goldfinch-gold/35 bg-goldfinch-gold/[0.08] px-3 py-2.5 text-xs text-ink/75">
            <Clock size={14} class="mt-0.5 shrink-0 text-clay" />
            This traveller last wrote more than 24 hours ago, so WhatsApp only allows an approved template now. Free-form replies resume as soon as they message again.
          </p>
        {/if}
      </footer>
    {/if}
  </section>

  <!-- ── Traveller ────────────────────────────────────────────────────────── -->
  <section class="rounded-[10px] border border-ink/10 bg-surface p-3">
    {#if !detail}
      <p class="text-sm text-ink/50">No conversation selected.</p>
    {:else}
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-forest/70">Traveller</p>
      <dl class="mt-2 grid gap-1.5 text-sm">
        {#if detail.conversation.visitor_country}<div class="flex justify-between gap-2"><dt class="text-ink/50">Country</dt><dd class="font-semibold text-heading">{detail.conversation.visitor_country}</dd></div>{/if}
        {#if detail.conversation.lead_status}<div class="flex justify-between gap-2"><dt class="text-ink/50">Lead</dt><dd class="font-semibold text-heading capitalize">{detail.conversation.lead_status}</dd></div>{/if}
        {#if detail.contact?.whatsapp_opt_in}<div class="flex justify-between gap-2"><dt class="text-ink/50">Opt-in</dt><dd class="font-semibold text-forest">Yes</dd></div>{/if}
      </dl>

      {#if lead}
        <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-forest/70">Enquiry</p>
        <dl class="mt-2 grid gap-1.5 text-sm">
          {#if lead.booking_code}<div class="flex justify-between gap-2"><dt class="text-ink/50">Ref</dt><dd class="font-semibold text-heading">{lead.booking_code}</dd></div>{/if}
          {#if detail.tour}<div class="flex justify-between gap-2"><dt class="text-ink/50">Tour</dt><dd class="text-right font-semibold text-heading">{detail.tour.title}</dd></div>{/if}
          {#if lead.travel_date}<div class="flex justify-between gap-2"><dt class="text-ink/50">Travel</dt><dd class="font-semibold text-heading">{lead.travel_date}</dd></div>{/if}
          {#if lead.total_people}<div class="flex justify-between gap-2"><dt class="text-ink/50">Travellers</dt><dd class="font-semibold text-heading">{lead.total_people}</dd></div>{/if}
          {#if lead.estimated_amount}<div class="flex justify-between gap-2"><dt class="text-ink/50">Estimate</dt><dd class="font-semibold text-heading">{lead.currency ?? 'USD'} {lead.estimated_amount}</dd></div>{/if}
          {#if lead.status}<div class="flex justify-between gap-2"><dt class="text-ink/50">Status</dt><dd class="font-semibold text-heading capitalize">{lead.status}</dd></div>{/if}
        </dl>
      {/if}

      {#if contextEntries.length}
        <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-forest/70">From the assistant</p>
        <dl class="mt-2 grid gap-1.5 text-sm">
          {#each contextEntries.slice(0, 10) as [key, value]}
            <div class="flex justify-between gap-2">
              <dt class="capitalize text-ink/50">{key.replace(/_/g, ' ')}</dt>
              <dd class="text-right font-semibold text-heading">{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
            </div>
          {/each}
        </dl>
      {/if}

      <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-forest/70">Quotations</p>
      <div class="mt-2">
        <AdminButton variant="secondary" size="sm" type="button" on:click={newQuotation}>
          <Plus size={14} /> New quotation
        </AdminButton>
      </div>
      {#if detail.quotations?.length}
        <div class="mt-2 grid gap-2">
          {#each detail.quotations as quotation (quotation.id)}
            <button class="w-full rounded-md bg-sand/40 p-2 text-left text-xs transition hover:bg-sand/70 disabled:opacity-60" type="button" disabled={quoteLoading} on:click={() => editQuotation(quotation)}>
              <span class="flex items-center justify-between gap-2">
                <span class="font-mono font-bold text-heading">{quotation.quote_code}</span>
                <span class={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${quotationStatusChip(quotation.status)}`}>{quotationStatusLabel(quotation.status)}</span>
              </span>
              <span class="mt-1 flex items-center justify-between gap-2 text-ink/55">
                {#if quotation.title}<span class="truncate">{quotation.title}</span>{/if}
                {#if quotation.total_amount != null}<span class="shrink-0 font-semibold text-heading">{quotationMoney(quotation.total_amount, quotation.currency)}</span>{/if}
              </span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="mt-2 text-[11px] text-ink/45">No quotations raised from this conversation yet.</p>
      {/if}

      <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-forest/70">Internal notes</p>
      <p class="mt-0.5 text-[11px] text-ink/45">Staff only — never sent to the traveller.</p>
      <div class="mt-2 flex gap-1.5">
        <input class="h-9 min-w-0 flex-1 rounded-md border border-ink/15 px-2 text-sm outline-none focus:border-forest" placeholder="Add a note…" bind:value={noteDraft} on:keydown={(e) => e.key === 'Enter' && addNote()} />
        <AdminButton variant="secondary" type="button" disabled={!noteDraft.trim()} on:click={addNote}>Add</AdminButton>
      </div>
      <div class="mt-2 grid gap-2">
        {#each detail.notes as note (note.id)}
          <div class="rounded-md bg-sand/40 p-2 text-xs">
            <p class="text-ink/75">{note.body}</p>
            <p class="mt-1 text-[10px] text-ink/40">{time(note.created_at)}</p>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<AdminQuotationEditor
  open={quoteOpen}
  quotation={editingQuote}
  prefill={quotePrefill}
  {tours}
  on:saved={quotationSaved}
  on:sent={quotationSent}
  on:close={closeQuote}
/>
