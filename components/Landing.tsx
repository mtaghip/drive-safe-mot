// Building blocks for landing pages and guides, so each page only holds its own words.
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Tick } from '@/components/icons.tsx';
import { Hours, MapEmbed } from '@/components/shared.tsx';
import { ADDRESS_LINES, DIRECTIONS_HREF, PHONE_DISPLAY, PHONE_HREF, siteUrl } from '@/lib/site.ts';
import garageFront from '@/public/images/garage-front.webp';

export type Faq = { q: string; a: string };
type Cta = { href: string; label: string };

const CtaLink = ({ cta, className }: { cta: Cta; className: string }) =>
  cta.href.startsWith('/') ? <Link href={cta.href} className={className}>{cta.label}</Link> : <a href={cta.href} className={className}>{cta.label}</a>;

/** Navy opening section: eyebrow, heading, lede, two buttons, and a card on the right. */
export function Hero({ eyebrow, title, lede, primary, secondary, card }: {
  eyebrow: string; title: string; lede: ReactNode; primary: Cta; secondary?: Cta; card: ReactNode;
}) {
  return (
    <section className="navy hero">
      <div className="wrap hero__inner">
        <div className="hero__copy">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="display">{title}</h1>
          <p className="hero__lede">{lede}</p>
          <div className="hero__ctas">
            <CtaLink cta={primary} className="btn-amber hero__cta" />
            {secondary ? <CtaLink cta={secondary} className="hero__call" /> : <a href={PHONE_HREF} className="hero__call">Call {PHONE_DISPLAY}</a>}
          </div>
        </div>
        {card}
      </div>
    </section>
  );
}

/** The price card used in the hero. */
export function PriceCard({ label, note, price, from, nextLabel, nextValue }: {
  label: string; note: string; price: string; from?: boolean; nextLabel?: string; nextValue?: string;
}) {
  return (
    <div className="price-card">
      <div className="price-card__top">
        <span className="price-card__label">{label}</span>
        <span className="price-card__fixed">{note}</span>
      </div>
      <div className={'price-card__price' + (price.startsWith('£') ? '' : ' price-card__price--word')}>
        {from && <span className="price-card__from">from</span>}{price}
      </div>
      {nextLabel && (
        <div className="price-card__next"><span>{nextLabel}</span><span>{nextValue}</span></div>
      )}
    </div>
  );
}

/** A short list in the hero card, for guides. */
export function SummaryCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="price-card bat-card">
      <div className="price-card__label">{title}</div>
      <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

export function Section({ title, intro, tone, id, children }: { title: string; intro?: ReactNode; tone?: 'white' | 'sand'; id?: string; children: ReactNode }) {
  const inner = (
    <div className={'wrap section--96'}>
      <h2 className="h2">{title}</h2>
      {intro && <p className="lp-lede">{intro}</p>}
      {children}
    </div>
  );
  if (tone === 'white') return <section className="trust" id={id}>{inner}</section>;
  if (tone === 'sand') return <section className="reviews" id={id}>{inner}</section>;
  return <section id={id}>{inner}</section>;
}

/** Heading on the left, ticked list on the right. */
export function SplitList({ title, intro, items, tone, id }: { title: string; intro?: string; items: { check: string; why?: string }[]; tone?: 'white' | 'sand'; id?: string }) {
  const inner = (
    <div className="wrap section--96 bat-two">
      <div>
        <h2 className="h2">{title}</h2>
        {intro && <p className="lp-lede">{intro}</p>}
      </div>
      <ul className="ticks bat-list">
        {items.map(i => <li key={i.check}><span><strong>{i.check}</strong>{i.why && <span className="prep-why">{i.why}</span>}</span></li>)}
      </ul>
    </div>
  );
  return <section className={tone === 'white' ? 'trust' : tone === 'sand' ? 'reviews' : undefined} id={id}>{inner}</section>;
}

export function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="lp-steps">
      {steps.map((s, i) => (
        <li key={s.title} className="lp-step">
          <span className="lp-step__num">{i + 1}</span>
          <div><h3>{s.title}</h3><p>{s.text}</p></div>
        </li>
      ))}
    </ol>
  );
}

/** Ticked reasons in a grid. */
export function Reasons({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="lp-why">
      {items.map(w => (
        <div key={w.title} className="trust__item">
          <span className="check-dot"><Tick size={18} /></span>
          <div><div className="trust__title">{w.title}</div><div className="trust__text">{w.text}</div></div>
        </div>
      ))}
    </div>
  );
}

/** Explanations in white cards. */
export function Cards({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="lp-why">
      {items.map(w => (
        <div key={w.title} className="bat-why">
          <div className="trust__title">{w.title}</div>
          <div className="trust__text">{w.text}</div>
        </div>
      ))}
    </div>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="lp-faq">
      {faqs.map(f => (
        <details key={f.q} className="lp-faq__item">
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FindUs({ title = 'Find us', intro }: { title?: string; intro?: string }) {
  return (
    <section className="wrap section--96 find-us">
      <div className="find-us__info">
        <h2 className="h2">{title}</h2>
        {intro && <p className="lp-lede">{intro}</p>}
        <p className="find-us__addr">{ADDRESS_LINES.map((l, i) => <span key={l}>{i > 0 && <br />}{l}</span>)}</p>
        <a href={DIRECTIONS_HREF} className="lp-directions" target="_blank" rel="noopener">Get directions →</a>
        <a href={PHONE_HREF} className="find-us__phone">{PHONE_DISPLAY}</a>
        <Hours />
      </div>
      <Image src={garageFront} alt="Drive Safe MOT Centre on Taylor Street, Luton" className="find-us__photo" sizes="(min-width: 860px) 280px, 100vw" />
      <MapEmbed />
    </section>
  );
}

export function FinalCta({ title, line, primary, secondary }: { title: string; line: string; primary: Cta; secondary?: Cta }) {
  return (
    <section className="navy">
      <div className="wrap section--96 lp-final">
        <h2 className="h2">{title}</h2>
        <p>{line}</p>
        <div className="hero__ctas">
          <CtaLink cta={primary} className="btn-amber hero__cta" />
          {secondary ? <CtaLink cta={secondary} className="hero__call" /> : <a href={PHONE_HREF} className="hero__call">Call {PHONE_DISPLAY}</a>}
        </div>
      </div>
    </section>
  );
}

/** Structured data for search engines: the questions, plus a service or an article. */
export function PageLd({ path, faqs, service, article }: {
  path: string; faqs: Faq[];
  service?: { type: string; name: string; price?: string; minPrice?: string };
  article?: string;
}) {
  const url = siteUrl() + path, org = { '@type': 'AutoRepair', name: 'Drive Safe MOT Centre', url: siteUrl() };
  const items: object[] = [{
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }];
  if (service) {
    items.push({
      '@context': 'https://schema.org', '@type': 'Service', serviceType: service.type, name: service.name, url,
      areaServed: { '@type': 'City', name: 'Luton' }, provider: org,
      ...(service.price ? { offers: { '@type': 'Offer', price: service.price, priceCurrency: 'GBP', url } } : {}),
      ...(service.minPrice ? { offers: { '@type': 'Offer', priceCurrency: 'GBP', priceSpecification: { '@type': 'PriceSpecification', minPrice: service.minPrice, priceCurrency: 'GBP' } } } : {}),
    });
  }
  if (article) {
    items.push({ '@context': 'https://schema.org', '@type': 'Article', headline: article, url, author: { '@type': 'Organization', name: org.name, url: org.url }, publisher: { '@type': 'Organization', name: org.name, url: org.url } });
  }
  return <>{items.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />)}</>;
}
