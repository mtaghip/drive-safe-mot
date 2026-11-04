import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Tick } from '@/components/icons.tsx';
import { Hours, MapEmbed } from '@/components/shared.tsx';
import { nextMorningSlot } from '@/lib/next-slot.ts';
import { fmtHour, fmtLong } from '@/lib/schedule.ts';
import { ADDRESS_LINES, ADDRESS_ONE_LINE, DIRECTIONS_HREF, OPEN_DAYS_TEXT, PHONE_DISPLAY, PHONE_HREF, serviceById, siteUrl } from '@/lib/site.ts';
import garageFront from '@/public/images/garage-front.webp';

export const dynamic = 'force-dynamic';

const PATH = '/dpf-cleaning-luton';
const dpf = serviceById('dpf')!;
const FROM = dpf.price; // "£150"
const bookHref = (s: { date: string; hour: number } | null) => (s ? `/book?service=dpf&date=${s.date}&hour=${s.hour}` : '/book?service=dpf');

export const metadata: Metadata = {
  title: { absolute: `DPF Cleaning in Luton · From ${FROM} | Drive Safe MOT` },
  description: `DPF warning light, limp mode or losing power? DPF cleaning in Luton from ${FROM}, with a fault code check included. Priced before we start. Drive Safe MOT Centre, ${ADDRESS_ONE_LINE}.`,
  alternates: { canonical: PATH },
};

const SIGNS = [
  'DPF warning light on the dashboard',
  'Car going into limp mode',
  'Loss of power, especially when overtaking or on hills',
  'Engine management light',
  'Black smoke, or a strong exhaust smell',
  'Worse fuel economy than usual',
];

const STEPS = [
  { title: 'Drop it off in the morning', text: 'Book a morning slot online. The job takes the day, so plan to leave the car with us.' },
  { title: 'We check it first', text: 'We read the fault codes and look at how blocked the filter is, then call you with the method and price.' },
  { title: 'Clean, then collect', text: 'With your go-ahead we clean the filter and check the codes again. We call you when it’s ready to collect.' },
];

const WHY = [
  { title: `From ${FROM}`, text: 'Cleaning is often far cheaper than a new filter, which can cost well over £1,000 fitted.' },
  { title: 'Fault code check included', text: 'We find out why the light is on before touching anything, so you only pay for what the car needs.' },
  { title: 'Priced before we start', text: 'Every filter is different. We tell you the method and the price, and only go ahead when you say so.' },
  { title: 'Right method for the blockage', text: 'A lightly blocked filter and a badly blocked one need different treatment. We use the one that fits.' },
];

const FAQS = [
  { q: 'How much does DPF cleaning cost in Luton?', a: `From ${FROM}. The final price depends on the car and how blocked the filter is: a badly blocked filter needs a different technique and costs more. We check it and tell you the price before doing any work.` },
  { q: 'How long does a DPF clean take?', a: 'Plan to leave the car with us for the day. Book a morning slot and drop it off, and we’ll call you when it’s ready.' },
  { q: 'What causes a DPF to block?', a: 'Diesel particulate filters trap soot and burn it off on longer, faster drives. Lots of short trips, stop-start town driving, or an engine fault can stop that happening, so soot builds up until the filter blocks.' },
  { q: 'Can I keep driving with the DPF light on?', a: 'It’s best not to for long. A blocked filter can put the car into limp mode, and carrying on can cause further damage and a bigger bill. Book it in as soon as you can.' },
  { q: 'Is cleaning better than replacing the DPF?', a: 'If the filter isn’t damaged, cleaning it is usually much cheaper than a replacement. We check the filter and the fault codes first and tell you honestly which makes sense.' },
  { q: 'Will a blocked DPF fail the MOT?', a: 'It can. On a diesel with a DPF, any visible smoke from the exhaust during the MOT is a major fault, and a filter that has been tampered with or removed is a fail. A clean can help the car pass its emissions test.' },
  { q: 'Isn’t it cheaper just to remove the DPF?', a: 'Removing the DPF from a car used on the road is illegal, is an automatic MOT fail, and can mean a fine of up to £1,000. Cleaning keeps the car legal.' },
  { q: 'Do you check the fault codes?', a: 'Yes. A fault code check is included with every DPF clean, so we can see whether anything else, such as a sensor, is causing the problem.' },
];

export default async function DpfCleaningLutonPage() {
  const morning = await nextMorningSlot();
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const serviceLd = {
    '@context': 'https://schema.org', '@type': 'Service', serviceType: 'DPF cleaning', name: 'DPF cleaning in Luton',
    url: siteUrl() + PATH, areaServed: { '@type': 'City', name: 'Luton' },
    provider: { '@type': 'AutoRepair', name: 'Drive Safe MOT Centre', url: siteUrl() },
    offers: { '@type': 'Offer', priceCurrency: 'GBP', priceSpecification: { '@type': 'PriceSpecification', minPrice: FROM.replace('£', ''), priceCurrency: 'GBP' } },
  };
  const nextLabel = morning ? `${fmtLong(morning.date)}, ${fmtHour(morning.hour)}` : 'Call us to check';

  return (
    <>
      <section className="navy hero">
        <div className="wrap hero__inner">
          <div className="hero__copy">
            <div className="eyebrow">DPF cleaning · Taylor Street, Luton</div>
            <h1 className="display">DPF cleaning in Luton</h1>
            <p className="hero__lede">
              DPF warning light on, stuck in limp mode or losing power? We check the fault codes, find out how blocked the filter is, and clean it for far less than a new one.
            </p>
            <div className="hero__ctas">
              <Link href={bookHref(morning)} className="btn-amber hero__cta">Book a DPF clean</Link>
              <a href={PHONE_HREF} className="hero__call">Call {PHONE_DISPLAY}</a>
            </div>
          </div>
          <div className="price-card">
            <div className="price-card__top">
              <span className="price-card__label">DPF clean</span>
              <span className="price-card__fixed">Priced before we start</span>
            </div>
            <div className="price-card__price"><span className="price-card__from">from</span>{FROM}</div>
            <div className="price-card__next">
              <span>Next free morning drop-off</span>
              <span>{nextLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap section--96 lp-checks">
        <div>
          <h2 className="h2">Signs your DPF is blocked</h2>
          <p className="lp-lede">
            The diesel particulate filter (DPF) in your exhaust traps soot. When it can’t burn the soot off, it blocks, and you’ll usually notice one or more of these:
          </p>
        </div>
        <ul className="ticks lp-checks__list">{SIGNS.map(s => <li key={s}>{s}</li>)}</ul>
      </section>

      <section className="wrap section--96" style={{ paddingTop: 0 }}>
        <h2 className="h2">How it works</h2>
        <ol className="lp-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="lp-step">
              <span className="lp-step__num">{i + 1}</span>
              <div><h3>{s.title}</h3><p>{s.text}</p></div>
            </li>
          ))}
        </ol>
        <p style={{ marginTop: 28 }}><Link href={bookHref(morning)} className="btn-amber lp-cta">Book a morning drop-off</Link></p>
      </section>

      <section className="trust">
        <div className="wrap section--96">
          <h2 className="h2">Why get your DPF cleaned with us</h2>
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
          <h2 className="h2">DPF questions</h2>
          <div className="lp-faq">
            {FAQS.map(f => (
              <details key={f.q} className="lp-faq__item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className="lp-lede" style={{ fontSize: 16 }}>MOT coming up too? <Link href="/book-mot-luton">Book your MOT in Luton</Link> for £45.</p>
        </div>
      </section>

      <section className="wrap section--96 find-us">
        <div className="find-us__info">
          <h2 className="h2">Find us</h2>
          <p className="lp-lede">On Taylor Street in Luton, open {OPEN_DAYS_TEXT}.</p>
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
          <h2 className="h2">Get your DPF sorted</h2>
          <p>From {FROM}, fault code check included · next free morning drop-off {nextLabel}</p>
          <div className="hero__ctas">
            <Link href={bookHref(morning)} className="btn-amber hero__cta">Book a DPF clean</Link>
            <a href={PHONE_HREF} className="hero__call">Call {PHONE_DISPLAY}</a>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
    </>
  );
}
