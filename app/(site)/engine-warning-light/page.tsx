import type { Metadata } from 'next';
import Link from 'next/link';
import { Cards, FaqList, FinalCta, Hero, PageLd, Section, SplitList, SummaryCard, type Faq } from '@/components/Landing.tsx';

const PATH = '/engine-warning-light';
const BOOK = '/book?service=repair';

export const metadata: Metadata = {
  title: { absolute: 'Engine Warning Light On? What It Means and What to Do | Drive Safe MOT' },
  description: 'Engine management light on, or flashing? What the engine warning light means, whether it’s safe to drive, common causes, and why it’s an MOT fail. Fault code checks in Luton.',
  alternates: { canonical: PATH },
};

const COLOURS = [
  { title: 'Amber and steady', text: 'The engine’s computer has found a fault. It’s usually safe to drive gently for a short while, but get it checked soon: small faults can become expensive ones.' },
  { title: 'Amber and flashing', text: 'Often a serious misfire, which can quickly damage the catalytic converter. Slow down, avoid hard acceleration, and get it checked as soon as possible.' },
  { title: 'Any red warning light', text: 'Red means stop. Pull over when it’s safe and switch off, especially for oil pressure, engine temperature or brake warnings. Check your handbook before driving on.' },
];

const CAUSES = [
  { check: 'A faulty sensor', why: 'Oxygen (lambda), air flow and other sensors are common culprits, and often a straightforward fix.' },
  { check: 'Ignition problems', why: 'Worn spark plugs or a failing ignition coil can cause misfires, especially on petrol cars.' },
  { check: 'EGR valve', why: 'Exhaust gas recirculation valves can clog with soot, particularly on diesels.' },
  { check: 'A blocked DPF (diesels)', why: 'Lots of short trips can block the diesel particulate filter, sometimes with its own warning light too.' },
  { check: 'Catalytic converter', why: 'Often a result of another fault, such as a misfire, left unfixed.' },
  { check: 'A loose or faulty fuel cap', why: 'On some cars, a fuel cap that isn’t sealing can trigger an emissions fault.' },
];

const DO = [
  { check: 'Note what the car is doing', why: 'Loss of power, rough running, strange smells or noises all help find the cause.' },
  { check: 'Check for other warning lights', why: 'Red lights, or several lights at once, mean stop and get help.' },
  { check: 'Drive gently, or not at all if it’s flashing', why: 'Avoid hard acceleration and high revs until it’s checked.' },
  { check: 'Get the fault codes read', why: 'The engine’s computer stores codes that point to the problem. Reading them is the first step to fixing it.' },
];

const FAQS: Faq[] = [
  { q: 'Is it safe to drive with the engine light on?', a: 'If it’s amber and steady and the car is driving normally, it’s usually OK to drive gently for a short while to get it checked. If it’s flashing, the car feels wrong, or any red light comes on, stop when it’s safe and get it looked at before driving further.' },
  { q: 'Will my car fail its MOT with the engine light on?', a: 'Yes. Since 2018, an engine management light that stays on is a major fault and an automatic MOT fail. Get it fixed before the test.' },
  { q: 'Can I just clear the warning light?', a: 'Clearing the codes switches the light off, but doesn’t fix the fault, so it usually comes back. It’s best to find and fix the cause.' },
  { q: 'What does reading the fault codes involve?', a: 'A diagnostic tool plugs into the car and reads the codes the engine’s computer has stored. The codes point to the system or sensor involved, which helps us find the fault and give you a price to fix it.' },
  { q: 'Why did the light go off on its own?', a: 'Some faults are intermittent, so the light can come and go. The code is often still stored, so it’s worth having it read before it turns into something bigger.' },
];

export default function EngineWarningLightPage() {
  return (
    <>
      <Hero eyebrow="Car guide · Drive Safe MOT Centre, Luton" title="Engine warning light on?"
        lede="That little engine symbol on the dashboard means the car’s computer has found a fault. Here’s what the light means, whether you can keep driving, and what to do next."
        primary={{ href: BOOK, label: 'Book a fault code check' }} secondary={{ href: '#causes', label: 'Common causes' }}
        card={<SummaryCard title="In short" items={['Amber and steady: get it checked soon', 'Flashing: slow down and get it checked now', 'Red light: stop when it’s safe', 'Engine light on is an MOT fail']} />} />
      <Section title="What the colour means"><Cards items={COLOURS} /></Section>
      <SplitList id="causes" title="Common causes" intro="There are lots of possible causes. These are some of the most common:" items={CAUSES} tone="white" />
      <SplitList title="What to do" items={DO} />
      <Section title="Engine light questions" tone="sand">
        <FaqList faqs={FAQS} />
        <p className="lp-lede" style={{ fontSize: 16 }}>
          Diesel? Read about <Link href="/dpf-cleaning-luton">DPF cleaning</Link> · MOT due? <Link href="/book-mot-luton">Book your MOT</Link>
        </p>
      </Section>
      <FinalCta title="Get the fault codes read" line="We find out why the light is on and price the fix before we start" primary={{ href: BOOK, label: 'Book a fault code check' }} />
      <PageLd path={PATH} faqs={FAQS} article="Engine warning light on? What it means and what to do" />
    </>
  );
}
