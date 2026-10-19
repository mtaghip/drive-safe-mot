# Drive Safe MOT Centre website

Next.js site for Drive Safe MOT Centre, 21 Taylor St, Luton LU2 0EY, with online booking of one-hour slots.

Pages: `/` home, `/services`, `/book` (`/book?service=dpf` preselects a service), `/contact`, `/privacy`.
Staff page: `/admin` (password protected, hidden from search engines).

## Running it

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev                  # http://localhost:3000
npm test                     # schedule + validation unit tests
npm run build && npm start   # production
```

Without `DATABASE_URL`, development keeps bookings in memory (lost on restart). Without `RESEND_API_KEY`, emails are printed to the server log. In production, `DATABASE_URL` is required.

## Environment

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Public address, e.g. `https://www.drivesafemot.co.uk`. Used in the sitemap, robots.txt and share previews, which are generated at build time, so set it before building. On Vercel the production domain is used automatically. |
| `ADMIN_PASSWORD` | Password for `/admin`, at least 10 characters. Changing it signs everyone out. Without it, the staff page is switched off. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) spam check on the booking form (free). Usually invisible to customers. The site key is baked in at build time. Leave both empty to turn it off. |
| `DATABASE_URL` | Postgres connection string. The `bookings` table is created automatically on first use. |
| `RESEND_API_KEY` | [Resend](https://resend.com) key for confirmation emails. |
| `BOOKING_FROM_EMAIL` | Sender, on a domain verified in Resend, e.g. `Drive Safe MOT Centre <bookings@yourdomain>`. |
| `GARAGE_EMAIL` | Receives a notification for every new booking (reply goes to the customer). |

## How booking works

- Slots are 9:00–17:00 in one-hour blocks, Monday–Friday, from tomorrow for 4 weeks (UK time). Change these in `BOOKING` in `lib/site.ts`. Saturday opening is a single flag there and also updates the opening hours shown on the site.
- England and Wales bank holidays are closed automatically, including substitute days (e.g. Monday 28 Dec 2026 for Boxing Day). They're worked out from the date rules, so there's no list to keep up to date. One-off holidays like a coronation need closing by hand on the staff page.
- One booking per slot. The database enforces it, so two people can't take the same slot; the loser is told and the calendar refreshes.
- The home page's "Next free slot" reads live availability.

## Staff page (`/admin`)

- Day view of all 8 slots with customer name, phone (tap to call), email, registration and reference.
- **Add phone booking** on any free slot, today or up to a year ahead. Email is optional; if given, the customer gets a confirmation.
- **Move** or **Cancel** a booking. Cancelling frees the slot online straight away. Customers are not emailed about moves or cancellations, so give them a call.
- **Block slot** (e.g. a booking taken another way) and **Close this day** (holidays, training). Closed days show as "Closed" in the customer calendar. Closing a day with bookings on it shows a warning so staff can call those customers.
- A 4-week strip shows how full each day is; search by booking reference jumps to that booking.

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
- `lib/store.ts`: Postgres storage (in-memory fallback for dev)
- `lib/security.ts`, `lib/admin.ts`: Turnstile, rate-limit keys, staff sessions
- `app/admin/`: staff page and its server actions
- `lib/email.ts`: confirmation and garage notification emails
- `app/api/availability`, `app/api/bookings`: booking API
- `components/BookingForm.tsx`: the 4-step booking UI

## Privacy

`/privacy` is a plain-English privacy notice, linked from the footer and the booking form. **The owner should read it and confirm it's accurate before launch**, in particular the 6-year record retention period and the named providers (update the hosting line once you've chosen a host). It isn't legal advice.

The Google map only loads after the visitor clicks "Show map", since Google sets cookies. The site sets no tracking cookies of its own, so no cookie banner is needed.

## Content still to replace

- The three reviews on the home page are placeholders. Swap in real Google reviews in `REVIEWS` in `lib/site.ts`.
- Tyre change, servicing and tuning show "Call" for price until real prices are added.

## Design source

`project/` and `chats/` hold the Claude Design handoff this site was built from (`project/Drive Safe MOT Centre.dc.html`).
