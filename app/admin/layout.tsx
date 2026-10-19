import type { Metadata } from 'next';
import Link from 'next/link';
import { Tick } from '@/components/icons.tsx';
import { isAdmin } from '@/lib/admin.ts';
import { logout } from './actions.ts';

export const metadata: Metadata = { title: 'Staff', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isAdmin();
  return (
    <>
      <header className="site-header">
        <div className="wrap site-header__bar">
          <Link href="/admin" className="brand">
            <span className="brand__mark"><Tick /></span>
            <span className="brand__text">
              <span className="brand__name">Drive Safe</span>
              <span className="brand__sub">Staff · Bookings</span>
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/" className="adm-headlink">View site</Link>
            {signedIn && <form action={logout}><button className="adm-headlink adm-headbtn">Sign out</button></form>}
          </div>
        </div>
      </header>
      <main className="adm">{children}</main>
    </>
  );
}
