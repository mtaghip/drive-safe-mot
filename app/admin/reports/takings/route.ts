import { requireStaff } from '@/lib/auth.ts';
import { resolvePeriod } from '@/lib/report-periods.ts';
import { paidInvoicesForExport } from '@/lib/reports.ts';
import { todayIso } from '@/lib/schedule.ts';

export const dynamic = 'force-dynamic';

// Spreadsheet-safe cell: quoted, and a leading = + - @ neutralised so a name can't run as a formula.
const cell = (v: string | number) => {
  const s = String(v);
  return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};
const pounds = (p: number) => (p / 100).toFixed(2);

/** Paid invoices in the chosen period, for the accountant. */
export async function GET(req: Request) {
  await requireStaff('viewReports');
  const q = Object.fromEntries(new URL(req.url).searchParams);
  const p = resolvePeriod(q, todayIso());
  const rows = await paidInvoicesForExport(p.from, p.to);
  const lines = [
    ['Invoice', 'Issued', 'Paid', 'Method', 'Customer', 'Registration', 'Net', 'VAT', 'Total'].map(cell).join(','),
    ...rows.map(r => [r.number, r.issueDate, r.paidAt, r.method, r.name, r.reg, pounds(r.net), pounds(r.vat), pounds(r.total)].map(cell).join(',')),
  ];
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="drive-safe-takings-${p.from}-to-${p.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
