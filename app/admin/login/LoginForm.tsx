'use client';

import { useActionState } from 'react';
import { login } from '../actions.ts';

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="field" style={{ marginTop: 20 }}>
      <label htmlFor="pw">Password</label>
      <input id="pw" name="password" type="password" autoComplete="current-password" required autoFocus />
      {state?.error && <span className="error-text" role="alert">{state.error}</span>}
      <button className="btn-amber adm-btn" disabled={pending} style={{ marginTop: 8 }}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
