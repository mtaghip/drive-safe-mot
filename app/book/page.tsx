import type { Metadata } from 'next';
import BookingForm from '@/components/BookingForm.tsx';
import { serviceById } from '@/lib/site.ts';

export const metadata: Metadata = {
  title: 'Book your MOT',
  description: 'Book a one-hour MOT, DPF, repair, tyre, servicing or tuning slot online at Drive Safe MOT Centre, Luton.',
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  return (
    <>
      <section className="navy book-hero">
        <div className="wrap book-hero__inner">
          <div className="eyebrow">Online booking</div>
          <h1 className="display">Book your slot</h1>
          <p>Choose a one-hour slot between 9am and 5pm, from tomorrow onwards.</p>
        </div>
      </section>
      <BookingForm key={service} initialService={serviceById(service ?? '')?.id ?? 'mot'} />
    </>
  );
}
