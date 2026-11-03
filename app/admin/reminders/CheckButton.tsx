'use client';

import { useActionState } from 'react';
import { checkMotDatesAction } from './actions.ts';

export default function CheckButton() {
  const [state, action, pending] = useActionState(checkMotDatesAction, undefined);
  return (
    <form action={action} className="adm-inline" style={{ marginTop: 12 }}>
      <button className="adm-btn" disabled={pending}>{pending ? 'Checking with DVLA…' : 'Check MOT dates now'}</button>
      {state?.ok && <span className="adm-ok" role="status">{state.ok}</span>}
      {state?.error && <span className="error-text" role="alert">{state.error}</span>}
    </form>
  );
}
