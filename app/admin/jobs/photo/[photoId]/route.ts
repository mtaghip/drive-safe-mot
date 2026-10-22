import { requireStaff } from '@/lib/auth.ts';
import { getPhoto } from '@/lib/jobs.ts';

export const dynamic = 'force-dynamic';

/** A job photo, for signed-in staff only. */
export async function GET(_: Request, { params }: { params: Promise<{ photoId: string }> }) {
  await requireStaff();
  const photo = await getPhoto(Number((await params).photoId));
  if (!photo) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(photo.data), {
    headers: { 'Content-Type': photo.mime, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
  });
}
