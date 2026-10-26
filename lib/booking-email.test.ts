import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarLinks, customerConfirmation, firstName, garageNotice } from './booking-email.ts';
import type { Booking } from './store.ts';

const b: Booking = { ref: 'DS-HHCTJ', service: 'mot', date: '2026-10-29', hour: 10, name: 'mohammad TAGHI', phone: '07700 900123', email: 'm@example.com', reg: 'eo59ssk' };

test('first name is capitalised', () => {
  assert.equal(firstName('mohammad taghi'), 'Mohammad');
  assert.equal(firstName('  '), 'there');
});

test('customer confirmation has the details, plate spaced, and company footer', () => {
  const m = customerConfirmation(b);
  assert.equal(m.subject, 'Booking confirmed: MOT test, Thursday 29 October at 10:00 (DS-HHCTJ)');
  assert.match(m.text, /^Hi Mohammad,/);
  assert.match(m.text, /Vehicle: {4}EO59 SSK/);
  assert.match(m.text, /Time: {7}10:00 – 11:00/);
  assert.match(m.text, /£45, fixed price/);
  assert.match(m.text, /company no\. 15967320/);
  assert.match(m.html, /EO59 SSK/);
  assert.match(m.html, /Get directions/);
  assert.doesNotMatch(m.html, /TAGHI/);
});

test('names are escaped in the HTML', () => {
  const m = garageNotice({ ...b, name: '<b>x</b>' });
  assert.match(m.html, /&lt;b&gt;x&lt;\/b&gt;/);
});

test('calendar event is in London time', () => {
  const { ics, google } = calendarLinks(b);
  assert.match(ics, /DTSTART;TZID=Europe\/London:20261029T100000/);
  assert.match(ics, /DTEND;TZID=Europe\/London:20261029T110000/);
  assert.match(google, /dates=20261029T100000%2F20261029T110000/);
  assert.match(google, /ctz=Europe%2FLondon/);
});
