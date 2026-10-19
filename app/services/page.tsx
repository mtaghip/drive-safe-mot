import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PHONE_DISPLAY, PHONE_HREF, SERVICES } from '@/lib/site.ts';
import tyreChange from '@/public/images/tyre-change.webp';

export const metadata: Metadata = {
  title: 'Services and prices',
  description: 'MOT tests from £45, DPF cleaning from £150, MOT repairs, tyre changes, servicing and tuning in Luton.',
};

export default function ServicesPage() {
  return (
    <>
      <section className="navy svc-hero">
        <div className="wrap svc-hero__inner">
          <div className="svc-hero__copy">
            <div className="eyebrow">Services and prices</div>
            <h1 className="display">Straightforward work, fair prices.</h1>
          </div>
          <Image src={tyreChange} alt="Mechanic changing a car tyre" className="svc-hero__img" priority sizes="(min-width: 860px) 540px, 100vw" />
        </div>
      </section>

      <section className="wrap page-body svc-cards">
        {SERVICES.map((s, i) => (
          <article key={s.id} className="svc-card">
            <div className="svc-card__main">
              <div className="svc-card__title">
                <span className="svc-card__num">{String(i + 1).padStart(2, '0')}</span>
                <h2>{s.name}</h2>
              </div>
              <p className="svc-card__desc">{s.description}</p>
              <ul className="ticks">{s.bullets.map(b => <li key={b}>{b}</li>)}</ul>
            </div>
            <div className="svc-card__side">
              <div>
                {s.priceLabel && <div className="svc-card__label">{s.priceLabel}</div>}
                <div className={s.priceIsWord ? 'svc-card__price svc-card__price--word' : 'svc-card__price'}>{s.price}</div>
                {s.priceNote && <div className="svc-card__note">{s.priceNote}</div>}
              </div>
              <Link href={`/book?service=${s.id}`} className="btn-amber svc-card__cta">{s.cta}</Link>
            </div>
          </article>
        ))}
        <div className="callout">
          <span>Not sure what you need? Give us a ring and we&rsquo;ll talk it through.</span>
          <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
        </div>
      </section>
    </>
  );
}
