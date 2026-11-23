import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqList, FinalCta, PageLd, Section, type Faq } from '@/components/Landing.tsx';
import { lookupConfigured } from '@/lib/vehicle-lookup.ts';
import Checker from './Checker.tsx';

export const dynamic = 'force-dynamic';

const PATH = '/mot-due-date-checker';

export const metadata: Metadata = {
  title: { absolute: 'Free MOT Due Date Checker: When Is My MOT Due? | Drive Safe MOT' },
  description: 'Check when your MOT is due from your number plate, free. See the earliest date you can have your MOT and keep the same renewal date, then book a £45 MOT in Luton.',
  alternates: { canonical: PATH },
};

const FAQS: Faq[] = [
  { q: 'How do I check when my MOT is due?', a: 'Enter your registration in the checker above. It shows the MOT expiry date held by the DVLA. It’s also on your last MOT certificate.' },
  { q: 'How early can I have my MOT?', a: 'Up to a month (minus a day) before it runs out, and you keep the same renewal date. The checker works out that date for you.' },
  { q: 'When does a new car need its first MOT?', a: 'Most cars need their first MOT by the third anniversary of their registration, then every year after that.' },
  { q: 'What happens if I miss my MOT date?', a: 'There’s no grace period. Driving without a valid MOT can mean a fine of up to £1,000, except when driving to a pre-booked test or to have faults repaired.' },
  { q: 'Do you store my registration?', a: 'No. The checker sends the registration to the DVLA to look up the vehicle and shows you the result. We don’t keep a record of the cars checked.' },
];

export default function MotDueDateCheckerPage() {
  return (
    <>
      <section className="navy hero">
        <div className="wrap chk-hero">
          <div className="eyebrow">Free tool · Drive Safe MOT Centre, Luton</div>
          <h1 className="display">When is my MOT due?</h1>
          <p className="hero__lede">Enter your number plate to see your MOT due date, and the earliest day you can have the test and keep the same renewal date.</p>
          <Checker available={lookupConfigured()} />
        </div>
      </section>
      <Section title="MOT date questions" tone="sand">
        <FaqList faqs={FAQS} />
        <p className="lp-lede" style={{ fontSize: 16 }}>
          <Link href="/how-to-prepare-for-your-mot">Pre-MOT checklist</Link> · <Link href="/mot-expired">MOT expired? What to do</Link> · <Link href="/saturday-mot-luton">Saturday MOTs</Link>
        </p>
      </Section>
      <FinalCta title="MOT coming up?" line="£45 fixed price in Luton · open Saturdays" primary={{ href: '/book?service=mot', label: 'Book your MOT' }} />
      <PageLd path={PATH} faqs={FAQS} article="Free MOT due date checker" />
    </>
  );
}
