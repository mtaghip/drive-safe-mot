// Google reviews, against a fake Places API.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.PGLITE_DIR = 'memory://';
process.env.GOOGLE_PLACES_API_KEY = 'test-key';
const { db } = await import('./db.ts');
const { googleReviews, quotable } = await import('./google-reviews.ts');

const calls: string[] = [];
let places = [{ id: 'other', formattedAddress: '1 High St, Luton LU1 1AA, UK' }, { id: 'ours', formattedAddress: '21 Taylor St, Luton LU2 0EY, UK' }];
globalThis.fetch = (async (url: string) => {
  calls.push(String(url));
  const body = String(url).includes('searchText') ? { places } : {
    rating: 4.8, userRatingCount: 37, googleMapsUri: 'https://maps.google.com/?cid=1',
    reviews: [
      { rating: 5, text: { text: 'Great service, quick MOT and honest advice.' }, relativePublishTimeDescription: 'a week ago', publishTime: '2026-10-20T10:00:00Z', authorAttribution: { displayName: 'Amy R', uri: 'https://g/amy' } },
      { rating: 2, text: { text: 'Had to wait longer than I expected for my car.' }, authorAttribution: { displayName: 'Bob' } },
      { rating: 5, text: { text: 'Good' }, authorAttribution: { displayName: 'Cat' } },
    ],
  };
  return new Response(JSON.stringify(body), { status: 200 });
}) as typeof fetch;

test('finds the listing at our postcode, then caches it', async () => {
  const r = await googleReviews();
  assert.ok(r);
  assert.equal(r.rating, 4.8);
  assert.equal(r.count, 37);
  assert.match(calls[1], /places\/ours/);
  assert.deepEqual(quotable(r).map(x => x.author), ['Amy R']); // 4+ stars with something written
  await googleReviews();
  assert.equal(calls.length, 2, 'second call is served from the cache');
});

test('never shows a listing at another postcode', async () => {
  await db.query(`DELETE FROM app_settings WHERE key = 'google_reviews'`);
  places = [{ id: 'other', formattedAddress: '1 High St, Luton LU1 1AA, UK' }];
  const orig = console.error; console.error = () => {};
  try { assert.equal(await googleReviews(), null); } finally { console.error = orig; }
});
