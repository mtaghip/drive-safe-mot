import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Tick } from '@/components/icons.tsx';
import { Hours, MapEmbed } from '@/components/shared.tsx';
import { saturdaySlots } from '@/lib/next-slot.ts';
import { fmtHour, fmtLong } from '@/lib/schedule.ts';
import { ADDRESS_LINES, ADDRESS_ONE_LINE, BOOKING, DIRECTIONS_HREF, PHONE_DISPLAY, PHONE_HREF, siteUrl } from '@/lib/site.ts';
import garageFront from '@/public/images/garage-front.webp';

export const dynamic = 'force-dynamic';

const PATH = '/saturday-mot-luton';
const OPEN = `${BOOKING.hours[0]}am to ${BOOKING.hours[BOOKING.hours.length - 1] + 1 - 12}pm`;
const slotHref = (date: string, hour?: number) => `/book?service=mot&date=${date}${hour != null ? `&hour=${hour}` : ''}`;

export const metadata: Metadata = {
  title: { absolute: 'Saturday MOT in Luton · Book Online, £45 | Drive Safe MOT' },
  description: `Book a Saturday MOT in Luton online. Open Saturdays ${OPEN}, £45 fixed price with no weekend surcharge. See this week's free Saturday slots at Drive Safe MOT Centre, ${ADDRESS_ONE_LINE}.`,
  alternates: { canonical: PATH },
};

const WHY = [
  { title: 'No time off work', text: `Open every Saturday, ${OPEN}. Book a one-hour slot that suits you.` },
  { title: 'Same £45 on Saturdays', text: 'No weekend surcharge. The price is the same fixed £45 any day of the week.' },
  { title: 'Wait or drop it off', text: 'The MOT takes about an hour. Wait with us, or drop the car off and collect it before we close at 6pm.' },
  { title: 'Book in a minute', text: 'Pick your Saturday slot online, get an email confirmation straight away, and pay on the day.' },
];

const FAQS = [
  { q: 'Are you open for MOTs on Saturdays?', a: `Yes. We test every Saturday from ${OPEN}, the same as Monday to Friday${BOOKING.closedOnBankHolidays ? '. We’re closed on Sundays and bank holidays.' : ', and we’re open bank holidays too. We’re closed on Sundays.'}` },
  { q: 'Is a Saturday MOT more expensive?', a: 'No. Our MOT is £45, fixed price, on Saturdays and weekdays alike. That’s below the DVSA maximum of £54.85 for a car.' },
  { q: 'How far ahead can I book a Saturday MOT?', a: `Up to ${BOOKING.weeks} weeks ahead online, from tomorrow. Saturdays are popular, so it’s worth booking early if you need one.` },
  { q: 'What if this Saturday is full?', a: `Pick the next Saturday from the list above, or a weekday slot. If you’re stuck, call us on ${PHONE_DISPLAY} and we’ll do what we can.` },
  { q: 'Can I drop my car off on Saturday morning?', a: 'Yes. Book the first slot, drop the car off, and we’ll call you when it’s done. Collect it any time before we close at 6pm.' },
  { q: 'What if my car fails on a Saturday?', a: 'We’ll show you what failed and give you a price for the repair before doing any work. We carry out MOT repairs here too, and you don’t have to have them done with us.' },
  { q: 'How early can I have my MOT and keep the same date?', a: 'Up to a month (minus a day) before it runs out. For example, if it runs out on 15 May, you can have it from 16 April and still keep 15 May next year.' },
];

export default async function SaturdayMotPage() {
  const saturdays = await saturdaySlots();
  const firstFree = saturdays?.find(s => s.hours.length > 0);
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const serviceLd = {
    '@context': 'https://schema.org', '@type': 'Service', serviceType: 'MOT test', name: 'Saturday MOT in Luton',
    url: siteUrl() + PATH, areaServed: { '@type': 'City', name: 'Luton' },
    provider: {
      '@type': 'AutoRepair', name: 'Drive Safe MOT Centre', url: siteUrl(),
      openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: `${String(BOOKING.hours[0]).padStart(2, '0')}:00`, closes: `${BOOKING.hours[BOOKING.hours.length - 1] + 1}:00` }],
    },
    offers: { '@type': 'Offer', price: '45.00', priceCurrency: 'GBP', url: siteUrl() + PATH },
  };

  return (
    <>
      <section className="navy hero">
        <div className="wrap hero__inner">
          <div className="hero__copy">
            <div className="eyebrow">Open Saturdays {OPEN} · Taylor Street, Luton</div>
            <h1 className="display">Saturday MOT in Luton</h1>
            <p className="hero__lede">
              Can’t get the car in during the week? We’re open every Saturday. £45 fixed price, no weekend surcharge, and you can book your slot online in under a minute.
            </p>
            <div className="hero__ctas">
              <Link href={firstFree ? slotHref(firstFree.date) : '/book?service=mot'} className="btn-amber hero__cta">Book a Saturday MOT</Link>
              <a href={PHONE_HREF} className="hero__call">Call {PHONE_DISPLAY}</a>
            </div>
          </div>
          <div className="price-card">
            <div className="price-card__top">
              <span className="price-card__label">Saturday MOT</span>
              <span className="price-card__fixed">Fixed price</span>
            </div>
            <div className="price-card__price">£45</div>
            <div className="price-card__next">
              <span>Next free slot</span>
              <span>{firstFree ? `${fmtLong(firstFree.date)}, ${fmtHour(firstFree.hours[0])}` : 'Call us to check'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap section--96">
        <div className="section-head">
          <h2 className="h2">Free Saturday slots</h2>
          <span className="section-head__note">Live from our diary. Tap a time to book it.</span>
        </div>
        {saturdays ? (
          <div className="sat-grid">
            {saturdays.map(s => (
              <div key={s.date} className="sat-day">
                <h3>{fmtLong(s.date)}</h3>
                {s.closed ? <p className="sat-day__none">Closed this day</p>
                  : s.hours.length === 0 ? <p className="sat-day__none">Fully booked</p>
                  : (
                    <ul className="sat-day__slots">
                      {s.hours.map(h => <li key={h}><Link href={slotHref(s.date, h)} aria-label={`Book ${fmtHour(h)} on ${fmtLong(s.date)}`}>{fmtHour(h)}</Link></li>)}
                    </ul>
                  )}
              </div>
            ))}
          </div>
        ) : (
          <p className="lp-lede">We couldn’t load the diary just now. Call us on <a href={PHONE_HREF}>{PHONE_DISPLAY}</a> to book your Saturday MOT.</p>
        )}
        <p className="lp-lede" style={{ fontSize: 16 }}>Not a Saturday person? <Link href="/book-mot-luton">Book an MOT any day of the week</Link>.</p>
      </section>

      <section className="trust">
        <div className="wrap section--96">
          <h2 className="h2">Why book your Saturday MOT with us</h2>
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

      <section className="reviews">
        <div className="wrap section--96">
          <h2 className="h2">Saturday MOT questions</h2>
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
          <h2 className="h2">Find us on Saturday</h2>
          <p className="lp-lede">On Taylor Street, a short drive from the town centre, High Town, Round Green and Stopsley.</p>
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
          <h2 className="h2">Book your Saturday MOT</h2>
          <p>£45 fixed price · {firstFree ? `next free slot ${fmtLong(firstFree.date)}, ${fmtHour(firstFree.hours[0])}` : `open Saturdays ${OPEN}`}</p>
          <div className="hero__ctas">
            <Link href={firstFree ? slotHref(firstFree.date) : '/book?service=mot'} className="btn-amber hero__cta">Book online</Link>
            <a href={PHONE_HREF} className="hero__call">Call {PHONE_DISPLAY}</a>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
    </>
  );
}
