import type { Metadata } from 'next';
import { Hours, MapEmbed } from '@/components/shared.tsx';
import { DIRECTIONS_HREF, PHONE_DISPLAY, PHONE_HREF } from '@/lib/site.ts';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Drive Safe MOT Centre, 21 Taylor St, Luton LU2 0EY. Call 01582 729943.',
};

export default function ContactPage() {
  return (
    <>
      <section className="navy contact-hero">
        <div className="wrap contact-hero__inner">
          <div className="eyebrow">Contact</div>
          <h1 className="display">Come and see us</h1>
        </div>
      </section>
      <section className="wrap page-body contact">
        <div className="contact__col">
          <a href={PHONE_HREF} className="btn-amber call-card">
            <span className="call-card__label">Call us</span>
            <span className="call-card__num">{PHONE_DISPLAY}</span>
            <span className="call-card__hint">Tap to call on mobile</span>
          </a>
          <div className="info-card">
            <div className="info-card__label">Address</div>
            <p className="info-card__addr">21 Taylor St<br />Luton LU2 0EY</p>
            <a href={DIRECTIONS_HREF} target="_blank" rel="noopener" className="info-card__link">Get directions →</a>
          </div>
          <div className="info-card">
            <div className="info-card__label">Opening hours</div>
            <Hours />
          </div>
        </div>
        <MapEmbed tall />
      </section>
    </>
  );
}
