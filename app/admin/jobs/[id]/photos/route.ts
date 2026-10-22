import { NextResponse } from 'next/server';
import { audit, requireStaff } from '@/lib/auth.ts';
import { addPhoto, getJob } from '@/lib/jobs.ts';

export const dynamic = 'force-dynamic';

/** Upload one photo to a job (resized in the browser first). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff('write');
  const jobId = Number((await params).id);
  if (!(await getJob(jobId))) return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('photo');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No photo received.' }, { status: 400 });
  const problem = await addPhoto(jobId, file.type, new Uint8Array(await file.arrayBuffer()), me);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  await audit(me, 'Added job photo', 'job', jobId);
  return NextResponse.json({ ok: true });
}
