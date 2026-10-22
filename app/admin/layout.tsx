import type { Metadata } from 'next';
import Link from 'next/link';
import { Tick } from '@/components/icons.tsx';
import { currentStaff } from '@/lib/auth.ts';
import { can, roleLabel } from '@/lib/roles.ts';
import AdminNav from './AdminNav.tsx';
import { signOutAction } from './auth-actions.ts';

export const metadata: Metadata = { title: 'Staff', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await currentStaff();
  const nav = me ? [
    { href: '/admin', label: 'Diary' },
    { href: '/admin/customers', label: 'Customers' },
    { href: '/admin/invoices', label: 'Invoices' },
    { href: '/admin/reminders', label: 'Reminders' },
    ...(can(me.role, 'manageStaff') ? [{ href: '/admin/team', label: 'Team' }] : []),
    ...(can(me.role, 'viewActivity') ? [{ href: '/admin/activity', label: 'Activity' }] : []),
  ] : [];
  return (
    <>
      <header className="site-header no-print">
        <div className="wrap site-header__bar">
          <Link href="/admin" className="brand">
            <span className="brand__mark"><Tick /></span>
            <span className="brand__text">
              <span className="brand__name">Drive Safe</span>
              <span className="brand__sub">Staff</span>
            </span>
          </Link>
          <div className="adm-me">
            {me && <Link href="/admin/account" className="adm-headlink" title="Your account">{me.name} <span className="adm-me__role">{roleLabel(me.role)}</span></Link>}
            <Link href="/" className="adm-headlink adm-hide-sm">View site</Link>
            {me && <form action={signOutAction}><button className="adm-headlink adm-headbtn">Sign out</button></form>}
          </div>
        </div>
        {me && <AdminNav items={nav} />}
      </header>
      <main className="adm">{children}</main>
    </>
  );
}
