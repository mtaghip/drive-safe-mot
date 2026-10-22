// The whole database schema. Applied on startup; every statement is safe to
// re-run, so a fresh database needs no manual setup and an existing one is
// brought up to date.
export const SCHEMA = String.raw`
CREATE TABLE IF NOT EXISTS bookings (
  id          serial PRIMARY KEY,
  ref         text NOT NULL UNIQUE,
  service     text NOT NULL,
  slot_date   date NOT NULL,
  slot_hour   smallint NOT NULL CHECK (slot_hour BETWEEN 0 AND 23),
  name        text NOT NULL,
  phone       text NOT NULL,
  email       text NOT NULL,
  reg         text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'online';

-- One live booking per one-hour slot. Cancelling a booking (setting cancelled_at) frees the slot.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_unique
  ON bookings (slot_date, slot_hour) WHERE cancelled_at IS NULL;

-- Days closed by staff (slot_hour NULL) and single blocked slots.
CREATE TABLE IF NOT EXISTS blocks (
  id         serial PRIMARY KEY,
  slot_date  date NOT NULL,
  slot_hour  smallint CHECK (slot_hour BETWEEN 0 AND 23),
  note       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS blocks_unique ON blocks (slot_date, coalesce(slot_hour, -1));

-- Rolling counters for rate limits (booking attempts, staff logins).
CREATE TABLE IF NOT EXISTS rate_events (
  key text NOT NULL,
  at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_events_key_at ON rate_events (key, at);

-- Days the 8:30am schedule email has gone out.
CREATE TABLE IF NOT EXISTS daily_emails (
  day     date PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Server-generated secrets (the key that signs staff sessions and unsubscribe links).
CREATE TABLE IF NOT EXISTS app_settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- Staff accounts. The first is created with the setup password and is the owner.
CREATE TABLE IF NOT EXISTS staff (
  id              serial PRIMARY KEY,
  email           text NOT NULL,
  name            text NOT NULL,
  role            text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff', 'viewer')),
  password_hash   text NOT NULL,
  -- Bumped on password change or sign-out-everywhere, which ends existing sessions.
  session_version integer NOT NULL DEFAULT 1,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_email_unique ON staff (lower(email));

CREATE TABLE IF NOT EXISTS customers (
  id           serial PRIMARY KEY,
  name         text NOT NULL,
  phone        text NOT NULL DEFAULT '',
  email        text NOT NULL DEFAULT '',
  address      text NOT NULL DEFAULT '',
  notes        text NOT NULL DEFAULT '',
  -- MOT and service reminder emails. Customers can opt out from the link in each one.
  reminders_ok boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customers_phone_digits ON customers (regexp_replace(phone, '\D', '', 'g'));
CREATE INDEX IF NOT EXISTS customers_email_lower ON customers (lower(email));

CREATE TABLE IF NOT EXISTS vehicles (
  id          serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reg         text NOT NULL,
  make        text NOT NULL DEFAULT '',
  model       text NOT NULL DEFAULT '',
  colour      text NOT NULL DEFAULT '',
  year        integer,
  mot_due     date,
  service_due date,
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicles_reg_compact ON vehicles (replace(reg, ' ', ''));
CREATE INDEX IF NOT EXISTS vehicles_customer ON vehicles (customer_id);
CREATE INDEX IF NOT EXISTS vehicles_mot_due ON vehicles (mot_due);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id integer REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_id integer REFERENCES vehicles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS invoices (
  id             serial PRIMARY KEY,
  -- Allocated when issued, so issued invoices are numbered without gaps. Drafts have none.
  number         integer UNIQUE,
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void')),
  customer_id    integer REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id     integer REFERENCES vehicles(id) ON DELETE SET NULL,
  booking_id     integer REFERENCES bookings(id) ON DELETE SET NULL,
  -- Who and what the invoice is for, as printed. Copied from the customer and
  -- vehicle while a draft, then frozen when issued so later edits can't change it.
  bill_name      text NOT NULL DEFAULT '',
  bill_address   text NOT NULL DEFAULT '',
  bill_phone     text NOT NULL DEFAULT '',
  bill_email     text NOT NULL DEFAULT '',
  reg            text NOT NULL DEFAULT '',
  vehicle_desc   text NOT NULL DEFAULT '',
  mileage        integer,
  issue_date     date,
  notes          text NOT NULL DEFAULT '',
  net_pence      integer NOT NULL DEFAULT 0,
  vat_pence      integer NOT NULL DEFAULT 0,
  total_pence    integer NOT NULL DEFAULT 0,
  -- For an MOT pass: the new expiry, saved to the vehicle when the invoice is issued.
  next_mot_due   date,
  paid_at        date,
  payment_method text,
  created_by     integer REFERENCES staff(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_customer ON invoices (customer_id);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          serial PRIMARY KEY,
  invoice_id  integer NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('labour', 'part', 'mot', 'other')),
  description text NOT NULL,
  quantity    numeric(10, 2) NOT NULL DEFAULT 1,
  -- Excluding VAT.
  unit_pence  integer NOT NULL,
  -- Percent. NULL means outside the scope of VAT (the MOT test fee).
  vat_rate    numeric(5, 2)
);
CREATE INDEX IF NOT EXISTS invoice_items_invoice ON invoice_items (invoice_id);

-- Each reminder goes once per vehicle, kind and due date.
CREATE TABLE IF NOT EXISTS reminder_sends (
  id         serial PRIMARY KEY,
  vehicle_id integer NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  kind       text NOT NULL,
  due_date   date NOT NULL,
  sent_to    text NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, kind, due_date)
);

-- Who did what in the staff pages.
CREATE TABLE IF NOT EXISTS audit_log (
  id         serial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  staff_id   integer REFERENCES staff(id) ON DELETE SET NULL,
  staff_name text NOT NULL DEFAULT '',
  action     text NOT NULL,
  entity     text NOT NULL DEFAULT '',
  entity_id  integer,
  detail     text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS audit_log_at ON audit_log (at DESC);
`;
