import { listStaff, requireStaff } from '@/lib/auth.ts';
import { MIN_PASSWORD_LENGTH } from '@/lib/passwords.ts';
import { roleLabel } from '@/lib/roles.ts';
import { AddStaffForm, ResetPasswordForm, StaffRowForm } from './TeamForms.tsx';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const me = await requireStaff('manageStaff');
  const staff = await listStaff();
  return (
    <div className="wrap page-body adm-page">
      <h1 className="adm-h1">Team</h1>
      <p className="adm-muted" style={{ margin: 0 }}>Everyone signs in with their own email and password. Disabling someone signs them out at once.</p>
      <ul className="adm-cards">
        {staff.map(s => (
          <li key={s.id} className={'card adm-person' + (s.active ? '' : ' adm-person--off')}>
            <div className="adm-person__head">
              <strong>{s.name}</strong>{s.id === me.id && <span className="adm-badge">You</span>}
              <span className="adm-badge adm-badge--phone">{roleLabel(s.role)}</span>
              {!s.active && <span className="adm-badge adm-badge--off">Disabled</span>}
            </div>
            <div className="adm-muted">{s.email} · {s.lastLoginAt ? `last signed in ${s.lastLoginAt}` : 'never signed in'}</div>
            <StaffRowForm id={s.id} role={s.role} active={s.active} self={s.id === me.id} />
            {s.id !== me.id && <ResetPasswordForm id={s.id} minLength={MIN_PASSWORD_LENGTH} />}
          </li>
        ))}
      </ul>
      <section className="card">
        <h2 className="adm-h2">Add a staff member</h2>
        <p className="adm-muted" style={{ margin: '6px 0 0' }}>Give them the temporary password in person. They can change it from their account page.</p>
        <AddStaffForm minLength={MIN_PASSWORD_LENGTH} />
      </section>
    </div>
  );
}
