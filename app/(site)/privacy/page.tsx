import type { Metadata } from 'next';
import { ADDRESS_ONE_LINE, EMAIL, PHONE_DISPLAY, PHONE_HREF } from '@/lib/site.ts';

export const metadata: Metadata = {
  title: 'Privacy notice',
  description: 'How Drive Safe MOT Centre uses the details you give us when you book.',
};

// Reviewed date shown on the page. Update it whenever this notice changes.
const UPDATED = '19 October 2026';

export default function PrivacyPage() {
  return (
    <>
      <section className="navy contact-hero">
        <div className="wrap contact-hero__inner">
          <div className="eyebrow">Privacy</div>
          <h1 className="display">Privacy notice</h1>
        </div>
      </section>
      <section className="wrap page-body">
        <article className="card prose">
          <p className="prose__updated">Last updated {UPDATED}</p>

          <h2>Who we are</h2>
          <p>Drive Safe MOT Centre, {ADDRESS_ONE_LINE}, is responsible for the personal information you give us through this website. If you have any questions, call us on <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>, email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or ask at the counter.</p>

          <h2>What we collect</h2>
          <p>When you book online we collect your name, phone number, email address, your vehicle registration, the service you chose and the time of your booking.</p>
          <p>When we work on your vehicle we keep a customer record: your contact details and address, your vehicle&rsquo;s details (make, model, colour, year, mileage, and when its MOT and service are due), and the invoices for work we&rsquo;ve done. We may look up your vehicle&rsquo;s make, colour and MOT date from the DVLA using its registration.</p>
          <p>To protect the booking system from abuse we also keep a scrambled (hashed) version of your internet address for up to a day. We can&rsquo;t turn it back into your address.</p>

          <h2>Why we use it</h2>
          <ul>
            <li>To hold your slot, carry out the work you booked and contact you about it, for example if we need to move your appointment.</li>
            <li>To send you a booking confirmation by email.</li>
            <li>To keep the records a garage needs for the work it carries out, including invoices.</li>
            <li>To email you a reminder before your MOT runs out or your service is due.</li>
          </ul>
          <p>We use your details to book and carry out work on your vehicle (UK GDPR Article 6(1)(b), performance of a contract) and to keep the records the law requires (Article 6(1)(c)).
            MOT and service reminders are sent in our legitimate interest in helping you keep your vehicle legal and safe (Article 6(1)(f)); every reminder has a link to stop them, or just tell us.
            We don&rsquo;t send any other marketing, and we never sell your details.</p>

          <h2>Who we share it with</h2>
          <p>Only the companies that run this website for us, who may only use your details to provide that service:</p>
          <ul>
            <li>Our website and database hosting provider, which stores your booking.</li>
            <li>Resend, which sends our booking emails.</li>
            <li>Cloudflare, whose Turnstile check helps stop automated spam bookings.</li>
          </ul>
          <p>Some of these providers may process data outside the UK. Where they do, they use safeguards recognised under UK data protection law.</p>

          <h2>Maps and cookies</h2>
          <p>This website doesn&rsquo;t use advertising or tracking cookies. The map on our Home and Contact pages is provided by Google and only loads if you choose &ldquo;Show map&rdquo;. Google may then set cookies under its own <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">privacy policy</a>. We remember that you chose to show the map in your browser&rsquo;s storage on your device.</p>

          <h2>How long we keep it</h2>
          <p>We keep booking records for up to 6 years after your appointment, to meet our legal and accounting obligations and to deal with any questions about work we&rsquo;ve done.</p>

          <h2>Your rights</h2>
          <p>You can ask us for a copy of the information we hold about you, and ask us to correct it, delete it or stop using it. Contact us using the details above and we&rsquo;ll respond within one month.</p>
          <p>If you&rsquo;re unhappy with how we&rsquo;ve handled your information, you can complain to the Information Commissioner&rsquo;s Office at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">ico.org.uk</a> or on 0303 123 1113.</p>
        </article>
      </section>
    </>
  );
}
