import type { Metadata } from 'next';
import Link from 'next/link';
import { Cards, FaqList, FinalCta, FindUs, Hero, PageLd, PriceCard, Reasons, Section, Steps, type Faq } from '@/components/Landing.tsx';
import { nextSlotLabel } from '@/lib/next-slot.ts';
import { ADDRESS_ONE_LINE } from '@/lib/site.ts';

export const dynamic = 'force-dynamic';

const PATH = '/mot-repairs-luton';
const BOOK = '/book?service=repair';

export const metadata: Metadata = {
  title: { absolute: 'Failed Your MOT? MOT Repairs in Luton | Drive Safe MOT' },
  description: `Failed your MOT, here or elsewhere? We repair MOT failures in Luton: brakes, tyres, lights, suspension, steering and exhausts. Priced before any work starts, with a retest after repairs. ${ADDRESS_ONE_LINE}.`,
  alternates: { canonical: PATH },
};

const COMMON = [
  { title: 'Lights and indicators', text: 'Blown bulbs, cracked lenses and headlight aim. Often quick fixes.' },
  { title: 'Brakes', text: 'Worn pads and discs, brake imbalance, and handbrake problems.' },
  { title: 'Tyres', text: 'Tread below 1.6mm, cuts, bulges or the wrong size. We supply and fit.' },
  { title: 'Suspension and steering', text: 'Worn bushes, ball joints, springs and shock absorbers.' },
  { title: 'Driver’s view', text: 'Windscreen damage, worn wiper blades and washers that don’t work.' },
  { title: 'Exhaust and emissions', text: 'Leaks, smoke and emissions failures, including blocked DPFs on diesels.' },
];

const STEPS = [
  { title: 'Bring your failure sheet', text: 'Book a repair check online or call us. Bring the MOT result if you failed somewhere else, or we can look it up from your registration.' },
  { title: 'Get a price first', text: 'We check the faults and give you the price for the repairs before any work begins.' },
  { title: 'Repair and retest', text: 'With your go-ahead we carry out the repairs, then retest the car.' },
];

const WHY = [
  { title: 'Priced before we start', text: 'You know the cost of every repair before we pick up a spanner.' },
  { title: 'Failed somewhere else? That’s fine', text: 'Bring your failure sheet and we’ll take it from there.' },
  { title: 'Retest after repairs', text: 'Once the work is done, we retest the car so you can get back on the road.' },
  { title: 'Honest advice', text: 'We tell you what must be fixed to pass, and what can wait.' },
];

const FAQS: Faq[] = [
  { q: 'My car failed its MOT. Can I still drive it?', a: 'Only if your old MOT certificate is still valid and the car has no “dangerous” faults. You can’t drive a car with a dangerous fault, or one whose MOT has run out, except to a pre-booked MOT test or to have the faults repaired. If in doubt, call us.' },
  { q: 'Do I have to pay for a retest?', a: 'Under the government’s rules, if you leave the car with the test centre for repairs and it’s retested within 10 working days, there’s no charge for the partial retest. Some faults can also be retested free if you bring the car back by the end of the next working day. Ask us when you book and we’ll confirm what applies.' },
  { q: 'I failed my MOT at another garage. Can you do the repairs?', a: 'Yes. Bring your failure sheet, or tell us your registration, and we’ll check the faults and give you a price. You don’t have to have repairs done where the test was carried out.' },
  { q: 'What are dangerous, major and minor faults?', a: 'Dangerous and major faults mean the car fails. Dangerous faults also mean it mustn’t be driven until repaired. Minor faults and advisories don’t fail the test, but are worth keeping an eye on. Our MOT advisories guide explains each one.' },
  { q: 'How long do MOT repairs take?', a: 'It depends on the faults and whether parts need ordering. Many common repairs, such as bulbs and wiper blades, are quick. We’ll give you an idea of the time along with the price.' },
];

export default async function MotRepairsLutonPage() {
  const nextSlot = await nextSlotLabel();
  return (
    <>
      <Hero eyebrow="MOT repairs · Taylor Street, Luton" title="Failed your MOT?"
        lede="Don’t panic. We repair MOT failures in Luton, from bulbs and wipers to brakes and suspension. You get a price before any work starts, and a retest once it’s fixed."
        primary={{ href: BOOK, label: 'Book a repair check' }}
        card={<PriceCard label="MOT repairs" note="Before any work starts" price="Quoted" nextLabel="Next free slot" nextValue={nextSlot} />} />
      <Section title="Common MOT failures we fix"><Cards items={COMMON} /></Section>
      <Section title="How it works" tone="white"><Steps steps={STEPS} /></Section>
      <Section title="Why choose us for MOT repairs"><Reasons items={WHY} /></Section>
      <Section title="Failed MOT questions" tone="sand">
        <FaqList faqs={FAQS} />
        <p className="lp-lede" style={{ fontSize: 16 }}>
          <Link href="/mot-advisories-explained">MOT advisories explained</Link> · <Link href="/mot-expired">MOT expired? What to do</Link> · <Link href="/book-mot-luton">Book an MOT</Link>
        </p>
      </Section>
      <FindUs />
      <FinalCta title="Get your car back through its MOT" line={`Priced before we start · next free slot ${nextSlot}`} primary={{ href: BOOK, label: 'Book a repair check' }} />
      <PageLd path={PATH} faqs={FAQS} service={{ type: 'MOT repairs', name: 'MOT repairs in Luton' }} />
    </>
  );
}
