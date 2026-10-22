// Storage tests against a real (embedded, in-memory) Postgres.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.PGLITE_DIR = 'memory://';
const { db } = await import('./db.ts');
const { createBooking, store, SlotTakenError } = await import('./store.ts');
const { getCustomer, searchCustomers, deleteCustomer } = await import('./customers.ts');
const inv = await import('./invoices.ts');
const { sendDueReminders, upcomingDue } = await import('./reminders.ts');
const { addDays, todayIso } = await import('./schedule.ts');
const { COMPANY } = await import('./site.ts');

// The next weekday that isn't a bank holiday, for valid bookings.
const { isOpenDay } = await import('./schedule.ts');
let day = addDays(todayIso(), 1);
while (!isOpenDay(day)) day = addDays(day, 1);
const req = (hour: number, extra = {}) => ({ service: 'mot' as const, date: day, hour, name: 'Sarah Miles', phone: '07700 900123', email: 'sarah@example.com', reg: 'AB12 CDE', source: 'online' as const, ...extra });

test('bookings file themselves under one customer and vehicle', async () => {
  await createBooking(req(9));
  await createBooking(req(10, { phone: '07700900123', email: '', reg: 'ab12cde' }));   // same phone, reg typed differently
  await createBooking(req(11, { phone: '01582 000000', email: 'SARAH@example.com', reg: 'XY99 ZZZ' })); // same email, another car
  await createBooking(req(12, { name: 'Dave Price', phone: '07700 111222', email: 'dave@example.com', reg: 'DP01 AAA' }));
  const list = await searchCustomers('');
  assert.equal(list.length, 2);
  const sarah = list.find(c => c.name === 'Sarah Miles')!;
  assert.equal(sarah.regs, 'AB12 CDE, XY99 ZZZ');
  assert.equal((await searchCustomers('ab12')).length, 1, 'search by partial reg');
  assert.equal((await searchCustomers('0770 0111')).length, 1, 'search by phone digits');
  const bookings = await store().dayBookings(day);
  assert.ok(bookings.every(b => b.customerId && b.vehicleId));
});

test('a refused slot leaves no stray customer behind', async () => {
  await assert.rejects(createBooking(req(9, { name: 'Late Larry', phone: '07999 888777', email: 'larry@example.com' })), SlotTakenError);
  assert.equal((await searchCustomers('Larry')).length, 0);
});

test('invoices: draft from booking, issue with gapless numbers, MOT date saved', async () => {
  const b = (await store().dayBookings(day)).find(x => x.hour === 9)!;
  const id = await inv.createDraft({ customerId: b.customerId!, booking: b, staffId: null as unknown as number });
  let draft = (await inv.getInvoice(id))!;
  assert.equal(draft.status, 'draft');
  assert.equal(draft.number, null);
  assert.deepEqual(draft.lines.map(l => [l.kind, l.unitPence]), [['mot', 4500]]);
  assert.equal(draft.billName, 'Sarah Miles');

  const ok = await inv.saveDraft(id, { ...draft, mileage: 64000, nextMotDue: '2027-10-01',
    lines: [...draft.lines, { kind: 'part', description: 'Wiper blade', quantity: 2, unitPence: 1250, vatRate: null }] });
  assert.ok(ok);
  draft = (await inv.getInvoice(id))!;
  assert.equal(draft.totalPence, 7000);

  // A second draft, deleted: must not use up a number.
  const spare = await inv.createDraft({ customerId: b.customerId!, staffId: null as unknown as number });
  await inv.deleteDraft(spare);

  assert.equal(await inv.issueInvoice(id), null);
  const issued = (await inv.getInvoice(id))!;
  assert.equal(issued.status, 'issued');
  assert.equal(issued.number, COMPANY.firstInvoiceNumber);
  assert.equal(await inv.saveDraft(id, { ...issued }), false, 'issued invoices are frozen');
  const cust = (await getCustomer(b.customerId!))!;
  assert.equal(cust.vehicles.find(v => v.id === b.vehicleId)!.motDue, '2027-10-01');

  const second = await inv.createDraft({ customerId: b.customerId!, staffId: null as unknown as number });
  assert.match(String(await inv.issueInvoice(second)), /at least one line/);
  await inv.saveDraft(second, { ...(await inv.getInvoice(second))!, lines: [{ kind: 'labour', description: 'Brake pads', quantity: 1, unitPence: 9000, vatRate: null }] });
  assert.equal(await inv.issueInvoice(second), null);
  assert.equal((await inv.getInvoice(second))!.number, COMPANY.firstInvoiceNumber + 1);

  await inv.markPaid(id, 'card', todayIso());
  assert.equal((await inv.getInvoice(id))!.status, 'paid');
  await inv.voidInvoice(second);
  assert.equal((await inv.getInvoice(second))!.status, 'void');
  assert.equal((await inv.outstanding()).n, 0);
  assert.equal(await deleteCustomer(b.customerId!), false, 'customers with invoices are kept');
});

test('reminders go once, only to opted-in customers with email', async () => {
  const today = todayIso();
  const sarah = (await searchCustomers('Sarah'))[0];
  const dave = (await searchCustomers('Dave'))[0];
  await db.query(`UPDATE vehicles SET mot_due = $1 WHERE customer_id = $2`, [addDays(today, 20), sarah.id]);
  await db.query(`UPDATE vehicles SET mot_due = $1, service_due = $1 WHERE customer_id = $2`, [addDays(today, 5), dave.id]);
  await db.query(`UPDATE customers SET reminders_ok = false WHERE id = $1`, [dave.id]);
  const first = await sendDueReminders(today);
  assert.deepEqual(first.sent.map(s => [s.reg, s.kind]).sort(), [['AB12 CDE', 'mot-30'], ['XY99 ZZZ', 'mot-30']]);
  assert.equal((await sendDueReminders(today)).sent.length, 0, 'no repeats');
  await db.query(`UPDATE customers SET reminders_ok = true WHERE id = $1`, [dave.id]);
  const later = await sendDueReminders(today);
  assert.deepEqual(later.sent.map(s => s.kind).sort(), ['mot-7', 'service-14']);
  const up = await upcomingDue(today, addDays(today, 45));
  assert.equal(up.length, 4);
  assert.ok(up.every(u => u.lastSent === today));
});

test('reports: takings, work, unpaid, sources and reminder conversion', async () => {
  const rep = await import('./reports.ts');
  const today = todayIso(), monthStart = today.slice(0, 8) + '01';
  // From the invoice tests: 1001 paid today (£70.00 by card), 1002 voided.
  const series = await rep.takingsSeries(monthStart, today, 'day');
  assert.equal(series.length, Number(today.slice(8)), 'one row per day, zeros included');
  assert.equal(series.find(r => r.bucket === today)!.pence, 7000);
  assert.equal(series.reduce((s, r) => s + r.pence, 0), 7000, 'void invoice not counted');
  const sum = await rep.takingsSummary(monthStart, today);
  assert.deepEqual(sum.paid, { pence: 7000, n: 1 });
  assert.deepEqual(sum.byMethod, [{ method: 'card', pence: 7000, n: 1 }]);

  const weekly = await rep.takingsSeries(addDays(today, -40), today, 'week');
  assert.ok(weekly.every(r => new Date(r.bucket + 'T00:00:00Z').getUTCDay() === 1), 'weeks start on Monday');

  const range = [addDays(today, -1), addDays(today, 40)] as const;
  const work = await rep.workByService(...range);
  assert.deepEqual(work.booked, [{ service: 'mot', n: 4 }]);
  assert.deepEqual(work.invoiced.map(w => w.kind).sort(), ['mot', 'part']);
  assert.deepEqual(await rep.bookingSources(...range), { online: { source: 'online', kept: 4, cancelled: 0 }, phone: { source: 'phone', kept: 0, cancelled: 0 } });

  // An issued, unpaid invoice shows on the unpaid list.
  const dave = (await searchCustomers('Dave'))[0];
  const id = await inv.createDraft({ customerId: dave.id, staffId: null as unknown as number });
  await inv.saveDraft(id, { ...(await inv.getInvoice(id))!, lines: [{ kind: 'labour', description: 'Clutch', quantity: 1, unitPence: 35000, vatRate: null }] });
  await inv.issueInvoice(id);
  const unpaid = await rep.unpaidInvoices(addDays(today, 10));
  assert.deepEqual(unpaid.map(u => [u.billName, u.days, u.pence]), [['Dave Price', 10, 35000]]);

  // Reminders were sent today to Sarah's two cars and Dave's car (MOT and service).
  let conv = await rep.reminderConversion(today, today);
  assert.equal(conv.reduce((s, r) => s + r.sent, 0), 4);
  // Dave's car had an MOT and a service reminder, then was invoiced: both count.
  assert.deepEqual(conv.filter(r => r.converted).map(r => r.kind).sort(), ['mot-7', 'service-14']);
  // Sarah books XY99 ZZZ after her reminder: that reminder now counts as converted.
  let slot = addDays(today, 3);
  while (!isOpenDay(slot)) slot = addDays(slot, 1);
  await createBooking(req(15, { date: slot, reg: 'XY99 ZZZ' }));
  conv = await rep.reminderConversion(today, today);
  assert.equal(conv.find(r => r.kind === 'mot-30')!.converted, 1);
  assert.equal(conv.reduce((s, r) => s + r.converted, 0), 3);
});
