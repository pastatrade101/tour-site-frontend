<script lang="ts">
  /**
   * Closing conversion band for the destinations index.
   *
   * Everything stated here is either qualitative (how Goldfinch plans) or the
   * one number the CMS actually holds — how many destinations are published.
   * No ratings, review counts, trip totals or awards: none of that exists in
   * the database, so none of it appears on the page.
   *
   * The photograph is an enhancement, never a requirement. With no image the
   * band falls back to the brand green plus the house dot texture and a warm
   * gold glow, which is a deliberate treatment rather than an empty frame.
   */
  import { ArrowRight, MapPin, MessageCircle, PenLine, ShieldCheck, Users } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { fadeUpOnScroll } from '$lib/animations';
  import Img from '../Img.svelte';

  /** Optional background photograph. Any destination image works — it is scrimmed hard. */
  export let image = '';
  export let imageRecord: Record<string, any> | null | undefined = undefined;
  /** Full https wa.me link, or empty to hide the WhatsApp button entirely. */
  export let whatsapp = '';
  /** Number of published destinations. The only count on this page that is real. */
  export let total = 0;

  type TrustPoint = { icon: typeof MapPin; text: string };

  // CMS image/settings fields arrive null often enough that coercing here is
  // cheaper than making every caller remember `?? ''`.
  $: imageSrc = typeof image === 'string' ? image.trim() : '';
  $: waRaw = typeof whatsapp === 'string' ? whatsapp.trim() : '';

  // Only ever follow an absolute https link — a malformed setting must not
  // become a javascript: or data: href.
  $: waHref = /^https:\/\//i.test(waRaw) ? waRaw : '';
  $: destinationCount = Number.isFinite(total) && total > 0 ? Math.round(total) : 0;

  $: trustPoints = [
    destinationCount
      ? {
          icon: MapPin,
          text: `${destinationCount} ${destinationCount === 1 ? 'destination' : 'destinations'} to choose from`
        }
      : null,
    { icon: Users, text: 'Planned by our team in Tanzania' },
    { icon: PenLine, text: 'Tailor-made itineraries' },
    { icon: ShieldCheck, text: 'No obligation to book' }
  ].filter((point): point is TrustPoint => point !== null);
</script>

<section class="relative isolate overflow-hidden bg-deep-green text-white" aria-labelledby="destinations-cta-heading">
  {#if imageSrc}
    <Img
      record={imageRecord}
      fields={['banner_image_url', 'main_image_url', 'image_url']}
      src={imageRecord ? '' : imageSrc}
      alt=""
      width={1800}
      sizes="100vw"
      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.18]"
    />
    <!-- Scrim holds the band close to brand green so AA contrast survives any
         photograph, including a bright sky filling the headline area. -->
    <span
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-deep-green via-deep-green/72 to-deep-green"
      aria-hidden="true"
    ></span>
  {:else}
    <span
      class="pointer-events-none absolute inset-0 opacity-[0.06]"
      style="background-image: radial-gradient(circle, #F1E3C8 1px, transparent 1.5px); background-size: 24px 24px;"
      aria-hidden="true"
    ></span>
  {/if}

  <span
    class="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-goldfinch-gold/15 blur-3xl"
    aria-hidden="true"
  ></span>
  <span
    class="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-goldfinch-gold/10 blur-3xl"
    aria-hidden="true"
  ></span>

  <div class="container-shell relative py-20 md:py-28">
    <div class="mx-auto max-w-3xl text-center" use:fadeUpOnScroll={{ y: 16 }}>
      <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">Plan with Goldfinch</p>

      <h2
        id="destinations-cta-heading"
        class="mt-5 font-serif text-4xl font-bold leading-[1.08] text-white md:text-5xl lg:text-[56px]"
      >
        Not sure where to begin?
      </h2>

      <p class="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/80 md:text-lg md:leading-9">
        Tell us roughly when you would like to travel and what you would like to see, and our planners
        in Tanzania will shape a route around it.
      </p>

      <div class="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <a
          class="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-goldfinch-gold px-7 text-[15px] font-bold text-heading shadow-lg shadow-black/20 transition duration-200 ease-out hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto"
          href="/plan-my-trip"
          on:click={() => trackEvent('cta_click', { cta_name: 'Plan my trip', cta_location: 'destinations_cta' })}
        >
          Plan my trip
          <ArrowRight size={17} strokeWidth={2.4} aria-hidden="true" />
        </a>

        {#if waHref}
          <a
            class="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] border border-white/35 bg-white/[0.06] px-7 text-[15px] font-bold text-white backdrop-blur transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/55 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            on:click={() => trackEvent('whatsapp_click', { cta_location: 'destinations_cta' })}
          >
            <MessageCircle size={17} strokeWidth={2.4} aria-hidden="true" />
            Talk on WhatsApp
          </a>
        {/if}
      </div>

      <ul
        class="mx-auto mt-12 grid max-w-3xl gap-x-10 gap-y-4 border-t border-white/10 pt-8 text-left sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-center lg:gap-x-8"
      >
        {#each trustPoints as point (point.text)}
          <li class="flex items-center gap-2.5 text-sm font-medium leading-6 text-white/75">
            <svelte:component this={point.icon} size={16} strokeWidth={2.2} class="shrink-0 text-goldfinch-gold" aria-hidden="true" />
            <span>{point.text}</span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</section>
