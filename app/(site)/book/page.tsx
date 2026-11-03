import type { Metadata } from 'next';
import BookingForm from '@/components/BookingForm.tsx';
import { isIsoDate } from '@/lib/schedule.ts';
import { serviceById, SLOT_RANGE_TEXT } from '@/lib/site.ts';

export const metadata: Metadata = {
  title: 'Book your MOT',
  description: 'Book a one-hour MOT, DPF, repair, tyre, servicing or tuning slot online at Drive Safe MOT Centre, Luton.',
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string; date?: string; hour?: string }> }) {
  const { service, date, hour } = await searchParams;
  return (
    <>
      <section className="navy book-hero">
        <div className="wrap book-hero__inner">
          <div className="eyebrow">Online booking</div>
          <h1 className="display">Book your slot</h1>
          <p>Choose a one-hour slot, {SLOT_RANGE_TEXT}, from tomorrow onwards.</p>
        </div>
      </section>
      <BookingForm key={`${service}-${date}-${hour}`} initialService={serviceById(service ?? '')?.id ?? 'mot'}
        initialDate={isIsoDate(date) ? date : undefined} initialHour={hour && /^\d{1,2}$/.test(hour) ? Number(hour) : undefined} />
    </>
  );
}
