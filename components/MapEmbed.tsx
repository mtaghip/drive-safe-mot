'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ADDRESS_ONE_LINE, DIRECTIONS_HREF, MAP_EMBED_SRC } from '@/lib/site.ts';

const KEY = 'ds-map-allowed';

/** Google Maps sets cookies, so the map only loads once the visitor asks for it. The choice is remembered on this device. */
export default function MapEmbed({ tall = false }: { tall?: boolean }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(KEY) === '1') setAllowed(true); } catch {}
  }, []);

  function allow() {
    setAllowed(true);
    try { localStorage.setItem(KEY, '1'); } catch {}
  }

  return (
    <div className={tall ? 'map map--tall' : 'map'}>
      {allowed ? (
        <iframe title="Map to Drive Safe MOT Centre" src={MAP_EMBED_SRC} loading="lazy" />
      ) : (
        <div className="map__gate">
          <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="var(--navy)" strokeWidth={2} strokeLinejoin="round" />
            <circle cx="12" cy="9.5" r="2.5" fill="var(--amber)" />
          </svg>
          <p className="map__addr">{ADDRESS_ONE_LINE}</p>
          <button type="button" className="map__show" onClick={allow}>Show map</button>
          <a href={DIRECTIONS_HREF} target="_blank" rel="noopener" className="map__link">Open in Google Maps →</a>
          <p className="map__note">The map is provided by Google, which may set cookies. <Link href="/privacy">Privacy notice</Link></p>
        </div>
      )}
    </div>
  );
}
