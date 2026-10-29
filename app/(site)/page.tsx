import Image from 'next/image';
import Link from 'next/link';
import { Tick } from '@/components/icons.tsx';
import { Hours, MapEmbed } from '@/components/shared.tsx';
import { nextSlotLabel } from '@/lib/next-slot.ts';
import { googleReviews, quotable } from '@/lib/google-reviews.ts';
import { ADDRESS_LINES, PHONE_DISPLAY, PHONE_HREF, REVIEWS_URL, SERVICES, SLOT_RANGE_TEXT } from '@/lib/site.ts';
import garageFront from '@/public/images/garage-front.webp';

export const dynamic = 'force-dynamic';

const TRUST = [
  { title: 'Prices shown up front', text: '£45 MOT, no surprises at the counter.' },
  { title: 'Explained in plain English', text: 'We talk you through results and advisories.' },
  { title: 'Book in under a minute', text: `One-hour slots, ${SLOT_RANGE_TEXT}, from tomorrow.` },
];

export default async function HomePage() {
  const [nextSlot, google] = await Promise.all([nextSlotLabel(), googleReviews()]);
  const quotes = google ? quotable(google) : [];
  const reviewsHref = google?.mapsUrl || REVIEWS_URL;
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
          <span className="section-head__links">
            <Link href="/book-mot-luton" className="section-head__link">MOTs in Luton →</Link>
            <Link href="/services" className="section-head__link">All services and prices →</Link>
          </span>
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
            {google && google.count > 0 && (
              <a href={reviewsHref} className="reviews__summary" target="_blank" rel="noopener">
                <strong>{google.rating.toFixed(1)}</strong> <span aria-hidden="true">★</span> from {google.count} Google review{google.count === 1 ? '' : 's'}
              </a>
            )}
          </div>
          {quotes.length > 0 ? (
            <div className="reviews__grid">
              {quotes.map(r => (
                <figure key={r.author + r.publishTime} className="review">
                  <div className="review__stars" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}</div>
                  <blockquote>{r.text.length > 320 ? r.text.slice(0, 300).replace(/\s+\S*$/, '') + '…' : r.text}</blockquote>
                  <figcaption>
                    {r.authorUrl ? <a href={r.authorUrl} target="_blank" rel="noopener nofollow">{r.author}</a> : r.author}
                    <span> · {r.when ? `${r.when} on Google` : 'on Google'}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="reviews__empty">See what local drivers say about us on Google.</p>
          )}
          <p className="reviews__more"><a href={reviewsHref} className="btn-amber reviews__cta" target="_blank" rel="noopener">Read our reviews on Google</a></p>
        </div>
      </section>

      <section className="wrap section--96 find-us">
        <div className="find-us__info">
          <h2 className="h2">Find us</h2>
          <p className="find-us__addr">{ADDRESS_LINES.map((l, i) => <span key={l}>{i > 0 && <br />}{l}</span>)}</p>
          <a href={PHONE_HREF} className="find-us__phone">{PHONE_DISPLAY}</a>
          <Hours />
        </div>
        <Image src={garageFront} alt="Drive Safe MOT Centre workshop on Taylor Street" className="find-us__photo" sizes="(min-width: 860px) 280px, 100vw" />
        <MapEmbed />
      </section>
    </>
  );
}
