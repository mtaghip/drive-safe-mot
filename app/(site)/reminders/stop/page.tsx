import type { Metadata } from 'next';
import { db } from '@/lib/db.ts';
import { tokenValid } from '@/lib/reminders.ts';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/site.ts';
import { stopRemindersAction } from './actions.ts';

export const metadata: Metadata = { title: 'Stop reminders', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function StopRemindersPage({ searchParams }: { searchParams: Promise<{ c?: string; t?: string; done?: string }> }) {
  const { c, t = '', done } = await searchParams;
  const id = Number(c);
  const valid = Number.isInteger(id) && id > 0 && (await tokenValid(id, t));
  const optedOut = valid && (await db.query<{ ok: boolean }>('SELECT reminders_ok AS ok FROM customers WHERE id = $1', [id])).rows[0]?.ok === false;
  return (
    <>
      <section className="navy contact-hero">
        <div className="wrap contact-hero__inner">
          <div className="eyebrow">Reminders</div>
          <h1 className="display">{done || optedOut ? 'You’re unsubscribed' : 'Stop reminders'}</h1>
        </div>
      </section>
      <section className="wrap page-body">
        <div className="card prose">
          {!valid ? (
            <p>This link isn’t valid. To stop reminders, call us on <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>.</p>
          ) : done || optedOut ? (
            <p>We won’t send you any more MOT or service reminders. Changed your mind? Call us on <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>.</p>
          ) : (
            <form action={stopRemindersAction}>
              <p style={{ marginTop: 0 }}>We email a reminder before your MOT or service is due. Stop these emails?</p>
              <input type="hidden" name="c" value={id} /><input type="hidden" name="t" value={t} />
              <button className="btn-amber adm-btn" style={{ marginTop: 8 }}>Stop reminder emails</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
