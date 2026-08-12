<script lang="ts">
  import { onMount } from 'svelte';
  import { Copy, Plus, Save, Trash2 } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import type { TourGroupPrice, TourPricingSeason } from '$lib/types';

  type TourOption = { id:string; title:string; currency?:string };
  let tours:TourOption[]=[]; let selectedTourId=''; let seasons:TourPricingSeason[]=[];
  let loading=true; let loadingPrices=false; let saving=false; let error=''; let notice='';
  $: selectedTour=tours.find((tour)=>tour.id===selectedTourId);
  $: tourOptions=[{label:'Select a tour',value:''},...tours.map((tour)=>({label:tour.title,value:tour.id}))];

  const defaultPrices=():TourGroupPrice[] => [
    [1,1,1],[2,2,1],[3,3,2],[4,4,2],[5,5,3],[6,6,3]
  ].map(([min,max,rooms],i)=>({minimum_travelers:min,maximum_travelers:max,room_count:rooms,price:null,price_status:'ON_REQUEST',sort_order:i*10}));
  const newSeason=(type:'STANDARD_SEASON'|'PEAK_SEASON'|'CUSTOM'='CUSTOM'):TourPricingSeason=>({
    season_type:type,season_name:type==='STANDARD_SEASON'?'Standard Season':type==='PEAK_SEASON'?'Peak Season':'Custom Season',
    start_date:null,end_date:null,currency:selectedTour?.currency||'USD',pricing_basis:'PER_PERSON',status:'ACTIVE',sort_order:seasons.length*10,group_prices:defaultPrices()
  });
  const loadTours=async()=>{loading=true;error='';try{const result=await api.tours.list({limit:100,status:'all',view:'summary'});tours=result.data.items.map((tour)=>({id:tour.id,title:tour.title,currency:tour.currency||'USD'}));}catch(e){error=e instanceof Error?e.message:'Unable to load tours.'}finally{loading=false}};
  const loadSeasons=async()=>{seasons=[];notice='';if(!selectedTourId)return;loadingPrices=true;try{const result=await api.pricingOptions.seasons(selectedTourId);seasons=(result.data as unknown as TourPricingSeason[]).map((season)=>({...season,group_prices:[...(season.group_prices||[])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))}));}catch(e){error=e instanceof Error?e.message:'Unable to load season pricing.'}finally{loadingPrices=false}};
  const addSeason=(type:'STANDARD_SEASON'|'PEAK_SEASON'|'CUSTOM'='CUSTOM')=>{if(!selectedTourId){notice='Select a tour first.';return}seasons=[...seasons,newSeason(type)]};
  const duplicate=(index:number)=>{const source=seasons[index];seasons=[...seasons.slice(0,index+1),{...source,id:undefined,season_name:`${source.season_name} Copy`,season_type:'CUSTOM',group_prices:source.group_prices.map((price)=>({...price,id:undefined}))},...seasons.slice(index+1)]};
  const removeSeason=(index:number)=>seasons=seasons.filter((_,i)=>i!==index);
  const addGroup=(seasonIndex:number)=>{const prices=seasons[seasonIndex].group_prices;const previous=prices.at(-1);const min=(previous?.maximum_travelers??previous?.minimum_travelers??6)+1;seasons[seasonIndex].group_prices=[...prices,{minimum_travelers:min,maximum_travelers:null,room_count:Math.ceil(min/2),price:null,price_status:'ON_REQUEST',sort_order:prices.length*10}];seasons=[...seasons]};
  const removeGroup=(seasonIndex:number,priceIndex:number)=>{seasons[seasonIndex].group_prices=seasons[seasonIndex].group_prices.filter((_,i)=>i!==priceIndex);seasons=[...seasons]};
  const statusChanged=(price:TourGroupPrice)=>{if(price.price_status!=='FIXED_PRICE')price.price=null};
  const save=async()=>{if(!selectedTourId)return;notice='';for(const season of seasons){if(!season.season_name.trim()){notice='Every season needs a name.';return}for(const price of season.group_prices){if(price.price_status==='FIXED_PRICE'&&(price.price===null||price.price===undefined)){notice=`Enter a fixed price for ${season.season_name}, or change its status.`;return}}}saving=true;try{await api.pricingOptions.saveSeasons(selectedTourId,{tour_id:selectedTourId,seasons});notice='Season pricing saved.';await loadSeasons()}catch(e){notice=e instanceof Error?e.message:'Unable to save season pricing.'}finally{saving=false}};
  onMount(loadTours);
</script>

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader eyebrow="Tour Management" title="Season & Group Pricing" description="Manage per-person or per-group tour rates by travel season and party size." />
  {#if loading}<LoadingState message="Loading tours..."/>{:else if error && !tours.length}<ErrorState message={error}/>{:else}
    <section class="rounded-xl border border-ink/10 bg-surface p-5 shadow-sm">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr_auto] lg:items-end">
        <AdminSelect label="Tour" name="tour_id" bind:value={selectedTourId} options={tourOptions} on:change={loadSeasons}/>
        <p class="text-sm leading-6 text-ink/55">Prices stay relational: tour → seasons → group prices. Empty numeric prices are valid for On request and Not available.</p>
        <div class="flex flex-wrap gap-2"><button class="admin-action secondary" type="button" on:click={()=>addSeason('STANDARD_SEASON')}><Plus size={15}/>Standard</button><button class="admin-action secondary" type="button" on:click={()=>addSeason('PEAK_SEASON')}><Plus size={15}/>Peak</button><button class="admin-action" type="button" on:click={()=>addSeason()}><Plus size={15}/>Custom season</button></div>
      </div>
    </section>

    {#if notice}<p class="rounded-lg border border-goldfinch-gold/25 bg-goldfinch-gold/10 px-4 py-3 text-sm font-semibold text-heading">{notice}</p>{/if}
    {#if loadingPrices}<LoadingState message="Loading season pricing..."/>
    {:else if selectedTourId}
      {#if !seasons.length}<div class="rounded-xl border border-dashed border-ink/15 bg-surface p-10 text-center"><h2 class="font-serif text-2xl text-heading">No pricing seasons yet</h2><p class="mt-2 text-sm text-ink/55">Add Standard Season, Peak Season, or a custom season.</p></div>{/if}
      {#each seasons as season,seasonIndex}
        <section class="overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-sm">
          <header class="grid gap-3 border-b border-ink/10 bg-sand/35 p-4 md:grid-cols-4 xl:grid-cols-[1fr_1fr_150px_160px_150px_auto]">
            <label class="field"><span>Season name</span><input bind:value={season.season_name}/></label>
            <label class="field"><span>Type</span><select bind:value={season.season_type}><option value="STANDARD_SEASON">Standard Season</option><option value="PEAK_SEASON">Peak Season</option><option value="CUSTOM">Custom</option></select></label>
            <label class="field"><span>Starts</span><input type="date" bind:value={season.start_date}/></label>
            <label class="field"><span>Ends</span><input type="date" bind:value={season.end_date}/></label>
            <label class="field"><span>Currency</span><input maxlength="3" bind:value={season.currency}/></label>
            <div class="flex items-end justify-end gap-2"><button class="icon-action" type="button" title="Duplicate season" on:click={()=>duplicate(seasonIndex)}><Copy size={16}/></button><button class="icon-action danger" type="button" title="Delete season" on:click={()=>removeSeason(seasonIndex)}><Trash2 size={16}/></button></div>
            <label class="field"><span>Pricing basis</span><select bind:value={season.pricing_basis}><option value="PER_PERSON">Per Person</option><option value="PER_GROUP">Per Group</option></select></label>
            <label class="field"><span>Status</span><select bind:value={season.status}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
          </header>
          <div class="overflow-x-auto"><table class="w-full min-w-[850px] text-sm"><thead><tr class="border-b border-ink/10 text-left text-[10px] uppercase tracking-wider text-ink/45"><th>Group</th><th>Min</th><th>Max</th><th>Rooms</th><th>Status</th><th>Price</th><th></th></tr></thead><tbody>{#each season.group_prices as price,priceIndex}<tr class="border-b border-ink/8 last:border-0"><td class="font-bold text-heading">{price.minimum_travelers===1&&price.maximum_travelers===1?'Solo':price.maximum_travelers?`${price.minimum_travelers} people`:`${price.minimum_travelers}+ people`}</td><td><input class="matrix-number" type="number" min="1" bind:value={price.minimum_travelers}/></td><td><input class="matrix-number" type="number" min={price.minimum_travelers} placeholder="No max" bind:value={price.maximum_travelers}/></td><td><input class="matrix-number" type="number" min="0" bind:value={price.room_count}/></td><td><select class="matrix-select" bind:value={price.price_status} on:change={()=>statusChanged(price)}><option value="FIXED_PRICE">Fixed price</option><option value="ON_REQUEST">On request</option><option value="NOT_AVAILABLE">Not available</option></select></td><td><input class="matrix-price" type="number" min="0" step="0.01" placeholder={price.price_status==='FIXED_PRICE'?'0.00':'—'} disabled={price.price_status!=='FIXED_PRICE'} bind:value={price.price}/></td><td><button class="icon-action danger" type="button" aria-label="Remove group size" on:click={()=>removeGroup(seasonIndex,priceIndex)}><Trash2 size={14}/></button></td></tr>{/each}</tbody></table></div>
          <div class="border-t border-ink/10 p-3"><button class="text-xs font-bold text-forest" type="button" on:click={()=>addGroup(seasonIndex)}>+ Add custom group size</button></div>
        </section>
      {/each}
      <div class="sticky bottom-4 z-10 flex justify-end"><button class="admin-action px-6 shadow-lg" type="button" disabled={saving} on:click={save}><Save size={16}/>{saving?'Saving...':'Save season pricing'}</button></div>
    {/if}
  {/if}
</div>

<style>
  .admin-action{display:inline-flex;height:2.65rem;align-items:center;justify-content:center;gap:.45rem;border-radius:.5rem;background:rgb(var(--c-deep-green));padding:0 1rem;font-size:.8rem;font-weight:800;color:white}.admin-action.secondary{border:1px solid rgb(var(--c-ink)/.12);background:white;color:rgb(var(--c-heading))}.admin-action:disabled{opacity:.55}.field{display:grid;gap:.35rem;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgb(var(--c-ink)/.55)}.field input,.field select{height:2.55rem;border:1px solid rgb(var(--c-ink)/.12);border-radius:.4rem;background:white;padding:0 .7rem;font-size:.82rem;font-weight:600;text-transform:none;letter-spacing:0;color:rgb(var(--c-heading));outline:none}.icon-action{display:inline-grid;height:2.35rem;width:2.35rem;place-items:center;border:1px solid rgb(var(--c-ink)/.12);border-radius:.45rem;background:white;color:rgb(var(--c-ink)/.65)}.icon-action.danger{color:#b42318}th,td{padding:.7rem 1rem}.matrix-number,.matrix-price,.matrix-select{height:2.35rem;border:1px solid rgb(var(--c-ink)/.12);border-radius:.35rem;background:white;padding:0 .55rem;outline:none}.matrix-number{width:5.5rem}.matrix-price{width:8rem}.matrix-select{width:9.5rem}.matrix-price:disabled{background:rgb(var(--c-sand)/.45);color:rgb(var(--c-ink)/.35)}
</style>
