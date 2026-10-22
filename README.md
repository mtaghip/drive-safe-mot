# Drive Safe MOT Centre website

Next.js site for Drive Safe MOT Centre, 21 Taylor St, Luton LU2 0EY, with online booking of one-hour slots.

Pages: `/` home, `/services`, `/book` (`/book?service=dpf` preselects a service), `/contact`, `/privacy`.
Staff area: `/admin`, with personal staff logins and roles: diary, customers and vehicles, invoices, MOT and service reminders, team and activity log. Hidden from search engines.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev                  # http://localhost:3000
npm test                     # schedule + validation unit tests
npm run build && npm start   # production
```

Without `DATABASE_URL`, development uses PGlite, an embedded Postgres that keeps its data in `.data/pglite` (delete the folder to start again); the tests use it in memory. Without `RESEND_API_KEY`, emails are printed to the server log. In production, `DATABASE_URL` is required.

## Environment

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Public address, e.g. `https://www.drivesafemot.co.uk`. Used in the sitemap, robots.txt and share previews, which are generated at build time, so set it before building. On Vercel the production domain is used automatically. |
| `ADMIN_PASSWORD` | Setup password, needed once: at `/admin/login` on a new site it lets you create the owner account. After that everyone signs in with their own email and password, and this setting is no longer used. |
| `DVLA_VES_API_KEY` | Optional. Enables the **Look up** button that fills in a vehicle's make, colour, year and MOT expiry from its registration. Free from [DVLA](https://register-for-ves.driver-vehicle-licensing.api.gov.uk/). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) spam check on the booking form (free). Usually invisible to customers. The site key is baked in at build time. Leave both empty to turn it off. |
| `DATABASE_URL` | Postgres connection string. All tables are created and kept up to date automatically on startup. |
| `RESEND_API_KEY` | [Resend](https://resend.com) key for confirmation emails. |
| `BOOKING_FROM_EMAIL` | Sender, on a domain verified in Resend, e.g. `Drive Safe MOT Centre <bookings@yourdomain>`. |
| `CRON_SECRET` | Enables the 8:30am daily diary email (see below). Any long random string. |
| `GARAGE_EMAIL` | Receives a notification for every new booking (reply goes to the customer). Defaults to the garage's address, drivesafeltd@outlook.com (`EMAIL` in `lib/site.ts`). Customer replies to confirmation emails also go to `EMAIL`. |

Resend can only send **from** a domain you own and have verified, so `BOOKING_FROM_EMAIL` can't be the Outlook address. Use something like `bookings@yourdomain.co.uk`; replies still reach the Outlook inbox.

## How booking works

- Slots are 9:00–17:00 in one-hour blocks, Monday–Friday, from tomorrow for 4 weeks (UK time). Change these in `BOOKING` in `lib/site.ts`. Saturday opening is a single flag there and also updates the opening hours shown on the site.
- England and Wales bank holidays are closed automatically, including substitute days (e.g. Monday 28 Dec 2026 for Boxing Day). They're worked out from the date rules, so there's no list to keep up to date. One-off holidays like a coronation need closing by hand on the staff page.
- One booking per slot. The database enforces it, so two people can't take the same slot; the loser is told and the calendar refreshes.
- The home page's "Next free slot" reads live availability.

## Staff area (`/admin`)

Modelled on the TG Performance admin, rebuilt for a garage.

**Sign-in and roles.** Everyone has their own email and password (hashed with scrypt). On a new site, `/admin/login` asks for the setup password (`ADMIN_PASSWORD`) to create the owner account; the owner adds everyone else on the **Team** page with a temporary password, which they change from **Your account**. Roles:

| Role | Can |
| --- | --- |
| Owner | Everything, including the Team page |
| Manager | Everything except managing staff; can void invoices, delete customers and see Reports |
| Staff | Diary, customers, invoices (create, issue, mark paid, email), reminders |
| Viewer | See everything, change nothing |

Disabling someone or resetting their password signs them out at once. There must always be at least one active owner. Sign-in is limited to 10 attempts per 15 minutes. **Activity** (owner and manager) logs who did what.

**Diary.** Day view of all 8 slots. Add phone bookings, move, cancel, block slots, close days, email a day's schedule. Each booking links to its customer and has an **Invoice** button.

**Customers.** Every online or phone booking is filed under a customer (matched by phone number, then email) and vehicle (by registration), so the list builds itself. Search by name, phone, email or registration. Each customer page shows their vehicles (MOT and service due dates, DVLA lookup), invoices, bookings and reminder setting. Customers with invoices can't be deleted.

**Invoices.** Start one from a booking, a customer or a vehicle. Drafts are freely editable: lines for MOT, labour, parts and other, with live totals. Issuing gives the next number (from 1001, no gaps, since drafts have no number) and freezes it. Then: print or save as PDF (A4), email to the customer, mark paid (method and date), or void (keeps its number). If the MOT passed, enter the new expiry on the invoice (a suggestion follows DVSA's "up to a month early keeps the date" rule) and it's saved to the vehicle when issued.

- **VAT:** set `COMPANY.vatNumber` in `lib/site.ts` if the garage is VAT registered. Invoices then charge VAT per line (20% by default) and show the breakdown. The MOT test fee is always outside the scope of VAT. With no VAT number, invoices show no VAT at all.
- **Company details:** a limited company must show its registered name, number and office on invoices. Fill in `COMPANY` in `lib/site.ts`; staff see a warning on invoices until they're set. Bank details there are printed for bank-transfer payments.

**Workshop and job cards.** Every car in the workshop has a job card: the customer's request, a checklist of work to do, mileage in, the mechanic, staff-only notes, photos and a timeline of who did what. Open one with **Job card** on a diary booking, **Book in** on the Workshop page (today's bookings without a card are listed there), or **Open a job card** on a customer's page for walk-ins. The **Workshop** board has a column per status (booked in, in progress, waiting for parts, ready, collected today), with one-tap buttons to move a car on and filters for "my jobs" and unassigned. Only sensible moves are allowed (a job can't jump from booked to collected), and collecting a car with no invoice, or an unpaid one, asks first. When a car is ready, staff can email the customer. **Create invoice** starts a draft with the booked service at its price, every other task as a line to price, and the mileage. Cancelling a booking cancels its job if work hasn't started. Job sheets print cleanly.

Photos are resized on the phone (longest side 1600px, JPEG) before upload, up to 20 per job, and are kept in the database and only shown to signed-in staff. At roughly 150–300KB each, a busy garage adds a few hundred MB a year; if the database plan gets tight, move them to file storage such as Vercel Blob.

**Reports** (owner and manager). Unpaid invoices right now, oldest first, with how long each has waited. Then, for a chosen period (this month, last month, last 3 months, this year, last 12 months, or custom dates): money taken by day, week or month with the split by payment method; average invoice and total invoiced; jobs booked by service and invoiced amounts by type of work; online versus phone bookings, with cancellations; and how many reminders brought customers back (the same car booked in, not cancelled, or invoiced within 60 days). **Download CSV for the accountant** exports the period's paid invoices (number, dates, method, customer, registration, net, VAT, total).

**Reminders.** Each morning's 8:30 run emails customers about 30 and 7 days before an MOT runs out and 14 days before a service, with a link to book and a link to stop reminders (which asks for a click, so email scanners can't unsubscribe people). Each reminder goes once per vehicle and due date. The Reminders page lists what's due in the next 45 days and what ran out in the last 60, flagging customers with no email or who opted out so staff can call them. The garage's diary email lists the reminders sent that morning.

## Daily diary email (8:30am)

Every morning the garage inbox (`GARAGE_EMAIL`, default drivesafeltd@outlook.com) gets the day's timetable: each hour's booking with service, registration, name, phone and reference, plus blocked and free slots, a warning if the day is closed but still has bookings, and a 7-day summary. Staff can also send any day's schedule on demand with **Email this day's schedule** on the staff page.

It needs `CRON_SECRET` set (any long random string) and something to call `GET /api/cron/daily-schedule` each morning with the header `Authorization: Bearer <CRON_SECRET>`:

- **Vercel:** already configured in `vercel.json`. Vercel sends the header automatically. Its scheduler runs in UTC, so there are two triggers (07:30 and 08:30 UTC); the site only sends between 8:00 and 8:59 UK time, so exactly one of them sends, in summer and winter. On Vercel's free Hobby plan a trigger may run any time within its hour, so the email arrives between 8:00 and 9:00; on Pro it arrives at 8:30.
- **Any other host, or for exactly 8:30 on a free plan:** a free service such as cron-job.org, set to 08:30 Europe/London, calling the URL above with that header.

Each day is only sent once, even if the scheduler retries. If sending fails, the next trigger that morning tries again.

## Spam and abuse protection

- Cloudflare Turnstile, when configured. If Cloudflare can't be reached, bookings are refused rather than let through.
- At most 10 booking attempts per hour from one network address, and at most 3 upcoming online bookings per phone number or email (`BOOKING.maxAttemptsPerHour`, `BOOKING.maxUpcomingPerCustomer`). Phone bookings made by staff aren't limited.
- A hidden honeypot field catches simple bots.
- Network addresses are only stored hashed, and deleted after a day.
- Staff sign-in is limited to 10 attempts per 15 minutes per address.

## Code map

- `lib/site.ts`: business details, services and prices, reviews, booking rules
- `lib/schedule.ts`: UK-time date logic shared by browser and server
- `lib/validation.ts`: booking validation shared by the form and the API
- `lib/db.ts`, `lib/schema.ts`: database access (Postgres or embedded PGlite) and the schema
- `lib/store.ts`: bookings, diary blocks, rate limits
- `lib/auth.ts`, `lib/passwords.ts`, `lib/roles.ts`: staff sign-in, sessions and permissions
- `lib/customers.ts`, `lib/vehicle-lookup.ts`: customers, vehicles, DVLA lookup
- `lib/invoices.ts`, `lib/invoice-calc.ts`, `lib/invoice-document.ts`: invoices, VAT and MOT-date rules, the printed/emailed layout
- `lib/reminders.ts`, `lib/reminder-rules.ts`: customer reminder emails
- `lib/reports.ts`, `lib/report-periods.ts`, `app/admin/reports/`: the Reports page and CSV export
- `lib/jobs.ts`, `lib/job-status.ts`, `app/admin/jobs/`, `app/admin/workshop/`: job cards, statuses and the workshop board
- `lib/security.ts`: Turnstile and network-address hashing
- `app/admin/`: staff pages and their server actions
- `lib/email.ts`: confirmation and garage notification emails
- `app/api/availability`, `app/api/bookings`: booking API
- `components/BookingForm.tsx`: the 4-step booking UI
- `lib/daily-email.ts`, `app/api/cron/daily-schedule`: the 8:30am diary email

## Privacy

`/privacy` is a plain-English privacy notice, linked from the footer and the booking form. **The owner should read it and confirm it's accurate before launch**, in particular the 6-year record retention period and the named providers (update the hosting line once you've chosen a host). It isn't legal advice.

The Google map only loads after the visitor clicks "Show map", since Google sets cookies. The site sets no tracking cookies of its own, so no cookie banner is needed.

## Content still to replace

- The three reviews on the home page are placeholders. Swap in real Google reviews in `REVIEWS` in `lib/site.ts`.
- Tyre change, servicing and tuning show "Call" for price until real prices are added.
- Bank details for invoices (optional, for bank-transfer payments), in `COMPANY` in `lib/site.ts`.

## Design source

`project/` and `chats/` hold the Claude Design handoff this site was built from (`project/Drive Safe MOT Centre.dc.html`).
