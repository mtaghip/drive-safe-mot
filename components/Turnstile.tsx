'use client';

import { useEffect, useRef } from 'react';

type TurnstileApi = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
};
declare global { interface Window { turnstile?: TurnstileApi; } }

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

let scriptLoad: Promise<void> | null = null;
function loadScript() {
  return (scriptLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptLoad = null; reject(new Error('Turnstile failed to load')); };
    document.head.appendChild(s);
  }));
}

/**
 * Cloudflare Turnstile spam check. Usually invisible; it only shows a checkbox when Cloudflare is unsure.
 * Tokens are single use, so bump `resetKey` after every submission.
 */
export default function Turnstile({ onToken, resetKey }: { onToken: (t: string) => void; resetKey: number }) {
  const el = useRef<HTMLDivElement>(null), id = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !el.current || !window.turnstile) return;
      id.current = window.turnstile.render(el.current, {
        sitekey: TURNSTILE_SITE_KEY, theme: 'dark', size: 'flexible', appearance: 'interaction-only',
        callback: (t: string) => cb.current(t), 'expired-callback': () => cb.current(''), 'error-callback': () => cb.current(''),
      });
    }).catch(err => console.error(err));
    return () => {
      cancelled = true;
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && id.current) { cb.current(''); window.turnstile?.reset(id.current); }
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={el} style={{ marginTop: 18 }} />;
}
