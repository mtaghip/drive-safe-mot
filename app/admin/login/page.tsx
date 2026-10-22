import { redirect } from 'next/navigation';
import { currentStaff, hasStaff, setupCode } from '@/lib/auth.ts';
import { MIN_PASSWORD_LENGTH } from '@/lib/passwords.ts';
import { SetupForm, SignInForm } from './LoginForm.tsx';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await currentStaff()) redirect('/admin');
  const firstRun = !(await hasStaff());
  return (
    <section className="wrap page-body">
      <div className="card adm-login">
        <h1 className="adm-h1">{firstRun ? 'Set up staff sign-in' : 'Staff sign-in'}</h1>
        {!firstRun ? <SignInForm /> : setupCode() ? (
          <>
            <p className="muted-p" style={{ margin: '12px 0 0' }}>
              Create the owner account. The owner can then add everyone else from the Team page.
              To prove you&rsquo;re allowed to, enter the setup password (the site&rsquo;s <code>ADMIN_PASSWORD</code> setting).
            </p>
            <SetupForm minLength={MIN_PASSWORD_LENGTH} />
          </>
        ) : (
          <p className="muted-p">
            Staff sign-in isn&rsquo;t set up yet. Set the <code>ADMIN_PASSWORD</code> environment variable
            (at least {MIN_PASSWORD_LENGTH} characters) and restart the site, then come back here to create the owner account.
          </p>
        )}
      </div>
    </section>
  );
}
