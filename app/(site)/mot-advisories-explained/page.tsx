import type { Metadata } from 'next';
import Link from 'next/link';
import { Cards, FaqList, FinalCta, Hero, PageLd, Section, SplitList, SummaryCard, type Faq } from '@/components/Landing.tsx';

const PATH = '/mot-advisories-explained';

export const metadata: Metadata = {
  title: { absolute: 'MOT Advisories Explained: Dangerous, Major, Minor | Drive Safe MOT' },
  description: 'What MOT advisories, minor, major and dangerous faults mean, which ones fail the test, whether you can drive, and what to do about advisories before your next MOT.',
  alternates: { canonical: PATH },
};

const LEVELS = [
  { title: 'Dangerous: fail', text: 'A direct risk to road safety or the environment. The car fails, and you mustn’t drive it until it’s repaired.' },
  { title: 'Major: fail', text: 'Could affect safety, other road users or the environment. The car fails and needs repairing straight away.' },
  { title: 'Minor: pass', text: 'No significant effect on safety, but it should be repaired as soon as possible. The car passes, with the fault recorded.' },
  { title: 'Advisory: pass', text: 'Something to keep an eye on, such as tyres or brakes getting close to the limit. It may become a fault later.' },
];

const COMMON = [
  { check: 'Tyres close to the legal limit', why: 'Tread approaching 1.6mm, or minor cracking on the sidewall.' },
  { check: 'Brake pads or discs wearing', why: 'Still within limits, but will need replacing.' },
  { check: 'Corrosion', why: 'Surface rust on brake pipes, the subframe or underbody.' },
  { check: 'Oil leak', why: 'A small leak that isn’t yet bad enough to fail.' },
  { check: 'Worn suspension parts', why: 'Bushes or joints showing slight wear.' },
];

const FAQS: Faq[] = [
  { q: 'Does an advisory mean my car failed?', a: 'No. Advisories and minor faults don’t fail the MOT. Your car passes, but the items are recorded so you know what to keep an eye on.' },
  { q: 'Can I drive with MOT advisories?', a: 'Yes, but it’s wise to get them checked. An advisory today, such as worn tyres or brakes, can become a dangerous fault before your next MOT, and you’re responsible for keeping the car roadworthy all year round.' },
  { q: 'Can I drive with a major or dangerous fault?', a: 'Not with a dangerous fault: it must be repaired before the car is driven. With a major fault, you can only drive the car if your old MOT certificate is still valid, and it should be fixed straight away.' },
  { q: 'Can other people see my MOT advisories?', a: 'Yes. The MOT history of any car, including advisories, is public on the government’s MOT history service. Buyers often check it, so fixing advisories can help when you sell.' },
  { q: 'Should I fix advisories before my next MOT?', a: 'It’s a good idea. Advisories are often the things that fail next year’s test. Fixing them early can also be cheaper, for example replacing brake pads before they damage the discs.' },
];

export default function MotAdvisoriesPage() {
  return (
    <>
      <Hero eyebrow="MOT guide · Drive Safe MOT Centre, Luton" title="MOT advisories explained"
        lede="Your MOT result sorts problems into dangerous, major and minor faults, plus advisories. Here’s what each one means, which ones fail, and what to do next."
        primary={{ href: '/book?service=repair', label: 'Get advisories fixed' }} secondary={{ href: '/book-mot-luton', label: 'Book an MOT, £45' }}
        card={<SummaryCard title="In short" items={['Dangerous: fail, don’t drive', 'Major: fail, repair now', 'Minor: pass, repair soon', 'Advisory: pass, keep an eye on it']} />} />
      <Section title="The four levels"><Cards items={LEVELS} /></Section>
      <SplitList title="Common advisories" intro="These come up a lot. Most are cheaper to fix sooner rather than later." items={COMMON} tone="white" />
      <Section title="MOT advisory questions" tone="sand">
        <FaqList faqs={FAQS} />
        <p className="lp-lede" style={{ fontSize: 16 }}>
          <Link href="/mot-repairs-luton">Failed your MOT?</Link> · <Link href="/how-to-prepare-for-your-mot">Pre-MOT checklist</Link>
        </p>
      </Section>
      <FinalCta title="Got advisories on your MOT?" line="We check them and give you a price before any work starts" primary={{ href: '/book?service=repair', label: 'Book a repair check' }} />
      <PageLd path={PATH} faqs={FAQS} article="MOT advisories explained: dangerous, major, minor and advisory" />
    </>
  );
}
