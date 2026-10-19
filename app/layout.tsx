import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { siteUrl } from '@/lib/site.ts';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });

const description = 'Friendly, local MOT testing, DPF cleaning, MOT repairs, tyres, servicing and tuning on Taylor Street, Luton. £45 MOT. Book a one-hour slot online or call 01582 729943.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'Drive Safe MOT Centre · MOT testing and repairs in Luton', template: '%s · Drive Safe MOT Centre' },
  description,
  openGraph: { type: 'website', locale: 'en_GB', siteName: 'Drive Safe MOT Centre', description },
};

export const viewport: Viewport = { themeColor: '#0f2340' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
