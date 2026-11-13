import type { Metadata } from 'next';
import Link from 'next/link';
import { PHONE_DISPLAY, PHONE_HREF, siteUrl } from '@/lib/site.ts';

const PATH = '/car-battery-cold-weather';
const BOOK = '/book?service=battery';

export const metadata: Metadata = {
  title: { absolute: 'Why Car Batteries Die in Cold Weather (and How to Prevent It) | Drive Safe MOT' },
  description: 'Why car batteries struggle in winter, the warning signs of a weak battery, and simple ways to stop yours going flat. Battery checks and replacement in Luton, priced by vehicle.',
  alternates: { canonical: PATH },
};

const WHY = [
  { title: 'Cold slows the battery down', text: 'A car battery makes power through a chemical reaction, and that reaction slows down in the cold. On a frosty morning the same battery simply has less power to give.' },
  { title: 'The engine is harder to turn', text: 'Engine oil thickens when it’s cold, so the starter motor needs more power to turn the engine over, just when the battery has the least to give.' },
  { title: 'Winter means more electrics', text: 'Heater fan, heated screens and seats, headlights and wipers all draw power. On a short trip they can use more than the alternator puts back.' },
  { title: 'Short journeys don’t recharge it', text: 'Starting the engine takes a lot of charge. A few minutes’ drive to the shops or school isn’t long enough to put it back, so the battery slowly runs down.' },
  { title: 'Age catches up in winter', text: 'Batteries lose capacity as they get older, typically lasting around four to five years. A battery that coped in summer can be the one that fails on the first cold snap.' },
  { title: 'Cars that sit unused', text: 'Even when parked, the alarm, clock and other systems draw a small amount of power. Leave a car for a week or two in the cold and it may not have enough left to start.' },
];

const SIGNS = [
  { check: 'The engine turns over slowly', why: 'A sluggish, laboured start, especially first thing in the morning, is the most common early warning.' },
  { check: 'A clicking noise when you turn the key', why: 'Usually means there isn’t enough power to turn the starter motor.' },
  { check: 'Dim lights or flickering dashboard', why: 'Most noticeable when starting, or at idle with the lights and heater on.' },
  { check: 'Battery warning light', why: 'Can point to the battery or to the charging system (the alternator). Either way, get it looked at.' },
  { check: 'Stop-start has stopped working', why: 'Many cars switch off stop-start when the battery charge is low, so this can be an early sign.' },
  { check: 'You’ve needed a jump start recently', why: 'Once is bad luck. Twice in a short time usually means the battery or charging system needs checking.' },
  { check: 'The battery is over four or five years old', why: 'Even with no symptoms, an older battery is the one most likely to fail in the cold.' },
];

const PREVENT = [
  { check: 'Take a longer drive once a week', why: 'Around 30 minutes at a steady speed gives the alternator time to recharge the battery.' },
  { check: 'Switch things off before you switch off', why: 'Turn off the heater fan, heated screens, lights and wipers before turning off the engine, so the next start has less to power.' },
  { check: 'Don’t sit with the electrics on and the engine off', why: 'Running the radio or heater with the engine off drains the battery quickly in the cold.' },
  { check: 'Use a battery charger or maintainer', why: 'If the car is parked for long spells, a smart charger keeps the battery topped up safely.' },
  { check: 'Keep the terminals clean and tight', why: 'Corrosion (white or green powder) and loose clamps stop the battery charging and starting properly.' },
  { check: 'Park in a garage if you can', why: 'Even a little shelter from frost makes cold starts easier.' },
  { check: 'Get it checked before winter', why: 'If the battery is getting on, or you’ve noticed any of the signs above, have it checked before it lets you down.' },
];

const JUMP = [
  { title: 'Don’t keep cranking', text: 'Try for a few seconds at a time, waiting around 30 seconds between attempts. Turn off the lights, heater and radio first.' },
  { title: 'Jump start it safely', text: 'Follow your car’s handbook: many modern cars have specific jump points under the bonnet. If you’re not sure, call a breakdown service.' },
  { title: 'Drive for at least 30 minutes', text: 'Once it starts, a longer drive helps put charge back. A short trip and switching off again can leave you stuck.' },
  { title: 'Get it checked', text: 'A battery that’s gone flat once in the cold is likely to do it again. Book a battery check and we’ll tell you whether it needs replacing.' },
];

const FAQS = [
  { q: 'Can you test and replace my car battery in Luton?', a: 'Yes. We test the battery and, if it needs replacing, fit the right type for your car, including AGM and EFB batteries for stop-start. The price depends on the car, and we tell you it before we fit anything. Book a battery check online or call us.' },
  { q: 'Why does my car battery die in cold weather?', a: 'Cold slows the chemical reaction inside the battery, so it has less power to give, while thick, cold engine oil makes the engine harder to turn. Add winter electrics like the heater and lights, and short journeys that don’t recharge it, and a weak battery can fail on a cold morning.' },
  { q: 'How long does a car battery last?', a: 'Typically around four to five years, depending on how the car is used. Lots of short journeys, long spells parked and heavy electrical use can shorten that.' },
  { q: 'Will a car battery recharge by idling?', a: 'Only slowly. Idling with the heater and lights on may barely keep up with what they use. A proper drive of around 30 minutes recharges the battery far better.' },
  { q: 'Can a battery die overnight in the cold?', a: 'A healthy battery shouldn’t, but an old or already low battery can go from starting the car one day to not starting it the next when the temperature drops.' },
  { q: 'Do stop-start cars need a special battery?', a: 'Yes. Cars with stop-start usually need an AGM or EFB battery designed for frequent starting. Fitting the wrong type can cause stop-start problems and an early failure.' },
  { q: 'Is the battery checked in the MOT?', a: 'The MOT checks that the battery is secure and not leaking, but it doesn’t test how much charge it holds. A battery can pass the MOT and still fail you on a cold morning.' },
  { q: 'Is it the battery or the alternator?', a: 'If the car starts after a jump but goes flat again after driving, or the battery warning light comes on while driving, the charging system (often the alternator) may be at fault rather than the battery.' },
];

function Checklist({ items }: { items: { check: string; why: string }[] }) {
  return (
    <ul className="ticks bat-list">
      {items.map(i => <li key={i.check}><span><strong>{i.check}</strong><span className="prep-why">{i.why}</span></span></li>)}
    </ul>
  );
}

export default function CarBatteryColdWeatherPage() {
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const articleLd = {
    '@context': 'https://schema.org', '@type': 'Article', headline: 'Why car batteries die in cold weather, and how to prevent it',
    url: siteUrl() + PATH, author: { '@type': 'Organization', name: 'Drive Safe MOT Centre', url: siteUrl() },
    publisher: { '@type': 'Organization', name: 'Drive Safe MOT Centre', url: siteUrl() },
  };

  return (
    <>
      <section className="navy hero">
        <div className="wrap hero__inner">
          <div className="hero__copy">
            <div className="eyebrow">Winter car care · Drive Safe MOT Centre, Luton</div>
            <h1 className="display">Why car batteries die in cold weather</h1>
            <p className="hero__lede">
              The first frosty morning is when weak batteries give up. Here’s why the cold hits batteries so hard, the warning signs to look out for,
              and simple ways to stop yours going flat.
            </p>
            <div className="hero__ctas">
              <Link href={BOOK} className="btn-amber hero__cta">Book a battery check</Link>
              <a href="#prevent" className="hero__call">How to prevent it</a>
            </div>
          </div>
          <div className="price-card bat-card">
            <div className="price-card__label">In short</div>
            <ul>
              <li>Cold weakens the battery</li>
              <li>Cold oil makes the engine harder to start</li>
              <li>Winter electrics and short trips drain it</li>
              <li>Older batteries are most at risk</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="wrap section--96">
        <h2 className="h2">Why the cold is hard on batteries</h2>
        <div className="lp-why">
          {WHY.map(w => (
            <div key={w.title} className="bat-why">
              <div className="trust__title">{w.title}</div>
              <div className="trust__text">{w.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="trust">
        <div className="wrap section--96 bat-two">
          <div>
            <h2 className="h2">Warning signs of a weak battery</h2>
            <p className="lp-lede">Catch these early and you can sort the battery before it leaves you stranded.</p>
          </div>
          <Checklist items={SIGNS} />
        </div>
      </section>

      <section className="wrap section--96 bat-two" id="prevent">
        <div>
          <h2 className="h2">How to stop your battery going flat</h2>
          <p className="lp-lede">Simple habits that make a real difference over winter.</p>
        </div>
        <Checklist items={PREVENT} />
      </section>

      <section className="reviews">
        <div className="wrap section--96">
          <h2 className="h2">Car won’t start on a cold morning?</h2>
          <ol className="lp-steps">
            {JUMP.map((s, i) => (
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
          <h2 className="h2">Battery checks and replacement in Luton</h2>
          <p className="lp-lede">
            Slow to start, needed a jump, or the battery warning light is on? Book a battery check. We test the battery and tell you whether it
            needs replacing. If it does, we fit the right type for your car, including AGM and EFB batteries for stop-start, and give you the
            price before we fit it. Prices depend on the car.
          </p>
          <p style={{ marginTop: 22 }}><Link href={BOOK} className="btn-amber lp-cta">Book a battery check</Link></p>
          <p className="lp-lede" style={{ fontSize: 16 }}>
            <Link href="/how-to-prepare-for-your-mot">Pre-MOT checklist</Link> · <Link href="/book-mot-luton">Book an MOT in Luton</Link>
          </p>
        </div>
        <div className="prep-help__card">
          <strong>Won’t start at all?</strong>
          <span>Give us a ring and we’ll talk you through your options.</span>
          <a href={PHONE_HREF} className="find-us__phone">{PHONE_DISPLAY}</a>
        </div>
      </section>

      <section className="reviews">
        <div className="wrap section--96">
          <h2 className="h2">Car battery questions</h2>
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
    </>
  );
}
