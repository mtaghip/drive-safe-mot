import { requireStaff } from '@/lib/auth.ts';
import { MIN_PASSWORD_LENGTH } from '@/lib/passwords.ts';
import { roleLabel } from '@/lib/roles.ts';
import PasswordForm from './PasswordForm.tsx';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const me = await requireStaff();
  return (
    <div className="wrap page-body adm-page">
      <h1 className="adm-h1">Your account</h1>
      <div className="card adm-narrow">
        <dl className="adm-dl">
          <dt>Name</dt><dd>{me.name}</dd>
          <dt>Email</dt><dd>{me.email}</dd>
          <dt>Role</dt><dd>{roleLabel(me.role)}</dd>
        </dl>
      </div>
      <div className="card adm-narrow">
        <h2 className="adm-h2">Change password</h2>
        <p className="adm-muted" style={{ margin: '6px 0 0' }}>This signs you out on every other device.</p>
        <PasswordForm minLength={MIN_PASSWORD_LENGTH} />
      </div>
    </div>
  );
}
