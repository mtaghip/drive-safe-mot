# Drive Safe MOT Centre website

Next.js site for Drive Safe MOT Centre, 21 Taylor St, Luton LU2 0EY, with online booking of one-hour slots.

Pages: `/` home, `/services`, `/book` (`/book?service=dpf` preselects a service), `/contact`.

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
| `DATABASE_URL` | Postgres connection string. The `bookings` table is created automatically on first use. |
| `RESEND_API_KEY` | [Resend](https://resend.com) key for confirmation emails. |
| `BOOKING_FROM_EMAIL` | Sender, on a domain verified in Resend, e.g. `Drive Safe MOT Centre <bookings@yourdomain>`. |
| `GARAGE_EMAIL` | Receives a notification for every new booking (reply goes to the customer). |

## How booking works

- Slots are 9:00–17:00 in one-hour blocks, Monday–Friday, from tomorrow for 4 weeks (UK time). Change these in `BOOKING` in `lib/site.ts`. Saturday opening is a single flag there and also updates the opening hours shown on the site.
- One booking per slot. The database enforces it with a unique index, so two people can't take the same slot; the loser is told and the calendar refreshes.
- To cancel a booking and free its slot: `UPDATE bookings SET cancelled_at = now() WHERE ref = 'DS-XXXXX';`
- The home page's "Next free slot" reads live availability.

## Code map

- `lib/site.ts`: business details, services and prices, reviews, booking rules
- `lib/schedule.ts`: UK-time date logic shared by browser and server
- `lib/validation.ts`: booking validation shared by the form and the API
- `lib/store.ts`: Postgres storage (in-memory fallback for dev)
- `lib/email.ts`: confirmation and garage notification emails
- `app/api/availability`, `app/api/bookings`: booking API
- `components/BookingForm.tsx`: the 4-step booking UI

## Content still to replace

- The three reviews on the home page are placeholders. Swap in real Google reviews in `REVIEWS` in `lib/site.ts`.
- Tyre change, servicing and tuning show "Call" for price until real prices are added.

## Design source

`project/` and `chats/` hold the Claude Design handoff this site was built from (`project/Drive Safe MOT Centre.dc.html`).
