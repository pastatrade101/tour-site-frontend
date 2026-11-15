<script lang="ts">
  /**
   * Every review card on the site — the design of the Amani site's
   * guest-reviews, in Goldfinch's colours.
   *
   * A card is: the stars, the quote (cut to a few lines), then who wrote it,
   * where they are from and where the review was left. A review too long for
   * its card opens whole in a dialog. Larger screens get a grid; a phone gets a
   * row to swipe, the review being read resting in the middle, with dots under
   * it. "View more reviews" pages through the rest of the approved reviews.
   *
   * It draws only what a review carries: no rating, no stars; no country, no
   * flag. Nothing is defaulted to five stars.
   */
  import { onMount, tick } from 'svelte';
  import { ArrowRight, ArrowUpRight, Check, Star, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { countryCodeFor } from '$lib/data/countries';
  import { t } from '$lib/i18n/ui';
  import { rail, steer } from '$lib/motion/rail';

  type ReviewLike = {
    id?: string | null;
    author_name?: string | null;
    client_name?: string | null;
    country?: string | null;
    client_country?: string | null;
    rating?: number | null;
    message?: string | null;
    comment?: string | null;
    platform?: string | null;
    source_url?: string | null;
  };

  interface Props {
    reviews?: ReviewLike[];
    /** How many approved reviews exist in all. Above what is shown, "View more" appears. */
    total?: number;
    /** Off where the caller's list is its own selection rather than the site's approved reviews. */
    more?: boolean;
  }
  let { reviews = [], total = 0, more = true }: Props = $props();

  const PAGE = 6;
  /** About seven lines of a card. Longer than this, the card offers the whole review. */
  const LIMIT = 260;

  const nameOf = (r: ReviewLike) => (r.author_name || r.client_name || '').trim();
  const countryOf = (r: ReviewLike) => (r.country || r.client_country || '').trim();
  const textOf = (r: ReviewLike) => (r.message || r.comment || '').trim();
  const platformOf = (r: ReviewLike) => (r.platform ?? '').trim();
  /** Only a web address is linked; anything else typed into the field is ignored. */
  const sourceOf = (r: ReviewLike) => {
    const url = (r.source_url ?? '').trim();
    return /^https?:\/\//i.test(url) ? url : '';
  };
  const starsOf = (r: ReviewLike) => {
    const n = typeof r.rating === 'number' && Number.isFinite(r.rating) ? Math.round(r.rating) : 0;
    return n > 0 ? Math.min(n, 5) : 0;
  };
  const flagOf = (r: ReviewLike) => {
    const code = countryCodeFor(countryOf(r));
    return code ? `/flags/${code.toLowerCase()}.svg` : '';
  };
  /** A flag file that fails to load steps aside; the country's name is still there. */
  const dropFlag = (event: Event) => (event.currentTarget as HTMLImageElement).remove();

  const plain = (text: string) => text.replace(/\s+/g, ' ').trim();
  const excerpt = (text: string) => {
    const flat = plain(text);
    return flat.length > LIMIT ? `${flat.slice(0, LIMIT).replace(/\s+\S*$/, '')}…` : flat;
  };
  const keyOf = (r: ReviewLike) => r.id || `${nameOf(r)}|${textOf(r).slice(0, 60)}`;

  let extra = $state<ReviewLike[]>([]);
  let nextPage = $state(1);
  let known = $state(0);
  let exhausted = $state(false);
  /** How many cards to show once "View more" has been used; before that, all that were given. */
  let cap = $state<number | null>(null);
  let loading = $state(false);
  let failed = $state(false);

  /** Every review in hand, each once: the ones given, then the ones fetched. */
  const all = $derived.by(() => {
    const seen = new Set<string>();
    return [...reviews, ...extra].filter((review) => {
      const key = keyOf(review);
      if (!(nameOf(review) || textOf(review)) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  const shown = $derived(cap === null ? all.slice(0, Math.max(reviews.length, 1)) : all.slice(0, cap));
  const available = $derived(Math.max(total, known));
  const hasMore = $derived(more && (all.length > shown.length || (!exhausted && shown.length < available)));

  /**
   * Six more, every time. The first pages of the full list are mostly the
   * reviews already on screen, so pages are fetched until six new ones are in
   * hand; a click that added one card under two full rows read as a fault.
   * Anything fetched beyond the six waits for the next click.
   */
  async function loadMore() {
    loading = true;
    failed = false;
    try {
      const target = shown.length + PAGE;
      for (let fetched = 0; all.length < target && !exhausted && fetched < 6; fetched++) {
        const response = await api.reviews.list({ status: 'approved', limit: PAGE, page: nextPage });
        const items = (response.data.items ?? []) as ReviewLike[];
        known = Number(response.data.pagination?.total) || known;
        nextPage += 1;
        extra = [...extra, ...items];
        exhausted = !items.length || (nextPage - 1) * PAGE >= known;
      }
      cap = Math.min(target, all.length);
      await tick();
      syncDots();
    } catch {
      failed = true;
    } finally {
      loading = false;
    }
  }

  /*
   * Which card the row is showing, for the dots. On a phone the cards rest in
   * the middle and the side padding is symmetric, so card i is showing exactly
   * when the row has scrolled i card-steps.
   */
  let track = $state<HTMLDivElement>();
  let active = $state(0);
  function syncDots() {
    if (!track) return;
    const card = track.children[0] as HTMLElement | undefined;
    const step = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || '0') : 1;
    active = Math.min(shown.length - 1, Math.max(0, Math.round(track.scrollLeft / (step || 1))));
  }
  onMount(() => {
    if (!track) return;
    const observer = new ResizeObserver(syncDots);
    observer.observe(track);
    syncDots();
    return () => observer.disconnect();
  });

  /* ── The whole review, in a dialog ───────────────────────────────────── */
  let dialog = $state<HTMLDialogElement>();
  let fullText = $state<HTMLElement>();
  let reading = $state<ReviewLike | null>(null);

  async function read(review: ReviewLike) {
    reading = review;
    await tick();
    if (!dialog || dialog.open) return;
    // The page behind stays put while the review is read; the padding stands
    // in for the scrollbar, so nothing shifts sideways as it goes.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    dialog.showModal();
    fullText?.focus();
  }
  const release = () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  };
  const closed = () => {
    reading = null;
    release();
  };
  onMount(() => () => {
    if (dialog?.open) release();
  });

  const starsLabel = (n: number) => $t('ui.review_stars').replace('{n}', String(n));
</script>

{#if shown.length}
  <div class="reviews">
    <div class="review-track" bind:this={track} onscroll={syncDots} use:rail>
      {#each shown as review (keyOf(review))}
        {@const name = nameOf(review)}
        {@const country = countryOf(review)}
        {@const text = plain(textOf(review))}
        {@const stars = starsOf(review)}
        {@const platform = platformOf(review)}
        {@const source = sourceOf(review)}
        {@const flag = flagOf(review)}
        <article class="review-card">
          {#if stars}
            <div class="stars" role="img" aria-label={starsLabel(stars)}>
              {#each Array(5) as _, j (j)}
                <Star size={18} strokeWidth={0} fill="currentColor" class={j < stars ? '' : 'off'} aria-hidden="true" />
              {/each}
            </div>
          {/if}

          {#if text}
            <blockquote>&ldquo;{excerpt(text)}&rdquo;</blockquote>
            {#if text.length > LIMIT}
              <button
                type="button"
                class="review-more"
                aria-label={name ? `${$t('ui.review_read_full')}: ${name}` : $t('ui.review_read_full')}
                onclick={() => read(review)}
              >{$t('ui.review_read_full')} <ArrowUpRight size={14} aria-hidden="true" /></button>
            {/if}
          {/if}

          <footer class="review-author">
            {#if name}<h3 class="font-sans">{name}</h3>{/if}
            {#if country}
              <p class="review-country">
                {#if flag}<img src={flag} alt="" width="18" height="18" loading="lazy" decoding="async" onerror={dropFlag} />{/if}
                <span>{country}</span>
              </p>
            {/if}
            <!-- Only what is true of every review: where it was left. -->
            {#if platform}
              <p class="review-source">
                <span class="tick" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                {#if source}
                  <a href={source} target="_blank" rel="noopener noreferrer nofollow">{$t('ui.review_on_platform').replace('{platform}', platform)}</a>
                {:else}
                  <span>{$t('ui.review_on_platform').replace('{platform}', platform)}</span>
                {/if}
              </p>
            {/if}
          </footer>
        </article>
      {/each}
    </div>

    {#if shown.length > 7}
      <!-- A long row: a slim bar shows where you are instead of a dot for each. -->
      <div class="review-progress" style={`--n:${shown.length};--at:${active}`} role="status" aria-live="polite">
        <span class="bar" aria-hidden="true"><span class="thumb"></span></span>
        <span class="count">{active + 1} / {shown.length}</span>
      </div>
    {:else if shown.length > 1}
      <div class="review-dots" role="group" aria-label={$t('ui.review_choose')}>
        {#each shown as review, i (keyOf(review))}
          <button
            type="button"
            class:on={i === active}
            aria-label={$t('ui.review_show_n').replace('{n}', String(i + 1)).replace('{total}', String(shown.length))}
            aria-current={i === active ? 'true' : undefined}
            onclick={() => steer(track, i)}
          ></button>
        {/each}
      </div>
    {/if}

    {#if hasMore || failed}
      <div class="review-actions">
        <button type="button" class="review-load" onclick={loadMore} disabled={loading}>
          {loading ? $t('ui.review_loading') : failed ? $t('ui.review_try_again') : $t('ui.review_view_more')}
          {#if !loading}<ArrowRight size={16} aria-hidden="true" />{/if}
        </button>
        {#if failed}<p class="review-error" role="status">{$t('ui.review_load_failed')}</p>{/if}
      </div>
    {/if}
  </div>

  <!-- A click on the dimmed page behind closes it, as Escape does: the click
       lands on the dialog itself only there, its content being a full-size child. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <dialog
    bind:this={dialog}
    class="review-dialog"
    aria-labelledby="review-dialog-title"
    onclose={closed}
    onclick={(event) => {
      if (event.target === dialog) dialog?.close();
    }}
  >
    {#if reading}
      {@const stars = starsOf(reading)}
      <div class="review-dialog-body">
        <header>
          <div>
            <h3 id="review-dialog-title">{$t('ui.review_by').replace('{name}', nameOf(reading))}</h3>
            <p>{[countryOf(reading), platformOf(reading), stars ? starsLabel(stars) : ''].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" class="review-dialog-close" aria-label={$t('ui.close')} onclick={() => dialog?.close()}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <blockquote class="full-review" tabindex="0" bind:this={fullText}>{textOf(reading)}</blockquote>
        {#if sourceOf(reading)}
          <a class="original-review" href={sourceOf(reading)} target="_blank" rel="noopener noreferrer nofollow">
            {$t('ui.review_read_original')} <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        {/if}
      </div>
    {/if}
  </dialog>
{/if}

<style>
  .review-track {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
    align-items: stretch;
  }

  .review-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 28px;
    border: 1px solid rgb(var(--c-ink) / 0.1);
    border-radius: 16px;
    background: rgb(var(--c-surface));
    box-shadow: 0 12px 32px -26px rgb(54 49 43 / 0.25);
    color: rgb(var(--c-heading));
    text-align: left;
  }

  .stars {
    display: flex;
    gap: 6px;
    color: rgb(var(--c-goldfinch-gold));
  }
  .stars :global(.off) {
    color: rgb(var(--c-ink) / 0.14);
  }

  .review-card blockquote {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 7;
    line-clamp: 7;
    overflow: hidden;
    overflow-wrap: anywhere;
    margin: 18px 0 0;
    color: rgb(var(--c-heading));
    font-size: 15.5px;
    line-height: 1.6;
  }
  /* A card with no stars starts at its quote. */
  .review-card > blockquote:first-child {
    margin-top: 0;
  }

  .review-more {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    width: fit-content;
    min-height: 32px;
    margin-top: 6px;
    padding: 0;
    border: 0;
    background: none;
    color: rgb(var(--c-heading));
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    transition: color 0.2s ease;
  }
  .review-more:hover {
    color: rgb(var(--c-gold-hover));
  }
  .review-more:focus-visible,
  .review-source a:focus-visible,
  .review-load:focus-visible,
  .review-dots button:focus-visible,
  .review-dialog-close:focus-visible,
  .original-review:focus-visible {
    outline: 2px solid rgb(var(--c-goldfinch-gold));
    outline-offset: 3px;
    border-radius: 4px;
  }

  .review-author {
    margin-top: auto;
    padding-top: 22px;
  }
  .review-author::before {
    content: '';
    display: block;
    height: 1px;
    margin-bottom: 22px;
    background: rgb(var(--c-ink) / 0.1);
  }
  .review-author h3 {
    margin: 0;
    overflow: hidden;
    color: rgb(var(--c-heading));
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .review-author p {
    margin: 4px 0 0;
    color: rgb(var(--c-ink) / 0.62);
    font-size: 13.5px;
    line-height: 1.4;
  }
  .review-country {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .review-country img {
    flex: none;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    object-fit: cover;
    box-shadow: 0 0 0 1px rgb(var(--c-ink) / 0.14);
  }
  .review-country span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .review-author .review-source {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
  }
  .review-source a {
    color: inherit;
    text-decoration: none;
  }
  .review-source a:hover {
    color: rgb(var(--c-heading));
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .tick {
    display: grid;
    flex: none;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: rgb(var(--c-goldfinch-gold) / 0.2);
    color: rgb(var(--c-deep-green));
  }

  /* ── Under the row ─────────────────────────────────────────────────── */
  .review-dots {
    display: none;
    justify-content: center;
    gap: 8px;
    margin-top: 18px;
  }
  .review-dots button {
    width: 8px;
    height: 8px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: rgb(var(--c-ink) / 0.2);
    cursor: pointer;
    transition:
      width 0.45s cubic-bezier(0.22, 1, 0.36, 1),
      background-color 0.3s ease;
  }
  .review-dots button.on {
    width: 22px;
    background: rgb(var(--c-heading));
  }
  .review-progress {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-top: 18px;
  }
  .review-progress .bar {
    position: relative;
    width: 132px;
    height: 3px;
    overflow: hidden;
    border-radius: 3px;
    background: rgb(var(--c-ink) / 0.14);
  }
  .review-progress .thumb {
    --w: max(16px, 100% / var(--n));
    position: absolute;
    inset: 0 auto 0 0;
    left: calc((100% - var(--w)) * var(--at) / max(1, var(--n) - 1));
    width: var(--w);
    border-radius: inherit;
    background: rgb(var(--c-heading));
    transition: left 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .review-progress .count {
    min-width: 44px;
    color: rgb(var(--c-ink) / 0.6);
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .review-actions {
    display: grid;
    justify-items: center;
    gap: 8px;
    margin-top: 28px;
  }
  .review-load {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 46px;
    padding: 0 22px;
    border: 1.5px solid rgb(var(--c-goldfinch-gold));
    border-radius: 12px;
    background: rgb(var(--c-surface));
    color: rgb(var(--c-heading));
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .review-load:hover:not(:disabled) {
    background: rgb(var(--c-goldfinch-gold) / 0.14);
  }
  .review-load:disabled {
    opacity: 0.7;
    cursor: progress;
  }
  .review-error {
    margin: 0;
    color: rgb(var(--c-ink) / 0.6);
    font-size: 12.5px;
  }

  /* ── The whole review ──────────────────────────────────────────────── */
  .review-dialog {
    width: min(92vw, 560px);
    max-height: 90dvh;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: 18px;
    background: rgb(var(--c-surface));
    color: rgb(var(--c-ink));
    box-shadow: 0 30px 80px rgb(20 22 16 / 0.35);
  }
  .review-dialog::backdrop {
    background: rgb(20 22 16 / 0.6);
  }
  .review-dialog-body {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 16px;
    max-height: 90dvh;
    padding: 24px;
    text-align: left;
  }
  .review-dialog header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .review-dialog h3 {
    margin: 0;
    color: rgb(var(--c-heading));
    font-size: 21px;
    font-weight: 600;
    line-height: 1.25;
  }
  .review-dialog header p {
    margin: 6px 0 0;
    color: rgb(var(--c-ink) / 0.62);
    font-size: 13.5px;
    line-height: 1.4;
  }
  .review-dialog-close {
    display: grid;
    flex: none;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 999px;
    background: rgb(var(--c-ink) / 0.07);
    color: rgb(var(--c-heading));
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .review-dialog-close:hover {
    background: rgb(var(--c-ink) / 0.13);
  }
  .full-review {
    min-height: 0;
    margin: 0;
    padding-right: 8px;
    overflow-y: auto;
    overscroll-behavior: contain;
    overflow-wrap: anywhere;
    color: rgb(var(--c-ink) / 0.82);
    font-size: 15.5px;
    line-height: 1.8;
    white-space: pre-line;
  }
  .full-review:focus-visible {
    outline: none;
  }
  .original-review {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    color: rgb(var(--c-heading));
    font-size: 14px;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  @media (max-width: 1023px) {
    .review-track {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .review-card {
      padding: 24px;
    }
  }

  /* Phones: an edge-to-edge rail. The review being read rests in the middle,
     its neighbours peek in either side and sit back a little, in step with the
     finger (use:rail sets --rail-abs on each card). */
  @media (max-width: 767px) {
    .review-track {
      --card: min(80vw, 380px);
      display: flex;
      gap: 10px;
      margin-inline: calc(50% - 50vw);
      padding: 6px calc((100vw - var(--card)) / 2) 12px;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
    }
    .review-track::-webkit-scrollbar {
      display: none;
    }
    .review-card {
      flex: 0 0 var(--card);
      padding: 22px;
      scale: calc(1 - var(--rail-abs, 0) * 0.05);
      scroll-snap-align: center;
      scroll-snap-stop: always;
    }
    .review-card blockquote {
      -webkit-line-clamp: 8;
      line-clamp: 8;
    }
    .review-dots,
    .review-progress {
      display: flex;
    }
    .review-actions {
      margin-top: 20px;
    }
    .review-dialog-body {
      padding: 20px;
    }
  }

  @media (max-width: 767px) and (prefers-reduced-motion: reduce) {
    .review-card {
      scale: none;
    }
    .review-progress .thumb {
      transition: none;
    }
  }
</style>
