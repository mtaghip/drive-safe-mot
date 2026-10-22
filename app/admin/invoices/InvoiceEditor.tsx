'use client';

import { useActionState, useMemo, useState } from 'react';
import type { Vehicle } from '@/lib/customers.ts';
import { gbp, LINE_KINDS, lineNet, nextMotDue, parsePence, totals, type Line, type LineKind } from '@/lib/invoice-calc.ts';
import type { Invoice } from '@/lib/invoices.ts';
import { keepValues } from '../keep-values.ts';
import { saveDraftAction } from './actions.ts';

type EditLine = { kind: LineKind; description: string; quantity: string; price: string; vatRate: number | null };

const toEdit = (l: Line): EditLine => ({ ...l, quantity: String(l.quantity), price: (l.unitPence / 100).toFixed(2) });
const toLine = (l: EditLine): Line | null => {
  const unitPence = parsePence(l.price), quantity = Number(l.quantity);
  return unitPence == null || !(quantity > 0) ? null : { kind: l.kind, description: l.description, quantity, unitPence, vatRate: l.vatRate };
};
const vehicleDesc = (v: Vehicle) => [v.year, v.make, v.model, v.colour && `(${v.colour.toLowerCase()})`].filter(Boolean).join(' ');

export default function InvoiceEditor({ inv, vehicles, vatRegistered, standardRate, today }: {
  inv: Invoice; vehicles: Vehicle[]; vatRegistered: boolean; standardRate: number; today: string;
}) {
  const [state, action, pending] = useActionState(saveDraftAction, undefined);
  const [f, setF] = useState({
    vehicleId: inv.vehicleId ? String(inv.vehicleId) : '', billName: inv.billName, billAddress: inv.billAddress, billPhone: inv.billPhone,
    billEmail: inv.billEmail, reg: inv.reg, vehicleDesc: inv.vehicleDesc, mileage: inv.mileage == null ? '' : String(inv.mileage),
    notes: inv.notes, nextMotDue: inv.nextMotDue ?? '',
  });
  const [lines, setLines] = useState<EditLine[]>(inv.lines.map(toEdit));
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(p => ({ ...p, [k]: e.target.value }));
  const setLine = (i: number, patch: Partial<EditLine>) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const rateFor = (kind: LineKind) => (!vatRegistered || kind === 'mot' ? null : standardRate);
  const add = (kind: LineKind, description = '', price = '') => setLines(ls => [...ls, { kind, description, quantity: '1', price, vatRate: rateFor(kind) }]);

  const parsed = lines.map(toLine);
  const t = useMemo(() => totals(parsed.filter((l): l is Line => l !== null)), [parsed]);
  const hasMot = lines.some(l => l.kind === 'mot');
  const vehicle = vehicles.find(v => String(v.id) === f.vehicleId);
  const suggestedMot = hasMot ? nextMotDue(today, vehicle?.motDue ?? null) : null;

  function pickVehicle(id: string) {
    const v = vehicles.find(x => String(x.id) === id);
    setF(p => ({ ...p, vehicleId: id, ...(v ? { reg: v.reg, vehicleDesc: vehicleDesc(v) } : {}) }));
  }

  const payload = JSON.stringify({
    ...f, mileage: f.mileage.replace(/[,\s]/g, ''),
    lines: lines.map((l, i) => ({ ...l, quantity: l.quantity, unitPence: parsed[i]?.unitPence ?? NaN })),
  });

  return (
    <form className="adm-page" onSubmit={keepValues(action, e => {
      const intent = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value');
      return intent !== 'issue' || confirm('Issue this invoice? It gets the next invoice number and can’t be edited afterwards.');
    })}>
      <input type="hidden" name="id" value={inv.id} />
      <input type="hidden" name="data" value={payload} />

      <section className="card">
        <h2 className="adm-h2">Customer</h2>
        <div className="adm-form">
          <div className="field"><label>Name</label><input value={f.billName} onChange={set('billName')} required /></div>
          <div className="field"><label>Phone</label><input value={f.billPhone} onChange={set('billPhone')} /></div>
          <div className="field"><label>Email</label><input type="email" value={f.billEmail} onChange={set('billEmail')} /></div>
          <div className="field field--wide"><label>Address</label><textarea rows={2} value={f.billAddress} onChange={set('billAddress')} /></div>
        </div>
      </section>

      <section className="card">
        <h2 className="adm-h2">Vehicle</h2>
        <div className="adm-form">
          {vehicles.length > 0 && (
            <div className="field"><label>Customer’s vehicle</label>
              <select value={f.vehicleId} onChange={e => pickVehicle(e.target.value)}>
                <option value="">Other / not listed</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg}{v.make ? ` · ${v.make} ${v.model}` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="field"><label>Registration</label><input value={f.reg} onChange={set('reg')} style={{ textTransform: 'uppercase' }} /></div>
          <div className="field"><label>Description</label><input value={f.vehicleDesc} onChange={set('vehicleDesc')} placeholder="e.g. 2015 Ford Focus" /></div>
          <div className="field"><label>Mileage</label><input value={f.mileage} onChange={set('mileage')} inputMode="numeric" /></div>
        </div>
      </section>

      <section className="card">
        <h2 className="adm-h2">Work and parts</h2>
        <div className="adm-lines">
          <div className="adm-lines__head" aria-hidden="true">
            <span>Type</span><span>Description</span><span>Qty</span><span>Unit price{vatRegistered ? ' (ex VAT)' : ''}</span>{vatRegistered && <span>VAT</span>}<span>Amount</span><span />
          </div>
          {lines.map((l, i) => (
            <div key={i} className={'adm-line' + (vatRegistered ? ' adm-line--vat' : '')}>
              <select aria-label="Type" value={l.kind} onChange={e => { const kind = e.target.value as LineKind; setLine(i, { kind, vatRate: rateFor(kind) }); }}>
                {LINE_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <input aria-label="Description" value={l.description} onChange={e => setLine(i, { description: e.target.value })} placeholder="Description" required />
              <input aria-label="Quantity" value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} inputMode="decimal"
                className={Number(l.quantity) > 0 ? '' : 'adm-bad'} />
              <input aria-label="Unit price in pounds" value={l.price} onChange={e => setLine(i, { price: e.target.value })} inputMode="decimal" placeholder="0.00"
                className={parsePence(l.price) == null ? 'adm-bad' : ''} />
              {vatRegistered && (
                <select aria-label="VAT rate" value={l.vatRate ?? ''} onChange={e => setLine(i, { vatRate: e.target.value === '' ? null : Number(e.target.value) })}>
                  <option value="20">20%</option><option value="5">5%</option><option value="0">0%</option><option value="">Outside scope</option>
                </select>
              )}
              <span className="adm-line__amount">{parsed[i] ? gbp(lineNet(parsed[i]!)) : '—'}</span>
              <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" aria-label={`Remove line ${i + 1}`} onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          {lines.length === 0 && <p className="adm-muted">No lines yet. Add one below.</p>}
        </div>
        <div className="adm-actions" style={{ marginTop: 12 }}>
          {!hasMot && <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => add('mot', 'MOT test', '45.00')}>+ MOT test £45</button>}
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => add('labour', 'Labour', '')}>+ Labour</button>
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => add('part')}>+ Part</button>
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => add('other')}>+ Other</button>
        </div>
        <table className="adm-totals">
          <tbody>
            {vatRegistered && <tr><td>Subtotal (ex VAT)</td><td>{gbp(t.net)}</td></tr>}
            {vatRegistered && <tr><td>VAT</td><td>{gbp(t.vat)}</td></tr>}
            <tr className="adm-totals__total"><td>Total</td><td>{gbp(t.total)}</td></tr>
          </tbody>
        </table>
        {vatRegistered && hasMot && <p className="adm-muted">The MOT test fee is outside the scope of VAT.</p>}
      </section>

      {hasMot && (
        <section className="card">
          <h2 className="adm-h2">MOT passed?</h2>
          <p className="adm-muted" style={{ margin: '6px 0 0' }}>
            Enter the new expiry from the certificate. When the invoice is issued it&rsquo;s saved to the vehicle, and reminders follow from it.
            Leave empty if it failed.
          </p>
          <div className="adm-inline" style={{ marginTop: 10 }}>
            <input type="date" value={f.nextMotDue} onChange={set('nextMotDue')} className="adm-input" aria-label="Next MOT due" />
            {suggestedMot && f.nextMotDue !== suggestedMot && (
              <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setF(p => ({ ...p, nextMotDue: suggestedMot }))}>
                Use {suggestedMot.split('-').reverse().join('/')} (passed today{vehicle?.motDue ? `, old expiry ${vehicle.motDue.split('-').reverse().join('/')}` : ''})
              </button>
            )}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="adm-h2">Notes on the invoice</h2>
        <textarea rows={3} value={f.notes} onChange={set('notes')} className="adm-textarea" placeholder="e.g. Advisories: front tyres close to limit" />
      </section>

      <div className="adm-savebar">
        {state?.error && <span className="error-text" role="alert">{state.error}</span>}
        {state?.ok && <span className="adm-ok" role="status">{state.ok}</span>}
        <button name="intent" value="save" className="adm-btn adm-btn--ghost" disabled={pending}>{pending ? 'Saving…' : 'Save draft'}</button>
        <button name="intent" value="issue" className="adm-btn" disabled={pending}>Save and issue</button>
      </div>
    </form>
  );
}
