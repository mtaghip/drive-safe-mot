'use client';

import Link from 'next/link';
import { useState } from 'react';

type Result = { reg: string; make: string; colour: string; year: number | null; motExpiry: string | null; motStatus: string };

const DAY = 86_400_000;
const fmt = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
/** The earliest test date that keeps the same renewal date: a month before expiry, plus a day. */
function earliest(expiry: string) {
  const d = new Date(expiry + 'T12:00:00Z');
  const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
  d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
  return new Date(d.getTime() + DAY).toISOString().slice(0, 10);
}

export default function Checker({ available }: { available: boolean }) {
  const [reg, setReg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/mot-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reg }) });
      const data = await res.json();
      if (!res.ok) setError(data.error === 'unavailable' ? 'The checker isn’t available right now.' : data.error);
      else setResult(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!available) {
    return (
      <div className="chk-card">
        <p style={{ margin: 0 }}>
          Our checker is being set up. In the meantime, you can check your MOT due date on the{' '}
          <a href="https://www.gov.uk/check-mot-history" target="_blank" rel="noopener">government’s MOT history service</a>.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const days = result?.motExpiry ? Math.round((Date.parse(result.motExpiry) - Date.parse(today)) / DAY) : null;

  return (
    <div className="chk-card">
      <form onSubmit={check} className="chk-form">
        <label htmlFor="chk-reg" className="sr-only">Registration</label>
        <input id="chk-reg" className="chk-plate" value={reg} onChange={e => setReg(e.target.value.toUpperCase())} placeholder="AB12 CDE"
          autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={10} required />
        <button className="btn-amber chk-btn" disabled={busy}>{busy ? 'Checking…' : 'Check MOT date'}</button>
      </form>
      {error && <p className="error-text" role="alert" style={{ marginTop: 14 }}>{error}</p>}
      {result && (
        <div className="chk-result" role="status">
          <div className="chk-car"><span className="done__plate">{result.reg}</span> {[result.year, result.colour, result.make].filter(Boolean).join(' ')}</div>
          {result.motExpiry && days != null ? (
            <>
              <p className="chk-due">{days < 0 ? 'MOT ran out on' : 'MOT due by'} <strong>{fmt(result.motExpiry)}</strong></p>
              <p className="chk-note">
                {days < 0
                  ? 'This car’s MOT has run out. You can only drive it to a pre-booked MOT or to have faults repaired.'
                  : earliest(result.motExpiry) <= today
                    ? `That’s ${days} day${days === 1 ? '' : 's'} away. You can have the MOT now and keep the same renewal date.`
                    : `That’s ${days} days away. You can have your MOT from ${fmt(earliest(result.motExpiry))} and keep the same renewal date.`}
              </p>
            </>
          ) : (
            <p className="chk-due">{result.motStatus === 'No details held by DVLA' ? 'No MOT record yet: newer cars need their first MOT at three years old.' : 'DVLA didn’t return an MOT date for this vehicle.'}</p>
          )}
          <div className="hero__ctas" style={{ marginTop: 16 }}>
            <Link href="/book?service=mot" className="btn-amber hero__cta">Book your MOT, £45</Link>
          </div>
        </div>
      )}
    </div>
  );
}
