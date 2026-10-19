import Link from 'next/link';
import BottomBar from '@/components/BottomBar.tsx';
import Header from '@/components/Header.tsx';
import { ADDRESS_ONE_LINE, EMAIL, NAV, PHONE_DISPLAY, PHONE_HREF, siteUrl } from '@/lib/site.ts';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoRepair',
  name: 'Drive Safe MOT Centre',
  url: siteUrl(),
  telephone: '+441582729943',
  email: EMAIL,
  priceRange: '££',
  address: { '@type': 'PostalAddress', streetAddress: '21 Taylor St', addressLocality: 'Luton', postalCode: 'LU2 0EY', addressCountry: 'GB' },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' }],
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <footer className="site-footer">
        <div className="wrap site-footer__top">
          <div className="site-footer__info">
            <span className="site-footer__name">Drive Safe MOT Centre</span>
            <span>{ADDRESS_ONE_LINE}</span>
            <a href={PHONE_HREF} className="site-footer__phone">{PHONE_DISPLAY}</a>
            <a href={`mailto:${EMAIL}`} className="site-footer__email">{EMAIL}</a>
          </div>
          <nav className="site-footer__nav" aria-label="Footer">
            {NAV.map(n => <Link key={n.href} href={n.href}>{n.label}</Link>)}
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
        <div className="wrap site-footer__legal">© {new Date().getFullYear()} Drive Safe MOT Centre</div>
        <div className="footer-spacer" />
      </footer>
      <BottomBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
