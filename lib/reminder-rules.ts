// When customer reminders go out. Pure, so the timing is tested directly.
export type ReminderRule = { kind: string; field: 'mot_due' | 'service_due'; what: 'MOT' | 'service'; from: number; to: number };

/**
 * Each reminder is sent once per vehicle and due date, on any day in its window
 * (days before the due date, inclusive). The windows don't overlap, so a car
 * added close to its due date gets only the most urgent one.
 */
export const REMINDER_RULES: ReminderRule[] = [
  { kind: 'mot-30', field: 'mot_due', what: 'MOT', from: 30, to: 8 },
  { kind: 'mot-7', field: 'mot_due', what: 'MOT', from: 7, to: 0 },
  { kind: 'service-14', field: 'service_due', what: 'service', from: 14, to: 0 },
];

const DAY = 86_400_000;
export const daysUntil = (due: string, today: string) => Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / DAY);

/** The rule that applies to a due date today, if any. */
export function ruleFor(field: ReminderRule['field'], due: string, today: string): ReminderRule | null {
  const d = daysUntil(due, today);
  return REMINDER_RULES.find(r => r.field === field && d <= r.from && d >= r.to) ?? null;
}

/** The first day a reminder can go out for this due date. */
export function firstReminderDay(field: ReminderRule['field'], due: string): string {
  const from = Math.max(...REMINDER_RULES.filter(r => r.field === field).map(r => r.from));
  return new Date(Date.parse(due + 'T00:00:00Z') - from * DAY).toISOString().slice(0, 10);
}
