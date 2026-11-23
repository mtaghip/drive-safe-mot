import type { Metadata } from 'next';
import { Cards, FaqList, FinalCta, FindUs, Hero, PageLd, PriceCard, Reasons, Section, Steps, type Faq } from '@/components/Landing.tsx';
import { ADDRESS_ONE_LINE } from '@/lib/site.ts';

const PATH = '/ecu-remapping-luton';
const BOOK = '/book?service=tuning';

export const metadata: Metadata = {
  title: { absolute: 'ECU Remapping in Luton · Performance and Economy | Drive Safe MOT' },
  description: `ECU remapping in Luton for better performance or fuel economy, set up to suit your car and how you drive. Diagnostics before and after. Priced by vehicle. ${ADDRESS_ONE_LINE}.`,
  alternates: { canonical: PATH },
};

const OPTIONS = [
  { title: 'Performance', text: 'More power and torque for stronger acceleration and easier overtaking.' },
  { title: 'Economy', text: 'Adjusted to make the engine work more efficiently, which can help fuel economy, especially on diesels.' },
  { title: 'Set up for how you drive', text: 'We talk through how you use the car first, and set the remap to suit.' },
];

const STEPS = [
  { title: 'Tell us about your car', text: 'Call us or book online with the make, model and engine. We’ll tell you what’s possible and the price.' },
  { title: 'Health check first', text: 'We run diagnostics before we start, because a remap should only go on an engine in good condition.' },
  { title: 'Remap and re-check', text: 'We remap the ECU, then run diagnostics again afterwards to make sure everything is as it should be.' },
];

const WHY = [
  { title: 'Diagnostics before and after', text: 'We check the engine is healthy before remapping, and check again afterwards.' },
  { title: 'Performance or economy', text: 'Choose what matters to you.' },
  { title: 'Priced by vehicle', text: 'Every car is different. We give you the price for yours before we start.' },
  { title: 'Honest advice', text: 'If your car isn’t a good candidate for a remap, we’ll tell you.' },
];

const FAQS: Faq[] = [
  { q: 'What is ECU remapping?', a: 'Your car’s engine control unit (ECU) runs software that controls things like fuel and boost. Remapping changes those settings, usually to give more power and torque, or to improve fuel economy.' },
  { q: 'How much does a remap cost?', a: 'It depends on the car and the engine. Call us or book online with your make, model and engine, and we’ll give you a price before we start.' },
  { q: 'Do I need to tell my insurer?', a: 'Yes. A remap is a modification, and you must tell your insurance company. Not declaring it could invalidate your cover.' },
  { q: 'Will a remap affect my warranty?', a: 'It can. If your car is still under a manufacturer’s warranty, check your warranty terms before going ahead.' },
  { q: 'Is my car suitable for a remap?', a: 'Many turbocharged petrol and diesel engines respond well. The engine must be healthy first, which is why we run diagnostics before we start. If your car isn’t a good candidate, we’ll tell you.' },
];

export default function EcuRemappingLutonPage() {
  return (
    <>
      <Hero eyebrow="Tuning · Taylor Street, Luton" title="ECU remapping in Luton"
        lede="Remapping for better performance or fuel economy, set up to suit your car and how you drive, with diagnostics before and after."
        primary={{ href: BOOK, label: 'Book a remap' }}
        card={<PriceCard label="ECU remap" note="Priced by vehicle" price="Call" />} />
      <Section title="Performance or economy"><Cards items={OPTIONS} /></Section>
      <Section title="How it works" tone="white"><Steps steps={STEPS} /></Section>
      <Section title="Why remap with us"><Reasons items={WHY} /></Section>
      <Section title="Remapping questions" tone="sand"><FaqList faqs={FAQS} /></Section>
      <FindUs />
      <FinalCta title="Find out what your car can do" line="Priced for your car before we start" primary={{ href: BOOK, label: 'Book a remap' }} />
      <PageLd path={PATH} faqs={FAQS} service={{ type: 'ECU remapping', name: 'ECU remapping in Luton' }} />
    </>
  );
}
