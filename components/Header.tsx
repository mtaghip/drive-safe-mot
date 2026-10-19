'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV, PHONE_DISPLAY, PHONE_HREF } from '@/lib/site.ts';
import { Phone, Tick } from './icons.tsx';

export default function Header() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [pathname]);

  const current = (href: string) => (pathname === href ? 'page' : undefined);

  return (
    <header className="site-header">
      <div className="wrap site-header__bar">
        <Link href="/" className="brand">
          <span className="brand__mark"><Tick /></span>
          <span className="brand__text">
            <span className="brand__name">Drive Safe</span>
            <span className="brand__sub">MOT Centre · Luton</span>
          </span>
        </Link>

        <nav className="desk-nav" aria-label="Main">
          {NAV.map(n => <Link key={n.href} href={n.href} aria-current={current(n.href)}>{n.label}</Link>)}
        </nav>
        <div className="desk-actions">
          <a href={PHONE_HREF} className="desk-phone"><Phone />{PHONE_DISPLAY}</a>
          <Link href="/book" className="btn-amber desk-book">Book MOT</Link>
        </div>

        <button className="menu-btn" onClick={() => setMenu(m => !m)} aria-label="Menu" aria-expanded={menu} aria-controls="mobile-nav">
          <span /><span /><span />
        </button>
      </div>

      {menu && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Main">
          {NAV.map(n => <Link key={n.href} href={n.href} className="mobile-nav__link" aria-current={current(n.href)}>{n.label}</Link>)}
          <a href={PHONE_HREF} className="btn-amber mobile-nav__call">Call {PHONE_DISPLAY}</a>
        </nav>
      )}
    </header>
  );
}
