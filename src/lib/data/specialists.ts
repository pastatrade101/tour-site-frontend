// Static fallback specialists for generic planning surfaces. Tour and About
// pages prefer CMS-managed specialists when records are published/assigned.
import type { Specialist } from '$lib/types';

export type { Specialist };

export const SPECIALISTS: Specialist[] = [
  {
    name: 'Amani Mushi',
    role: 'Safari & Kilimanjaro Specialist',
    blurb: 'Born and raised in Arusha, with 12+ years planning East Africa trips. Honest advice, no pressure.'
  },
  {
    name: 'Neema Laizer',
    role: 'Family & Beach Specialist',
    blurb: 'Plans relaxed, kid-friendly safaris and Zanzibar escapes families love.'
  }
];

export const defaultSpecialist = SPECIALISTS[0];
