// The invoice as one self-contained HTML block, used for the printed A4 page and the
// emailed copy alike, so the two never differ. Tables and inline styles only:
// that's what survives Gmail and Outlook, and it prints the same.
import { gbp, lineNet, lineVat, totals } from './invoice-calc.ts';
import { invoiceLabel, paymentLabel, type Invoice } from './invoices.ts';
import { ADDRESS_ONE_LINE, COMPANY, EMAIL, PHONE_DISPLAY, VAT_REGISTERED } from './site.ts';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const ukDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''));
const rateLabel = (r: number | null) => (r == null ? 'Outside scope' : `${qty(r)}%`);

const NAVY = '#0f2340', AMBER = '#f4b324', INK = '#0e1a2c', MUTE = '#586377', LINE = '#e6e1d6';
const FONT = 'Arial,Helvetica,sans-serif';

export function renderInvoiceHtml(inv: Invoice): string {
  const t = totals(inv.lines);
  const showVat = VAT_REGISTERED;
  const title = inv.status === 'draft' ? 'DRAFT INVOICE' : 'INVOICE';
  const stamp = inv.status === 'paid' ? { text: 'PAID', color: '#1f7a4d' }
    : inv.status === 'void' ? { text: 'VOID', color: '#b4321f' }
    : inv.status === 'draft' ? { text: 'DRAFT', color: MUTE } : null;
  const th = `padding:8px 10px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUTE};border-bottom:2px solid ${NAVY};text-align:left;`;
  const td = `padding:9px 10px;font-size:14px;border-bottom:1px solid ${LINE};vertical-align:top;`;
  const right = 'text-align:right;white-space:nowrap;';
  const label = (s: string) => `<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${MUTE};margin-bottom:6px;">${s}</div>`;

  const rows = inv.lines.map(l => `<tr>
    <td style="${td}">${esc(l.description)}</td>
    <td style="${td}${right}">${qty(l.quantity)}</td>
    <td style="${td}${right}">${gbp(l.unitPence)}</td>
    ${showVat ? `<td style="${td}${right}color:${MUTE};">${rateLabel(l.vatRate)}</td>` : ''}
    <td style="${td}${right}">${gbp(lineNet(l))}</td>
  </tr>`).join('');

  const sumRow = (k: string, v: string, strong = false) => `<tr><td style="padding:5px 10px;font-size:${strong ? 17 : 14}px;${strong ? `font-weight:800;border-top:2px solid ${NAVY};` : `color:${MUTE};`}">${k}</td>
    <td style="padding:5px 10px;${right}font-size:${strong ? 17 : 14}px;${strong ? `font-weight:800;border-top:2px solid ${NAVY};` : ''}">${v}</td></tr>`;
  const vatRows = showVat
    ? t.byRate.filter(r => r.rate != null).map(r => sumRow(`VAT at ${qty(r.rate!)}% on ${gbp(r.net)}`, gbp(r.vat))).join('')
      + (t.byRate.some(r => r.rate == null) ? sumRow('Outside the scope of VAT', gbp(t.byRate.find(r => r.rate == null)!.net)) : '')
    : '';

  const legal = [COMPANY.legalName && `${esc(COMPANY.legalName)}${COMPANY.legalName !== COMPANY.tradingName ? ` trading as ${esc(COMPANY.tradingName)}` : ''}`,
    COMPANY.companyNumber && `Company no. ${esc(COMPANY.companyNumber)}`,
    COMPANY.registeredOffice && `Registered office: ${esc(COMPANY.registeredOffice)}`,
    COMPANY.vatNumber && `VAT no. ${esc(COMPANY.vatNumber)}`].filter(Boolean).join(' · ');
  const bank = COMPANY.bank.accountNumber
    ? `<div style="margin-top:8px;">Bank transfer: ${esc(COMPANY.bank.accountName)} · Sort code ${esc(COMPANY.bank.sortCode)} · Account ${esc(COMPANY.bank.accountNumber)} · Reference ${inv.number ?? ''}</div>` : '';

  return `<div style="font-family:${FONT};color:${INK};background:#fff;max-width:760px;margin:0 auto;padding:36px 40px;box-sizing:border-box;">
  <table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
    <td style="vertical-align:top;">
      <div style="display:inline-block;background:${AMBER};color:${NAVY};font-weight:900;font-size:20px;line-height:1;padding:9px 11px;border-radius:7px;">✓</div>
      <div style="font-size:22px;font-weight:900;letter-spacing:.02em;text-transform:uppercase;margin-top:10px;color:${NAVY};">${esc(COMPANY.tradingName)}</div>
      <div style="font-size:13px;color:${MUTE};line-height:1.6;margin-top:4px;">${esc(ADDRESS_ONE_LINE)}<br>${esc(PHONE_DISPLAY)} · ${esc(EMAIL)}</div>
    </td>
    <td style="vertical-align:top;text-align:right;">
      <div style="font-size:26px;font-weight:900;letter-spacing:.06em;color:${NAVY};">${title}</div>
      <table role="presentation" style="margin:10px 0 0 auto;border-collapse:collapse;font-size:14px;">
        <tr><td style="color:${MUTE};padding:2px 10px 2px 0;">Number</td><td style="font-weight:700;text-align:right;">${inv.number ?? '—'}</td></tr>
        <tr><td style="color:${MUTE};padding:2px 10px 2px 0;">Date</td><td style="font-weight:700;text-align:right;">${ukDate(inv.issueDate) || '—'}</td></tr>
        ${inv.paidAt ? `<tr><td style="color:${MUTE};padding:2px 10px 2px 0;">Paid</td><td style="font-weight:700;text-align:right;">${ukDate(inv.paidAt)}${inv.paymentMethod ? ` · ${esc(paymentLabel(inv.paymentMethod))}` : ''}</td></tr>` : ''}
      </table>
      ${stamp ? `<div style="display:inline-block;margin-top:10px;border:3px solid ${stamp.color};color:${stamp.color};font-weight:900;font-size:18px;letter-spacing:.2em;padding:4px 12px;border-radius:6px;transform:rotate(-4deg);">${stamp.text}</div>` : ''}
    </td>
  </tr></table>

  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:28px;"><tr>
    <td style="vertical-align:top;width:50%;padding-right:16px;">
      ${label('Bill to')}
      <div style="font-size:15px;font-weight:700;">${esc(inv.billName)}</div>
      <div style="font-size:14px;line-height:1.5;color:${INK};white-space:pre-line;">${esc(inv.billAddress)}</div>
      <div style="font-size:14px;color:${MUTE};margin-top:4px;">${[inv.billPhone, inv.billEmail].filter(Boolean).map(esc).join(' · ')}</div>
    </td>
    <td style="vertical-align:top;width:50%;">
      ${inv.reg || inv.vehicleDesc ? `${label('Vehicle')}
      ${inv.reg ? `<span style="display:inline-block;background:#f7d117;border:1.5px solid #111;border-radius:4px;padding:3px 10px;font-weight:800;letter-spacing:.06em;font-size:16px;">${esc(inv.reg)}</span>` : ''}
      <div style="font-size:14px;margin-top:6px;">${esc(inv.vehicleDesc)}</div>
      ${inv.mileage != null ? `<div style="font-size:14px;color:${MUTE};">Mileage: ${inv.mileage.toLocaleString('en-GB')}</div>` : ''}
      ${inv.nextMotDue ? `<div style="font-size:14px;color:${MUTE};">Next MOT due: ${ukDate(inv.nextMotDue)}</div>` : ''}` : ''}
    </td>
  </tr></table>

  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:26px;">
    <tr><th style="${th}">Description</th><th style="${th}${right}">Qty</th><th style="${th}${right}">Unit price</th>${showVat ? `<th style="${th}${right}">VAT</th>` : ''}<th style="${th}${right}">Amount</th></tr>
    ${rows || `<tr><td colspan="5" style="${td}color:${MUTE};">No lines yet.</td></tr>`}
  </table>

  <table role="presentation" style="margin:14px 0 0 auto;border-collapse:collapse;min-width:300px;">
    ${showVat ? sumRow('Subtotal (excl. VAT)', gbp(t.net)) + vatRows : ''}
    ${sumRow(showVat ? 'Total (incl. VAT)' : 'Total', gbp(t.total), true)}
  </table>

  ${inv.notes ? `<div style="margin-top:22px;">${label('Notes')}<div style="font-size:14px;line-height:1.5;white-space:pre-line;">${esc(inv.notes)}</div></div>` : ''}

  <div style="margin-top:28px;padding-top:14px;border-top:1px solid ${LINE};font-size:12px;color:${MUTE};line-height:1.6;">
    <div>${esc(COMPANY.paymentTerms)} Thank you for your business.</div>${bank}
    ${legal ? `<div style="margin-top:8px;">${legal}</div>` : ''}
  </div>
</div>`;
}

export function renderInvoiceText(inv: Invoice): string {
  const t = totals(inv.lines);
  const lines = [
    `${COMPANY.tradingName} · ${invoiceLabel(inv)}${inv.issueDate ? ` · ${ukDate(inv.issueDate)}` : ''}`,
    '', `Bill to: ${inv.billName}`, inv.reg ? `Vehicle: ${inv.reg} ${inv.vehicleDesc}`.trim() : '', '',
    ...inv.lines.map(l => `${l.description} × ${qty(l.quantity)}  ${gbp(lineNet(l))}${VAT_REGISTERED && l.vatRate != null ? ` + VAT ${rateLabel(l.vatRate)}` : ''}`),
    '',
    ...(VAT_REGISTERED ? [`Subtotal: ${gbp(t.net)}`, `VAT: ${gbp(t.vat)}`] : []),
    `Total: ${gbp(t.total)}`,
    inv.status === 'paid' ? `Paid ${ukDate(inv.paidAt)}, thank you.` : COMPANY.paymentTerms,
    '', `${ADDRESS_ONE_LINE} · ${PHONE_DISPLAY} · ${EMAIL}`,
  ];
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

/** What's missing from the company details printed on invoices, for a warning on the staff pages. */
export function companyDetailsMissing(): string[] {
  const missing = [];
  if (!COMPANY.legalName) missing.push('registered company name');
  if (!COMPANY.companyNumber) missing.push('company number');
  if (!COMPANY.registeredOffice) missing.push('registered office');
  return missing;
}
