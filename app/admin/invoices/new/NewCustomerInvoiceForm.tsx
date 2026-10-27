'use client';

import { useActionState } from 'react';
import { keepValues } from '../../keep-values.ts';
import { createInvoiceForNewCustomerAction } from '../actions.ts';

export default function NewCustomerInvoiceForm() {
  const [state, action, pending] = useActionState(createInvoiceForNewCustomerAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-form">
      <div className="field"><label>Name</label><input name="name" required /></div>
      <div className="field"><label>Phone</label><input name="phone" type="tel" /></div>
      <div className="field"><label>Email</label><input name="email" type="email" /></div>
      <div className="field"><label>Vehicle registration</label><input name="reg" style={{ textTransform: 'uppercase' }} /></div>
      <div className="field field--wide"><label>Address (for the invoice, optional)</label><textarea name="address" rows={2} /></div>
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Starting…' : 'Start invoice'}</button>
      {state?.error && <div style={{ gridColumn: '1 / -1' }}><span className="error-text" role="alert">{state.error}</span></div>}
    </form>
  );
}
