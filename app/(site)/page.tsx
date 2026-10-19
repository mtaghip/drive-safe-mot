import Link from 'next/link';
import { Tick } from '@/components/icons.tsx';
import { Hours, MapEmbed } from '@/components/shared.tsx';
import { bookingRange, fmtHour, fmtShort, nextFreeSlot } from '@/lib/schedule.ts';
import { ADDRESS_LINES, PHONE_DISPLAY, PHONE_HREF, REVIEWS, SERVICES } from '@/lib/site.ts';
import { availability } from '@/lib/store.ts';

export const dynamic = 'force-dynamic';

async function nextSlotLabel() {
  try {
    const range = bookingRange();
    const slot = nextFreeSlot(range, await availability(range.start, range.end));
    return slot ? `${fmtShort(slot.date)}, ${fmtHour(slot.hour)}` : 'Call us to check';
  } catch (err) {
    console.error('[home] could not load availability', err);
    return 'Call us to check';
  }
}

const TRUST = [
  { title: 'Prices shown up front', text: '£45 MOT, no surprises at the counter.' },
  { title: 'Explained in plain English', text: 'We talk you through results and advisories.' },
  { title: 'Book in under a minute', text: 'One-hour slots, 9am to 5pm, from tomorrow.' },
];

export default async function HomePage() {
  const nextSlot = await nextSlotLabel();
  return (
    <>
      <section className="navy hero">
        <div className="wrap hero__inner">
          <div className="hero__copy">
            <div className="eyebrow">Your local MOT centre on Taylor Street</div>
            <h1 className="display">Safe hands for your MOT.</h1>
            <p className="hero__lede">Friendly, local MOT testing and repairs in Luton. Pick a one-hour slot online or give us a ring, and we&rsquo;ll look after the rest.</p>
            <div className="hero__ctas">
              <Link href="/book" className="btn-amber hero__cta">Book your MOT online</Link>
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
          </div>
        </div>
      </section>

      <section className="trust">
        <div className="wrap trust__inner">
          {TRUST.map(t => (
            <div key={t.title} className="trust__item">
              <span className="check-dot"><Tick size={18} /></span>
              <div><div className="trust__title">{t.title}</div><div className="trust__text">{t.text}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <h2 className="h2">What we do</h2>
          <Link href="/services" className="section-head__link">All services and prices →</Link>
        </div>
        <div className="svc-list">
          {SERVICES.map((s, i) => (
            <Link key={s.id} href="/services" className="svc-row">
              <span className="svc-row__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="svc-row__body">
                <span className="svc-row__name">{s.name}</span>
                <span className="svc-row__desc">{s.summary}</span>
              </span>
              <span className="svc-row__price">
                <span className="svc-row__amount">{s.homePrice}</span>
                <span className="svc-row__note">{s.homePriceNote}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="reviews">
        <div className="wrap section--96">
          <div className="section-head">
            <h2 className="h2">What drivers say</h2>
            <span className="section-head__note">Placeholder reviews. Replace with your Google reviews.</span>
          </div>
          <div className="reviews__grid">
            {REVIEWS.map(r => (
              <figure key={r.name} className="review">
                <div className="review__stars" aria-label={`${r.stars} out of 5 stars`}>{'★'.repeat(r.stars)}</div>
                <blockquote>{r.quote}</blockquote>
                <figcaption>{r.name} <span>· {r.area}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap section--96 find-us">
        <div className="find-us__info">
          <h2 className="h2">Find us</h2>
          <p className="find-us__addr">{ADDRESS_LINES.map((l, i) => <span key={l}>{i > 0 && <br />}{l}</span>)}</p>
          <a href={PHONE_HREF} className="find-us__phone">{PHONE_DISPLAY}</a>
          <Hours />
        </div>
        <MapEmbed />
      </section>
    </>
  );
}
