// Job card statuses and the moves allowed between them. Pure and safe for the browser.
export type JobStatus = 'booked' | 'in_progress' | 'waiting_parts' | 'ready' | 'collected' | 'cancelled';

export const STATUSES: { value: JobStatus; label: string; board: string }[] = [
  { value: 'booked', label: 'Booked in', board: 'Booked in' },
  { value: 'in_progress', label: 'In progress', board: 'In progress' },
  { value: 'waiting_parts', label: 'Waiting for parts', board: 'Waiting for parts' },
  { value: 'ready', label: 'Ready to collect', board: 'Ready' },
  { value: 'collected', label: 'Collected', board: 'Collected' },
  { value: 'cancelled', label: 'Cancelled', board: 'Cancelled' },
];
export const statusLabel = (s: string) => STATUSES.find(x => x.value === s)?.label ?? s;
export const isJobStatus = (v: unknown): v is JobStatus => STATUSES.some(s => s.value === v);

/** Where a job can go from each status, most likely first. Collected and cancelled jobs can be reopened. */
const NEXT: Record<JobStatus, JobStatus[]> = {
  booked: ['in_progress', 'cancelled'],
  in_progress: ['ready', 'waiting_parts', 'booked'],
  waiting_parts: ['in_progress', 'ready'],
  ready: ['collected', 'in_progress'],
  collected: ['ready'],
  cancelled: ['booked'],
};
export const nextStatuses = (s: JobStatus) => NEXT[s];
export const canMove = (from: JobStatus, to: JobStatus) => NEXT[from].includes(to);

/** Button wording for a move, so staff see an action rather than a state. */
export function moveLabel(from: JobStatus, to: JobStatus) {
  if (to === 'in_progress') return from === 'booked' ? 'Start work' : from === 'ready' ? 'Back to work' : 'Parts arrived, carry on';
  if (to === 'waiting_parts') return 'Waiting for parts';
  if (to === 'ready') return from === 'collected' ? 'Reopen (not collected)' : 'Ready to collect';
  if (to === 'collected') return 'Collected';
  if (to === 'cancelled') return 'Cancel job';
  if (to === 'booked') return from === 'cancelled' ? 'Reopen job' : 'Back to booked in';
  return statusLabel(to);
}

/** Open jobs are on the workshop board; collected and cancelled ones are finished. */
export const isOpen = (s: JobStatus) => s !== 'collected' && s !== 'cancelled';
