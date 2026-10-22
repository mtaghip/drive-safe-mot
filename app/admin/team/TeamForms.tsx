'use client';

import { useActionState, useEffect, useRef } from 'react';
import { ROLES, type Role } from '@/lib/roles.ts';
import { addStaffAction, resetPasswordAction, updateStaffAction, type TeamState } from './actions.ts';
import { keepValues } from '../keep-values.ts';

function Msg({ state }: { state: TeamState }) {
  if (state?.error) return <span className="error-text" role="alert">{state.error}</span>;
  if (state?.ok) return <span className="adm-ok" role="status">{state.ok}</span>;
  return null;
}

const RoleSelect = ({ value, name = 'role' }: { value?: Role; name?: string }) => (
  <select name={name} defaultValue={value ?? 'staff'}>
    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}: {r.desc}</option>)}
  </select>
);

export function AddStaffForm({ minLength }: { minLength: number }) {
  const [state, action, pending] = useActionState(addStaffAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} onSubmit={keepValues(action)} className="adm-form">
      <div className="field"><label>Name</label><input name="name" required /></div>
      <div className="field"><label>Email</label><input name="email" type="email" required /></div>
      <div className="field"><label>Role</label><RoleSelect /></div>
      <div className="field"><label>Temporary password ({minLength}+ characters)</label><input name="password" type="text" autoComplete="off" minLength={minLength} required /></div>
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Adding…' : 'Add staff member'}</button>
      <div style={{ gridColumn: '1 / -1' }}><Msg state={state} /></div>
    </form>
  );
}

export function StaffRowForm({ id, role, active, self }: { id: number; role: Role; active: boolean; self: boolean }) {
  const [state, action, pending] = useActionState(updateStaffAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-inline">
      <input type="hidden" name="id" value={id} />
      <RoleSelect value={role} />
      <label className="adm-check"><input type="checkbox" name="active" defaultChecked={active} disabled={self} /> Active</label>
      {self && <input type="hidden" name="active" value="on" />}
      <button className="adm-btn adm-btn--ghost adm-btn--sm" disabled={pending}>Save</button>
      <Msg state={state} />
    </form>
  );
}

export function ResetPasswordForm({ id, minLength }: { id: number; minLength: number }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-inline">
      <input type="hidden" name="id" value={id} />
      <input name="password" type="text" autoComplete="off" placeholder="New temporary password" minLength={minLength} required className="adm-input" />
      <button className="adm-btn adm-btn--ghost adm-btn--sm" disabled={pending}>Reset password</button>
      <Msg state={state} />
    </form>
  );
}
