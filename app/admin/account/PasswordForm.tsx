'use client';

import { useActionState, useEffect, useRef } from 'react';
import { changePasswordAction } from '../auth-actions.ts';
import { keepValues } from '../keep-values.ts';

export default function PasswordForm({ minLength }: { minLength: number }) {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} onSubmit={keepValues(action)} className="adm-stack" style={{ marginTop: 14 }}>
      <div className="field"><label htmlFor="cur">Current password</label><input id="cur" name="current" type="password" autoComplete="current-password" required /></div>
      <div className="field"><label htmlFor="new">New password (at least {minLength} characters)</label><input id="new" name="next" type="password" autoComplete="new-password" minLength={minLength} required /></div>
      <div className="field"><label htmlFor="conf">New password again</label><input id="conf" name="confirm" type="password" autoComplete="new-password" required /></div>
      {state?.error && <span className="error-text" role="alert">{state.error}</span>}
      {state?.ok && <span className="adm-ok" role="status">Password changed.</span>}
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}
