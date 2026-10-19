import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import Link from 'next/link';
import BottomBar from '@/components/BottomBar.tsx';
import Header from '@/components/Header.tsx';
import { ADDRESS_ONE_LINE, NAV, PHONE_DISPLAY, PHONE_HREF } from '@/lib/site.ts';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Drive Safe MOT Centre · MOT testing and repairs in Luton', template: '%s · Drive Safe MOT Centre' },
  description: 'Friendly, local MOT testing, DPF cleaning, MOT repairs, tyres, servicing and tuning on Taylor Street, Luton. £45 MOT. Book a one-hour slot online or call 01582 729943.',
};

export const viewport: Viewport = { themeColor: '#0f2340' };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoRepair',
  name: 'Drive Safe MOT Centre',
  telephone: '+441582729943',
  address: { '@type': 'PostalAddress', streetAddress: '21 Taylor St', addressLocality: 'Luton', postalCode: 'LU2 0EY', addressCountry: 'GB' },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={archivo.variable}>
      <body>
        <Header />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap site-footer__top">
            <div className="site-footer__info">
              <span className="site-footer__name">Drive Safe MOT Centre</span>
              <span>{ADDRESS_ONE_LINE}</span>
              <a href={PHONE_HREF} className="site-footer__phone">{PHONE_DISPLAY}</a>
            </div>
            <nav className="site-footer__nav" aria-label="Footer">
              {NAV.map(n => <Link key={n.href} href={n.href}>{n.label}</Link>)}
            </nav>
          </div>
          <div className="wrap site-footer__legal">© {new Date().getFullYear()} Drive Safe MOT Centre</div>
          <div className="footer-spacer" />
        </footer>
        <BottomBar />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
