'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { JobTask } from '@/lib/jobs.ts';
import { keepValues } from '../keep-values.ts';
import { addTaskAction, emailReadyAction, newJobAction, removeTaskAction, saveJobAction, toggleTaskAction, type JobState } from './actions.ts';

function Msg({ state }: { state: JobState }) {
  if (state?.error) return <span className="error-text" role="alert">{state.error}</span>;
  if (state?.ok) return <span className="adm-ok" role="status">{state.ok}</span>;
  return null;
}

export function JobDetailsForm({ job, mechanics, readOnly }: {
  job: { id: number; requested: string; mileageIn: number | null; mechanicId: number | null; notes: string };
  mechanics: { id: number; name: string }[]; readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(saveJobAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-form">
      <input type="hidden" name="id" value={job.id} />
      <fieldset disabled={readOnly} className="adm-fieldset">
        <div className="field field--wide"><label>What the customer asked for</label><textarea name="requested" rows={2} defaultValue={job.requested} /></div>
        <div className="field"><label>Mileage in</label><input name="mileageIn" inputMode="numeric" defaultValue={job.mileageIn ?? ''} placeholder="e.g. 64,210" /></div>
        <div className="field"><label>Mechanic</label>
          <select name="mechanicId" defaultValue={job.mechanicId ?? ''}>
            <option value="">Not assigned</option>
            {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="field field--wide"><label>Workshop notes (staff only, not on the invoice)</label><textarea name="notes" rows={3} defaultValue={job.notes} placeholder="e.g. Keys in drawer 2. Customer waiting." /></div>
      </fieldset>
      {!readOnly && <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Saving…' : 'Save details'}</button>}
      <div style={{ gridColumn: '1 / -1' }}><Msg state={state} /></div>
    </form>
  );
}

export function TaskList({ tasks, readOnly }: { tasks: JobTask[]; readOnly: boolean }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<number, boolean>>({});
  return (
    <ul className="adm-tasks">
      {tasks.map(t => {
        const done = optimistic[t.id] ?? t.done;
        return (
          <li key={t.id} className={done ? 'adm-task--done' : ''}>
            <label className="adm-check adm-task">
              <input type="checkbox" checked={done} disabled={readOnly || pending}
                onChange={e => { const v = e.target.checked; setOptimistic(o => ({ ...o, [t.id]: v })); start(() => toggleTaskAction(t.id, v)); }} />
              <span>{t.description}</span>
            </label>
            {!readOnly && (
              <form action={removeTaskAction} className="no-print"><input type="hidden" name="taskId" value={t.id} />
                <button className="adm-btn adm-btn--ghost adm-btn--sm" aria-label={`Remove ${t.description}`}>✕</button></form>
            )}
          </li>
        );
      })}
      {tasks.length === 0 && <li className="adm-muted">No work listed yet.</li>}
    </ul>
  );
}

export function AddTaskForm({ jobId }: { jobId: number }) {
  const [state, action, pending] = useActionState(addTaskAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} onSubmit={keepValues(action)} className="adm-inline" style={{ marginTop: 10 }}>
      <input type="hidden" name="id" value={jobId} />
      <input name="description" placeholder="Add work, e.g. Replace front brake pads" aria-label="New task" className="adm-input" style={{ flex: '1 1 260px' }} required maxLength={300} />
      <button className="adm-btn adm-btn--ghost" disabled={pending}>Add</button>
      {state?.error && <span className="error-text" role="alert">{state.error}</span>}
    </form>
  );
}

/** Resizes a photo in the browser (longest side 1600px, JPEG) so uploads stay small on a phone connection. */
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not read that photo.'))), 'image/jpeg', 0.8));
}

export function PhotoUploader({ jobId }: { jobId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = [...files];
    for (const [i, f] of list.entries()) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      try {
        const body = new FormData();
        body.append('photo', await shrink(f), 'photo.jpg');
        const res = await fetch(`/admin/jobs/${jobId}/photos`, { method: 'POST', body });
        if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Upload failed.'); break; }
      } catch {
        setError('Couldn’t upload that photo. Try again.'); break;
      }
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="adm-inline" style={{ marginTop: 10 }}>
      <label className="adm-btn adm-btn--ghost" style={{ cursor: 'pointer' }}>
        {busy ?? 'Add photos'}
        <input type="file" accept="image/*" capture="environment" multiple hidden disabled={!!busy} onChange={e => { upload(e.target.files); e.target.value = ''; }} />
      </label>
      {error && <span className="error-text" role="alert">{error}</span>}
    </div>
  );
}

export function EmailReadyButton({ jobId, email }: { jobId: number; email: string }) {
  const [state, action, pending] = useActionState(emailReadyAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-inline">
      <input type="hidden" name="id" value={jobId} />
      <button className="adm-btn adm-btn--ghost" disabled={pending}>{pending ? 'Sending…' : `Email ${email}: ready to collect`}</button>
      <Msg state={state} />
    </form>
  );
}

export function NewJobForm({ customerId, vehicles }: { customerId: number; vehicles: { id: number; reg: string }[] }) {
  const [state, action, pending] = useActionState(newJobAction, undefined);
  return (
    <form onSubmit={keepValues(action)} className="adm-form">
      <input type="hidden" name="customerId" value={customerId} />
      {vehicles.length > 0 && (
        <div className="field"><label>Vehicle</label>
          <select name="vehicleId" defaultValue={vehicles[0].id}>{vehicles.map(v => <option key={v.id} value={v.id}>{v.reg}</option>)}</select>
        </div>
      )}
      <div className="field field--wide"><label>What needs doing</label><input name="requested" required maxLength={500} placeholder="e.g. Knocking noise from front left" /></div>
      <button className="btn-amber adm-btn" disabled={pending}>{pending ? 'Opening…' : 'Open job card'}</button>
      <div style={{ gridColumn: '1 / -1' }}><Msg state={state} /></div>
    </form>
  );
}
