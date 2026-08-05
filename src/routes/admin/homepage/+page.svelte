<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Building2,
    CheckCircle2,
    Edit,
    ExternalLink,
    Image as ImageIcon,
    LayoutTemplate,
    Monitor,
    Plus,
    Save,
    ShieldCheck,
    Trash2,
    X
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { imgUrl } from '$lib/img';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Section = {
    button_text?: string | null;
    button_url?: string | null;
    content?: string | null;
    extra_data?: Record<string, unknown> | unknown[] | null;
    id: string;
    image_url?: string | null;
    is_active: boolean;
    section_key: string;
    sort_order: number;
    subtitle?: string | null;
    title?: string | null;
  };

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };
  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };
  type FormValue = {
    button_text: string;
    button_url: string;
    content: string;
    image_url: string;
    is_active: boolean;
    section_key: string;
    sort_order: string;
    subtitle: string;
    title: string;
  };
  type SectionSurface = 'admin' | 'orphan' | 'public';
  type SectionPreset = Partial<FormValue> & { extra_data?: Record<string, unknown> };
  type SectionRegistryItem = {
    description: string;
    fields: string[];
    key: string;
    label: string;
    preset?: SectionPreset;
    surface: SectionSurface;
  };

  const emptyForm = (): FormValue => ({
    button_text: '',
    button_url: '',
    content: '',
    image_url: '',
    is_active: true,
    section_key: '',
    sort_order: '0',
    subtitle: '',
    title: ''
  });

  const sectionRegistry: SectionRegistryItem[] = [
    {
      key: 'hero',
      label: 'Hero section',
      surface: 'public',
      description: 'Main first-screen homepage hero with image, heading, overlay and primary/secondary calls to action.',
      fields: ['title', 'subtitle', 'image', 'button', 'extra: eyebrow, title_highlight, secondary_cta, overlay'],
      preset: {
        title: 'Plan East Africa With Confidence',
        subtitle: 'Honest safari, Kilimanjaro, gorilla trekking and beach advice from local experts.',
        image_url: '/images/surf-hero.jpg',
        button_text: 'Plan My Trip',
        button_url: '/plan-my-trip',
        extra_data: { secondary_cta_text: 'Talk to a Travel Advisor', secondary_cta_url: '/contact' }
      }
    },
    {
      key: 'intro',
      label: 'Intro and stats',
      surface: 'public',
      description: 'Introductory brand band after the hero. Extra JSON can override stats and certificate bullets.',
      fields: ['title', 'subtitle', 'extra: eyebrow, stats, cert_title, cert_items'],
      preset: {
        title: 'Not a booking platform. A team of Tanzanians who built this from the ground up.',
        subtitle:
          'We are local specialists who plan honest, tailor-made journeys - not a faceless checkout. Share what matters to you and we shape a confident itinerary around your dates, pace and budget, with no pressure and no payment to start.',
        extra_data: { eyebrow: 'Real people, real Tanzania' }
      }
    },
    {
      key: 'experiences',
      label: 'Experiences (ways to travel)',
      surface: 'public',
      description: 'Intro copy above the homepage experience selector. The cards themselves come from published tour categories (Safari Styles).',
      fields: ['title', 'subtitle', 'extra: eyebrow'],
      preset: {
        title: 'What Kind of Tanzania Trip Are You Imagining?',
        subtitle: "You do not need to know the perfect route yet. Start with the experience that feels closest to your trip, and we'll help connect the right places, timing, lodges, transfers and pace.",
        extra_data: { eyebrow: 'Ways to Travel' }
      }
    },
    {
      key: 'advisor_note',
      label: "Advisor's note",
      surface: 'public',
      description: 'Editorial band about why planning details matter. Extra JSON `points` is a list of {title, text} bullets.',
      fields: ['title', 'subtitle', 'image', 'button', 'extra: eyebrow, points'],
      preset: {
        title: 'The Trip Is Won or Lost in the Planning Details',
        subtitle: 'Most travel mistakes happen before arrival. The wrong route, too many one-night stops, poor lodge locations or badly timed transfers can make even a beautiful trip feel tiring.',
        button_text: 'Talk to a Travel Advisor',
        button_url: '/contact',
        extra_data: { eyebrow: "An Advisor's Note" }
      }
    },
    {
      key: 'top_destinations',
      label: 'Top destinations mosaic',
      surface: 'public',
      description: 'Edge-to-edge photo mosaic of published destinations after the intro band. Hovering a tile reveals "Request this trip". Tiles come from published destination records with images.',
      fields: ['title', 'subtitle', 'extra: eyebrow'],
      preset: {
        title: 'Top Destinations',
        subtitle: 'The parks, peaks and coastlines our guests ask for most — each one a trip we can shape around you.',
        extra_data: { eyebrow: 'Where travellers go' }
      }
    },
    {
      key: 'featured_destinations',
      label: 'Featured destinations',
      surface: 'public',
      description: 'Heading and CTA above the homepage destination cards. Cards come from published destination records.',
      fields: ['title', 'subtitle', 'button', 'extra: eyebrow'],
      preset: {
        title: 'More destinations',
        subtitle: 'Handpicked places across Tanzania, from the Serengeti to the coast.',
        button_text: 'All destinations',
        button_url: '/destinations'
      }
    },
    {
      key: 'why_us',
      label: 'Why us',
      surface: 'public',
      description: 'The safari value-proposition band. Extra JSON can override the feature cards.',
      fields: ['title', 'subtitle', 'extra: eyebrow, features'],
      preset: {
        title: 'Your Safari, Your Way',
        subtitle: 'We listen first, then design. Every trip is shaped around your dates, budget and the kind of journey you want.',
        extra_data: { eyebrow: 'Why travel with us' }
      }
    },
    {
      key: 'featured_tours',
      label: 'Featured tours',
      surface: 'public',
      description: 'Heading above the homepage tour cards. Cards come from published tour records.',
      fields: ['title', 'subtitle', 'button', 'extra: eyebrow'],
      preset: {
        title: 'Top Tour Packages',
        subtitle: 'Our most-loved safari, Kilimanjaro and Zanzibar itineraries - each fully tailorable to you.',
        button_text: 'View All Tours',
        button_url: '/tours'
      }
    },
    {
      key: 'cost_ranges',
      label: 'Typical costs',
      surface: 'public',
      description: 'Homepage price guide band. Use the cost range rows editor for trip type, starting price and note.',
      fields: ['title', 'subtitle', 'extra: ranges'],
      preset: {
        title: 'What trips typically cost',
        subtitle: 'A confident brand is upfront about price - here are honest starting points by trip type.',
        extra_data: { ranges: [] }
      }
    },
    {
      key: 'seasons',
      label: 'Seasons',
      surface: 'public',
      description: 'Best-time-to-visit band. Extra JSON can override the seasonal cards.',
      fields: ['title', 'subtitle', 'extra: eyebrow, seasons'],
      preset: {
        title: 'Best Times to Visit Tanzania',
        subtitle: 'Every season has its magic - here is an honest guide so we can match your trip to what matters most to you.',
        extra_data: { eyebrow: 'When to go' }
      }
    },
    {
      key: 'migration_section',
      label: 'Migration calendar',
      surface: 'public',
      description: 'Heading for the Great Migration calendar. Calendar cards come from migration entries.',
      fields: ['title', 'subtitle', 'extra: eyebrow'],
      preset: {
        title: 'Follow the herds, month by month',
        subtitle: 'Where the wildebeest and zebra roam across the Serengeti through the year.',
        extra_data: { eyebrow: 'Great Migration' }
      }
    },
    {
      key: 'plan_dream',
      label: 'Plan your dream',
      surface: 'public',
      description: 'Dark lead-capture band with editable heading, supporting copy, form title and bullet points.',
      fields: ['title', 'subtitle', 'extra: eyebrow, form_title, points'],
      preset: {
        title: 'Plan Your Dream Tanzania Safari',
        subtitle: 'Tell us a few details and a local specialist will craft a confident, tailor-made plan.',
        extra_data: { eyebrow: 'Plan your dream trip', form_title: 'Safari details' }
      }
    },
    {
      key: 'how_it_works',
      label: 'Planning process',
      surface: 'public',
      description: 'Process section heading and CTA. Step content is controlled by the frontend component defaults.',
      fields: ['title', 'subtitle', 'button'],
      preset: {
        title: 'Our Process',
        subtitle: 'A calm, transparent process - no pressure, and no payment to start.',
        button_text: 'Start planning',
        button_url: '/plan-my-trip'
      }
    },
    {
      key: 'reviews_section',
      label: 'Platform reviews',
      surface: 'public',
      description: 'Heading for the verified review widget. Review cards come from approved review records.',
      fields: ['title', 'subtitle', 'extra: eyebrow'],
      preset: {
        title: 'Real reviews from real safaris',
        subtitle: 'Verified ratings from travellers across TripAdvisor, SafariBookings and Google.',
        extra_data: { eyebrow: 'Loved by travellers' }
      }
    },
    {
      key: 'testimonials',
      label: 'Traveller stories',
      surface: 'public',
      description: 'Heading above testimonial cards. Cards come from published testimonial records.',
      fields: ['title', 'subtitle', 'extra: eyebrow'],
      preset: {
        title: 'What Our Travelers Say',
        subtitle: 'Real stories from guests who travelled with confidence.',
        extra_data: { eyebrow: 'Loved by travellers' }
      }
    },
    {
      key: 'partners',
      label: 'Partner logos',
      surface: 'public',
      description: 'Trusted partner logo strip shown on the homepage. Use the logo rows editor to manage logos.',
      fields: ['title', 'extra: logos'],
      preset: {
        title: 'Trusted by leading travel partners',
        subtitle: 'Airlines, lodges, hotels and travel platforms you work with to plan with confidence.',
        extra_data: { logos: [] }
      }
    },
    {
      key: 'gallery_preview',
      label: 'Gallery preview',
      surface: 'public',
      description: 'Catchy homepage gallery section. Cards come from published Admin Gallery image records.',
      fields: ['title', 'subtitle', 'button', 'extra: eyebrow'],
      preset: {
        title: 'See the journeys before you choose',
        subtitle: 'Real published gallery moments from safaris, climbs, coast stays and the places our team knows well.',
        button_text: 'View gallery',
        button_url: '/gallery',
        extra_data: { eyebrow: 'Field notes in frames' }
      }
    },
    {
      key: 'blog_preview',
      label: 'Blog preview',
      surface: 'public',
      description: 'Heading and CTA above latest posts. Cards come from published blog posts.',
      fields: ['title', 'subtitle', 'button', 'extra: eyebrow'],
      preset: {
        title: 'Latest Stories & Guides',
        subtitle: 'Tips, guides and inspiration from our East Africa specialists.',
        button_text: 'View all',
        button_url: '/blog',
        extra_data: { eyebrow: 'Stories' }
      }
    },
    {
      key: 'impact',
      label: 'Impact band',
      surface: 'public',
      description: 'Responsible travel band with image, badge, points and primary CTA.',
      fields: ['title', 'subtitle', 'image', 'button', 'extra: eyebrow, points, badge, badge_label'],
      preset: {
        title: 'Every Safari You Book Creates Change',
        subtitle: 'Travel done right protects the places and people that make Tanzania extraordinary. A share of every trip funds conservation and local communities.',
        button_text: 'Learn about our impact',
        button_url: '/about',
        extra_data: { eyebrow: 'Our impact' }
      }
    },
    {
      key: 'faq',
      label: 'FAQ section',
      surface: 'public',
      description: 'FAQ heading, WhatsApp CTA and optional homepage-specific FAQ rows. If no rows are added here, the homepage falls back to published FAQ records.',
      fields: ['title', 'subtitle', 'button', 'extra: eyebrow, faqs'],
      preset: {
        title: 'Tanzania Safari FAQs',
        subtitle: 'Honest answers to the questions travellers ask most.',
        button_text: 'Ask us on WhatsApp',
        button_url: '/contact',
        extra_data: { eyebrow: 'Good to know', faqs: [] }
      }
    },
    {
      key: 'final_cta',
      label: 'Final CTA',
      surface: 'public',
      description: 'Bottom homepage call to action with configurable image/video background, overlay, trust chips and buttons.',
      fields: ['title', 'subtitle', 'image', 'button', 'extra: eyebrow, secondary_cta, trust_points, background_video, overlay'],
      preset: {
        title: 'Ready to Plan Your East Africa Adventure?',
        subtitle: 'Talk to a local expert and travel with confidence.',
        button_text: 'Plan My Trip',
        button_url: '/plan-my-trip',
        extra_data: { secondary_cta_text: 'Talk to a Travel Advisor', secondary_cta_url: '/contact' }
      }
    },
    {
      key: 'login_slider',
      label: 'Admin login slider',
      surface: 'admin',
      description: 'Used by the admin login screen, not by the public homepage.',
      fields: ['extra: slides'],
      preset: { title: 'Login slider', subtitle: 'Image slides shown on the admin login screen.', extra_data: { slides: [] } }
    },
    {
      key: 'why_choose_us',
      label: 'Legacy why choose us',
      surface: 'orphan',
      description: 'Legacy key. The current homepage renders why_us instead.',
      fields: []
    },
    {
      key: 'faq_preview',
      label: 'Legacy FAQ preview',
      surface: 'orphan',
      description: 'Legacy key. The current homepage renders faq instead.',
      fields: []
    },
    {
      key: 'ai_advisor_cta',
      label: 'Legacy AI advisor CTA',
      surface: 'orphan',
      description: 'Legacy key. The current homepage does not render this section.',
      fields: []
    }
  ];

  const sectionSuggestions = sectionRegistry.filter((item) => item.surface !== 'orphan');
  const publicSectionItems = sectionRegistry.filter((item) => item.surface === 'public');
  const sectionLookup = new Map(sectionRegistry.map((item) => [item.key, item]));

  let rows: Section[] = [];
  let mediaItems: MediaItem[] = [];

  let loading = true;
  let loadingMedia = false;
  let saving = false;
  let deleting = false;
  let reordering = false;
  let error = '';

  let modalOpen = false;
  let confirmOpen = false;
  let editing: Section | null = null;
  let toDelete: Section | null = null;
  let form = emptyForm();
  let extraDataText = '{}';
  let toasts: Toast[] = [];

  // ── background & overlay (stored inside extra_data) ───────────────────────
  const positionOptions = [
    { label: 'Center', value: 'center' },
    { label: 'Top', value: 'center top' },
    { label: 'Bottom', value: 'center bottom' },
    { label: 'Left', value: 'left center' },
    { label: 'Right', value: 'right center' },
    { label: 'Top left', value: 'left top' },
    { label: 'Top right', value: 'right top' },
    { label: 'Bottom left', value: 'left bottom' },
    { label: 'Bottom right', value: 'right bottom' }
  ];
  const BG_KEYS = ['background_video', 'overlay_color', 'overlay_opacity', 'overlay_gradient', 'media_position'];
  const emptyBg = () => ({ video: '', overlay_color: '#393D32', overlay_opacity: '60', overlay_gradient: true, media_position: 'center' });
  let bg = emptyBg();

  const hexToRgba = (hex: string, alpha: number) => {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!match) return `rgba(57,61,50,${alpha})`;
    const n = parseInt(match[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  $: bgHasMedia = Boolean(form.image_url.trim() || bg.video.trim());
  $: overlayAlpha = Math.max(0, Math.min(100, Number(bg.overlay_opacity) || 0)) / 100;
  $: overlayStyle = bg.overlay_gradient
    ? `background:linear-gradient(135deg, ${hexToRgba(bg.overlay_color, overlayAlpha)}, ${hexToRgba(bg.overlay_color, overlayAlpha * 0.55)})`
    : `background:${hexToRgba(bg.overlay_color, overlayAlpha)}`;

  const extraToBg = (ed: Record<string, unknown>) => ({
    video: typeof ed.background_video === 'string' ? ed.background_video : '',
    overlay_color: typeof ed.overlay_color === 'string' ? ed.overlay_color : '#393D32',
    overlay_opacity: ed.overlay_opacity != null ? String(Math.round(Number(ed.overlay_opacity) * 100)) : '60',
    overlay_gradient: ed.overlay_gradient !== false,
    media_position: typeof ed.media_position === 'string' ? ed.media_position : 'center'
  });

  const bgToExtra = (): Record<string, unknown> => ({
    ...(bg.video.trim() ? { background_video: bg.video.trim() } : {}),
    overlay_color: bg.overlay_color || '#393D32',
    overlay_opacity: overlayAlpha,
    overlay_gradient: bg.overlay_gradient,
    media_position: bg.media_position || 'center'
  });

  // ── repeaters stored inside extra_data (partner logos + login slides) ──────
  type LogoRow = { image_url: string; name: string; url: string };
  type SlideRow = { image_url: string; title: string; subtitle: string };
  let logos: LogoRow[] = [];
  let slides: SlideRow[] = [];

  // Shared media-library picker — targets either a logo row or a slide row.
  let mediaPicker: { list: 'logos' | 'slides'; index: number } | null = null;

  const MANAGED_KEYS = [...BG_KEYS, 'faqs', 'logos', 'slides', 'ranges'];

  const openMediaPicker = async (list: 'logos' | 'slides', index: number) => {
    mediaPicker = { list, index };
    await loadMedia();
  };
  const pickMedia = (url: string) => {
    if (mediaPicker?.list === 'logos' && logos[mediaPicker.index]) {
      logos[mediaPicker.index].image_url = url;
      logos = logos;
    } else if (mediaPicker?.list === 'slides' && slides[mediaPicker.index]) {
      slides[mediaPicker.index].image_url = url;
      slides = slides;
    }
    mediaPicker = null;
  };

  const addLogo = () => {
    logos = [...logos, { name: '', image_url: '', url: '' }];
  };
  const removeLogo = (index: number) => {
    logos = logos.filter((_, i) => i !== index);
  };
  const moveLogo = (index: number, direction: 'down' | 'up') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= logos.length) return;
    const next = [...logos];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    logos = next;
  };
  const extraToLogos = (ed: Record<string, unknown>): LogoRow[] =>
    Array.isArray(ed.logos)
      ? (ed.logos as Array<Record<string, unknown>>).map((l) => ({
          name: String(l?.name ?? ''),
          image_url: String(l?.image_url ?? ''),
          url: String(l?.url ?? '')
        }))
      : [];
  const logosToExtra = () =>
    logos
      .filter((l) => l.image_url.trim())
      .map((l) => ({
        name: l.name.trim() || undefined,
        image_url: l.image_url.trim(),
        ...(l.url.trim() ? { url: l.url.trim() } : {})
      }));

  const addSlide = () => {
    slides = [...slides, { image_url: '', title: '', subtitle: '' }];
  };
  const removeSlide = (index: number) => {
    slides = slides.filter((_, i) => i !== index);
  };
  const extraToSlides = (ed: Record<string, unknown>): SlideRow[] =>
    Array.isArray(ed.slides)
      ? (ed.slides as Array<Record<string, unknown>>).map((s) => ({
          image_url: String(s?.image_url ?? ''),
          title: String(s?.title ?? ''),
          subtitle: String(s?.subtitle ?? '')
        }))
      : [];
  const slidesToExtra = () =>
    slides
      .filter((s) => s.image_url.trim())
      .map((s) => ({
        image_url: s.image_url.trim(),
        ...(s.title.trim() ? { title: s.title.trim() } : {}),
        ...(s.subtitle.trim() ? { subtitle: s.subtitle.trim() } : {})
      }));

  // ── cost ranges repeater (stored in extra_data.ranges) ────────────────────
  type CostRow = { label: string; from: string; note: string };
  let costRanges: CostRow[] = [];
  const addCostRange = () => {
    costRanges = [...costRanges, { label: '', from: '', note: '' }];
  };
  const removeCostRange = (index: number) => {
    costRanges = costRanges.filter((_, i) => i !== index);
  };
  const extraToCostRanges = (ed: Record<string, unknown>): CostRow[] =>
    Array.isArray(ed.ranges)
      ? (ed.ranges as Array<Record<string, unknown>>).map((r) => ({
          label: String(r?.label ?? ''),
          from: String(r?.from ?? ''),
          note: String(r?.note ?? '')
        }))
      : [];
  const costRangesToExtra = () =>
    costRanges
      .filter((r) => r.label.trim() && r.from.trim())
      .map((r) => ({
        label: r.label.trim(),
        from: r.from.trim(),
        ...(r.note.trim() ? { note: r.note.trim() } : {})
      }));

  // ── homepage FAQ repeater (stored in extra_data.faqs) ─────────────────────
  type FaqRow = { question: string; answer: string };
  let faqRows: FaqRow[] = [];
  const addFaqRow = () => {
    faqRows = [...faqRows, { question: '', answer: '' }];
  };
  const removeFaqRow = (index: number) => {
    faqRows = faqRows.filter((_, i) => i !== index);
  };
  const moveFaqRow = (index: number, direction: 'down' | 'up') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= faqRows.length) return;
    const next = [...faqRows];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    faqRows = next;
  };
  const extraToFaqRows = (ed: Record<string, unknown>): FaqRow[] =>
    Array.isArray(ed.faqs)
      ? (ed.faqs as Array<Record<string, unknown>>).map((f) => ({
          question: String(f?.question ?? ''),
          answer: String(f?.answer ?? '')
        }))
      : [];
  const faqRowsToExtra = () =>
    faqRows
      .filter((f) => f.question.trim() && f.answer.trim())
      .map((f) => ({
        question: f.question.trim(),
        answer: f.answer.trim()
      }));

  $: sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order || a.section_key.localeCompare(b.section_key));
  $: partnersSection = sorted.find((section) => section.section_key === 'partners') ?? null;
  $: partnerLogoPreview = partnersSection
    ? extraToLogos(((partnersSection.extra_data && !Array.isArray(partnersSection.extra_data) ? partnersSection.extra_data : {}) ?? {}) as Record<string, unknown>).filter((logo) => logo.image_url.trim())
    : [];
  $: existingSectionKeys = new Set(rows.map((section) => section.section_key));
  $: missingFrontendSections = publicSectionItems.filter((section) => !existingSectionKeys.has(section.key));
  $: orphanSections = sorted.filter((section) => sectionMeta(section.section_key).surface === 'orphan');
  $: adminOnlySections = sorted.filter((section) => sectionMeta(section.section_key).surface === 'admin');
  $: publicCreatedCount = publicSectionItems.length - missingFrontendSections.length;
  $: currentMeta = form.section_key.trim() ? sectionMeta(form.section_key.trim()) : null;

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };

  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const prettyKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const sectionMeta = (key: string): SectionRegistryItem =>
    sectionLookup.get(key) ?? {
      key,
      label: prettyKey(key),
      surface: 'orphan',
      description: 'Custom key saved in the CMS, but the public homepage does not currently render it.',
      fields: []
    };
  const surfaceLabel = (surface: SectionSurface) =>
    surface === 'public' ? 'Public homepage' : surface === 'admin' ? 'Admin only' : 'Orphan';
  const surfaceClasses = (surface: SectionSurface) =>
    surface === 'public'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
      : surface === 'admin'
        ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/70'
        : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80';
  const surfacePanelClasses = (surface: SectionSurface) =>
    surface === 'public'
      ? 'border-emerald-200/70 bg-emerald-50/50'
      : surface === 'admin'
        ? 'border-sky-200/70 bg-sky-50/55'
        : 'border-amber-200/80 bg-amber-50/55';
  const activeLabel = (surface: SectionSurface) =>
    surface === 'public'
      ? 'Active (visible on public homepage)'
      : surface === 'admin'
        ? 'Active (visible where this admin section is used)'
        : 'Active (saved, but not rendered on public homepage)';

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.homepage.get({ all: true });
      rows = res.data as unknown as Section[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load homepage sections.';
    } finally {
      loading = false;
    }
  };

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as unknown as MediaItem[]).filter((m) => m.file_url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load media library.', 'error');
    } finally {
      loadingMedia = false;
    }
  };

  const nextOrder = () => (sorted.length ? Math.max(...sorted.map((s) => s.sort_order)) + 1 : 0);

  const openCreate = () => {
    editing = null;
    form = { ...emptyForm(), sort_order: String(nextOrder()) };
    extraDataText = '{}';
    bg = emptyBg();
    logos = [];
    slides = [];
    costRanges = [];
    faqRows = [];
    void loadMedia();
    modalOpen = true;
  };

  const openPresetSection = (key: string) => {
    const preset = sectionLookup.get(key)?.preset ?? {};
    const { extra_data, ...formDefaults } = preset;
    const ed = extra_data ?? {};
    editing = null;
    form = {
      ...emptyForm(),
      ...formDefaults,
      is_active: formDefaults.is_active ?? true,
      section_key: key,
      sort_order: String(formDefaults.sort_order ?? nextOrder())
    };
    bg = extraToBg(ed);
    logos = key === 'partners' ? extraToLogos(ed) : [];
    slides = key === 'login_slider' ? extraToSlides(ed) : [];
    costRanges = key === 'cost_ranges' ? extraToCostRanges(ed) : [];
    faqRows = key === 'faq' ? extraToFaqRows(ed) : [];
    const rest = Object.fromEntries(Object.entries(ed).filter(([extraKey]) => !MANAGED_KEYS.includes(extraKey)));
    extraDataText = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '{}';
    void loadMedia();
    modalOpen = true;
  };

  const openPartnersManager = () => {
    if (partnersSection) {
      openEdit(partnersSection);
      return;
    }

    editing = null;
    form = {
      ...emptyForm(),
      is_active: true,
      section_key: 'partners',
      sort_order: String(nextOrder()),
      subtitle: 'Airlines, lodges, hotels and travel platforms you work with to plan with confidence.',
      title: 'Trusted by leading travel partners'
    };
    extraDataText = '{}';
    bg = emptyBg();
    logos = [];
    slides = [];
    costRanges = [];
    faqRows = [];
    void loadMedia();
    modalOpen = true;
  };

  const openEdit = (section: Section) => {
    editing = section;
    form = {
      button_text: section.button_text ?? '',
      button_url: section.button_url ?? '',
      content: section.content ?? '',
      image_url: section.image_url ?? '',
      is_active: section.is_active,
      section_key: section.section_key,
      sort_order: String(section.sort_order ?? 0),
      subtitle: section.subtitle ?? '',
      title: section.title ?? ''
    };
    const ed = (section.extra_data ?? {}) as Record<string, unknown>;
    bg = extraToBg(ed);
    logos = extraToLogos(ed);
    slides = extraToSlides(ed);
    costRanges = extraToCostRanges(ed);
    faqRows = extraToFaqRows(ed);
    const rest = Object.fromEntries(Object.entries(ed).filter(([key]) => !MANAGED_KEYS.includes(key)));
    extraDataText = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '{}';
    void loadMedia();
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); extraDataText = '{}'; bg = emptyBg(); logos = []; slides = []; costRanges = []; faqRows = []; mediaPicker = null; };

  const save = async () => {
    if (!/^[a-z0-9_]{2,}$/.test(form.section_key.trim())) {
      showToast('Section key is required (lowercase letters, numbers, underscores).', 'error');
      return;
    }

    let extra: Record<string, unknown> = {};
    try {
      extra = extraDataText.trim() ? JSON.parse(extraDataText) : {};
    } catch {
      showToast('Extra data must be valid JSON.', 'error');
      return;
    }

    // Merge the friendly background/overlay controls back into extra_data when
    // this section actually has a background image or video.
    if (form.image_url.trim() || bg.video.trim()) {
      extra = { ...extra, ...bgToExtra() };
    }

    // Merge partner logos when this is a logo-strip section.
    if (form.section_key.trim() === 'partners' || logos.some((l) => l.image_url.trim())) {
      extra = { ...extra, logos: logosToExtra() };
    }

    // Merge login slides when this is the login slider section.
    if (form.section_key.trim() === 'login_slider' || slides.some((s) => s.image_url.trim())) {
      extra = { ...extra, slides: slidesToExtra() };
    }

    // Merge cost ranges for the typical-cost band.
    if (form.section_key.trim() === 'cost_ranges' || costRanges.some((r) => r.label.trim())) {
      extra = { ...extra, ranges: costRangesToExtra() };
    }

    // Merge homepage-specific FAQ rows. When empty, the public homepage falls
    // back to the global Admin → FAQs records.
    if (form.section_key.trim() === 'faq' || faqRows.some((f) => f.question.trim() || f.answer.trim())) {
      extra = { ...extra, faqs: faqRowsToExtra() };
    }

    saving = true;
    const payload = {
      button_text: form.button_text.trim() || null,
      button_url: form.button_url.trim() || null,
      content: form.content.trim() || null,
      extra_data: extra,
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      section_key: form.section_key.trim(),
      sort_order: Number(form.sort_order || 0),
      subtitle: form.subtitle.trim() || null,
      title: form.title.trim() || null
    };

    try {
      if (editing) {
        await api.homepage.updateSection(editing.id, payload);
        showToast('Section updated successfully.');
      } else {
        await api.homepage.createSection(payload);
        showToast('Section created successfully.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save section.', 'error');
    } finally {
      saving = false;
    }
  };

  const toggleActive = async (section: Section) => {
    try {
      await api.homepage.updateSection(section.id, { is_active: !section.is_active });
      showToast(section.is_active ? 'Section deactivated.' : 'Section activated.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to toggle section.', 'error');
    }
  };

  const move = async (section: Section, direction: 'down' | 'up') => {
    const idx = sorted.findIndex((s) => s.id === section.id);
    const swapWith = direction === 'up' ? sorted[idx - 1] : sorted[idx + 1];
    if (!swapWith) return;
    reordering = true;
    try {
      await Promise.all([
        api.homepage.updateSection(section.id, { sort_order: swapWith.sort_order }),
        api.homepage.updateSection(swapWith.id, { sort_order: section.sort_order })
      ]);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to reorder sections.', 'error');
    } finally {
      reordering = false;
    }
  };

  const openDelete = (section: Section) => { toDelete = section; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.homepage.removeSection(toDelete.id);
      showToast('Section deleted successfully.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete section.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(load);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content Management"
    title="Homepage Sections"
    description="Manage homepage content blocks without editing code. Reorder, activate, and edit each section."
    actionLabel="New Section"
    actionIcon={Plus}
    on:action={openCreate}
  />

  {#if !loading && !error}
    <section class="grid gap-5 rounded-[8px] border border-ink/10 bg-surface p-5 shadow-[0_16px_48px_rgba(57,61,50,0.07)] lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)_auto] lg:items-center">
      <div class="flex min-w-0 gap-4">
        <span class="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-goldfinch-gold/15 text-clay ring-1 ring-goldfinch-gold/25">
          <Building2 size={21} strokeWidth={2.2} />
        </span>
        <div class="min-w-0">
          <p class="text-[11px] font-extrabold uppercase tracking-[0.18em] text-forest/65">Homepage trust section</p>
          <h2 class="mt-1 text-xl font-extrabold text-heading">Trusted by leading travel partners</h2>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-ink/60">Manage the partner logos shown on the public homepage strip. Use transparent SVG or PNG logos for the cleanest result.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span class={`rounded-full px-2.5 py-1 text-[11px] font-bold ${partnersSection?.is_active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70' : 'bg-ink/5 text-ink/45'}`}>
              {partnersSection ? (partnersSection.is_active ? 'Visible on homepage' : 'Inactive') : 'Not created'}
            </span>
            <span class="rounded-full bg-sand/70 px-2.5 py-1 text-[11px] font-bold text-ink/55">{partnerLogoPreview.length} logo{partnerLogoPreview.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      <div class="min-h-[86px] rounded-[8px] border border-ink/10 bg-canvas p-3">
        {#if partnerLogoPreview.length}
          <div class="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6">
            {#each partnerLogoPreview.slice(0, 6) as logo, i (`${logo.image_url}-${i}`)}
              <div class="grid h-14 place-items-center rounded-[6px] bg-surface px-3 ring-1 ring-ink/[0.06]">
                <img class="max-h-8 max-w-full object-contain grayscale" src={logo.image_url} alt={logo.name || 'Partner logo'} />
              </div>
            {/each}
          </div>
        {:else}
          <div class="grid h-full min-h-[60px] place-items-center rounded-[6px] border border-dashed border-ink/15 bg-surface/60 text-center text-xs font-medium text-ink/45">
            Add partner logos to activate this homepage strip.
          </div>
        {/if}
      </div>

      <button class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-deep-green px-4 text-sm font-bold text-white shadow-sm transition hover:bg-forest" type="button" on:click={openPartnersManager}>
        {partnersSection ? 'Manage logos' : 'Create section'}
      </button>
    </section>

    <section class="grid gap-5 rounded-[8px] border border-ink/10 bg-surface p-5 shadow-[0_16px_48px_rgba(57,61,50,0.07)]">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="max-w-3xl">
          <p class="text-[11px] font-extrabold uppercase tracking-[0.18em] text-forest/65">Frontend section wiring</p>
          <h2 class="mt-1 text-xl font-extrabold text-heading">Public homepage edit coverage</h2>
          <p class="mt-1 text-sm leading-6 text-ink/60">
            These are the section keys the SSR homepage reads. Missing records still render with frontend fallbacks until you create them here.
          </p>
        </div>
        <a class="inline-flex h-10 items-center gap-2 rounded-[8px] border border-ink/10 bg-surface px-3 text-xs font-bold text-ink shadow-sm transition hover:border-forest/25 hover:bg-sand/50" href="/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} /> View homepage
        </a>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-[8px] border border-emerald-200/70 bg-emerald-50/55 p-4">
          <div class="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={17} strokeWidth={2.4} />
            <p class="text-xs font-extrabold uppercase tracking-[0.14em]">Editable live</p>
          </div>
          <p class="mt-3 text-2xl font-extrabold text-heading">{publicCreatedCount}/{publicSectionItems.length}</p>
          <p class="mt-1 text-xs font-medium text-ink/55">Public homepage sections with CMS records.</p>
        </div>

        <div class="rounded-[8px] border border-ink/10 bg-canvas p-4">
          <div class="flex items-center gap-2 text-forest">
            <Monitor size={17} strokeWidth={2.4} />
            <p class="text-xs font-extrabold uppercase tracking-[0.14em]">Missing</p>
          </div>
          <p class="mt-3 text-2xl font-extrabold text-heading">{missingFrontendSections.length}</p>
          <p class="mt-1 text-xs font-medium text-ink/55">Rendered by frontend defaults until created.</p>
        </div>

        <div class="rounded-[8px] border border-sky-200/70 bg-sky-50/55 p-4">
          <div class="flex items-center gap-2 text-sky-700">
            <ShieldCheck size={17} strokeWidth={2.4} />
            <p class="text-xs font-extrabold uppercase tracking-[0.14em]">Admin only</p>
          </div>
          <p class="mt-3 text-2xl font-extrabold text-heading">{adminOnlySections.length}</p>
          <p class="mt-1 text-xs font-medium text-ink/55">Used outside the public homepage.</p>
        </div>

        <div class="rounded-[8px] border border-amber-200/80 bg-amber-50/55 p-4">
          <div class="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={17} strokeWidth={2.4} />
            <p class="text-xs font-extrabold uppercase tracking-[0.14em]">Orphan</p>
          </div>
          <p class="mt-3 text-2xl font-extrabold text-heading">{orphanSections.length}</p>
          <p class="mt-1 text-xs font-medium text-ink/55">Saved keys not rendered on the public homepage.</p>
        </div>
      </div>

      {#if missingFrontendSections.length}
        <div class="rounded-[8px] border border-dashed border-forest/25 bg-sand/25 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-extrabold text-heading">Create missing frontend sections</p>
              <p class="mt-1 text-xs leading-5 text-ink/55">Creating these records makes the corresponding homepage copy editable instead of relying on component defaults.</p>
            </div>
          </div>
          <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {#each missingFrontendSections as item (item.key)}
              <button class="group rounded-[8px] border border-ink/10 bg-surface p-3 text-left shadow-sm transition hover:border-forest/30 hover:bg-white" type="button" on:click={() => openPresetSection(item.key)}>
                <span class="flex items-center justify-between gap-3">
                  <span class="font-mono text-xs font-extrabold text-forest">{item.key}</span>
                  <span class="rounded-[6px] bg-deep-green px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white transition group-hover:bg-forest">Create</span>
                </span>
                <span class="mt-2 block text-sm font-bold text-heading">{item.label}</span>
                <span class="mt-1 line-clamp-2 block text-xs leading-5 text-ink/55">{item.description}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if orphanSections.length}
        <div class="rounded-[8px] border border-amber-200/80 bg-amber-50/60 p-4">
          <div class="flex items-start gap-3">
            <AlertTriangle class="mt-0.5 shrink-0 text-amber-800" size={18} strokeWidth={2.4} />
            <div class="min-w-0">
              <p class="text-sm font-extrabold text-amber-950">Orphan sections found</p>
              <p class="mt-1 text-xs leading-5 text-amber-900/75">These records are saved in the homepage CMS, but the current public homepage does not render their section keys.</p>
              <div class="mt-3 flex flex-wrap gap-2">
                {#each orphanSections as section (section.id)}
                  {@const meta = sectionMeta(section.section_key)}
                  <span class="rounded-[7px] bg-surface px-2.5 py-1 font-mono text-[11px] font-bold text-amber-900 ring-1 ring-amber-200" title={meta.description}>{section.section_key}</span>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="rounded-[8px] border border-emerald-200/70 bg-emerald-50/55 px-4 py-3 text-sm font-semibold text-emerald-800">
          No orphan public-homepage sections found in the saved CMS records.
        </div>
      {/if}
    </section>
  {/if}

  {#if loading}
    <LoadingState message="Loading homepage sections..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No homepage sections yet"
      message="Create frontend-wired sections like hero, intro, featured_destinations, partners, faq, or final_cta."
      actionLabel="New Section"
      icon={LayoutTemplate}
      on:action={openCreate}
    />
  {:else}
    <div class="grid gap-4">
      {#each sorted as section, index (section.id)}
        {@const meta = sectionMeta(section.section_key)}
        <article class={`grid gap-4 rounded-[8px] border bg-surface p-5 shadow-[0_14px_44px_rgba(57,61,50,0.06)] lg:grid-cols-[auto_140px_1fr_auto] lg:items-center ${section.is_active ? 'border-ink/10' : 'border-dashed border-ink/20 opacity-75'}`} transition:fade={{ duration: 120 }}>
          <!-- reorder -->
          <div class="flex flex-row gap-1 lg:flex-col">
            <button class="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 bg-surface text-ink/55 transition hover:bg-sand/70 disabled:opacity-30" type="button" aria-label="Move up" disabled={index === 0 || reordering} on:click={() => move(section, 'up')}>
              <ArrowUp size={15} />
            </button>
            <button class="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 bg-surface text-ink/55 transition hover:bg-sand/70 disabled:opacity-30" type="button" aria-label="Move down" disabled={index === sorted.length - 1 || reordering} on:click={() => move(section, 'down')}>
              <ArrowDown size={15} />
            </button>
          </div>

          <!-- thumb -->
          <div class="aspect-video overflow-hidden rounded-xl bg-sand/40 ring-1 ring-ink/10">
            {#if section.image_url}
              <img class="h-full w-full object-cover" src={section.image_url} alt={section.title || section.section_key} />
            {:else}
              <div class="grid h-full w-full place-items-center text-ink/25"><ImageIcon size={22} /></div>
            {/if}
          </div>

          <!-- details -->
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-forest/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-forest">{section.section_key}</span>
              <span class="rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55">Sort {section.sort_order}</span>
              {#if section.is_active}
                <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200/60">Active</span>
              {:else}
                <span class="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-bold text-ink/45">Inactive</span>
              {/if}
              <span class={`rounded-full px-2 py-0.5 text-[11px] font-bold ${surfaceClasses(meta.surface)}`}>{surfaceLabel(meta.surface)}</span>
            </div>
            <h3 class="mt-2 truncate text-lg font-bold text-ink">{section.title || prettyKey(section.section_key)}</h3>
            {#if section.subtitle}<p class="mt-0.5 line-clamp-1 text-sm text-ink/60">{section.subtitle}</p>{/if}
            <p class="mt-1 line-clamp-2 text-xs leading-5 text-ink/45">{meta.description}</p>
            {#if meta.fields.length}
              <p class="mt-1 text-xs font-semibold text-forest/75">Editable: {meta.fields.join(', ')}</p>
            {/if}
            {#if section.button_text}
              <span class="mt-2 inline-flex items-center gap-1 rounded-lg bg-goldfinch-gold/20 px-2 py-0.5 text-[11px] font-semibold text-heading">Button: {section.button_text}</span>
            {/if}
          </div>

          <!-- actions -->
          <div class="flex flex-wrap items-center gap-2 lg:justify-end">
            <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-sm">
              <input class="h-4 w-4 accent-forest" type="checkbox" checked={section.is_active} on:change={() => toggleActive(section)} />
              {section.is_active ? 'Active' : 'Inactive'}
            </label>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(section)}>
              <Edit size={14} />Edit
            </button>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(section)}>
              <Trash2 size={14} />Delete
            </button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form
      class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(57,61,50,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit section' : 'New section'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? sectionMeta(editing.section_key).label : 'Create homepage section'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <div>
          <AdminFormInput label="Section key" name="section_key" bind:value={form.section_key} placeholder="e.g. hero" required />
          {#if !editing}
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each sectionSuggestions as item}
                <button class="rounded-full border border-ink/10 bg-sand/40 px-2.5 py-1 font-mono text-[11px] font-semibold text-ink/60 transition hover:border-forest/40 hover:bg-sand/70" type="button" title={item.label} on:click={() => openPresetSection(item.key)}>{item.key}</button>
              {/each}
            </div>
          {/if}
        </div>

        {#if currentMeta}
          <div class={`rounded-[8px] border p-4 ${surfacePanelClasses(currentMeta.surface)}`}>
            <div class="flex flex-wrap items-center gap-2">
              <span class={`rounded-full px-2 py-0.5 text-[11px] font-bold ${surfaceClasses(currentMeta.surface)}`}>{surfaceLabel(currentMeta.surface)}</span>
              <span class="font-mono text-xs font-extrabold text-ink/65">{currentMeta.key}</span>
            </div>
            <p class="mt-2 text-sm font-bold text-heading">{currentMeta.label}</p>
            <p class="mt-1 text-xs leading-5 text-ink/55">{currentMeta.description}</p>
            {#if currentMeta.fields.length}
              <p class="mt-2 text-xs font-semibold text-forest/75">Frontend reads: {currentMeta.fields.join(', ')}</p>
            {/if}
          </div>
        {/if}

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Title" name="title" bind:value={form.title} placeholder="Section heading" />
          <AdminFormInput label="Subtitle" name="subtitle" bind:value={form.subtitle} placeholder="Supporting line" />
        </div>

        <AdminTextArea label="Content" name="content" bind:value={form.content} rows={3} placeholder="Optional body text for this section." />

        <!-- image -->
        <div class="rounded-[8px] border border-ink/10 bg-sand/25 p-4">
          <MediaPicker label="Section image" media={mediaItems} uploadFolder="homepage" bind:value={form.image_url} />
        </div>

        <!-- background video + overlay -->
        <div class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Background &amp; overlay</p>
            <p class="mt-1 text-xs text-ink/50">Used by full-width sections (e.g. final CTA, hero). A video takes priority over the image. The overlay keeps text readable.</p>
          </div>
          <AdminFormInput label="Background video URL (optional · mp4/webm)" name="bg_video" bind:value={bg.video} placeholder="https://...mp4" />
          <div class="grid gap-4 sm:grid-cols-3">
            <label class="grid gap-2 text-sm font-medium text-ink">
              <span>Overlay color</span>
              <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-2 shadow-sm">
                <input class="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-ink/10 bg-surface p-0.5" type="color" bind:value={bg.overlay_color} aria-label="Overlay color" />
                <input class="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none" bind:value={bg.overlay_color} spellcheck="false" />
              </span>
            </label>
            <label class="grid gap-2 text-sm font-medium text-ink">
              <span>Overlay opacity · {bg.overlay_opacity}%</span>
              <input class="mt-3 w-full accent-forest" type="range" min="0" max="100" step="5" bind:value={bg.overlay_opacity} aria-label="Overlay opacity" />
            </label>
            <AdminSelect label="Crop / focus" name="media_position" bind:value={bg.media_position} options={positionOptions} />
          </div>
          <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-surface p-3">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={bg.overlay_gradient} />
            <span class="text-sm font-semibold text-ink">Gradient overlay <span class="font-normal text-ink/50">(fades diagonally for depth)</span></span>
          </label>
        </div>

        <!-- partner logos repeater -->
        {#if form.section_key.trim() === 'partners'}
          <div class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Partner logos</p>
                <p class="mt-1 text-xs text-ink/50">Shown as an auto-scrolling homepage strip. Use transparent SVG or PNG logos and keep names accurate for accessibility.</p>
              </div>
              <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" on:click={addLogo}>
                <Plus size={14} />Add logo
              </button>
            </div>

            {#if logos.length === 0}
              <p class="rounded-[8px] border border-dashed border-ink/15 bg-surface/60 py-5 text-center text-xs text-ink/45">No logos yet. Add partners here, then save the section.</p>
            {:else}
              <div class="rounded-[8px] border border-ink/10 bg-surface p-3">
                <p class="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">Homepage preview</p>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {#each logos.filter((logo) => logo.image_url.trim()).slice(0, 6) as logo, i (`preview-${logo.image_url}-${i}`)}
                    <div class="grid h-14 place-items-center rounded-[6px] bg-canvas px-3 ring-1 ring-ink/[0.06]">
                      <img class="max-h-8 max-w-full object-contain grayscale" src={logo.image_url} alt={logo.name || 'Partner logo'} />
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#each logos as logo, i (i)}
              <div class="grid gap-3 rounded-[8px] border border-ink/10 bg-surface p-3 shadow-sm sm:grid-cols-[84px_1fr_auto] sm:items-start">
                <div class="grid h-16 w-[84px] place-items-center overflow-hidden rounded-[6px] bg-sand/40 ring-1 ring-ink/10">
                  {#if logo.image_url}
                    <img class="max-h-11 max-w-[72px] object-contain" src={logo.image_url} alt={logo.name || 'Logo'} />
                  {:else}
                    <ImageIcon size={16} class="text-ink/30" />
                  {/if}
                </div>
                <div class="grid gap-2">
                  <div class="grid gap-2 sm:grid-cols-[1fr_1fr]">
                    <input class="h-9 rounded-[8px] border border-ink/10 bg-surface px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Partner name" bind:value={logo.name} />
                    <input class="h-9 rounded-[8px] border border-ink/10 bg-surface px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Link URL (optional)" bind:value={logo.url} />
                  </div>
                  <div class="flex gap-2">
                    <input class="h-9 min-w-0 flex-1 rounded-[8px] border border-ink/10 bg-surface px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Logo image URL" bind:value={logo.image_url} />
                    <button type="button" class="inline-flex h-9 shrink-0 items-center gap-1 rounded-[8px] border border-ink/10 bg-surface px-2.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-sand/60" on:click={() => openMediaPicker('logos', i)}><ImageIcon size={13} />Media</button>
                  </div>
                </div>
                <div class="flex items-center justify-end gap-1 sm:flex-col">
                  {#if logo.url}
                    <a class="grid h-8 w-8 place-items-center rounded-[8px] border border-ink/10 text-ink/50 transition hover:bg-sand/60 hover:text-forest" href={logo.url} target="_blank" rel="noopener noreferrer" aria-label="Open partner link"><ExternalLink size={14} /></a>
                  {/if}
                  <button type="button" class="grid h-8 w-8 place-items-center rounded-[8px] border border-ink/10 bg-surface text-ink/50 shadow-sm transition hover:bg-sand/60 disabled:opacity-30" aria-label="Move logo up" disabled={i === 0} on:click={() => moveLogo(i, 'up')}><ArrowUp size={14} /></button>
                  <button type="button" class="grid h-8 w-8 place-items-center rounded-[8px] border border-ink/10 bg-surface text-ink/50 shadow-sm transition hover:bg-sand/60 disabled:opacity-30" aria-label="Move logo down" disabled={i === logos.length - 1} on:click={() => moveLogo(i, 'down')}><ArrowDown size={14} /></button>
                  <button type="button" class="grid h-8 w-8 place-items-center rounded-[8px] border border-red-200 bg-surface text-red-600 shadow-sm transition hover:bg-red-50" aria-label="Remove logo" on:click={() => removeLogo(i)}><Trash2 size={14} /></button>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- login page slider repeater -->
        {#if form.section_key.trim() === 'login_slider'}
          <div class="grid gap-3 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Login page slides</p>
                <p class="mt-1 text-xs text-ink/50">Shown on the admin login screen — each slide has an image, a heading and a short line. Rotates automatically.</p>
              </div>
              <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" on:click={addSlide}>
                <Plus size={14} />Add slide
              </button>
            </div>

            {#if slides.length === 0}
              <p class="rounded-xl border border-dashed border-ink/15 bg-surface/60 py-4 text-center text-xs text-ink/45">No slides yet — add your first slide.</p>
            {/if}

            {#each slides as slide, i (i)}
              <div class="grid gap-2 rounded-xl border border-ink/10 bg-surface p-3 sm:grid-cols-[96px_1fr_auto] sm:items-start">
                <div class="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg bg-sand/40 ring-1 ring-ink/10 sm:w-24">
                  {#if slide.image_url}
                    <img class="h-full w-full object-cover" src={slide.image_url} alt={slide.title || 'Slide'} />
                  {:else}
                    <ImageIcon size={16} class="text-ink/30" />
                  {/if}
                </div>
                <div class="grid gap-2">
                  <div class="flex gap-2">
                    <input class="h-9 min-w-0 flex-1 rounded-lg border border-ink/10 bg-surface px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Image URL" bind:value={slide.image_url} />
                    <button type="button" class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-ink/10 bg-surface px-2.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-sand/60" on:click={() => openMediaPicker('slides', i)}><ImageIcon size={13} />Media</button>
                  </div>
                  <input class="h-9 rounded-lg border border-ink/10 bg-surface px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Heading (e.g. Plan East Africa with confidence)" bind:value={slide.title} />
                  <input class="h-9 rounded-lg border border-ink/10 bg-surface px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Short line (optional)" bind:value={slide.subtitle} />
                </div>
                <button type="button" class="grid h-9 w-9 place-items-center justify-self-end rounded-lg border border-red-200 bg-surface text-red-600 shadow-sm transition hover:bg-red-50" aria-label="Remove slide" on:click={() => removeSlide(i)}><Trash2 size={15} /></button>
              </div>
            {/each}
          </div>
        {/if}

        <!-- typical cost ranges repeater -->
        {#if form.section_key.trim() === 'cost_ranges'}
          <div class="grid gap-3 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Typical cost ranges</p>
                <p class="mt-1 text-xs text-ink/50">The "What trips typically cost" band on the homepage. Each row: trip type, a "from" price, and an optional note. (Built-in defaults show until you add rows.)</p>
              </div>
              <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" on:click={addCostRange}>
                <Plus size={14} />Add row
              </button>
            </div>

            {#if costRanges.length === 0}
              <p class="rounded-xl border border-dashed border-ink/15 bg-surface/60 py-4 text-center text-xs text-ink/45">No rows yet — add your first trip type.</p>
            {/if}

            {#each costRanges as row, i (i)}
              <div class="grid gap-2 rounded-xl border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-center">
                <input class="h-9 rounded-lg border border-ink/10 bg-surface px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Trip type (e.g. Safari)" bind:value={row.label} />
                <input class="h-9 rounded-lg border border-ink/10 bg-surface px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="from $1,500" bind:value={row.from} />
                <input class="h-9 rounded-lg border border-ink/10 bg-surface px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Note (e.g. Guiding &amp; park fees)" bind:value={row.note} />
                <button type="button" class="grid h-9 w-9 place-items-center justify-self-end rounded-lg border border-red-200 bg-surface text-red-600 shadow-sm transition hover:bg-red-50" aria-label="Remove row" on:click={() => removeCostRange(i)}><Trash2 size={15} /></button>
              </div>
            {/each}
          </div>
        {/if}

        <!-- homepage FAQ repeater -->
        {#if form.section_key.trim() === 'faq'}
          <div class="grid gap-3 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Homepage FAQ rows</p>
                <p class="mt-1 text-xs text-ink/50">These rows render in the homepage FAQ section. If you leave them empty, the homepage uses published records from Admin → FAQs.</p>
              </div>
              <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" on:click={addFaqRow}>
                <Plus size={14} />Add FAQ
              </button>
            </div>

            {#if faqRows.length === 0}
              <p class="rounded-xl border border-dashed border-ink/15 bg-surface/60 py-4 text-center text-xs text-ink/45">No homepage-specific FAQ rows. The public homepage will use published Admin FAQs instead.</p>
            {/if}

            {#each faqRows as row, i (i)}
              <div class="grid gap-3 rounded-xl border border-ink/10 bg-surface p-3 shadow-sm sm:grid-cols-[1fr_auto] sm:items-start">
                <div class="grid gap-2">
                  <input class="h-10 rounded-lg border border-ink/10 bg-surface px-3 text-sm font-semibold outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Question" bind:value={row.question} />
                  <textarea class="min-h-[92px] rounded-lg border border-ink/10 bg-surface px-3 py-2 text-sm leading-6 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Answer" bind:value={row.answer}></textarea>
                </div>
                <div class="flex items-center justify-end gap-1 sm:flex-col">
                  <button type="button" class="grid h-8 w-8 place-items-center rounded-[8px] border border-ink/10 bg-surface text-ink/50 shadow-sm transition hover:bg-sand/60 disabled:opacity-30" aria-label="Move FAQ up" disabled={i === 0} on:click={() => moveFaqRow(i, 'up')}><ArrowUp size={14} /></button>
                  <button type="button" class="grid h-8 w-8 place-items-center rounded-[8px] border border-ink/10 bg-surface text-ink/50 shadow-sm transition hover:bg-sand/60 disabled:opacity-30" aria-label="Move FAQ down" disabled={i === faqRows.length - 1} on:click={() => moveFaqRow(i, 'down')}><ArrowDown size={14} /></button>
                  <button type="button" class="grid h-8 w-8 place-items-center rounded-[8px] border border-red-200 bg-surface text-red-600 shadow-sm transition hover:bg-red-50" aria-label="Remove FAQ" on:click={() => removeFaqRow(i)}><Trash2 size={14} /></button>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Button text" name="button_text" bind:value={form.button_text} placeholder="e.g. Plan My Trip" />
          <AdminFormInput label="Button URL" name="button_url" bind:value={form.button_url} placeholder="e.g. /plan-my-trip" />
        </div>

        <label class="grid gap-2 text-sm font-medium text-ink">
          <span>Extra data (JSON)</span>
          <textarea class="min-h-[120px] rounded-2xl border border-ink/10 bg-surface px-3 py-2 font-mono text-xs shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" bind:value={extraDataText} spellcheck="false" placeholder={'{\n  "secondary_cta_text": "Talk to a Travel Advisor"\n}'}></textarea>
          <span class="text-xs text-ink/45">Advanced configuration stored as JSON (e.g. secondary CTA, feature lists).</span>
        </label>

        <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
          <label class="flex h-11 cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-surface px-4 transition hover:bg-sand/30">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_active} />
            <span class="text-sm font-semibold text-ink">{currentMeta ? activeLabel(currentMeta.surface) : 'Active'}</span>
          </label>
        </div>

        <!-- live preview -->
        <div class="overflow-hidden rounded-[8px] border border-ink/10">
          <div class="border-b border-ink/10 bg-sand/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Live preview</div>
          <div class="relative grid min-h-[180px] place-items-center overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green p-6 text-center text-white">
            {#if bg.video}
              <!-- svelte-ignore a11y-media-has-caption -->
              <video class="absolute inset-0 h-full w-full object-cover" style={`object-position:${bg.media_position}`} src={bg.video} autoplay muted loop playsinline></video>
            {:else if form.image_url}
              <img class="absolute inset-0 h-full w-full object-cover" style={`object-position:${bg.media_position}`} src={form.image_url} alt="" />
            {/if}
            {#if bgHasMedia}
              <div class="absolute inset-0" style={overlayStyle}></div>
            {/if}
            <div class="relative z-10">
              <h3 class="text-xl font-extrabold">{form.title || prettyKey(form.section_key || 'section')}</h3>
              {#if form.subtitle}<p class="mx-auto mt-2 max-w-md text-sm text-white/80">{form.subtitle}</p>{/if}
              {#if form.button_text}
                <span class="mt-4 inline-flex h-10 items-center rounded-xl bg-goldfinch-gold px-5 text-sm font-bold text-heading">{form.button_text}</span>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Section'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete homepage section"
  message={`Delete the "${toDelete?.section_key ?? 'this'}" section? This action soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(57,61,50,0.18)]">
    Deleting section...
  </div>
{/if}

{#if mediaPicker}
  <div
    class="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
    transition:fade={{ duration: 140 }}
  >
    <div
      class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-[0_24px_80px_rgba(57,61,50,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
    >
      <div class="flex items-center justify-between border-b border-ink/10 bg-sand/30 p-4">
        <h3 class="text-base font-bold text-ink">Choose an image</h3>
        <button
          class="grid h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand"
          type="button"
          aria-label="Close"
          on:click={() => (mediaPicker = null)}
        >
          <X size={16} />
        </button>
      </div>
      <div class="overflow-y-auto p-4">
        {#if loadingMedia}
          <p class="py-8 text-center text-sm text-ink/50">Loading media...</p>
        {:else if mediaItems.length === 0}
          <p class="py-8 text-center text-sm text-ink/50">No images in the Media Library yet.</p>
        {:else}
          <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {#each mediaItems as m (m.id)}
              <button
                class="group grid aspect-square place-items-center overflow-hidden rounded-xl border border-ink/10 bg-sand/30 p-2 transition hover:border-goldfinch-gold/50 hover:bg-sand/60"
                type="button"
                title={m.file_name}
                on:click={() => pickMedia(m.file_url)}
              >
                <img class="max-h-full max-w-full object-contain" src={imgUrl(m.thumbnail_url || m.file_url, 300)} alt={m.file_name} loading="lazy" />
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
