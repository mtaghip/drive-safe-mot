import type { Metadata } from 'next';
import Link from 'next/link';
import { Cards, FaqList, FinalCta, Hero, PageLd, PriceCard, Section, Steps, type Faq } from '@/components/Landing.tsx';
import { nextSlotLabel } from '@/lib/next-slot.ts';

export const dynamic = 'force-dynamic';

const PATH = '/mot-expired';
const BOOK = '/book?service=mot';

export const metadata: Metadata = {
  title: { absolute: 'MOT Expired? Can I Drive and What to Do | Drive Safe MOT Luton' },
  description: 'MOT run out? When you can and can’t drive, the fines and insurance risks, and how to get a test booked quickly in Luton. £45 MOT with the next free slot shown.',
  alternates: { canonical: PATH },
};

const RISKS = [
  { title: 'A fine of up to £1,000', text: 'For driving without a valid MOT. Cameras check number plates against MOT records.' },
  { title: 'Your insurance may not cover you', text: 'Many policies require a valid MOT. Driving without one could leave you uninsured if something happens.' },
  { title: 'Bigger penalties for dangerous faults', text: 'Driving a car with a dangerous fault can mean a fine of up to £2,500, three penalty points and a driving ban.' },
];

const STEPS = [
  { title: 'Book a test now', text: 'Book online or call us. Booking first matters: you’re allowed to drive to a pre-booked MOT.' },
  { title: 'Drive straight there', text: 'Take the car directly to the test, without detours. It must still be roadworthy.' },
  { title: 'Fix any faults', text: 'If it fails, you can drive it to have the faults repaired, unless there’s a dangerous fault. We can do the repairs and retest.' },
];

const FAQS: Faq[] = [
  { q: 'Can I drive my car if the MOT has expired?', a: 'Only to a pre-booked MOT test, or to a garage to have faults from a failed MOT repaired. The car must still be roadworthy. Driving anywhere else without a valid MOT can mean a fine of up to £1,000.' },
  { q: 'Is there a grace period after my MOT runs out?', a: 'No. Your MOT runs out at midnight on the expiry date, and there’s no grace period.' },
  { q: 'How do I check when my MOT runs out?', a: 'It’s on your last MOT certificate, or you can check it from your registration using our MOT due date checker or the government’s MOT history service.' },
  { q: 'How early can I have my MOT?', a: 'Up to a month (minus a day) before it runs out, and you keep the same renewal date. For example, if it runs out on 15 May, you can have it from 16 April.' },
  { q: 'Does an expired MOT affect my car tax?', a: 'Yes. You need a valid MOT to tax your car, so an expired MOT can stop you renewing your tax.' },
];

export default async function MotExpiredPage() {
  const nextSlot = await nextSlotLabel();
  return (
    <>
      <Hero eyebrow="MOT guide · Drive Safe MOT Centre, Luton" title="MOT expired?"
        lede="Your MOT has run out, or is about to. Here’s when you can still drive the car, the risks if you do, and how to get it tested quickly."
        primary={{ href: BOOK, label: 'Book an MOT now' }}
        card={<PriceCard label="MOT test" note="Fixed price" price="£45" nextLabel="Next free slot" nextValue={nextSlot} />} />
      <Section title="The risks of driving without an MOT"><Cards items={RISKS} /></Section>
      <Section title="What to do now" tone="white">
        <Steps steps={STEPS} />
        <p className="lp-lede" style={{ fontSize: 16 }}>Not sure of the date? <Link href="/mot-due-date-checker">Check your MOT due date</Link>.</p>
      </Section>
      <Section title="Expired MOT questions" tone="sand"><FaqList faqs={FAQS} /></Section>
      <FinalCta title="Get your MOT booked" line={`£45 fixed price · next free slot ${nextSlot}`} primary={{ href: BOOK, label: 'Book an MOT now' }} />
      <PageLd path={PATH} faqs={FAQS} article="MOT expired? When you can drive and what to do" />
    </>
  );
}
