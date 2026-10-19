'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  bookingRange, closedReason, daysInMonth, fmtHour, fmtLong, fmtMonth, fmtShort, freeHours, inRange, monthsInRange, pad, weekday,
  type Availability as Open,
} from '@/lib/schedule.ts';
import { BOOKING, PHONE_DISPLAY, PHONE_HREF, SERVICES, serviceById, type ServiceId } from '@/lib/site.ts';
import { validateBooking, type FieldErrors } from '@/lib/validation.ts';
import { Tick } from './icons.tsx';
import Turnstile, { TURNSTILE_SITE_KEY } from './Turnstile.tsx';

type Availability = Open & { start: string; end: string };
type Done = { ref: string; first: string; email: string; reg: string; service: string; when: string };

const EMPTY_FORM = { name: '', phone: '', email: '', reg: '' };
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function BookingForm({ initialService }: { initialService: ServiceId }) {
  const [service, setService] = useState<ServiceId>(initialService);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [availError, setAvailError] = useState(false);
  const [month, setMonth] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [captcha, setCaptcha] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);

  const loadAvailability = useCallback(async () => {
    try {
      const res = await fetch('/api/availability', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      setAvail(await res.json());
      setAvailError(false);
    } catch {
      setAvailError(true);
    }
  }, []);
  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  // Until availability arrives, show the calendar from the local range with every slot unconfirmed.
  const range = avail ?? bookingRange();
  const taken = avail?.taken ?? {}, closed = avail?.closed ?? [];
  const months = monthsInRange(range);
  const mi = Math.min(month, months.length - 1), m0 = months[mi];

  const clearError = (k: keyof FieldErrors) => setErrors(e => ({ ...e, [k]: undefined }));
  const setField = (k: keyof typeof EMPTY_FORM, v: string) => { setForm(f => ({ ...f, [k]: v })); clearError(k); };

  const lead = (weekday(m0) + 6) % 7;
  const days = Array.from({ length: daysInMonth(m0) }, (_, i) => {
    const iso = m0.slice(0, 8) + pad(i + 1);
    const inR = inRange(iso, range), why = closedReason(iso, closed);
    const free = inR && !why ? freeHours(iso, taken).length : 0;
    const ok = inR && !why && free > 0;
    let sub = '', label = fmtLong(iso);
    if (inR && why) { sub = 'Closed'; label += why === 'Holiday' ? ', bank holiday, closed' : ', closed'; }
    else if (inR && !free) { sub = 'Full'; label += ', fully booked'; }
    else if (ok && avail && free <= 2) { sub = free + ' left'; label += ', ' + free + ' slots left'; }
    return { iso, day: i + 1, ok, inR, sub, label, sel: date === iso };
  });

  async function confirm() {
    setSubmitError(null);
    const payload = { service, date, hour: slot, ...form };
    const check = validateBooking(payload);
    if (!check.ok) { setErrors(check.errors); scrollToFirstError(); return; }
    if (TURNSTILE_SITE_KEY && !captcha) { setSubmitError('Please wait a moment for the security check, then try again.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...check.value, website: honeypot, turnstileToken: captcha }),
      });
      setCaptchaReset(n => n + 1);
      const body = await res.json().catch(() => ({}));
      if (res.status === 201) {
        const v = check.value;
        setDone({ ref: body.ref, first: v.name.split(' ')[0], email: v.email, reg: v.reg,
          service: serviceById(v.service)!.name, when: `${fmtLong(v.date)}, ${fmtHour(v.hour)}` });
        window.scrollTo(0, 0);
        return;
      }
      if (body.errors) {
        setErrors(body.errors);
        if (res.status === 409) { setSlot(null); loadAvailability(); }
        scrollToFirstError();
        return;
      }
      setSubmitError(body.error ?? 'Something went wrong. Please try again.');
    } catch {
      setCaptchaReset(n => n + 1);
      setSubmitError(`We couldn’t reach the booking system. Please try again or call ${PHONE_DISPLAY}.`);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setDone(null); setDate(null); setSlot(null); setErrors({}); setForm(EMPTY_FORM); setSubmitError(null);
    loadAvailability();
  }

  if (done) {
    return (
      <section className="done-wrap">
        <div className="done">
          <div className="done__tick"><Tick size={40} color="#fff" width={2.6} /></div>
          <h2 className="display">You&rsquo;re booked in</h2>
          <p className="done__lede">Thanks {done.first}. We&rsquo;ve sent a confirmation to {done.email}.</p>
          <div className="done__rows">
            <div className="done__row"><span>Reference</span><span className="done__ref">{done.ref}</span></div>
            <div className="done__row"><span>Service</span><span>{done.service}</span></div>
            <div className="done__row"><span>When</span><span>{done.when}</span></div>
            <div className="done__row"><span>Vehicle</span><span className="done__plate">{done.reg}</span></div>
            <div className="done__row"><span>Where</span><span>21 Taylor St, Luton LU2 0EY</span></div>
          </div>
          <div className="done__actions">
            <Link href="/" className="done__home">Back to home</Link>
            <button type="button" className="done__again" onClick={reset}>Make another booking</button>
          </div>
        </div>
      </section>
    );
  }

  const svc = serviceById(service)!;

  return (
    <section className="wrap page-body book-layout">
      <div className="book-steps">
        <div className="card">
          <div className="step-head"><span className="step-num">1</span><h2>What do you need?</h2></div>
          <div className="choice-grid">
            {SERVICES.map(s => (
              <button key={s.id} type="button" className="choice" aria-pressed={service === s.id} onClick={() => setService(s.id)}>
                <span className="choice__name">{s.name}</span><span className="choice__note">{s.bookingNote}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="cal-head">
            <div className="step-head"><span className="step-num">2</span><h2>Pick a day</h2></div>
            <div className="cal-nav">
              <button type="button" aria-label="Previous month" disabled={mi === 0} onClick={() => setMonth(mi - 1)}>‹</button>
              <span className="cal-nav__label" aria-live="polite">{fmtMonth(m0)}</span>
              <button type="button" aria-label="Next month" disabled={mi >= months.length - 1} onClick={() => setMonth(mi + 1)}>›</button>
            </div>
          </div>
          <div className="cal-grid">
            {WEEKDAYS.map(w => <div key={w} className="cal-wd">{w}</div>)}
            {Array.from({ length: lead }, (_, i) => <div key={'pad' + i} />)}
            {days.map(d => (
              <button key={d.iso} type="button" disabled={!d.ok}
                className={'day' + (d.sel ? ' day--sel' : d.ok ? ' day--ok' : d.inR ? ' day--muted' : '')}
                aria-pressed={d.ok ? d.sel : undefined}
                aria-label={d.label}
                onClick={() => { setDate(d.iso); setSlot(null); clearError('when'); }}>
                <span>{d.day}</span>
                <span className="day__sub">{d.sub}</span>
              </button>
            ))}
          </div>
          <div className="legend">
            <span><i style={{ border: '1.5px solid var(--line-3)', background: '#fff' }} />Available</span>
            <span><i style={{ background: 'var(--navy)' }} />Selected</span>
            <span><i style={{ background: 'var(--muted-bg)' }} />Closed or fully booked</span>
          </div>
          {availError && (
            <p className="error-text" style={{ margin: '14px 0 0' }}>
              We couldn&rsquo;t load live availability. <button type="button" onClick={loadAvailability} style={{ font: 'inherit', color: 'inherit', textDecoration: 'underline', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>Try again</button> or call <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>.
            </p>
          )}
        </div>

        <div className="card" data-error={errors.when ? '' : undefined}>
          <div className="step-head"><span className="step-num">3</span><h2>Choose a time</h2></div>
          {!date ? (
            <p className="muted-p" style={{ margin: '18px 0 0' }}>Pick a day above to see available times.</p>
          ) : (
            <>
              <p className="muted-p" style={{ margin: '14px 0 0' }}>{fmtLong(date)}</p>
              <div className="slot-grid">
                {BOOKING.hours.map(h => {
                  const isTaken = !!taken[date]?.includes(h), pending = !avail;
                  return (
                    <button key={h} type="button" className="slot" disabled={isTaken || pending} aria-pressed={slot === h}
                      onClick={() => { setSlot(h); clearError('when'); }}>
                      <span className="slot__time">{fmtHour(h)}</span>
                      <span className="slot__sub">{pending ? 'Checking…' : isTaken ? 'Booked' : 'until ' + fmtHour(h + 1)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {errors.when && <p className="error-text" style={{ margin: '14px 0 0', fontSize: 15 }} role="alert">{errors.when}</p>}
        </div>

        <div className="card" data-error={errors.reg || errors.name || errors.phone || errors.email ? '' : undefined}>
          <div className="step-head"><span className="step-num">4</span><h2>Your details</h2></div>
          <div className="field" style={{ marginTop: 22 }}>
            <label htmlFor="bk-reg">Vehicle registration</label>
            <div className="plate">
              <span className="plate__uk" aria-hidden="true">UK</span>
              <input id="bk-reg" value={form.reg} onChange={e => setField('reg', e.target.value.toUpperCase())} placeholder="AB12 CDE"
                maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-invalid={!!errors.reg} />
            </div>
            {errors.reg && <span className="error-text">{errors.reg}</span>}
          </div>
          <div className="fields">
            <div className="field">
              <label htmlFor="bk-name">Full name</label>
              <input id="bk-name" value={form.name} onChange={e => setField('name', e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="bk-phone">Phone</label>
              <input id="bk-phone" type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} autoComplete="tel" aria-invalid={!!errors.phone} />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>
            <div className="field field--wide">
              <label htmlFor="bk-email">Email</label>
              <input id="bk-email" type="email" value={form.email} onChange={e => setField('email', e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="bk-website">Leave this empty</label>
              <input id="bk-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <aside className="summary">
        <div className="summary__eyebrow">Your booking</div>
        <div className="summary__rows">
          <div className="summary__row"><span>Service</span><span>{svc.name}</span></div>
          <div className="summary__row"><span>Day</span><span>{date ? fmtShort(date) : '—'}</span></div>
          <div className="summary__row"><span>Time</span><span>{slot != null ? `${fmtHour(slot)} – ${fmtHour(slot + 1)}` : '—'}</span></div>
          <div className="summary__price"><span>Price</span><span>{svc.summaryPrice}</span></div>
        </div>
        <button type="button" className="btn-amber summary__confirm" onClick={confirm} disabled={submitting}>
          {submitting ? 'Booking…' : 'Confirm booking'}
        </button>
        <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
        {submitError && <p className="summary__error" role="alert">{submitError}</p>}
        <p className="summary__small">Pay on the day. Need to change your slot? Call <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>.</p>
        <p className="summary__small" style={{ marginTop: 10, fontSize: 13 }}>We use your details only to manage this booking. See our <Link href="/privacy">privacy notice</Link>.</p>
      </aside>
    </section>
  );
}

function scrollToFirstError() {
  requestAnimationFrame(() => document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}
