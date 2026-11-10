<script lang="ts">
  /**
   * The Travel Journal article: a structured guide from the CMS, or a simple
   * article split at its H2s — both read with the same header, "At a glance",
   * hero photo, "On this page" navigation, closing call to action and related
   * reads. Every word on it comes from the article record or the UI dictionary.
   */
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ArrowRight, ChevronDown, Clock } from '@lucide/svelte';
  import { t } from '$lib/i18n/ui';
  import { localeFromPath } from '$lib/i18n';
  import { cdnUrl } from '$lib/img';
  import { hasRichContent, toMetaText } from '$lib/richText';
  import { breadcrumbLd } from '$lib/seo';
  import { articleLayout, categoryHref, isExternal, postHref, readingMinutes } from '$lib/journal';
  import type { BlogPost } from '$lib/types';
  import Img from '../Img.svelte';
  import JsonLd from '../JsonLd.svelte';
  import RichText from '../RichText.svelte';
  import JournalBlock from './JournalBlock.svelte';
  import JournalBreadcrumbs from './JournalBreadcrumbs.svelte';

  export let post: BlogPost;
  /** Onward reading: the editor's picks, or newer articles from the same category. */
  export let related: BlogPost[] = [];

  $: origin = $page.url.origin;
  $: locale = localeFromPath($page.url.pathname);
  $: category = post.blog_categories ?? null;
  $: layout = articleLayout(post);
  $: guide = post.guide ?? {};
  $: takeaways = (guide.takeaways ?? []).filter((line) => line.trim());
  $: minutes = readingMinutes(post);
  $: eyebrow = post.blog_topic_groups?.title || category?.name || '';
  $: published = post.published_at ? new Date(post.published_at) : null;
  $: publishedLabel = published && !Number.isNaN(published.getTime())
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(published)
    : '';
  $: finalCta = guide.final_cta ?? {};
  $: ctaHeading = finalCta.heading?.trim() || $t('journal.final_heading');
  $: ctaText = finalCta.heading?.trim() ? finalCta.text?.trim() ?? '' : $t('journal.final_text');
  $: ctaHref = finalCta.href?.trim() || '/plan-my-trip';
  $: crumbs = [
    { label: $t('nav.home'), href: '/' },
    { label: $t('journal.hub_title'), href: '/blog' },
    ...(category ? [{ label: category.name, href: categoryHref(category) }] : []),
    { label: post.title }
  ];

  // ── "On this page": the section the reader is in ─────────────────────────
  $: hasToc = layout.sections.length > 1;
  let active = '';
  let tocOpen = false;
  onMount(() => {
    let frame = 0;
    const update = () => {
      const nodes = layout.sections.map((section) => document.getElementById(section.id)).filter((node): node is HTMLElement => node !== null);
      // Header + pinned breadcrumb bar + a little air.
      const line = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 70) + 90;
      const passed = nodes.filter((node) => node.getBoundingClientRect().top <= line);
      active = (passed.at(-1) ?? nodes[0])?.id ?? '';
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  });

  // ── Structured data ──────────────────────────────────────────────────────
  $: path = postHref(post);
  $: description = toMetaText(post.meta_description || post.excerpt || guide.quick_answer || post.content || '', 170);
  $: articleLd = {
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    mainEntityOfPage: `${origin}${path}`,
    url: `${origin}${path}`,
    ...(post.og_image_url || post.featured_image_url ? { image: cdnUrl(post.og_image_url || post.featured_image_url || '') } : {}),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    ...(post.updated_at ? { dateModified: post.updated_at } : {}),
    author: post.author_name ? { '@type': 'Organization', name: post.author_name } : { '@id': `${origin}/#organization` },
    publisher: { '@id': `${origin}/#organization` }
  };
  $: faqs = layout.structured
    ? layout.sections.flatMap((section) => section.blocks.filter((block) => block.type === 'faq').flatMap((block) => (Array.isArray(block.items) ? block.items : [])))
        .filter((item) => item?.question?.trim() && hasRichContent(item.answer))
    : [];
  $: faqLd = faqs.length
    ? { '@type': 'FAQPage', mainEntity: faqs.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: toMetaText(item.answer, 1000) } })) }
    : null;
  $: crumbLd = breadcrumbLd(origin, crumbs.map((crumb, i) => ({ name: crumb.label, path: crumb.href ?? (i === crumbs.length - 1 ? path : '/') })));
</script>

<JsonLd data={crumbLd} />
<JsonLd data={articleLd} />
{#if faqLd}<JsonLd data={faqLd} />{/if}

<div class="journal-article">
  <JournalBreadcrumbs items={crumbs} />

  <div class="container-shell">
    <header class="mx-auto max-w-[800px] pb-7 pt-[60px] xl:pt-10">
      {#if eyebrow}<p class="text-xs font-semibold uppercase tracking-[0.14em] text-clay">{eyebrow}</p>{/if}
      <h1 class="mt-3 font-serif text-[30px] font-semibold leading-[1.2] text-heading md:text-[42px]">{post.title}</h1>
      {#if post.excerpt}<p class="mt-4 text-base leading-relaxed text-ink/70 md:text-[17px]">{post.excerpt}</p>{/if}
      <div class="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/60">
        <span class="inline-flex items-center gap-1.5"><Clock size={14} aria-hidden="true" />{$t('journal.min_read').replace('{n}', String(minutes))}</span>
        {#if publishedLabel}<span>{$t('journal.published')} <time datetime={post.published_at}>{publishedLabel}</time></span>{/if}
        {#if post.author_name}<span>{$t('journal.by')} {post.author_name}</span>{/if}
      </div>
    </header>

    {#if hasToc}
      <!-- Phones and tablets: contents in an accordion above the text. -->
      <div class="mx-auto mb-6 max-w-[800px] overflow-hidden rounded-[10px] border border-ink/10 lg:hidden">
        <button type="button" class="flex min-h-11 w-full items-center justify-between bg-canvas px-4 py-3.5 text-left text-[15px] font-semibold text-heading" aria-expanded={tocOpen} aria-controls="journal-mobile-toc" on:click={() => (tocOpen = !tocOpen)}>
          {$t('journal.on_this_page')}<ChevronDown size={16} class="shrink-0 transition-transform {tocOpen ? 'rotate-180' : ''}" />
        </button>
        <nav id="journal-mobile-toc" aria-label={$t('journal.on_this_page')} hidden={!tocOpen} class="px-4">
          <ol>
            {#each layout.sections as section (section.id)}
              <li><a href="#{section.id}" on:click={() => (tocOpen = false)} aria-current={active === section.id ? 'location' : undefined} class="flex min-h-11 items-center border-l-2 py-2 pl-3 text-[15px] leading-snug {active === section.id ? 'border-heading text-heading' : 'border-transparent text-ink/65'}">{section.toc}</a></li>
            {/each}
          </ol>
        </nav>
      </div>
    {/if}

    <div class="journal-prose mx-auto max-w-[800px]">
      {#if guide.quick_answer?.trim()}
        <p class="mb-5 font-serif text-[19px] font-medium leading-[1.65] text-heading md:text-[23px]">{guide.quick_answer}</p>
      {/if}
      {#if hasRichContent(guide.intro)}<RichText value={guide.intro} />{/if}
      {#if takeaways.length}
        <aside class="mt-6 border-y border-ink/10 py-5" aria-labelledby="journal-at-a-glance">
          <h2 id="journal-at-a-glance" class="text-sm font-semibold uppercase tracking-[0.12em] text-heading">{$t('journal.at_a_glance')}</h2>
          <ul class="mt-4 divide-y divide-ink/10">
            {#each takeaways as item, i (i)}
              <li class="flex gap-4 py-3 text-base leading-relaxed text-ink/75 first:pt-0 last:pb-0"><span class="pt-0.5 text-xs font-semibold text-heading" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><span>{item}</span></li>
            {/each}
          </ul>
        </aside>
      {/if}
    </div>

    {#if post.featured_image_url}
      <figure class="my-7 md:my-9">
        <Img record={post} fields={['featured_image_url']} alt={post.featured_image_alt || post.title} width={1500} sizes="(max-width: 1240px) 94vw, 1180px" eager aspect="16/9" className="aspect-video w-full rounded-[10px] object-cover" />
        {#if post.image_credit}<figcaption class="mt-2 text-xs text-ink/55">{post.image_credit}</figcaption>{/if}
      </figure>
    {/if}

    <!-- With a contents list: list beside the text. Without one: the text in the same centred column as the title. -->
    <div class="grid gap-6 pb-10 {hasToc ? 'lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12' : ''}">
      {#if hasToc}
      <aside class="hidden lg:block">
          <div class="sticky top-[calc(var(--nav-h,70px)_+_72px)]">
            <p class="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-heading">{$t('journal.on_this_page')}</p>
            <nav aria-label={$t('journal.on_this_page')}>
              <ol class="space-y-1">
                {#each layout.sections as section (section.id)}
                  <li><a href="#{section.id}" aria-current={active === section.id ? 'location' : undefined} class="block border-l-2 py-2 pl-3 text-sm leading-relaxed transition-colors hover:text-heading {active === section.id ? 'border-goldfinch-gold text-heading' : 'border-transparent text-ink/60'}">{section.toc}</a></li>
                {/each}
              </ol>
            </nav>
            {#if category}
              <a href={categoryHref(category)} class="mt-6 inline-flex items-center gap-1 text-[13.5px] font-semibold text-clay hover:underline">← {$t('journal.back_to_category')}</a>
            {/if}
          </div>
      </aside>
      {/if}

      <article class="journal-prose mx-auto w-full min-w-0 max-w-[800px] {hasToc ? 'lg:mx-0' : ''}">
        {#if hasRichContent(layout.lead)}<RichText value={layout.lead} />{/if}
        {#each layout.sections as section, i (section.id)}
          <section id={section.id} class="scroll-mt-[calc(var(--nav-h,70px)_+_64px)] {i > 0 || hasRichContent(layout.lead) ? 'mt-12' : ''}">
            {#if section.title}<h2 class="mb-6 font-serif text-[24px] font-semibold leading-[1.35] text-heading md:text-[28px]">{section.title}</h2>{/if}
            <div class="space-y-5">
              {#each section.blocks as block (block._id)}
                <JournalBlock {block} />
              {/each}
            </div>
          </section>
        {/each}

        <aside class="my-12 border-y border-t-2 border-ink/10 border-t-heading/60 py-7">
          <h2 class="font-serif text-[24px] font-semibold leading-snug text-heading md:text-[28px]">{ctaHeading}</h2>
          {#if ctaText}<p class="mt-3 text-[16px] leading-relaxed text-ink/70 md:text-[17px]">{ctaText}</p>{/if}
          <div class="mt-6 flex flex-wrap items-center gap-3 sm:gap-x-6">
            <a
              href={ctaHref}
              target={isExternal(ctaHref) ? '_blank' : undefined}
              rel={isExternal(ctaHref) ? 'noopener noreferrer' : undefined}
              class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-6 text-base font-semibold text-heading transition-colors hover:bg-gold-hover sm:w-auto"
            >{finalCta.button?.trim() || $t('cta.plan_my_trip')}<ArrowRight size={16} /></a>
            {#if finalCta.secondary_label?.trim() && finalCta.secondary_href?.trim()}
              <a href={finalCta.secondary_href} class="inline-flex min-h-11 items-center gap-2 font-semibold text-heading underline-offset-4 hover:underline">{finalCta.secondary_label}<ArrowRight size={16} /></a>
            {/if}
          </div>
        </aside>

        {#if post.author_name}
          <footer class="border-t border-ink/10 py-5 text-sm text-ink/60">{$t('journal.written_by')} {post.author_name}</footer>
        {/if}
      </article>
    </div>

    {#if related.length}
      <section class="border-t border-ink/10 pb-12 pt-8" aria-labelledby="journal-related">
        <h2 id="journal-related" class="font-serif text-[22px] font-semibold text-heading md:text-[26px]">{$t('journal.continue_exploring')}</h2>
        <div class="mt-5 grid gap-6 md:grid-cols-3">
          {#each related.slice(0, 3) as item (item.id)}
            <article class="group min-w-0">
              <a href={postHref(item)} class="block">
                {#if item.featured_image_url}
                  <Img record={item} fields={['featured_image_url']} alt="" width={640} sizes="(max-width: 768px) 92vw, 380px" className="aspect-video w-full rounded-[8px] object-cover" />
                {/if}
                <h3 class="mt-3 font-serif text-[18px] font-semibold leading-snug text-heading transition-colors group-hover:text-clay">{item.title}</h3>
                <span class="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-heading">{$t('cta.read_guide')} <ArrowRight size={16} class="transition-transform group-hover:translate-x-1" /></span>
              </a>
            </article>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>

<style>
  .journal-prose {
    color: rgb(var(--c-ink) / 0.78);
    font-size: 17px;
    line-height: 1.8;
  }
  @media (min-width: 768px) {
    .journal-prose { font-size: 18px; line-height: 1.85; }
  }
  :global(html:has(.journal-article)) { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) {
    :global(html:has(.journal-article)) { scroll-behavior: auto; }
  }
</style>
