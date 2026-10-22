import { requireStaff } from '@/lib/auth.ts';
import { NewCustomerForm } from '../Forms.tsx';

export default async function NewCustomerPage() {
  await requireStaff('write');
  return (
    <div className="wrap page-body adm-page">
      <h1 className="adm-h1">New customer</h1>
      <div className="card"><NewCustomerForm /></div>
    </div>
  );
}
