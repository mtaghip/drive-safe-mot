// Staff roles and what each can do. Shared by the server (enforcement) and the
// pages (which buttons to show). Owner can do everything.

export const ROLES = [
  { value: 'owner', label: 'Owner', desc: 'Everything, including managing staff' },
  { value: 'manager', label: 'Manager', desc: 'Everything except managing staff' },
  { value: 'staff', label: 'Staff', desc: 'Diary, customers, invoices and reminders' },
  { value: 'viewer', label: 'Viewer', desc: 'Can look at everything, change nothing' },
] as const;
export type Role = (typeof ROLES)[number]['value'];

const CAPS = {
  /** Add, edit, block and cancel bookings; edit customers; create and issue invoices. */
  write: ['manager', 'staff'],
  /** Void issued invoices and delete customers. */
  manage: ['manager'],
  /** Activity log. */
  viewActivity: ['manager'],
  /** Reports: takings, unpaid invoices, bookings and reminders. */
  viewReports: ['manager'],
  /** Team page: add staff, change roles, reset passwords. */
  manageStaff: [],
} satisfies Record<string, Role[]>;
export type Cap = keyof typeof CAPS;

export const can = (role: Role, cap: Cap) => role === 'owner' || (CAPS[cap] as Role[]).includes(role);
export const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label ?? role;
export const isRole = (v: unknown): v is Role => ROLES.some(r => r.value === v);
