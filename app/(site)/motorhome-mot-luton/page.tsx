import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqList, FinalCta, FindUs, Hero, PageLd, PriceCard, Reasons, Section, SplitList, type Faq } from '@/components/Landing.tsx';
import { nextSlotLabel } from '@/lib/next-slot.ts';
import { ADDRESS_ONE_LINE, PHONE_DISPLAY, PHONE_HREF } from '@/lib/site.ts';

export const dynamic = 'force-dynamic';

const PATH = '/motorhome-mot-luton';
const BOOK = '/book?service=mot';

export const metadata: Metadata = {
  title: { absolute: 'Motorhome and Campervan MOT in Luton | Drive Safe MOT' },
  description: `MOTs for motorhomes and campervans in Luton, as well as cars and small vans. Call us with your vehicle’s weight and height to check it fits our test bay. ${ADDRESS_ONE_LINE}.`,
  alternates: { canonical: PATH },
};

const BEFORE = [
  { check: 'Check the weight', why: 'Motorhomes are tested as class 4, like cars, but larger, heavier ones need a test bay and brake-testing equipment that can take them. The weight is on the plate inside the door or under the bonnet: tell us when you call.' },
  { check: 'Check the height', why: 'High-top and coachbuilt motorhomes need room in the test bay. Call us with the height before you book.' },
  { check: 'Lights and indicators', why: 'Including the extra marker lights many motorhomes have.' },
  { check: 'Tyres', why: 'Motorhome tyres often run out of age before they run out of tread. Check for cracking on the sidewalls.' },
  { check: 'Seatbelts', why: 'All fitted seatbelts are checked, including those in the living area.' },
  { check: 'Gas and habitation', why: 'The MOT doesn’t test the habitation side, such as gas and electrics in the living area. Those need a separate habitation check.' },
];

const WHY = [
  { title: 'Local to Luton', text: 'On Taylor Street, easy to reach from across Luton, Dunstable and Houghton Regis.' },
  { title: 'Explained in plain English', text: 'We talk you through the result and any advisories before you leave.' },
  { title: 'Repairs quoted first', text: 'If something fails, you get a price before any work starts.' },
  { title: 'Open Saturdays', text: 'Get it tested at the weekend, before your next trip.' },
];

const FAQS: Faq[] = [
  { q: 'Can you MOT my motorhome or campervan?', a: 'We test motorhomes and campervans as well as cars and small vans. Because motorhomes vary so much in size, please call us with your vehicle’s weight and height before booking so we can confirm it fits our test bay.' },
  { q: 'What class of MOT does a motorhome need?', a: 'Motorhomes and campervans (“motor caravans”) are tested as class 4, the same class as cars. Larger and heavier motorhomes need a test centre whose bay and brake-testing equipment can take them, which is why we ask for the weight and height before you book.' },
  { q: 'Does the MOT check the gas and electrics in the living area?', a: 'No. The MOT covers the vehicle itself: brakes, lights, steering, tyres, emissions and so on. Gas, water and electrics in the habitation area need a separate habitation check.' },
  { q: 'How long does a motorhome MOT take?', a: 'Usually around an hour, depending on the vehicle. You’re welcome to wait.' },
];

export default async function MotorhomeMotLutonPage() {
  const nextSlot = await nextSlotLabel();
  return (
    <>
      <Hero eyebrow="Motorhome MOTs · Taylor Street, Luton" title="Motorhome and campervan MOT"
        lede="We test motorhomes and campervans as well as cars and small vans. Call us with your vehicle’s weight and height first, so we can make sure it fits our test bay."
        primary={{ href: PHONE_HREF, label: `Call ${PHONE_DISPLAY}` }} secondary={{ href: BOOK, label: 'Book online' }}
        card={<PriceCard label="Motorhome MOT" note="Call to check size" price="Call" nextLabel="Next free slot" nextValue={nextSlot} />} />
      <SplitList title="Before you book" intro="A few things to check, so the test goes smoothly:" items={BEFORE} />
      <Section title="Why book with us" tone="white"><Reasons items={WHY} /></Section>
      <Section title="Motorhome MOT questions" tone="sand">
        <FaqList faqs={FAQS} />
        <p className="lp-lede" style={{ fontSize: 16 }}>Getting ready? Use our <Link href="/how-to-prepare-for-your-mot">pre-MOT checklist</Link>.</p>
      </Section>
      <FindUs />
      <FinalCta title="Book your motorhome MOT" line="Call us first with your vehicle’s weight and height" primary={{ href: PHONE_HREF, label: `Call ${PHONE_DISPLAY}` }} secondary={{ href: BOOK, label: 'Book online' }} />
      <PageLd path={PATH} faqs={FAQS} service={{ type: 'MOT test', name: 'Motorhome and campervan MOT in Luton' }} />
    </>
  );
}
