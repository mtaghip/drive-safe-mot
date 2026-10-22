'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { Customer, Vehicle } from '@/lib/customers.ts';
import { createCustomerAction, lookupRegAction, saveVehicleAction, updateCustomerAction, type CustomerState } from './actions.ts';
import { keepValues } from '../keep-values.ts';

function Msg({ state, ok = 'Saved.' }: { state: CustomerState; ok?: string }) {
  if (state?.error) return <span className="error-text" role="alert">{state.error}</span>;
  if (state?.ok) return <span className="adm-ok" role="status">{ok}</span>;
  return null;
}

function CustomerFields({ c }: { c?: Partial<Customer> }) {
  return (
    <>
      <div className="field"><label>Name</label><input name="name" defaultValue={c?.name} required /></div>
      <div className="field"><label>Phone</label><input name="phone" type="tel" defaultValue={c?.phone} /></div>
      <div className="field"><label>Email</label><input name="email" type="email" defaultValue={c?.email} /></div>
      <div className="field field--wide"><label>Address (for invoices)</label><textarea name="address" rows={3} defaultValue={c?.address} /></div>
      <div className="field field--wide"><label>Notes (staff only)</label><textarea name="notes" rows={2} defaultValue={c?.notes} /></div>
    </>
  );
}

export function NewCustomerForm() {
  const [state, action, pending] = useActionState(createCustomerAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-form">
      <CustomerFields />
      <div className="field"><label>Vehicle registration (optional)</label><input name="reg" style={{ textTransform: 'uppercase' }} /></div>
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Saving…' : 'Add customer'}</button>
      <div style={{ gridColumn: '1 / -1' }}><Msg state={state} /></div>
    </form>
  );
}

export function EditCustomerForm({ c, readOnly }: { c: Customer; readOnly: boolean }) {
  const [state, action, pending] = useActionState(updateCustomerAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-form">
      <input type="hidden" name="id" value={c.id} />
      <fieldset disabled={readOnly} className="adm-fieldset"><CustomerFields c={c} /></fieldset>
      {!readOnly && <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Saving…' : 'Save details'}</button>}
      <div style={{ gridColumn: '1 / -1' }}><Msg state={state} /></div>
    </form>
  );
}

/** Add or edit a vehicle, with an optional DVLA lookup that fills in make, colour, year and MOT date. */
export function VehicleForm({ customerId, v, lookup }: { customerId: number; v?: Vehicle; lookup: boolean }) {
  const [state, action, pending] = useActionState(saveVehicleAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [looking, startLookup] = useTransition();
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  useEffect(() => {
    if (state?.ok && !v) { ref.current?.reset(); ref.current?.closest('details')?.removeAttribute('open'); }
  }, [state, v]);

  function runLookup() {
    const f = ref.current!;
    const reg = (f.elements.namedItem('reg') as HTMLInputElement).value;
    setLookupMsg(null);
    startLookup(async () => {
      const r = await lookupRegAction(reg);
      if (!r.ok) { setLookupMsg(r.error); return; }
      const set = (name: string, value: string | number | null) => {
        const el = f.elements.namedItem(name) as HTMLInputElement;
        if (value != null && value !== '') el.value = String(value);
      };
      set('make', r.facts.make); set('colour', r.facts.colour); set('year', r.facts.year); set('motDue', r.facts.motExpiry);
      setLookupMsg(`Found: ${[r.facts.year, r.facts.make, r.facts.colour].filter(Boolean).join(' ')}. MOT ${r.facts.motStatus || 'status unknown'}${r.facts.motExpiry ? ` until ${r.facts.motExpiry.split('-').reverse().join('/')}` : ''}. Check, then save.`);
    });
  }

  return (
    <form ref={ref} onSubmit={keepValues(action)} className="adm-form">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="vehicleId" value={v?.id ?? ''} />
      <div className="field"><label>Registration</label>
        <div className="adm-inline" style={{ flexWrap: 'nowrap' }}>
          <input name="reg" defaultValue={v?.reg} required style={{ textTransform: 'uppercase', flex: 1, minWidth: 0 }} />
          {lookup && <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={runLookup} disabled={looking}>{looking ? 'Looking up…' : 'Look up'}</button>}
        </div>
      </div>
      <div className="field"><label>Make</label><input name="make" defaultValue={v?.make} /></div>
      <div className="field"><label>Model</label><input name="model" defaultValue={v?.model} /></div>
      <div className="field"><label>Colour</label><input name="colour" defaultValue={v?.colour} /></div>
      <div className="field"><label>Year</label><input name="year" inputMode="numeric" defaultValue={v?.year ?? ''} /></div>
      <div className="field"><label>MOT due</label><input name="motDue" type="date" defaultValue={v?.motDue ?? ''} /></div>
      <div className="field"><label>Service due</label><input name="serviceDue" type="date" defaultValue={v?.serviceDue ?? ''} /></div>
      <div className="field field--wide"><label>Notes</label><input name="notes" defaultValue={v?.notes} placeholder="e.g. tyre size, timing belt changed at 60k" /></div>
      {lookupMsg && <div className="adm-muted" style={{ gridColumn: '1 / -1' }} role="status">{lookupMsg}</div>}
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Saving…' : v ? 'Save vehicle' : 'Add vehicle'}</button>
      <div style={{ gridColumn: '1 / -1' }}><Msg state={state} /></div>
    </form>
  );
}
