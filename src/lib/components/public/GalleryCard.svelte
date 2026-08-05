<script module lang="ts">
  type Relation = { name?: string | null; slug?: string | null; title?: string | null } | null;

  export type GalleryCardItem = {
    alt_text?: string | null;
    caption?: string | null;
    destinations?: Relation;
    id?: string;
    image_url?: string | null;
    media_type?: 'document' | 'image' | 'video' | string | null;
    title?: string | null;
    tours?: Relation;
  };
</script>

<script lang="ts">
  import { ArrowUpRight, FileText, Film, Image as ImageIcon, MapPin } from '@lucide/svelte';
  import { imgUrl } from '$lib/img';

  export let item: GalleryCardItem;
  export let featured = false;

  $: title = item.title?.trim() || item.alt_text?.trim() || 'Gallery moment';
  $: caption = item.caption?.trim() || '';
  $: destination = item.destinations?.name?.trim() || '';
  $: tour = item.tours?.title?.trim() || '';
  $: mediaType = item.media_type || 'image';
  $: relation = destination || tour;
  $: relationHref = item.destinations?.slug ? `/destinations/${item.destinations.slug}` : item.tours?.slug ? `/tours/${item.tours.slug}` : '';
  $: mediaMeta =
    mediaType === 'video'
      ? { label: 'Video', icon: Film }
      : mediaType === 'document'
        ? { label: 'Document', icon: FileText }
        : { label: 'Photo', icon: ImageIcon };
  $: Icon = mediaMeta.icon;
</script>

<article class={`group relative isolate overflow-hidden rounded-[10px] bg-forest shadow-card ring-1 ring-black/10 transition duration-300 hover:shadow-card-hover ${featured ? 'min-h-[360px] md:row-span-2 md:min-h-[520px]' : 'min-h-[300px]'}`}>
  {#if item.image_url}
    <img
      class="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
      src={imgUrl(item.image_url, featured ? 1200 : 760)}
      alt={item.alt_text || title}
      loading={featured ? 'eager' : 'lazy'}
      decoding="async"
    />
  {:else}
    <div class="absolute inset-0 grid place-items-center bg-gradient-to-br from-forest to-deep-green text-white/30"><ImageIcon size={40} /></div>
  {/if}

  <!-- Scrims: darker top for badge legibility, strong bottom for text contrast. -->
  <div class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 via-black/15 to-transparent" aria-hidden="true"></div>
  <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5 transition duration-500 group-hover:from-black/92" aria-hidden="true"></div>
  <div class="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100" style="background: radial-gradient(circle at 72% 12%, rgba(214,169,80,0.30), transparent 36%);" aria-hidden="true"></div>

  <div class="relative z-10 flex h-full min-h-[inherit] flex-col justify-between p-4 md:p-5 text-white">
    <div class="flex items-start gap-3">
      {#if mediaType !== 'image'}
        <span class="inline-flex items-center gap-1.5 rounded-[7px] bg-black/50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white ring-1 ring-white/25 backdrop-blur">
          <Icon size={13} strokeWidth={2.5} /> {mediaMeta.label}
        </span>
      {/if}
      {#if relation}
        <span class="ml-auto inline-flex max-w-[72%] items-center gap-1.5 truncate rounded-[7px] bg-black/50 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
          <MapPin size={12} strokeWidth={2.5} class="shrink-0 text-goldfinch-gold" /> <span class="truncate">{relation}</span>
        </span>
      {/if}
    </div>

    <div>
      <h3 class={`max-w-xl font-semibold leading-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.55)] ${featured ? 'text-2xl md:text-[32px]' : 'text-lg md:text-xl'}`}>{title}</h3>
      {#if caption}
        <p class={`mt-2 max-w-lg text-sm leading-6 text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] ${featured ? 'line-clamp-3' : 'line-clamp-2'}`}>{caption}</p>
      {/if}
      {#if relation && relationHref}
        <a
          class="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[7px] bg-goldfinch-gold px-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-heading shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          href={relationHref}
        >
          Explore {relation} <ArrowUpRight size={14} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
        </a>
      {/if}
    </div>
  </div>
</article>
