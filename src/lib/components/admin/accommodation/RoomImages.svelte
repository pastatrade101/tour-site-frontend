<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import MediaPicker from '../MediaPicker.svelte';
  export let images:Array<{image_url:string;alt_text?:string;caption?:string}>=[];
  let picked='';
  const add=(url:string,item?:any)=>{if(url&&!images.some(x=>x.image_url===url))images=[...images,{image_url:url,alt_text:item?.alt_text??item?.title??'',caption:item?.caption??''}];picked=''};
</script>
<div><p class="text-sm font-semibold text-ink">Room images</p>{#if images.length}<div class="mt-2 grid grid-cols-4 gap-2">{#each images as image,i}<div class="group relative aspect-[4/3] overflow-hidden rounded-lg"><img class="h-full w-full object-cover" src={image.image_url} alt=""/><button class="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100" type="button" aria-label="Remove image" on:click={()=>images=images.filter((_,at)=>at!==i)}><Trash2 size={13}/></button></div>{/each}</div>{/if}<div class="mt-3"><MediaPicker label="Add room image" uploadFolder="lodge-rooms" aspect="aspect-[4/3]" bind:value={picked} on:select={(e)=>add(e.detail.file_url,e.detail)} on:change={(e)=>add(e.detail)}/></div></div>
