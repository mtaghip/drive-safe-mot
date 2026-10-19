// Shared by the booking form (instant feedback) and the API (the real check).
import { serviceById, type ServiceId } from './site.ts';
import { bookingRange, inRange, isIsoDate, isOpenDay, isSlotHour } from './schedule.ts';

export type BookingInput = {
  service?: unknown; date?: unknown; hour?: unknown;
  name?: unknown; phone?: unknown; email?: unknown; reg?: unknown;
};

export type BookingRequest = {
  service: ServiceId; date: string; hour: number;
  name: string; phone: string; email: string; reg: string;
};

export type FieldErrors = Partial<Record<'service' | 'when' | 'reg' | 'name' | 'phone' | 'email', string>>;

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export const normaliseReg = (v: string) => v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

export function validateBooking(input: BookingInput, now = new Date()):
  { ok: true; value: BookingRequest } | { ok: false; errors: FieldErrors } {
  const e: FieldErrors = {};
  const service = serviceById(str(input.service));
  if (!service) e.service = 'Please choose a service.';

  const date = input.date, hour = input.hour;
  if (!isIsoDate(date) || !isSlotHour(hour)) e.when = 'Please choose a day and time.';
  else if (!inRange(date, bookingRange(now)) || !isOpenDay(date)) e.when = "That day isn't available. Please pick another.";

  const reg = normaliseReg(str(input.reg)), name = str(input.name).trim(), phone = str(input.phone).trim(), email = str(input.email).trim();
  if (reg.replace(/\s/g, '').length < 2 || reg.length > 8) e.reg = 'Enter your registration.';
  if (!name || name.length > 100) e.name = 'Enter your name.';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) e.phone = 'Enter a valid phone number.';
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) e.email = 'Enter a valid email address.';

  if (Object.keys(e).length) return { ok: false, errors: e };
  return { ok: true, value: { service: service!.id, date: date as string, hour: hour as number, name, phone, email, reg } };
}
