import { ImageResponse } from 'next/og';

// The preview shown when the site is shared on WhatsApp, Facebook, X and in messages.
export const alt = 'Drive Safe MOT Centre, Luton. Safe hands for your MOT. £45 fixed price.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#0f2340', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 76, height: 76, borderRadius: 16, background: '#f4b324', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="#0f2340" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>Drive Safe</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 5, textTransform: 'uppercase', color: '#f4b324' }}>MOT Centre · Luton</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ fontSize: 92, fontWeight: 900, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: -2, maxWidth: 760 }}>Safe hands for your MOT.</div>
            <div style={{ fontSize: 30, color: '#c9d2e2' }}>21 Taylor St, Luton · 01582 729943 · Book online</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', background: '#16305a', borderRadius: 24, padding: '28px 36px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#c9d2e2' }}>MOT test</div>
            <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1, color: '#f4b324', letterSpacing: -4 }}>£45</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
