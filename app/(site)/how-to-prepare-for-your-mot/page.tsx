import type { Metadata } from 'next';
import Link from 'next/link';
import { nextSlotLabel } from '@/lib/next-slot.ts';
import { PHONE_DISPLAY, PHONE_HREF, siteUrl } from '@/lib/site.ts';

export const dynamic = 'force-dynamic';

const PATH = '/how-to-prepare-for-your-mot';
const BOOK = '/book?service=mot';

export const metadata: Metadata = {
  title: { absolute: 'How to Prepare for Your MOT: 10-Minute Checklist | Drive Safe MOT' },
  description: 'A simple pre-MOT checklist: lights, tyres, windscreen, wipers, seatbelts, warning lights and more. Many MOT fails are for things you can check yourself in 10 minutes.',
  alternates: { canonical: PATH },
};

type Item = { check: string; why: string };
const CHECKLIST: { group: string; items: Item[] }[] = [
  {
    group: 'Lights',
    items: [
      { check: 'Headlights, dipped and main beam', why: 'Ask someone to stand outside, or check the reflection in a garage door or shop window.' },
      { check: 'Indicators and hazard lights', why: 'All of them, front, back and on the side, flashing at a steady rate.' },
      { check: 'Brake lights', why: 'Press the pedal and have someone look, or reverse up to a window at night.' },
      { check: 'Rear fog light and number plate lights', why: 'Easily missed, and a blown bulb is a fail.' },
    ],
  },
  {
    group: 'Tyres and wheels',
    items: [
      { check: 'Tread depth of at least 1.6mm', why: 'Across the middle three-quarters of the tyre, all the way round. A 20p coin is a rough guide: if you can see its outer band, the tread may be too low.' },
      { check: 'No cuts, bulges or exposed cord', why: 'Check the sidewalls, inside and out, as well as the tread.' },
      { check: 'Tyre pressures', why: 'Not tested as such, but under-inflated tyres wear unevenly and can trigger a warning light.' },
      { check: 'Locking wheel nut key', why: 'Leave it in the car, in the glovebox or boot, so we can check the wheels if we need to.' },
    ],
  },
  {
    group: 'Windscreen, wipers and mirrors',
    items: [
      { check: 'Windscreen chips and cracks', why: 'Damage over 10mm in the area in front of the driver, or over 40mm anywhere the wipers clear, is a fail. A small chip can often be repaired cheaply first.' },
      { check: 'Wipers clear the screen', why: 'Split or smearing blades are a fail. They’re cheap and easy to replace.' },
      { check: 'Screenwash topped up', why: 'An empty washer bottle is one of the most common, and most avoidable, reasons for a fail.' },
      { check: 'Mirrors secure and not broken', why: 'Door mirrors and the rear-view mirror must be in place and usable.' },
    ],
  },
  {
    group: 'Inside the car',
    items: [
      { check: 'No warning lights on the dashboard', why: 'Engine management, airbag, ABS and some other warning lights left on after starting are a fail.' },
      { check: 'Horn works', why: 'Give it a short press. It must be loud enough to be heard.' },
      { check: 'Seatbelts', why: 'Pull each one all the way out, check for cuts or fraying, and make sure it clicks in and pulls back.' },
      { check: 'Seats secure', why: 'The driver’s seat must adjust and lock in place.' },
      { check: 'Nothing blocking your view', why: 'Remove sat nav mounts, air fresheners or stickers in the area the wipers clear.' },
    ],
  },
  {
    group: 'Outside and under the bonnet',
    items: [
      { check: 'Number plates clean and readable', why: 'Correct letters and spacing, not cracked or faded.' },
      { check: 'Doors open from inside and outside', why: 'And the boot and bonnet close and stay shut.' },
      { check: 'Fuel cap fits and seals', why: 'A missing or loose fuel cap is a fail.' },
      { check: 'Oil, brake fluid and coolant at the right level', why: 'Top up oil and screenwash before the test. Low brake fluid can point to a problem worth checking.' },
      { check: 'No heavy smoke from the exhaust', why: 'On a diesel with a DPF, any visible smoke during the test is a major fault.' },
    ],
  },
];

const ON_THE_DAY = [
  { title: 'Empty the boot', text: 'We need to check the inside of the car, the seatbelts and the boot floor. Loose items can stop parts of the test.' },
  { title: 'Bring enough fuel and oil', text: 'The engine runs during the emissions test, so make sure there’s fuel in the tank and oil in the engine.' },
  { title: 'Make sure it’s reasonably clean', text: 'The car doesn’t need a valet, but a very dirty car, inside or underneath, can stop parts of the test from being done.' },
  { title: 'No documents needed', text: 'You don’t need your V5C or your old certificate. Just bring the car, and the locking wheel nut key if it has one.' },
];

const FAQS = [
  { q: 'What are the most common reasons for failing an MOT?', a: 'Lighting and signalling, suspension, brakes, tyres and the driver’s view of the road (windscreen, wipers and washers) are among the most common. Many of these, such as a blown bulb, worn wiper blades or an empty washer bottle, are things you can check and fix yourself before the test.' },
  { q: 'Can I fix things before my MOT?', a: 'Yes, and it’s a good idea. Replacing bulbs and wiper blades, topping up screenwash and oil, and cleaning the number plates are all simple jobs. For anything more involved, we can check it and give you a price before the test.' },
  { q: 'How early can I have my MOT and keep the same date?', a: 'Up to a month (minus a day) before it runs out. For example, if your MOT runs out on 15 May, you can have it from 16 April and still keep 15 May next year.' },
  { q: 'What happens if my car fails?', a: 'You’ll get a clear explanation of what failed and why. We’ll give you a price for any repairs before doing any work, and you don’t have to have them done with us. You can’t drive a car with a dangerous fault.' },
  { q: 'Can a garage refuse to do my MOT?', a: 'Yes. The test can be refused if, for example, the car is too dirty to inspect, the boot is full, there isn’t enough fuel or oil to run the engine, or the car isn’t safe to test. Our checklist above covers all of these.' },
  { q: 'Do I need to bring anything to my MOT?', a: 'No documents are needed. Just bring the car, and the locking wheel nut key if it has one.' },
];

export default async function PrepareForMotPage() {
  const nextSlot = await nextSlotLabel();
  const count = CHECKLIST.reduce((n, g) => n + g.items.length, 0);
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const articleLd = {
    '@context': 'https://schema.org', '@type': 'Article', headline: 'How to prepare for your MOT: a 10-minute checklist',
    url: siteUrl() + PATH, author: { '@type': 'Organization', name: 'Drive Safe MOT Centre', url: siteUrl() },
    publisher: { '@type': 'Organization', name: 'Drive Safe MOT Centre', url: siteUrl() },
  };

  return (
    <>
      <section className="navy hero">
        <div className="wrap hero__inner">
          <div className="hero__copy">
            <div className="eyebrow">MOT guide · Drive Safe MOT Centre, Luton</div>
            <h1 className="display">How to prepare for your MOT</h1>
            <p className="hero__lede">
              Many MOT failures are for simple things like a blown bulb, worn wiper blades or an empty washer bottle. Run through this {count}-point checklist
              in about 10 minutes and give your car the best chance of passing first time.
            </p>
            <div className="hero__ctas">
              <a href="#checklist" className="btn-amber hero__cta">Start the checklist</a>
              <Link href={BOOK} className="hero__call">Book your MOT, £45</Link>
            </div>
          </div>
          <div className="price-card">
            <div className="price-card__top">
              <span className="price-card__label">MOT test</span>
              <span className="price-card__fixed">Fixed price</span>
            </div>
            <div className="price-card__price">£45</div>
            <div className="price-card__next">
              <span>Next free slot</span>
              <span>{nextSlot}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap section--96" id="checklist">
        <div className="section-head">
          <h2 className="h2">Your pre-MOT checklist</h2>
          <span className="section-head__note">Tick each one off as you go.</span>
        </div>
        <div className="prep-groups">
          {CHECKLIST.map(g => (
            <div key={g.group} className="prep-group">
              <h3>{g.group}</h3>
              <ul>
                {g.items.map(i => (
                  <li key={i.check}>
                    <label>
                      <input type="checkbox" />
                      <span><strong>{i.check}</strong><span className="prep-why">{i.why}</span></span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="trust">
        <div className="wrap section--96">
          <h2 className="h2">On the day</h2>
          <ol className="lp-steps">
            {ON_THE_DAY.map((s, i) => (
              <li key={s.title} className="lp-step">
                <span className="lp-step__num">{i + 1}</span>
                <div><h3>{s.title}</h3><p>{s.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="wrap section--96 prep-help">
        <div>
          <h2 className="h2">Found a problem?</h2>
          <p className="lp-lede">
            Don’t worry. Bring it in and we’ll take a look. We’ll tell you what needs doing and the price before we start any work, and many common
            jobs, like bulbs and wiper blades, are quick to sort.
          </p>
          <p className="lp-lede">
            Diesel warning light or smoke? A blocked DPF can fail the MOT. <Link href="/dpf-cleaning-luton">Read about DPF cleaning</Link>.
          </p>
        </div>
        <div className="prep-help__card">
          <strong>Talk to us first</strong>
          <span>Not sure about something on the list? Give us a ring.</span>
          <a href={PHONE_HREF} className="find-us__phone">{PHONE_DISPLAY}</a>
        </div>
      </section>

      <section className="reviews">
        <div className="wrap section--96">
          <h2 className="h2">MOT preparation questions</h2>
          <div className="lp-faq">
            {FAQS.map(f => (
              <details key={f.q} className="lp-faq__item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="navy">
        <div className="wrap section--96 lp-final">
          <h2 className="h2">Ready for your MOT?</h2>
          <p>£45 fixed price in Luton · next free slot {nextSlot} · open Saturdays too</p>
          <div className="hero__ctas">
            <Link href={BOOK} className="btn-amber hero__cta">Book your MOT online</Link>
            <Link href="/saturday-mot-luton" className="hero__call">See Saturday slots</Link>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
    </>
  );
}
