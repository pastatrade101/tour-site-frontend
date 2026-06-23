import { writable } from 'svelte/store';

// Shared open-state for the Goldfinch AI Travel Advisor so any component
// (e.g. the navbar "Need help?" link) can launch it. The widget owns the store;
// callers just flip it open.
export const aiAdvisorOpen = writable(false);

export const openAiAdvisor = () => aiAdvisorOpen.set(true);
