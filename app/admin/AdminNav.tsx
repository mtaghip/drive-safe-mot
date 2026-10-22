'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));
  return (
    <nav className="adm-nav" aria-label="Staff">
      <div className="wrap adm-nav__inner">
        {items.map(i => <Link key={i.href} href={i.href} aria-current={active(i.href) ? 'page' : undefined}>{i.label}</Link>)}
      </div>
    </nav>
  );
}
