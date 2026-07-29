<script lang="ts">
	import { fadeUpOnScroll } from '$lib/animations';
	import { Check, Leaf } from '@lucide/svelte';

	export let eyebrow = 'Real people, real Tanzania';
	export let title =
		'Not a booking platform. A team of Tanzanians who built this from the ground up.';
	export let body =
		'We are local specialists who plan honest, tailor-made journeys — not a faceless checkout. Share what matters to you and we shape a confident itinerary around your dates, pace and budget, with no pressure and no payment to start.';
	export let stats: Array<{ value: string; label: string }> = [
		{ value: '23+', label: 'Years of local expertise' },
		{ value: '10%', label: 'Reinvested in conservation' },
		{ value: '17', label: 'National parks covered' }
	];
	export let cert: { title: string; items: string[] } = {
		title: 'Conservation & community',
		items: [
			'5% of every trip funds conservation',
			'Licensed & insured local operator',
			'Lodge Conservation Foundation partner'
		]
	};
</script>

<section class="bg-canvas py-16 md:py-24" use:fadeUpOnScroll>
	<div class="container-shell">
		<!-- TOP -->
		<p class="text-sm font-semibold uppercase tracking-[0.16em] text-goldfinch-gold">
			{eyebrow}
		</p>
		<h2 class="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-heading md:text-[38px]">
			{title}
		</h2>
		<p class="mt-5 max-w-3xl leading-8 text-ink/70">
			{body}
		</p>

		<!-- BELOW -->
		<div class="mt-12 grid items-stretch gap-8 lg:grid-cols-[1.4fr_1fr]">
			<!-- LEFT: stats row -->
			<div class="grid grid-cols-3 gap-4">
				{#each stats as stat}
					<div class="rounded-2xl border border-ink/10 bg-surface p-5 text-center shadow-soft">
						<h3 class="text-3xl font-semibold text-goldfinch-gold md:text-4xl">{stat.value}</h3>
						<p class="mt-1 text-xs font-medium text-ink/60">{stat.label}</p>
					</div>
				{/each}
			</div>

			<!-- RIGHT: credential card -->
			<div class="rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft">
				<div class="flex items-center gap-2.5">
					<span
						class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-goldfinch-gold/15"
					>
						<Leaf size={16} class="text-goldfinch-gold" />
					</span>
					<p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">
						{cert.title}
					</p>
				</div>

				<div class="mt-4">
					{#each cert.items as item}
						<div
							class="mt-3 flex items-start gap-2.5 border-t border-ink/10 pt-3 first:mt-0 first:border-0 first:pt-0"
						>
							<Check size={15} class="mt-0.5 shrink-0 text-goldfinch-gold" />
							<span class="text-sm text-ink/75">{item}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>
