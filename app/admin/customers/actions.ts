'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit, requireStaff } from '@/lib/auth.ts';
import {
  addVehicle, createCustomer, deleteCustomer, deleteVehicle, getCustomer, getVehicle, setReminders, updateCustomer, updateVehicle,
  validateCustomer, validateVehicle,
} from '@/lib/customers.ts';
import { dvlaLookup, type VehicleFacts } from '@/lib/vehicle-lookup.ts';

export type CustomerState = { error?: string; ok?: boolean } | undefined;
const fields = (f: FormData) => Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v)]));
const num = (f: FormData, k: string) => Number(f.get(k));

export async function createCustomerAction(_: CustomerState, form: FormData): Promise<CustomerState> {
  const me = await requireStaff('write');
  const c = validateCustomer(fields(form));
  if (!c.ok) return { error: c.error };
  const id = await createCustomer(c.value);
  const reg = String(form.get('reg') ?? '').trim();
  if (reg) {
    const v = validateVehicle({ reg });
    if (v.ok) await addVehicle(id, v.value);
  }
  await audit(me, 'Added customer', 'customer', id, c.value.name);
  redirect(`/admin/customers/${id}`);
}

export async function updateCustomerAction(_: CustomerState, form: FormData): Promise<CustomerState> {
  const me = await requireStaff('write');
  const id = num(form, 'id');
  const c = validateCustomer(fields(form));
  if (!c.ok) return { error: c.error };
  await updateCustomer(id, c.value);
  await audit(me, 'Edited customer', 'customer', id, c.value.name);
  revalidatePath(`/admin/customers/${id}`);
  return { ok: true };
}

export async function setRemindersAction(form: FormData) {
  const me = await requireStaff('write');
  const id = num(form, 'id'), ok = form.get('ok') === '1';
  await setReminders(id, ok);
  await audit(me, ok ? 'Turned reminders on' : 'Turned reminders off', 'customer', id);
  revalidatePath(`/admin/customers/${id}`);
}

export async function deleteCustomerAction(form: FormData) {
  const me = await requireStaff('manage');
  const id = num(form, 'id');
  const c = await getCustomer(id);
  if (!(await deleteCustomer(id))) redirect(`/admin/customers/${id}?error=has-invoices`);
  await audit(me, 'Deleted customer', 'customer', id, c?.name ?? '');
  redirect('/admin/customers');
}

export async function saveVehicleAction(_: CustomerState, form: FormData): Promise<CustomerState> {
  const me = await requireStaff('write');
  const customerId = num(form, 'customerId'), vehicleId = num(form, 'vehicleId');
  const v = validateVehicle(fields(form));
  if (!v.ok) return { error: v.error };
  if (vehicleId) {
    const existing = await getVehicle(vehicleId);
    if (!existing || existing.customerId !== customerId) return { error: 'Vehicle not found.' };
    await updateVehicle(vehicleId, v.value);
  } else await addVehicle(customerId, v.value);
  await audit(me, vehicleId ? 'Edited vehicle' : 'Added vehicle', 'customer', customerId, v.value.reg);
  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: true };
}

export async function deleteVehicleAction(form: FormData) {
  const me = await requireStaff('write');
  const v = await getVehicle(num(form, 'vehicleId'));
  if (!v) return;
  await deleteVehicle(v.id);
  await audit(me, 'Removed vehicle', 'customer', v.customerId, v.reg);
  revalidatePath(`/admin/customers/${v.customerId}`);
}

export async function lookupRegAction(reg: string): Promise<{ ok: true; facts: VehicleFacts } | { ok: false; error: string }> {
  await requireStaff('write');
  return dvlaLookup(reg);
}
