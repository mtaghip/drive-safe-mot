import type { Metadata } from 'next';
import Link from 'next/link';
import { Cards, FaqList, FinalCta, FindUs, Hero, PageLd, PriceCard, Reasons, Section, SplitList, Steps, type Faq } from '@/components/Landing.tsx';
import { nextSlotLabel } from '@/lib/next-slot.ts';
import { ADDRESS_ONE_LINE } from '@/lib/site.ts';

export const dynamic = 'force-dynamic';

const PATH = '/car-service-luton';
const BOOK = '/book?service=service';

export const metadata: Metadata = {
  title: { absolute: 'Car Service in Luton · Interim and Full Services | Drive Safe MOT' },
  description: `Interim and full car services in Luton, priced by vehicle and confirmed before we start. Oil and filter change, fluids, brakes and lights checked. Add your MOT on the same visit. ${ADDRESS_ONE_LINE}.`,
  alternates: { canonical: PATH },
};

const TYPES = [
  { title: 'Interim service', text: 'For cars doing higher mileage, or as a check-up between full services. Oil and oil filter change, with the main safety items checked: brakes, lights, tyres, fluids and wipers.' },
  { title: 'Full service', text: 'A more thorough service, usually once a year. Everything in the interim service, plus more filters and a wider set of checks across the car.' },
  { title: 'MOT and service together', text: 'Book both for the same visit. Anything the service finds can be sorted before the MOT, so you’re more likely to pass first time.' },
];

const CHECKS = [
  { check: 'Engine oil and oil filter changed', why: 'The most important part of any service: fresh oil protects the engine.' },
  { check: 'Fluids checked and topped up', why: 'Coolant, brake fluid, power steering and screenwash.' },
  { check: 'Brakes checked', why: 'Pads, discs and brake fluid, so you know how much life is left.' },
  { check: 'Lights, tyres and wipers checked', why: 'The same things the MOT looks at, so problems are found early.' },
  { check: 'Battery, belts and hoses looked over', why: 'Spotting wear before it leaves you stranded.' },
  { check: 'A clear report on anything else we find', why: 'Explained in plain English and priced, so you can decide what to do.' },
];

const STEPS = [
  { title: 'Book a slot', text: 'Choose a time online or call us. Tell us the make and model and we’ll confirm the price for your car.' },
  { title: 'We service the car', text: 'Wait with us or drop it off. If we find anything else that needs doing, we call you with a price first.' },
  { title: 'Drive away', text: 'We talk you through what was done and anything to keep an eye on.' },
];

const WHY = [
  { title: 'Priced by vehicle', text: 'Every car is different, so we give you the price for yours before we start. No surprises at the counter.' },
  { title: 'No work without your go-ahead', text: 'Anything extra we find is explained and priced. You decide whether to go ahead.' },
  { title: 'MOT on the same visit', text: 'Save a trip: book your £45 MOT for the same day as your service.' },
  { title: 'Open Saturdays', text: 'Book a weekend slot if you can’t get the car in during the week.' },
];

const FAQS: Faq[] = [
  { q: 'How much is a car service in Luton?', a: 'It depends on the car and the type of service, because oil, filters and the time needed vary from model to model. Tell us the make and model, or book online, and we’ll confirm the price for your car before we start.' },
  { q: 'What’s the difference between an interim and a full service?', a: 'An interim service covers the essentials, including an oil and filter change and the main safety checks. A full service goes further, with more filters and a wider set of checks. Many drivers have a full service once a year and an interim one in between if they do high mileage.' },
  { q: 'How often should my car be serviced?', a: 'Most cars need a service every 12 months or at a set mileage, whichever comes first. Your car’s handbook gives the manufacturer’s schedule.' },
  { q: 'Is a service the same as an MOT?', a: 'No. The MOT is a yearly legal test of safety and emissions. A service is maintenance to keep the car running well. They’re often done together, and a service before the MOT can catch problems that would fail it.' },
  { q: 'Can I have my MOT and service on the same day?', a: 'Yes. Book them for the same visit and we’ll do both. If the service finds something that would fail the MOT, we can tell you before the test.' },
  { q: 'Can I wait while my car is serviced?', a: 'Yes, or drop it off and we’ll call you when it’s ready.' },
];

export default async function CarServiceLutonPage() {
  const nextSlot = await nextSlotLabel();
  return (
    <>
      <Hero eyebrow="Car servicing · Taylor Street, Luton" title="Car service in Luton"
        lede="Interim and full services to keep your car reliable between MOTs. Priced for your car before we start, with your MOT on the same visit if you need it."
        primary={{ href: BOOK, label: 'Book a service' }}
        card={<PriceCard label="Car service" note="Confirmed before we start" price="By car" nextLabel="Next free slot" nextValue={nextSlot} />} />
      <Section title="Choose your service"><Cards items={TYPES} /></Section>
      <SplitList title="What a service includes" intro="Exactly what’s done depends on the car and the service, but you can expect:" items={CHECKS} tone="white" />
      <Section title="How it works">
        <Steps steps={STEPS} />
        <p className="lp-lede" style={{ fontSize: 16 }}>MOT due too? <Link href="/book-mot-luton">Book your MOT in Luton</Link> for £45.</p>
      </Section>
      <Section title="Why service with us" tone="white"><Reasons items={WHY} /></Section>
      <Section title="Car service questions" tone="sand"><FaqList faqs={FAQS} /></Section>
      <FindUs />
      <FinalCta title="Book your car service" line={`Priced for your car before we start · next free slot ${nextSlot}`} primary={{ href: BOOK, label: 'Book a service' }} />
      <PageLd path={PATH} faqs={FAQS} service={{ type: 'Car servicing', name: 'Car servicing in Luton' }} />
    </>
  );
}
