'use client';

import { useActionState, useEffect, useRef } from 'react';
import { BOOKING, SERVICES } from '@/lib/site.ts';
import { fmtHour } from '@/lib/schedule.ts';
import { addPhoneBooking, emailDaySchedule, findRef, moveBooking } from './actions.ts';
import { keepValues } from './keep-values.ts';

/** Submit button that asks first. */
export function ConfirmButton({ children, message, className = 'adm-btn adm-btn--ghost' }: { children: React.ReactNode; message: string; className?: string }) {
  return <button className={className} onClick={e => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}

/** Closes the surrounding <details> once an action succeeds. */
function useCloseOnSuccess(ok: boolean | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) { ref.current?.reset(); ref.current?.closest('details')?.removeAttribute('open'); }
  }, [ok]);
  return ref;
}

export function PhoneBookingForm({ date, hour }: { date: string; hour: number }) {
  const [state, action, pending] = useActionState(addPhoneBooking, undefined);
  const ref = useCloseOnSuccess(state?.ok);
  const err = state?.errors ?? {};
  return (
    <form ref={ref} onSubmit={keepValues(action)} className="adm-form">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="hour" value={hour} />
      <div className="field"><label>Service</label>
        <select name="service" defaultValue="mot">{SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>
      <div className="field"><label>Registration</label><input name="reg" required maxLength={8} style={{ textTransform: 'uppercase' }} />{err.reg && <span className="error-text">{err.reg}</span>}</div>
      <div className="field"><label>Name</label><input name="name" required />{err.name && <span className="error-text">{err.name}</span>}</div>
      <div className="field"><label>Phone</label><input name="phone" type="tel" required />{err.phone && <span className="error-text">{err.phone}</span>}</div>
      <div className="field"><label>Email (optional, sends a confirmation)</label><input name="email" type="email" />{err.email && <span className="error-text">{err.email}</span>}</div>
      {(state?.error || err.when || err.service) && <span className="error-text" role="alert">{state?.error ?? err.when ?? err.service}</span>}
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Saving…' : 'Save booking'}</button>
    </form>
  );
}

export function MoveForm({ id, date, hour }: { id: number; date: string; hour: number }) {
  const [state, action, pending] = useActionState(moveBooking, undefined);
  const ref = useCloseOnSuccess(state?.ok);
  return (
    <form ref={ref} onSubmit={keepValues(action)} className="adm-form adm-form--row">
      <input type="hidden" name="id" value={id} />
      <div className="field"><label>New day</label><input name="date" type="date" defaultValue={date} required /></div>
      <div className="field"><label>Time</label>
        <select name="hour" defaultValue={hour}>{BOOKING.hours.map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}</select>
      </div>
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Moving…' : 'Move'}</button>
      {state?.error && <span className="error-text" role="alert" style={{ flexBasis: '100%' }}>{state.error}</span>}
    </form>
  );
}

export function EmailDayButton({ date, to }: { date: string; to: string }) {
  const [state, action, pending] = useActionState(emailDaySchedule, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-inline">
      <input type="hidden" name="date" value={date} />
      <button className="adm-btn adm-btn--ghost" disabled={pending}>{pending ? 'Sending…' : 'Email this day’s schedule'}</button>
      {state?.ok && <span className="adm-muted" role="status">Sent to {to}</span>}
      {state?.error && <span className="error-text" role="alert">{state.error}</span>}
    </form>
  );
}

export function RefSearch() {
  const [state, action, pending] = useActionState(findRef, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-inline">
      <input name="ref" placeholder="Find reference, e.g. DS-AB12C" aria-label="Booking reference" required className="adm-input" />
      <button className="adm-btn adm-btn--ghost" disabled={pending}>Find</button>
      {state?.error && <span className="error-text" role="alert">{state.error}</span>}
    </form>
  );
}
