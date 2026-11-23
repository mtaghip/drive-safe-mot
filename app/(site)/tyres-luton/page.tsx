import type { Metadata } from 'next';
import { FaqList, FinalCta, FindUs, Hero, PageLd, PriceCard, Reasons, Section, SplitList, Steps, type Faq } from '@/components/Landing.tsx';
import { nextSlotLabel } from '@/lib/next-slot.ts';
import { ADDRESS_ONE_LINE } from '@/lib/site.ts';

export const dynamic = 'force-dynamic';

const PATH = '/tyres-luton';
const BOOK = '/book?service=tyres';

export const metadata: Metadata = {
  title: { absolute: 'Tyres in Luton · Supply, Fit and Balance | Drive Safe MOT' },
  description: `New tyres supplied and fitted in Luton, most sizes. Wheel balancing, pressures set and puncture repairs where safe. Priced by tyre size. ${ADDRESS_ONE_LINE}.`,
  alternates: { canonical: PATH },
};

const SIGNS = [
  { check: 'Tread close to 1.6mm', why: 'The legal minimum for cars, across the middle three-quarters of the tyre. Grip in the wet drops well before that.' },
  { check: 'Cuts, bulges or exposed cord', why: 'Often from hitting a kerb or pothole. A bulge means the tyre’s structure is damaged and it needs replacing.' },
  { check: 'Uneven wear', why: 'Wear on one edge can point to wheel alignment or suspension problems.' },
  { check: 'A tyre that keeps losing pressure', why: 'Could be a slow puncture, a damaged valve or a leak at the rim.' },
  { check: 'Vibration at speed', why: 'Often a wheel that needs balancing, or a damaged tyre.' },
  { check: 'Tyre pressure warning light', why: 'Check the pressures, and look for a puncture if one tyre is low.' },
];

const STEPS = [
  { title: 'Tell us your tyre size', text: 'It’s on the sidewall, for example 205/55 R16. Call us or book online and we’ll give you a price for your size.' },
  { title: 'We fit and balance', text: 'We fit the new tyres, balance the wheels and set the pressures.' },
  { title: 'Drive away', text: 'Safely, and with tyres that will help your car through its next MOT.' },
];

const WHY = [
  { title: 'Most sizes supplied and fitted', text: 'Tell us your size and we’ll price it up for you.' },
  { title: 'Wheel balancing included in the job', text: 'For a smooth ride and even tyre wear.' },
  { title: 'Puncture repairs where safe', text: 'If a tyre can be safely repaired, we’ll repair it rather than sell you a new one.' },
  { title: 'Open Saturdays', text: 'Get your tyres sorted at the weekend.' },
];

const FAQS: Faq[] = [
  { q: 'How much do new tyres cost in Luton?', a: 'It depends on the size and brand. Tell us your tyre size, found on the sidewall (for example 205/55 R16), and we’ll give you a price before fitting.' },
  { q: 'What is the legal tyre tread depth in the UK?', a: 'For cars it’s 1.6mm, across the central three-quarters of the tread and around the whole tyre. Driving on illegal tyres can mean a fine of up to £2,500 and three penalty points for each tyre.' },
  { q: 'Can my puncture be repaired?', a: 'Often, if the puncture is in the central part of the tread and the tyre hasn’t been driven on flat. Punctures in the sidewall or shoulder can’t be safely repaired. We’ll check and tell you honestly.' },
  { q: 'Will worn tyres fail the MOT?', a: 'Yes. Tread below 1.6mm, cuts, bulges, exposed cord and the wrong size or type of tyre are all MOT fails.' },
  { q: 'Should I replace tyres in pairs?', a: 'It’s usually best to replace tyres in pairs on the same axle, so grip and wear are even. The two tyres on an axle must be the same size and type.' },
];

export default async function TyresLutonPage() {
  const nextSlot = await nextSlotLabel();
  return (
    <>
      <Hero eyebrow="Tyres · Taylor Street, Luton" title="Tyres in Luton"
        lede="Worn tread, a puncture or a tyre that failed the MOT? We supply and fit new tyres, balance the wheels and set your pressures before you drive away."
        primary={{ href: BOOK, label: 'Book a tyre change' }}
        card={<PriceCard label="Tyres" note="Priced by tyre size" price="By size" nextLabel="Next free slot" nextValue={nextSlot} />} />
      <SplitList title="Signs you need new tyres" intro="Check your tyres once a month. Replace them if you notice any of these:" items={SIGNS} />
      <Section title="How it works" tone="white"><Steps steps={STEPS} /></Section>
      <Section title="Why get your tyres with us"><Reasons items={WHY} /></Section>
      <Section title="Tyre questions" tone="sand"><FaqList faqs={FAQS} /></Section>
      <FindUs />
      <FinalCta title="Book your new tyres" line={`Supply and fit, most sizes · next free slot ${nextSlot}`} primary={{ href: BOOK, label: 'Book a tyre change' }} />
      <PageLd path={PATH} faqs={FAQS} service={{ type: 'Tyre fitting', name: 'Tyres supplied and fitted in Luton' }} />
    </>
  );
}
