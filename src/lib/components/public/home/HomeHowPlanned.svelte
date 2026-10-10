<script lang="ts">
  import { t } from '$lib/i18n/ui';
  import Img from '../Img.svelte';

  export let eyebrow = 'How Your Trip Is Planned';
  export let title = 'Simple Planning. Clear Routes. Local Support.';
  export let subtitle =
    "You do not need to arrive with a finished itinerary. Share the basics, and we'll help turn the idea into a route that makes sense.";
  export let imageUrl = '';
  export let fallbackImageUrl = '';
  /** Left out, the caption and the four steps are the built-in ones, in the page's language. */
  export let captionEyebrow: string | undefined = undefined;
  export let caption: string | undefined = undefined;
  export let steps: Array<{ body?: string; text?: string; title: string }> | undefined = undefined;

  $: captionEyebrowText = captionEyebrow ?? $t('home.how_it_works_caption_eyebrow');
  $: captionText = caption ?? $t('home.how_it_works_caption');
  $: stepList = steps ?? [1, 2, 3, 4].map((n) => ({ title: $t(`home.how_step_${n}_title`), text: $t(`home.how_step_${n}_text`) }));

  const stepNumber = (index: number) => String(index + 1).padStart(2, '0');
  const stepText = (step: { body?: string; text?: string }) => step.text?.trim() || step.body?.trim() || '';

  $: displayImage = imageUrl || fallbackImageUrl;
  $: visibleSteps = (stepList ?? []).filter((step) => step?.title?.trim()).slice(0, 4);
</script>

{#if visibleSteps.length}
  <section class="home-how-planned py-14 md:py-20">
    <div class="container-shell">
      <div class="max-w-[1180px]">
        {#if eyebrow}
          <span class="text-xs font-semibold uppercase tracking-[0.15em] text-goldfinch-gold">{eyebrow}</span>
        {/if}
        {#if title}
          <h2 class="mt-2 font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-heading sm:text-4xl md:text-[44px]">{title}</h2>
        {/if}
        {#if subtitle}
          <p class="mt-4 max-w-[720px] text-base leading-relaxed text-ink/65">{subtitle}</p>
        {/if}
      </div>

      <div class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
        <div class="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-canvas lg:aspect-auto lg:h-full lg:min-h-[440px]">
          {#if displayImage}
            <Img
              src={displayImage}
              alt={$t('ui.tanzania_safari_route_planned_around')}
              width={900}
              sizes="(max-width: 1024px) 92vw, 42vw"
              className="h-full w-full object-cover"
            />
          {:else}
            <div class="h-full w-full bg-gradient-to-br from-forest to-deep-green"></div>
          {/if}
          <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" aria-hidden="true"></div>
          <div class="absolute inset-x-0 bottom-0 p-6">
            {#if captionEyebrowText}
              <div class="text-[11px] font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">{captionEyebrowText}</div>
            {/if}
            {#if captionText}
              <p class="mt-1.5 font-serif text-xl font-semibold leading-tight text-white md:text-2xl">{captionText}</p>
            {/if}
          </div>
        </div>

        <div class="relative">
          <div aria-hidden="true" class="absolute bottom-2 left-[19px] top-2 hidden w-px bg-[#E3DCCB] sm:block md:left-[21px]"></div>
          <div class="flex flex-col gap-8">
            {#each visibleSteps as step, index (step.title)}
              <article class="relative flex gap-5">
                <div class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-goldfinch-gold bg-white font-serif text-[15px] font-semibold text-clay sm:h-11 sm:w-11">
                  {stepNumber(index)}
                </div>
                <div class="pt-1">
                  <h3 class="font-serif text-lg font-semibold text-heading">{step.title}</h3>
                  {#if stepText(step)}
                    <p class="mt-1.5 text-sm leading-relaxed text-ink/65">{stepText(step)}</p>
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  @media (max-width: 767px) {
    .home-how-planned h2 {
      font-size: clamp(1.85rem, 8vw, 2.25rem);
      line-height: 1.08;
      text-wrap: balance;
    }
  }
</style>
