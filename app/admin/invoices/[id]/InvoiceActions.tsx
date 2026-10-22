'use client';

import { useActionState } from 'react';
import { PAYMENT_METHODS } from '@/lib/invoice-calc.ts';
import { emailInvoiceAction, markPaidAction, type InvoiceState } from '../actions.ts';
import { keepValues } from '../../keep-values.ts';

function Msg({ state }: { state: InvoiceState }) {
  if (state?.error) return <span className="error-text" role="alert">{state.error}</span>;
  if (state?.ok) return <span className="adm-ok" role="status">{state.ok}</span>;
  return null;
}

export function PrintButton({ label = 'Print / save as PDF' }: { label?: string }) {
  return <button type="button" className="adm-btn" onClick={() => window.print()}>{label}</button>;
}

export function EmailInvoiceForm({ id, email }: { id: number; email: string }) {
  const [state, action, pending] = useActionState(emailInvoiceAction, undefined);
  if (!email) return <span className="adm-muted">No email address on the invoice.</span>;
  return (
    <form onSubmit={keepValues(action)} className="adm-inline">
      <input type="hidden" name="id" value={id} />
      <button className="adm-btn adm-btn--ghost" disabled={pending}>{pending ? 'Sending…' : `Email to ${email}`}</button>
      <Msg state={state} />
    </form>
  );
}

export function MarkPaidForm({ id, today }: { id: number; today: string }) {
  const [state, action, pending] = useActionState(markPaidAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-inline">
      <input type="hidden" name="id" value={id} />
      <select name="method" defaultValue="card" aria-label="Payment method" className="adm-input">
        {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <input type="date" name="date" defaultValue={today} max={today} aria-label="Date paid" className="adm-input" />
      <button className="adm-btn" disabled={pending}>Mark paid</button>
      <Msg state={state} />
    </form>
  );
}
