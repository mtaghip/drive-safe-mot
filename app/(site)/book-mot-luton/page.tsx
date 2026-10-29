import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Tick } from '@/components/icons.tsx';
import { Hours, MapEmbed } from '@/components/shared.tsx';
import { googleReviews } from '@/lib/google-reviews.ts';
import { nextSlotLabel } from '@/lib/next-slot.ts';
import { ADDRESS_LINES, ADDRESS_ONE_LINE, DIRECTIONS_HREF, OPEN_DAYS_TEXT, PHONE_DISPLAY, PHONE_HREF, REVIEWS_URL, siteUrl, SLOT_RANGE_TEXT } from '@/lib/site.ts';
import garageFront from '@/public/images/garage-front.webp';

export const dynamic = 'force-dynamic';

const PATH = '/book-mot-luton';
const BOOK = '/book?service=mot';

export const metadata: Metadata = {
  title: { absolute: 'Book an MOT in Luton · £45 Fixed Price | Drive Safe MOT' },
  description: `Book your MOT in Luton online in under a minute. £45 fixed price, one-hour slots ${SLOT_RANGE_TEXT}, ${OPEN_DAYS_TEXT.replace(/,.*/, '')}. Drive Safe MOT Centre, ${ADDRESS_ONE_LINE}.`,
  alternates: { canonical: PATH },
};

const STEPS = [
  { title: 'Pick a slot', text: `Choose a one-hour slot online, ${SLOT_RANGE_TEXT}, from tomorrow onwards. Saturdays too.` },
  { title: 'Get your confirmation', text: 'You’re emailed straight away with your booking reference, directions and a calendar invite.' },
  { title: 'Drop in on the day', text: 'Wait while we test it or leave the car with us. We explain the result and any advisories before you go.' },
];

const WHY = [
  { title: '£45, fixed', text: 'Less than the £54.85 maximum the DVSA allows for a car MOT, and no extra charges on the day.' },
  { title: 'Open Saturdays', text: `${OPEN_DAYS_TEXT}, so you don’t have to take time off work.` },
  { title: 'Repairs done here', text: 'If something fails, we explain why and quote the repair before doing any work.' },
  { title: 'Free MOT reminders', text: 'We email you before next year’s MOT is due, so you never drive without one.' },
];

const CHECKS = [
  'Brakes', 'Lights and indicators', 'Steering and suspension', 'Tyres and wheels', 'Seatbelts', 'Exhaust and emissions',
  'Windscreen, wipers and washers', 'Mirrors', 'Horn', 'Bodywork and structure', 'Fuel system', 'Registration plates and VIN',
];

const FAQS = [
  { q: 'How much is an MOT in Luton?', a: 'Our MOT is £45, fixed price, for cars, small vans and motorhomes. That’s below the DVSA maximum of £54.85 for a car, and there are no extra charges for the test.' },
  { q: 'How long does an MOT take?', a: 'Around an hour. You’re welcome to wait, or drop the car off and we’ll call you when it’s done.' },
  { q: 'How early can I have my MOT?', a: 'You can have your MOT up to a month (minus a day) before it runs out and keep the same renewal date. For example, if it runs out on 15 May, you can have it from 16 April.' },
  { q: 'What happens if my car fails?', a: 'We’ll show you what failed and why, and give you a price for the repair before doing any work. You don’t have to have it repaired with us. You can’t drive a car with a dangerous fault, so it’s worth booking early in case anything needs fixing.' },
  { q: 'Do I need to bring any documents?', a: 'No, you don’t need your V5C or old certificate. Just bring the car.' },
  { q: 'Can I book an MOT on a Saturday?', a: `Yes. We’re open ${OPEN_DAYS_TEXT}, and Saturday slots can be booked online like any other day.` },
  { q: 'How do I pay?', a: 'Payment is on the day, by card or cash. Nothing is taken when you book.' },
  { q: 'Can I change or cancel my booking?', a: `Yes. Call us on ${PHONE_DISPLAY} or reply to your confirmation email, quoting your booking reference.` },
];

export default async function BookMotLutonPage() {
  const [nextSlot, google] = await Promise.all([nextSlotLabel(), googleReviews()]);
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const serviceLd = {
    '@context': 'https://schema.org', '@type': 'Service', serviceType: 'MOT test', name: 'MOT test in Luton',
    url: siteUrl() + PATH, areaServed: { '@type': 'City', name: 'Luton' },
    provider: { '@type': 'AutoRepair', name: 'Drive Safe MOT Centre', url: siteUrl() },
    offers: { '@type': 'Offer', price: '45.00', priceCurrency: 'GBP', url: siteUrl() + BOOK },
  };
  return (
    <>
      <section className="navy hero">
        <div className="wrap hero__inner">
          <div className="hero__copy">
            <div className="eyebrow">MOT centre in Luton · {ADDRESS_ONE_LINE.split(', ').pop()}</div>
            <h1 className="display">Book an MOT in Luton</h1>
            <p className="hero__lede">
              £45 fixed price at Drive Safe MOT Centre on Taylor Street. Pick a one-hour slot online in under a minute, including Saturdays, and pay on the day.
            </p>
            <div className="hero__ctas">
              <Link href={BOOK} className="btn-amber hero__cta">Book your MOT now</Link>
              <a href={PHONE_HREF} className="hero__call">Call {PHONE_DISPLAY}</a>
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
            {google && google.count > 0 && (
              <a href={google.mapsUrl || REVIEWS_URL} className="price-card__rating" target="_blank" rel="noopener">
                <span aria-hidden="true">★</span> {google.rating.toFixed(1)} from {google.count} Google reviews
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="wrap section--96">
        <h2 className="h2">Booking takes a minute</h2>
        <ol className="lp-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="lp-step">
              <span className="lp-step__num">{i + 1}</span>
              <div><h3>{s.title}</h3><p>{s.text}</p></div>
            </li>
          ))}
        </ol>
        <p style={{ marginTop: 28 }}><Link href={BOOK} className="btn-amber lp-cta">See free MOT slots</Link></p>
      </section>

      <section className="trust">
        <div className="wrap section--96">
          <h2 className="h2">Why drivers in Luton book with us</h2>
          <div className="lp-why">
            {WHY.map(w => (
              <div key={w.title} className="trust__item">
                <span className="check-dot"><Tick size={18} /></span>
                <div><div className="trust__title">{w.title}</div><div className="trust__text">{w.text}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap section--96 lp-checks">
        <div>
          <h2 className="h2">What the MOT checks</h2>
          <p className="lp-lede">
            The MOT is the yearly safety and emissions test that most vehicles in Great Britain need once they’re three years old. We test to the DVSA standard and check:
          </p>
        </div>
        <ul className="ticks lp-checks__list">{CHECKS.map(c => <li key={c}>{c}</li>)}</ul>
      </section>

      <section className="reviews">
        <div className="wrap section--96">
          <h2 className="h2">MOT questions</h2>
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

      <section className="wrap section--96 find-us">
        <div className="find-us__info">
          <h2 className="h2">Easy to find in Luton</h2>
          <p className="lp-lede">
            On Taylor Street, a short drive from the town centre, High Town, Round Green and Stopsley, and easy to reach from Dunstable and Houghton Regis.
          </p>
          <p className="find-us__addr">{ADDRESS_LINES.map((l, i) => <span key={l}>{i > 0 && <br />}{l}</span>)}</p>
          <a href={DIRECTIONS_HREF} className="lp-directions" target="_blank" rel="noopener">Get directions →</a>
          <a href={PHONE_HREF} className="find-us__phone">{PHONE_DISPLAY}</a>
          <Hours />
        </div>
        <Image src={garageFront} alt="Drive Safe MOT Centre on Taylor Street, Luton" className="find-us__photo" sizes="(min-width: 860px) 280px, 100vw" />
        <MapEmbed />
      </section>

      <section className="navy">
        <div className="wrap section--96 lp-final">
          <h2 className="h2">Ready to book your MOT?</h2>
          <p>£45 fixed price · next free slot {nextSlot}</p>
          <div className="hero__ctas">
            <Link href={BOOK} className="btn-amber hero__cta">Book your MOT online</Link>
            <a href={PHONE_HREF} className="hero__call">Call {PHONE_DISPLAY}</a>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
    </>
  );
}
