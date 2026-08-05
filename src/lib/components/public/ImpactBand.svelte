<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { fadeUpOnScroll } from '$lib/animations';
	import { imgUrl } from '$lib/img';

	export let eyebrow = 'Our impact';
	export let title = 'Every Safari You Book Creates Change';
	export let body =
		'Travel done right protects the places and people that make Tanzania extraordinary. A share of every trip funds conservation and local communities.';
	export let points: Array<{ title: string; body: string }> = [
		{
			title: 'Community support',
			body: 'A share of every trip funds local schools, water and community projects.'
		},
		{
			title: 'Conservation fees',
			body: 'Park and concession fees directly protect wildlife and wild places.'
		},
		{
			title: 'Fair local jobs',
			body: 'We hire and fairly pay Tanzanian guides, drivers and camp teams.'
		}
	];
	export let imageUrl = '';
	export let badge = '10%';
	export let badgeLabel = 'of every trip reinvested locally';
	export let primaryCta = 'Learn about our impact';
	export let primaryCtaUrl = '/about';
	export let secondaryCta = 'Our impact projects';
	export let secondaryCtaUrl = '/about';
</script>

<section class="relative overflow-hidden bg-deep-green py-14 text-white md:py-20" use:fadeUpOnScroll>
	<div class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 28px 28px;" aria-hidden="true"></div>
	<div class="container-shell">
		<div class={`relative grid items-center gap-10 ${imageUrl ? 'lg:grid-cols-2 lg:gap-16' : ''}`}>
			{#if imageUrl}
				<div class="relative pb-6">
					<img
						class="aspect-[4/3] w-full rounded-[8px] object-cover"
						src={imgUrl(imageUrl, 1100)}
						alt=""
						loading="lazy"
						decoding="async"
					/>
					{#if badge || badgeLabel}
						<div
							class="absolute -bottom-5 left-5 rounded-[8px] bg-goldfinch-gold px-5 py-4 text-heading shadow-lg"
						>
							{#if badge}<p class="text-3xl font-semibold leading-none">{badge}</p>{/if}
							{#if badgeLabel}<p class="mt-1 text-xs font-semibold">{badgeLabel}</p>{/if}
						</div>
					{/if}
				</div>
			{/if}

			<div class={imageUrl ? '' : 'mx-auto max-w-3xl text-center'}>
				<p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">
					{eyebrow}
				</p>
				<h2 class="mt-3 text-3xl font-semibold text-white md:text-[38px]">{title}</h2>
				<p class="mt-4 leading-8 text-white/80">{body}</p>

				<div class={`mt-7 grid gap-4 ${imageUrl ? '' : 'text-left sm:grid-cols-3'}`}>
					{#each points as p}
						<div class="flex gap-3">
							<span
								class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-goldfinch-gold/25 text-goldfinch-gold"
							>
								<Check size={13} strokeWidth={3} />
							</span>
							<div>
								<p class="font-semibold text-white">{p.title}</p>
								<p class="text-sm leading-6 text-white/70">{p.body}</p>
							</div>
						</div>
					{/each}
				</div>

				<div class={`mt-8 flex flex-col gap-3 sm:flex-row ${imageUrl ? 'sm:flex-wrap' : 'sm:justify-center'}`}>
					<a
						href={primaryCtaUrl}
						class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-goldfinch-gold px-7 font-bold text-heading transition hover:brightness-105"
					>
						{primaryCta}
					</a>
					<a
						href={secondaryCtaUrl}
						class="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/40 px-7 font-semibold text-white transition hover:bg-white/10"
					>
						{secondaryCta}
					</a>
				</div>
			</div>
		</div>
	</div>
</section>
