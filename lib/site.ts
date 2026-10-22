/** Public address of the site, for links in the sitemap, share previews and emails. */
export function siteUrl(): string {
  const url = process.env.SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL)
    || 'http://localhost:3000';
  return url.replace(/\/$/, '');
}

/**
 * Details printed on invoices. Fill in the blanks before issuing real invoices:
 * a limited company must show its registered name, number and office.
 */
export const COMPANY = {
  tradingName: 'Drive Safe MOT Centre',
  /** Registered company name, e.g. 'Drive Safe Ltd'. */
  legalName: '' as string,
  companyNumber: '' as string,
  registeredOffice: '' as string,
  /** Leave empty if not VAT registered: invoices then show no VAT at all. */
  vatNumber: '' as string,
  /** For customers paying by bank transfer. Leave empty to leave it off invoices. */
  bank: { accountName: '', sortCode: '', accountNumber: '' },
  paymentTerms: 'Payment is due on collection of the vehicle.',
  /** Issued invoices are numbered from here, without gaps. */
  firstInvoiceNumber: 1001,
};
export const VAT_REGISTERED = COMPANY.vatNumber.trim() !== '';
export const STANDARD_VAT_RATE = 20;

export const PHONE_DISPLAY = '01582 729943';
export const PHONE_HREF = 'tel:01582729943';
export const EMAIL = 'drivesafeltd@outlook.com';
export const ADDRESS_LINES = ['21 Taylor St', 'Luton', 'LU2 0EY'];
export const ADDRESS_ONE_LINE = '21 Taylor St, Luton LU2 0EY';
export const MAP_EMBED_SRC = 'https://maps.google.com/maps?q=21%20Taylor%20St%2C%20Luton%20LU2%200EY&z=16&output=embed';
export const DIRECTIONS_HREF = 'https://www.google.com/maps/dir/?api=1&destination=21%20Taylor%20St%2C%20Luton%20LU2%200EY';

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/book', label: 'Book' },
  { href: '/contact', label: 'Contact' },
] as const;

export const BOOKING = {
  /** How far ahead customers can book, counted from tomorrow. */
  weeks: 4,
  /** Start hours of the one-hour slots: 9:00–10:00 … 16:00–17:00. */
  hours: [9, 10, 11, 12, 13, 14, 15, 16],
  openSaturday: false,
  /** England and Wales bank holidays, worked out automatically. */
  closedOnBankHolidays: true,
  timeZone: 'Europe/London',
  /** Most upcoming bookings one phone number or email can hold online. */
  maxUpcomingPerCustomer: 3,
  /** Most booking attempts from one network address per hour. */
  maxAttemptsPerHour: 10,
};

/**
 * The day's schedule is emailed to the garage once a day during this UK hour.
 * The scheduler calls in at 8:30; anything outside 8:00–8:59 is ignored, which keeps it right through clock changes.
 */
export const DAILY_EMAIL_HOUR = 8;

export const OPENING_HOURS = [
  { d: 'Monday – Friday', t: '9:00 – 17:00' },
  { d: 'Saturday', t: BOOKING.openSaturday ? '9:00 – 17:00' : 'Closed' },
  { d: 'Sunday', t: 'Closed' },
  ...(BOOKING.closedOnBankHolidays ? [{ d: 'Bank holidays', t: 'Closed' }] : []),
];

export type ServiceId = 'mot' | 'dpf' | 'repair' | 'tyres' | 'service' | 'tuning';

export type Service = {
  id: ServiceId;
  name: string;
  /** Home page row. */
  summary: string;
  homePrice: string;
  homePriceNote: string;
  /** Services page card. */
  description: string;
  bullets: string[];
  priceLabel?: string;
  price: string;
  priceNote?: string;
  /** Large price text is smaller for words than for £ figures. */
  priceIsWord: boolean;
  cta: string;
  /** Booking page choice and summary. */
  bookingNote: string;
  summaryPrice: string;
};

export const SERVICES: Service[] = [
  {
    id: 'mot', name: 'MOT test',
    summary: 'A full MOT to the DVSA standard, with the result and any advisories talked through before you leave.',
    homePrice: '£45', homePriceNote: 'fixed price',
    description: 'A full MOT carried out to the DVSA standard. We check brakes, lights, steering, suspension, tyres, seatbelts, emissions and more, then talk you through the result and any advisories.',
    bullets: ['Takes around an hour, wait or drop off', 'Cars, small vans and motorhomes', 'Result and advisories explained in plain English'],
    price: '£45', priceNote: 'Fixed price', priceIsWord: false, cta: 'Book an MOT',
    bookingNote: '£45 fixed', summaryPrice: '£45',
  },
  {
    id: 'dpf', name: 'DPF clean',
    summary: 'Diesel warning light or losing power? We clean your particulate filter and get it flowing again.',
    homePrice: '£150', homePriceNote: 'from',
    description: 'If your diesel is showing a DPF warning light, going into limp mode or losing power, a blocked diesel particulate filter is a common cause. We clean the filter to restore flow, which is often far cheaper than replacing it.',
    bullets: ['For diesel cars and vans', 'Warning light and fault code check', 'Helps with emissions on your MOT'],
    priceLabel: 'From', price: '£150', priceIsWord: false, cta: 'Book a DPF clean',
    bookingNote: 'From £150', summaryPrice: 'from £150',
  },
  {
    id: 'repair', name: 'MOT works',
    summary: 'Repairs to get you through your MOT, from brakes and tyres to lights and suspension.',
    homePrice: 'Quoted', homePriceNote: 'before we start',
    description: "Failed your MOT, or have advisories you'd like sorted? We carry out the repairs needed to get your vehicle through, and give you a price before any work begins.",
    bullets: ['Brakes, tyres, lights and wipers', 'Suspension, steering and exhausts', 'Retest after repairs'],
    price: 'Quoted', priceNote: 'Before any work starts', priceIsWord: true, cta: 'Book a repair check',
    bookingNote: 'Quoted on inspection', summaryPrice: 'Quoted',
  },
  {
    id: 'tyres', name: 'Tyre change',
    summary: 'New tyres supplied and fitted, wheels balanced and pressures checked.',
    homePrice: 'Call', homePriceNote: 'for a price',
    description: 'Worn tread, a puncture or a tyre that failed the MOT? We supply and fit new tyres, balance the wheels and set your pressures before you drive away.',
    bullets: ['Supply and fit, most sizes', 'Wheel balancing', 'Puncture repairs where safe'],
    price: 'Call', priceNote: 'Priced by tyre size', priceIsWord: true, cta: 'Book a tyre change',
    bookingNote: 'Priced by tyre size', summaryPrice: 'Call',
  },
  {
    id: 'service', name: 'Servicing',
    summary: 'Interim and full services to keep your car reliable between MOTs.',
    homePrice: 'Call', homePriceNote: 'for a price',
    description: 'Regular servicing keeps your car reliable and helps it through its next MOT. We offer interim and full services, with an oil change, new filters and a full safety check.',
    bullets: ['Interim and full services', 'Oil and filter change', 'Fluids, brakes and lights checked'],
    price: 'Call', priceNote: 'Priced by vehicle', priceIsWord: true, cta: 'Book a service',
    bookingNote: 'Priced by vehicle', summaryPrice: 'Call',
  },
  {
    id: 'tuning', name: 'Tuning',
    summary: 'Remapping for better performance or fuel economy, set up to suit how you drive.',
    homePrice: 'Call', homePriceNote: 'for a price',
    description: 'Engine remapping to improve performance or fuel economy, set up to suit your vehicle and how you drive.',
    bullets: ['ECU remapping', 'Performance and economy options', 'Diagnostics before and after'],
    price: 'Call', priceNote: 'Priced by vehicle', priceIsWord: true, cta: 'Book tuning',
    bookingNote: 'Priced by vehicle', summaryPrice: 'Call',
  },
];

export const serviceById = (id: string): Service | undefined => SERVICES.find(s => s.id === id);

export const REVIEWS = [
  { stars: 5, quote: "Booked online the night before, in and out within the hour. They showed me the advisories and didn't push any extra work.", name: 'Sarah M.', area: 'Stopsley' },
  { stars: 5, quote: 'DPF light kept coming on. They cleaned the filter for a fraction of what the dealer quoted for a new one.', name: 'Imran K.', area: 'High Town' },
  { stars: 5, quote: "Friendly lads, fair price, and they explained everything. I've used them for three years now.", name: 'Dave P.', area: 'Luton' },
];
