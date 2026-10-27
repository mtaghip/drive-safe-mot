// The garage's Google rating and reviews, from the Google Places API.
// Needs GOOGLE_PLACES_API_KEY; without it (or if Google is unreachable) the home
// page just links to the reviews on Google. Fetched at most twice a day and kept
// in app_settings, so page views don't each cost an API call.
import { db } from './db.ts';
import { ADDRESS_ONE_LINE, COMPANY } from './site.ts';

export type GoogleReview = { author: string; authorUrl: string; rating: number; text: string; when: string; publishTime: string };
export type GoogleReviews = { rating: number; count: number; mapsUrl: string; reviews: GoogleReview[]; fetchedAt: number };

const CACHE_KEY = 'google_reviews';
const FRESH_MS = 12 * 3600_000;
/** How long to wait after a failed fetch before trying again. */
const RETRY_MS = 3600_000;
let lastFailure = 0;

type PlaceReview = {
  rating?: number; text?: { text?: string }; originalText?: { text?: string }; relativePublishTimeDescription?: string;
  publishTime?: string; authorAttribution?: { displayName?: string; uri?: string };
};
type Place = { id?: string; rating?: number; userRatingCount?: number; googleMapsUri?: string; reviews?: PlaceReview[]; formattedAddress?: string };

async function places<T>(path: string, key: string, fields: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://places.googleapis.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fields, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google Places responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

/** GOOGLE_PLACE_ID if set, otherwise found by searching for the garage's name and postcode. */
async function placeId(key: string): Promise<string> {
  if (process.env.GOOGLE_PLACE_ID) return process.env.GOOGLE_PLACE_ID;
  const postcode = ADDRESS_ONE_LINE.match(/[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/)?.[0] ?? '';
  const r = await places<{ places?: Place[] }>('places:searchText', key, 'places.id,places.formattedAddress',
    { textQuery: `${COMPANY.tradingName}, ${ADDRESS_ONE_LINE}`, regionCode: 'GB', languageCode: 'en' });
  // Only accept a match at our postcode, so we never show another business's reviews.
  const match = r.places?.find(p => p.formattedAddress?.replace(/\s/g, '').includes(postcode.replace(/\s/g, '')));
  if (!match?.id) throw new Error(`No Google listing found at ${postcode}. Set GOOGLE_PLACE_ID.`);
  return match.id;
}

async function fetchReviews(key: string): Promise<GoogleReviews> {
  const id = await placeId(key);
  const p = await places<Place>(`places/${encodeURIComponent(id)}?languageCode=en`, key, 'rating,userRatingCount,googleMapsUri,reviews');
  return {
    rating: p.rating ?? 0, count: p.userRatingCount ?? 0, mapsUrl: p.googleMapsUri ?? '', fetchedAt: Date.now(),
    reviews: (p.reviews ?? []).map(r => ({
      author: r.authorAttribution?.displayName ?? 'Google user', authorUrl: r.authorAttribution?.uri ?? '',
      rating: r.rating ?? 0, text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
      when: r.relativePublishTimeDescription ?? '', publishTime: r.publishTime ?? '',
    })),
  };
}

/** Rating, count and Google's most relevant reviews (up to five), or null when not available. */
export async function googleReviews(): Promise<GoogleReviews | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  let cached: GoogleReviews | null = null;
  try {
    const { rows } = await db.query<{ value: string }>('SELECT value FROM app_settings WHERE key = $1', [CACHE_KEY]);
    cached = rows[0] ? JSON.parse(rows[0].value) : null;
  } catch (err) {
    console.error('[reviews] could not read the cache', err);
  }
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached;
  if (Date.now() - lastFailure < RETRY_MS) return cached;
  try {
    const fresh = await fetchReviews(key);
    await db.query('INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [CACHE_KEY, JSON.stringify(fresh)]).catch(err => console.error('[reviews] could not save the cache', err));
    return fresh;
  } catch (err) {
    lastFailure = Date.now();
    console.error('[reviews] could not fetch Google reviews', err);
    return cached;
  }
}

/** The reviews worth quoting on the home page: four or five stars, with something written. */
export const quotable = (r: GoogleReviews) => r.reviews.filter(x => x.rating >= 4 && x.text.length >= 20).slice(0, 3);
