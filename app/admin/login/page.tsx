import { redirect } from 'next/navigation';
import { adminPassword, isAdmin, MIN_PASSWORD_LENGTH } from '@/lib/admin.ts';
import LoginForm from './LoginForm.tsx';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');
  return (
    <section className="wrap page-body">
      <div className="card adm-login">
        <h1 className="adm-h1">Staff sign-in</h1>
        {adminPassword() ? <LoginForm /> : (
          <p className="muted-p">
            Staff sign-in isn&rsquo;t set up. Set the <code>ADMIN_PASSWORD</code> environment variable
            (at least {MIN_PASSWORD_LENGTH} characters) and restart the site.
          </p>
        )}
      </div>
    </section>
  );
}
