'use client';

import { useActionState } from 'react';
import { setupAction, signInAction } from '../auth-actions.ts';
import { keepValues } from '../keep-values.ts';

export function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-stack" style={{ marginTop: 20 }}>
      <div className="field"><label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus /></div>
      <div className="field"><label htmlFor="pw">Password</label>
        <input id="pw" name="password" type="password" autoComplete="current-password" required /></div>
      {state?.error && <span className="error-text" role="alert">{state.error}</span>}
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

export function SetupForm({ minLength }: { minLength: number }) {
  const [state, action, pending] = useActionState(setupAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-stack" style={{ marginTop: 20 }}>
      <div className="field"><label htmlFor="code">Setup password</label>
        <input id="code" name="code" type="password" autoComplete="off" required autoFocus /></div>
      <div className="field"><label htmlFor="name">Your name</label>
        <input id="name" name="name" autoComplete="name" required /></div>
      <div className="field"><label htmlFor="email">Your email (you&rsquo;ll sign in with this)</label>
        <input id="email" name="email" type="email" autoComplete="username" required /></div>
      <div className="field"><label htmlFor="pw">Choose a password (at least {minLength} characters)</label>
        <input id="pw" name="password" type="password" autoComplete="new-password" minLength={minLength} required /></div>
      {state?.error && <span className="error-text" role="alert">{state.error}</span>}
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Creating…' : 'Create owner account'}</button>
    </form>
  );
}
