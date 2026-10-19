'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PHONE_HREF } from '@/lib/site.ts';

/** Fixed call/book bar shown below 1040px. */
export default function BottomBar() {
  const onBook = usePathname() === '/book';
  return (
    <div className="bottom-bar">
      <a href={PHONE_HREF} className="bottom-bar__call">Call us</a>
      {!onBook && <Link href="/book" className="btn-amber">Book MOT</Link>}
    </div>
  );
}
