<script lang="ts">
  import {
    ArrowRight, BadgeCheck, CalendarCheck, Camera, Car, ChevronLeft, ChevronRight,
    Clock, Compass, CreditCard, ExternalLink, Flag, Headphones, Leaf, MapPin, Mountain, Plane, Quote, ShieldCheck,
    Sparkles, Star, Tent, Users
  } from '@lucide/svelte';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';
  import { fadeUpOnScroll, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import Img from '$lib/components/public/Img.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import type { Specialist } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: s = $publicSettings;
  $: heroImage = settingText(s, 'about_hero_image') || '/images/surf-hero.jpg';

  // ── Editable content — replace with your real details in the CMS or here ────
  // Honest brand-true tiles (no unverified numbers). Add real figures if you have
  // them, e.g. { value: '10+', label: 'Years operating' }.
  const STATS = [
    { icon: Compass, value: '100%', label: 'Tailor-made safaris' },
    { icon: MapPin, value: 'Local', label: 'Arusha-based experts' },
    { icon: Users, value: 'Private', label: 'Just your group' },
    { icon: Clock, value: '24/7', label: 'On-trip support' }
  ];

  const STORY_STEPS = [
    { icon: Flag, label: 'Founded in Arusha' },
    { icon: Users, label: 'Welcoming guests from abroad' },
    { icon: MapPin, label: 'Expanded across Tanzania' },
    { icon: Camera, label: 'Memories created together' }
  ];

  const WHY = [
    { icon: Compass, title: '100% Tailor-made', body: 'We design your Tanzania safari entirely around your wishes — unique and personal.' },
    { icon: CreditCard, title: 'No Hidden Fees', body: 'Transparent prices: on your safari there are no extra or surprise costs.' },
    { icon: MapPin, title: 'Local Expertise', body: 'Rooted in Arusha, we know Tanzania — for authentic safari moments that last.' },
    { icon: BadgeCheck, title: 'Flexible Payment', body: 'We accept many payment methods and offer fair cancellation policies.' },
    { icon: Clock, title: '24/7 Support', body: 'Throughout your safari, experienced guides are always there for you.' },
    { icon: Leaf, title: 'Fair & Sustainable', body: 'We act responsibly — with respect for people, wildlife & nature.' }
  ];

  const SERVICES = [
    { icon: Car, title: 'Transfers', body: 'Reliable transfers from all major airports and cities in Tanzania & Zanzibar — straight to your safari.' },
    { icon: Plane, title: 'Domestic Flights', body: 'We book domestic flights in Tanzania for easy access to even the most remote safari regions.' },
    { icon: Car, title: 'Car Rentals', body: 'A reliable fleet in Arusha & Zanzibar — from sturdy jeeps to spacious vans for your safari.' },
    { icon: CalendarCheck, title: 'Guaranteed Departures', body: 'A wide range of safaris and tours throughout Tanzania — with all departures guaranteed to run.' },
    { icon: Headphones, title: 'Expert Assistance', body: 'We help you plan your Tanzania safari — with personal advice and local insights.' },
    { icon: Mountain, title: 'Guided Hikes', body: 'Kilimanjaro & Mount Meru — from day hikes to multi-day climbs with experienced guides.' },
    { icon: ShieldCheck, title: 'Hotel Price Guarantee', body: 'The best deals for safari lodges, camps & beach hotels on Zanzibar and along the coast.' },
    { icon: Tent, title: 'Equipment Rentals', body: 'Well-maintained camping and outdoor gear for your safari adventure.' }
  ];

  const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const specialistPhoto = (specialist: Specialist) => specialist.photo_url || specialist.photo || '';

  // Only list genuine affiliations/certifications your company actually holds.
  const PARTNERS = ['TATO', 'Tanzania National Parks', 'TripAdvisor', 'Safe Travels', 'Travelife', 'IUCN'];

  const DEFAULT_FAQS = [
    { question: 'Why should I choose Goldfinch Adventures?', answer: 'We are a locally based Arusha team that designs private, tailor-made safaris around your interests, pace and budget — with honest advice and on-trip support the whole way.' },
    { question: 'Can I customise my safari?', answer: 'Yes — every itinerary is built around you. Tell us your dates, group and must-see places and we shape a plan to match.' },
    { question: 'When is the best time to visit Tanzania?', answer: 'Tanzania is a year-round destination. The dry season (late June–October) is easiest for game viewing; the green season brings lush scenery and fewer vehicles. We time your trip to what matters most to you.' },
    { question: 'How do payments work?', answer: 'A deposit secures your booking, with the balance due before travel. We accept several payment methods and share clear terms up front — no hidden fees.' },
    { question: 'Are children allowed on safari?', answer: 'Absolutely. We plan family-friendly pacing, suitable lodges and shorter game drives so younger travellers enjoy every day.' },
    { question: 'Can dietary needs be accommodated?', answer: 'Yes — tell us about any dietary requirements or allergies and we arrange meals accordingly throughout your trip.' }
  ];
  $: faqs = (data.faqs ?? []).length ? data.faqs : DEFAULT_FAQS;
  $: specialists = data.specialists ?? [];

  // Real published guest reviews only — carousel hides when there are none.
  $: testimonials = data.testimonials ?? [];
  let tIndex = 0;
  $: activeT = testimonials.length ? testimonials[((tIndex % testimonials.length) + testimonials.length) % testimonials.length] : null;
</script>

<svelte:head>
  <title>About Us | {brand.name}</title>
  <meta name="description" content="Goldfinch Adventures is a locally based safari company in Arusha, crafting tailor-made private journeys across Tanzania with expert guides and genuine hospitality." />
</svelte:head>

<!-- ── Hero ─────────────────────────────────────────────────────────────── -->
<section class="relative isolate overflow-hidden bg-deep-green text-white">
  <Img src={heroImage} alt="" width={1800} sizes="100vw" eager className="absolute inset-0 h-full w-full object-cover" />
  <div class="absolute inset-0 bg-[linear-gradient(105deg,rgba(12,16,12,0.86)_0%,rgba(12,16,12,0.55)_45%,rgba(12,16,12,0.25)_100%)]"></div>
  <div class="container-shell relative grid gap-10 py-20 md:py-28 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
    <div class="max-w-2xl [text-shadow:0_2px_18px_rgba(0,0,0,0.45)]">
      <p class="text-sm font-extrabold uppercase tracking-[0.22em] text-goldfinch-gold">About</p>
      <h1 class="mt-3 font-serif text-5xl font-semibold uppercase leading-[0.98] tracking-tight md:text-7xl">
        Goldfinch<br />Adventures
      </h1>
      <p class="mt-5 max-w-xl font-serif text-xl font-light italic text-white/90 md:text-2xl">Creating extraordinary African journeys, designed around you.</p>
      <p class="mt-5 max-w-xl text-[15px] leading-7 text-white/80">
        We are a locally based safari company in Arusha, crafting unforgettable private journeys across Tanzania with authentic experiences, expert guides and genuine hospitality.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a class="inline-flex h-12 items-center gap-2 rounded-[10px] bg-goldfinch-gold px-6 text-sm font-extrabold text-heading shadow-lg transition hover:brightness-105" href="/plan-my-trip">Plan Your Safari <ArrowRight size={17} strokeWidth={2.6} /></a>
        <a class="inline-flex h-12 items-center gap-2 rounded-[10px] border border-white/40 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15" href="/contact">Talk to a Safari Expert <ArrowRight size={16} /></a>
      </div>
    </div>

    <!-- stats card -->
    <div class="rounded-[16px] border border-white/15 bg-black/35 p-6 backdrop-blur-md">
      <div class="grid gap-5">
        {#each STATS as stat}
          <div class="flex items-center gap-4">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-goldfinch-gold/15 text-goldfinch-gold ring-1 ring-goldfinch-gold/30">
              <svelte:component this={stat.icon} size={20} strokeWidth={2} />
            </span>
            <div>
              <p class="text-xl font-extrabold leading-none text-white">{stat.value}</p>
              <p class="mt-1 text-[13px] font-medium text-white/70">{stat.label}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<!-- ── Our Story ────────────────────────────────────────────────────────── -->
<section class="bg-surface py-16 md:py-24" use:sectionReveal>
  <div class="container-shell grid gap-10 lg:grid-cols-2 lg:items-center">
    <div class="overflow-hidden rounded-[14px] shadow-[0_24px_60px_rgba(57,61,50,0.16)]" use:fadeUpOnScroll={{ y: 16 }}>
      <Img
        src={settingText(s, 'about_story_image') || heroImage}
        alt="Safari in Tanzania"
        width={1000}
        sizes="(max-width: 1024px) 92vw, 46vw"
        aspect="4/3"
        className="aspect-[4/3] w-full object-cover"
      />
    </div>
    <div use:fadeUpOnScroll={{ y: 16, delay: 0.08 }}>
      <p class="text-sm font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Our Story</p>
      <h2 class="mt-3 font-serif text-3xl font-semibold text-heading md:text-[40px]">More Than A Safari Company</h2>
      <div class="mt-5 grid gap-4 text-[15px] leading-7 text-ink/75">
        <p>Goldfinch Adventures was founded on one simple belief: <span class="font-semibold text-heading">every traveller deserves a safari that feels personal.</span></p>
        <p>We are not a mass-tour operator selling identical itineraries. We design journeys around your dreams, interests, travel style and pace.</p>
        <p>From witnessing the Great Migration in the Serengeti, to climbing Kilimanjaro, to relaxing on Zanzibar's beaches — every itinerary is handcrafted by local experts who know Tanzania intimately.</p>
        <p>Our mission is to create experiences that stay with you long after your journey ends.</p>
      </div>
    </div>
  </div>

  <!-- journey timeline -->
  <div class="container-shell mt-12">
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
      {#each STORY_STEPS as step, i}
        <div class="relative flex flex-col items-center text-center">
          <span class="grid h-14 w-14 place-items-center rounded-full border border-forest/20 bg-sand/50 text-forest">
            <svelte:component this={step.icon} size={22} strokeWidth={1.8} />
          </span>
          <p class="mt-3 max-w-[10rem] text-sm font-semibold text-heading">{step.label}</p>
          {#if i < STORY_STEPS.length - 1}
            <ArrowRight size={16} class="absolute right-[-8px] top-5 hidden text-ink/25 lg:block" />
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ── Why travel with us ───────────────────────────────────────────────── -->
<section class="bg-canvas py-16 md:py-24" use:sectionReveal>
  <div class="container-shell">
    <div class="max-w-2xl">
      <p class="text-sm font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Why Travel With Us</p>
      <h2 class="mt-3 font-serif text-3xl font-semibold text-heading md:text-[40px]">Why Your Safari With Us Will Be Unforgettable</h2>
    </div>
    <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.05 }}>
      {#each WHY as f}
        <div class="rounded-[12px] border border-ink/10 bg-surface p-6 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-card-hover">
          <span class="grid h-12 w-12 place-items-center rounded-[10px] bg-goldfinch-gold/12 text-goldfinch-gold ring-1 ring-goldfinch-gold/25">
            <svelte:component this={f.icon} size={22} strokeWidth={2} />
          </span>
          <h3 class="mt-4 text-lg font-bold text-heading">{f.title}</h3>
          <p class="mt-2 text-sm leading-6 text-ink/70">{f.body}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ── Our services ─────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-deep-green py-16 text-white md:py-24" use:sectionReveal>
  <div class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.5px); background-size: 30px 30px;" aria-hidden="true"></div>
  <div class="container-shell relative">
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-sm font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Our Services For You</p>
      <p class="mt-4 font-serif text-xl font-light italic text-white/85 md:text-2xl">“As we lose ourselves in the service of others we discover our own lives and our own happiness.”</p>
      <p class="mt-2 text-sm font-semibold text-white/60">Dieter F. Uchtdorf</p>
    </div>
    <div class="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4" use:staggeredCardReveal={{ y: 16, stagger: 0.04 }}>
      {#each SERVICES as sv}
        <div class="flex gap-3.5">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/95 text-forest shadow-sm">
            <svelte:component this={sv.icon} size={20} strokeWidth={2} />
          </span>
          <div>
            <h3 class="text-[15px] font-bold text-white">{sv.title}</h3>
            <p class="mt-1.5 text-[13px] leading-6 text-white/65">{sv.body}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ── Meet the specialists ─────────────────────────────────────────────── -->
{#if specialists.length}
  <section class="bg-surface py-16 md:py-24" use:sectionReveal>
    <div class="container-shell">
      <div class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Meet The Team</p>
        <h2 class="mt-3 font-serif text-3xl font-semibold text-heading md:text-[40px]">The People Behind Your Safari</h2>
      </div>
      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.05 }}>
        {#each specialists as specialist (specialist.id ?? specialist.name)}
          {@const photo = specialistPhoto(specialist)}
          <article class="group overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-forest/20 hover:shadow-card-hover">
            <div class="relative aspect-square overflow-hidden bg-deep-green">
              {#if photo}
                <Img
                  record={specialist}
                  fields={['photo_url', 'photo']}
                  src={photo}
                  alt={specialist.name}
                  width={640}
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 360px"
                  aspect="1/1"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              {:else}
                <div class="grid h-full w-full place-items-center bg-gradient-to-br from-forest to-deep-green">
                  <span class="font-serif text-5xl font-semibold text-goldfinch-gold">{initials(specialist.name)}</span>
                </div>
              {/if}
              <div class="absolute inset-0 bg-gradient-to-t from-deep-green/80 via-deep-green/20 to-transparent"></div>
              <div class="absolute inset-x-0 bottom-0 p-5">
                <p class="font-serif text-2xl font-semibold leading-tight text-white">{specialist.name}</p>
                <p class="mt-1 text-sm font-bold text-goldfinch-gold">{specialist.role}</p>
              </div>
            </div>
            <div class="p-5">
              {#if specialist.blurb}
                <p class="text-sm leading-6 text-ink/70">{specialist.blurb}</p>
              {/if}
              <div class="mt-4 flex flex-wrap gap-2 border-t border-ink/8 pt-4">
                {#if specialist.is_featured}
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-goldfinch-gold/15 px-3 py-1.5 text-xs font-bold text-heading">
                    <Star size={13} fill="currentColor" /> Featured specialist
                  </span>
                {/if}
                {#if specialist.tripadvisor_url}
                  <a
                    class="inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-sand/45 px-3 py-1.5 text-xs font-bold text-heading transition hover:border-clay/35 hover:bg-sand"
                    href={specialist.tripadvisor_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    TripAdvisor <ExternalLink size={13} />
                  </a>
                {/if}
              </div>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── Partners + guest reviews ─────────────────────────────────────────── -->
<section class="bg-canvas py-16 md:py-20" use:sectionReveal>
  <div class="container-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
    <div>
      <p class="text-sm font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Our Partners</p>
      <h2 class="mt-3 font-serif text-2xl font-semibold text-heading md:text-3xl">Proudly Working With</h2>
      <div class="mt-6 flex flex-wrap gap-2.5">
        {#each PARTNERS as p}
          <span class="inline-flex items-center gap-2 rounded-[8px] border border-ink/12 bg-surface px-4 py-2.5 text-sm font-bold text-ink/70 shadow-sm">
            <BadgeCheck size={15} class="text-forest" /> {p}
          </span>
        {/each}
      </div>
    </div>

    {#if activeT}
      <div class="rounded-[16px] border border-goldfinch-gold/20 bg-surface p-7 shadow-[0_18px_50px_rgba(57,61,50,0.08)] md:p-9">
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-goldfinch-gold">What Our Guests Say</p>
        <Quote size={30} class="mt-4 text-goldfinch-gold/40" />
        {#if activeT.rating}
          <div class="mt-2 flex gap-0.5 text-goldfinch-gold">
            {#each Array(Math.max(0, Math.min(5, activeT.rating))) as _}<Star size={16} fill="currentColor" strokeWidth={0} />{/each}
          </div>
        {/if}
        <p class="mt-3 font-serif text-lg font-light leading-8 text-heading md:text-xl">“{activeT.message}”</p>
        <div class="mt-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            {#if activeT.client_image_url}
              <Img
                record={activeT}
                fields={['client_image_url']}
                alt={activeT.client_name}
                width={96}
                height={96}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-goldfinch-gold/30"
              />
            {:else}
              <span class="grid h-11 w-11 place-items-center rounded-full bg-forest/10 font-bold text-forest">{initials(activeT.client_name)}</span>
            {/if}
            <div>
              <p class="font-bold text-heading">{activeT.client_name}</p>
              {#if activeT.client_country}<p class="text-xs text-ink/55">{activeT.client_country}</p>{/if}
            </div>
          </div>
          {#if testimonials.length > 1}
            <div class="flex gap-2">
              <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-ink/12 bg-surface text-ink/60 transition hover:border-forest/30 hover:text-forest" aria-label="Previous" on:click={() => (tIndex -= 1)}><ChevronLeft size={17} /></button>
              <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-ink/12 bg-surface text-ink/60 transition hover:border-forest/30 hover:text-forest" aria-label="Next" on:click={() => (tIndex += 1)}><ChevronRight size={17} /></button>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</section>

<!-- ── FAQ ──────────────────────────────────────────────────────────────── -->
<section class="bg-sand/40 py-16 md:py-20" use:sectionReveal>
  <div class="container-shell">
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-sm font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Frequently Asked Questions</p>
      <h2 class="mt-3 font-serif text-3xl font-semibold text-heading md:text-[38px]">Everything You Need to Know</h2>
    </div>
    <div class="mx-auto mt-12 max-w-4xl md:mt-14">
      <FAQAccordion {faqs} />
    </div>
  </div>
</section>

<!-- ── Final CTA ────────────────────────────────────────────────────────── -->
<section class="relative isolate overflow-hidden bg-deep-green text-white">
  <Img src={heroImage} alt="" width={1800} sizes="100vw" className="absolute inset-0 h-full w-full object-cover opacity-45" />
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,16,12,0.7),rgba(12,16,12,0.82))]"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <Sparkles size={24} class="mx-auto text-goldfinch-gold" />
    <h2 class="mt-4 font-serif text-3xl font-semibold md:text-[42px]">Your African Adventure Starts Here</h2>
    <p class="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-white/80">
      Whether you're dreaming of the Great Migration, climbing Kilimanjaro, or relaxing in Zanzibar, we're ready to create the perfect journey.
    </p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <a class="inline-flex h-12 items-center gap-2 rounded-[10px] bg-goldfinch-gold px-7 text-sm font-extrabold text-heading shadow-lg transition hover:brightness-105" href="/plan-my-trip">Plan My Safari <ArrowRight size={17} strokeWidth={2.6} /></a>
      <a class="inline-flex h-12 items-center gap-2 rounded-[10px] border border-white/40 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15" href="/contact"><Headphones size={16} /> Talk to a Safari Expert</a>
    </div>
  </div>
</section>
