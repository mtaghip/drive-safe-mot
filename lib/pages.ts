// The site's landing pages and guides, for the footer and the sitemap.
// Add a page here when you create it under app/(site)/.
export type SitePage = { path: string; label: string; group: 'services' | 'guides'; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' };

export const LANDING_PAGES: SitePage[] = [
  { path: '/book-mot-luton', label: 'Book an MOT in Luton', group: 'services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/saturday-mot-luton', label: 'Saturday MOTs', group: 'services', priority: 0.8, changeFrequency: 'daily' },
  { path: '/car-service-luton', label: 'Car servicing', group: 'services', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/mot-repairs-luton', label: 'Failed MOT and repairs', group: 'services', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/dpf-cleaning-luton', label: 'DPF cleaning', group: 'services', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/tyres-luton', label: 'Tyres', group: 'services', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/motorhome-mot-luton', label: 'Motorhome MOTs', group: 'services', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/ecu-remapping-luton', label: 'ECU remapping', group: 'services', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/mot-due-date-checker', label: 'MOT due date checker', group: 'guides', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/how-to-prepare-for-your-mot', label: 'Pre-MOT checklist', group: 'guides', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/mot-advisories-explained', label: 'MOT advisories explained', group: 'guides', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/mot-expired', label: 'MOT expired? What to do', group: 'guides', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/engine-warning-light', label: 'Engine warning light', group: 'guides', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/winter-car-checklist', label: 'Winter car checklist', group: 'guides', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/car-battery-cold-weather', label: 'Winter battery tips', group: 'guides', priority: 0.6, changeFrequency: 'yearly' },
];
