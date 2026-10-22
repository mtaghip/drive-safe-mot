import Link from 'next/link';
import { requireStaff } from '@/lib/auth.ts';
import { can } from '@/lib/roles.ts';
import { addDays, closureLabel, fmtHour, fmtLong, isIsoDate, isOpenDay, todayIso, weekday } from '@/lib/schedule.ts';
import { BOOKING, serviceById } from '@/lib/site.ts';
import { store } from '@/lib/store.ts';
import { addBlock, cancelBooking, removeBlock } from './actions.ts';
import { createInvoiceAction } from './invoices/actions.ts';
import { dailyEmailTo } from '@/lib/daily-email.ts';
import { ConfirmButton, EmailDayButton, MoveForm, PhoneBookingForm, RefSearch } from './Forms.tsx';

export const dynamic = 'force-dynamic';

const STRIP_DAYS = 28;
const dayName = (iso: string) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday(iso)];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ date?: string; denied?: string }> }) {
  const me = await requireStaff();
  const write = can(me.role, 'write');
  const today = todayIso();
  const { date: q, denied } = await searchParams;
  const date = isIsoDate(q) ? q : today;

  const s = store();
  const stripEnd = addDays(today, STRIP_DAYS - 1);
  const [bookings, dayBlocks, counts, stripBlocks, closures] = await Promise.all([
    s.dayBookings(date), s.blocks(date, date), s.countsByDay(today, stripEnd), s.blocks(today, stripEnd), s.blocks(today, addDays(today, 365)),
  ]);

  const closedBlock = dayBlocks.find(b => b.hour == null);
  const regular = closureLabel(date);
  const closed = !!(closedBlock || regular);
  const stripClosed = new Set(stripBlocks.filter(b => b.hour == null).map(b => b.date));
  const upcomingClosures = closures.filter(b => b.hour == null);

  return (
    <div className="wrap page-body adm-page">
      {denied && <p className="adm-banner adm-banner--warn">Your role doesn’t have access to that. Ask the owner if you need it.</p>}
      <div className="adm-top">
        <div>
          <div className="adm-eyebrow">{date === today ? 'Today' : date < today ? 'Past day' : 'Bookings for'}</div>
          <h1 className="adm-h1">{fmtLong(date)}</h1>
        </div>
        <div className="adm-inline">
          <Link className="adm-btn adm-btn--ghost" href={`/admin?date=${addDays(date, -1)}`} aria-label="Previous day">‹</Link>
          <Link className="adm-btn adm-btn--ghost" href="/admin">Today</Link>
          <Link className="adm-btn adm-btn--ghost" href={`/admin?date=${addDays(date, 1)}`} aria-label="Next day">›</Link>
          <form className="adm-inline" action="/admin">
            <input type="date" name="date" defaultValue={date} aria-label="Go to day" className="adm-input" />
            <button className="adm-btn adm-btn--ghost">Go</button>
          </form>
        </div>
      </div>
      <div className="adm-inline" style={{ justifyContent: 'space-between' }}>
        <RefSearch />
        <EmailDayButton date={date} to={dailyEmailTo()} />
      </div>

      <nav className="adm-strip" aria-label="Next four weeks">
        {Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i)).map(d => {
          const shut = !isOpenDay(d) || stripClosed.has(d);
          return (
            <Link key={d} href={`/admin?date=${d}`} className={'adm-day' + (d === date ? ' adm-day--sel' : '') + (shut ? ' adm-day--shut' : '')}>
              <span>{dayName(d)}</span><strong>{Number(d.slice(8))}</strong>
              <span>{shut ? 'Closed' : (counts[d] ?? 0) + '/' + BOOKING.hours.length}</span>
            </Link>
          );
        })}
      </nav>

      {regular && <p className="adm-banner">Closed: {regular}. Customers can&rsquo;t book this day.</p>}
      {closedBlock && (
        <div className="adm-banner adm-banner--warn">
          <span>Closed by staff{closedBlock.note ? `: ${closedBlock.note}` : ''}. Customers can&rsquo;t book this day.</span>
          {write && <form action={removeBlock}><input type="hidden" name="id" value={closedBlock.id} /><button className="adm-btn adm-btn--ghost">Reopen day</button></form>}
        </div>
      )}
      {closed && bookings.length > 0 && (
        <p className="adm-banner adm-banner--alert">This day is closed but still has {bookings.length} booking{bookings.length > 1 ? 's' : ''}. Call {bookings.length > 1 ? 'those customers' : 'the customer'} to move or cancel.</p>
      )}
      {write && !closed && date >= today && (
        <form action={addBlock} className="adm-inline adm-closeday">
          <input type="hidden" name="date" value={date} />
          <input name="note" placeholder="Reason (optional), e.g. Staff holiday" aria-label="Reason for closing" className="adm-input" maxLength={200} />
          <ConfirmButton message={`Close ${fmtLong(date)} to online bookings?`}>Close this day</ConfirmButton>
        </form>
      )}

      <ol className="adm-slots">
        {BOOKING.hours.map(h => {
          const b = bookings.find(x => x.hour === h), block = dayBlocks.find(x => x.hour === h);
          return (
            <li key={h} id={b ? `b${b.id}` : undefined} className={'adm-slot' + (b ? ' adm-slot--booked' : block ? ' adm-slot--blocked' : '')}>
              <div className="adm-slot__time">{fmtHour(h)}<span>– {fmtHour(h + 1)}</span></div>
              <div className="adm-slot__body">
                {b ? (
                  <>
                    <div className="adm-slot__head">
                      <strong>{serviceById(b.service)?.name ?? b.service}</strong>
                      <span className="done__plate">{b.reg}</span>
                      <span className={'adm-badge' + (b.source === 'phone' ? ' adm-badge--phone' : '')}>{b.source === 'phone' ? 'Phone' : 'Online'}</span>
                    </div>
                    <div className="adm-slot__meta">
                      {b.customerId ? <Link href={`/admin/customers/${b.customerId}`} className="adm-strong">{b.name}</Link> : <span>{b.name}</span>}
                      <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}>{b.phone}</a>
                      {b.email && <a href={`mailto:${b.email}`}>{b.email}</a>}
                      <span>Ref {b.ref}</span>
                      <span>Booked {b.createdAt}</span>
                    </div>
                    {write && <div className="adm-actions">
                      {b.customerId && (
                        <form action={createInvoiceAction}><input type="hidden" name="bookingId" value={b.id} />
                          <button className="adm-btn">Invoice</button></form>
                      )}
                      <details><summary className="adm-btn adm-btn--ghost">Move</summary><MoveForm id={b.id} date={b.date} hour={b.hour} /></details>
                      <form action={cancelBooking}><input type="hidden" name="id" value={b.id} />
                        <ConfirmButton message={`Cancel ${b.name}'s booking (${b.reg}) at ${fmtHour(h)}? The slot will become free online.`}>Cancel booking</ConfirmButton>
                      </form>
                    </div>}
                  </>
                ) : block ? (
                  <div className="adm-actions">
                    <span className="adm-muted">Blocked{block.note ? `: ${block.note}` : ''}</span>
                    {write && <form action={removeBlock}><input type="hidden" name="id" value={block.id} /><button className="adm-btn adm-btn--ghost">Unblock</button></form>}
                  </div>
                ) : closed || date < today || !write ? (
                  <span className="adm-muted">{closed || date < today ? '—' : 'Free'}</span>
                ) : (
                  <div className="adm-actions">
                    <span className="adm-muted">Free</span>
                    <details><summary className="adm-btn">Add phone booking</summary><PhoneBookingForm date={date} hour={h} /></details>
                    <form action={addBlock}>
                      <input type="hidden" name="date" value={date} /><input type="hidden" name="hour" value={h} />
                      <button className="adm-btn adm-btn--ghost">Block slot</button>
                    </form>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <section className="card adm-closures">
        <h2 className="adm-h2">Upcoming closed days</h2>
        <p className="adm-muted" style={{ margin: '6px 0 0' }}>Sundays{BOOKING.openSaturday ? '' : ', Saturdays'}{BOOKING.closedOnBankHolidays ? ' and bank holidays' : ''} are closed automatically.</p>
        {upcomingClosures.length === 0 ? <p className="adm-muted">None.</p> : (
          <ul>
            {upcomingClosures.map(c => (
              <li key={c.id}>
                <Link href={`/admin?date=${c.date}`}>{fmtLong(c.date)}</Link>{c.note && <span className="adm-muted"> · {c.note}</span>}
                {write && <form action={removeBlock}><input type="hidden" name="id" value={c.id} /><button className="adm-btn adm-btn--ghost adm-btn--sm">Reopen</button></form>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
