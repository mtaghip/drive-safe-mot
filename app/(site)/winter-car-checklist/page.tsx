import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqList, FinalCta, Hero, PageLd, Section, SplitList, SummaryCard, type Faq } from '@/components/Landing.tsx';

const PATH = '/winter-car-checklist';

export const metadata: Metadata = {
  title: { absolute: 'Winter Car Checklist: Get Your Car Ready for Winter | Drive Safe MOT' },
  description: 'A simple winter car checklist: battery, tyres, screenwash, antifreeze, wipers, lights and an emergency kit. Plus winter driving rules worth knowing. From Drive Safe MOT Centre, Luton.',
  alternates: { canonical: PATH },
};

const CAR = [
  { check: 'Battery', why: 'Cold weather is hard on batteries. If yours is slow to start or over four or five years old, get it checked.' },
  { check: 'Tyres', why: 'The legal minimum is 1.6mm, but grip on wet and icy roads drops well before that. Many experts recommend 3mm for winter.' },
  { check: 'Screenwash with antifreeze', why: 'Use a winter screenwash that won’t freeze in the bottle or on the screen.' },
  { check: 'Coolant (antifreeze)', why: 'Check the level when the engine is cold. The right mix stops the engine’s coolant from freezing.' },
  { check: 'Wiper blades', why: 'Replace split or smearing blades. Don’t use the wipers to clear ice: they tear.' },
  { check: 'Lights', why: 'Check all bulbs and keep the lenses clean. Days are short and roads are dirty.' },
];

const KIT = [
  { check: 'Ice scraper and de-icer', why: 'Not hot water, which can crack the windscreen.' },
  { check: 'Torch and phone charger', why: 'For breakdowns in the dark.' },
  { check: 'Warm coat, blanket and boots', why: 'In case you’re stuck for a while.' },
  { check: 'Water and a snack', why: 'Especially on longer journeys.' },
  { check: 'Jump leads', why: 'Or a portable jump starter.' },
];

const RULES = [
  { check: 'Clear every window before you drive', why: 'The Highway Code says you must be able to see out of every window. Clear snow from the roof too, so it doesn’t slide onto the screen.' },
  { check: 'Don’t leave the engine running to defrost', why: 'Leaving a car running unattended can invalidate your insurance if it’s stolen, and idling unnecessarily on a public road is against the rules.' },
  { check: 'Leave more room', why: 'Stopping distances can be up to ten times longer on ice.' },
];

const FAQS: Faq[] = [
  { q: 'What should I check on my car before winter?', a: 'The battery, tyres, screenwash, coolant, wiper blades and lights. Those cover most winter breakdowns and visibility problems.' },
  { q: 'What tyre tread is best for winter?', a: 'The legal minimum is 1.6mm, but tyres lose grip in wet and icy conditions well before that. Many experts recommend at least 3mm for winter driving.' },
  { q: 'Can I pour hot water on a frozen windscreen?', a: 'No. The sudden change in temperature can crack the glass. Use de-icer and a scraper, and run the heater on the windscreen.' },
  { q: 'Is it illegal to drive with snow on my car?', a: 'The Highway Code says you must be able to see out of every window and keep lights and number plates clean. Snow on the roof can also slide down and block your view, so clear it all before you set off.' },
];

export default function WinterCarChecklistPage() {
  return (
    <>
      <Hero eyebrow="Winter car care · Drive Safe MOT Centre, Luton" title="Winter car checklist"
        lede="A few minutes now can save you from a cold morning breakdown. Here’s what to check on your car, what to keep in it, and winter driving rules worth knowing."
        primary={{ href: '/book?service=service', label: 'Book a winter service' }} secondary={{ href: '/book?service=battery', label: 'Book a battery check' }}
        card={<SummaryCard title="The big six" items={['Battery', 'Tyres', 'Screenwash', 'Coolant', 'Wipers', 'Lights']} />} />
      <SplitList title="Check your car" items={CAR} />
      <SplitList title="Keep in the car" intro="A small winter kit in the boot:" items={KIT} tone="white" />
      <SplitList title="Winter driving rules" items={RULES} />
      <Section title="Winter car questions" tone="sand">
        <FaqList faqs={FAQS} />
        <p className="lp-lede" style={{ fontSize: 16 }}>
          <Link href="/car-battery-cold-weather">Why batteries die in the cold</Link> · <Link href="/tyres-luton">Tyres in Luton</Link> · <Link href="/car-service-luton">Car servicing</Link>
        </p>
      </Section>
      <FinalCta title="Get your car ready for winter" line="Battery checks, tyres and servicing in Luton" primary={{ href: '/book?service=service', label: 'Book a service' }} secondary={{ href: '/book?service=battery', label: 'Book a battery check' }} />
      <PageLd path={PATH} faqs={FAQS} article="Winter car checklist: get your car ready for winter" />
    </>
  );
}
