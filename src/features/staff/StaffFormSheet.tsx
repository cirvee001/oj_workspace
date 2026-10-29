import { useState } from 'react';
import type { Role } from '@/types/domain';
import { Button, Field, FormGrid, Input, Select, Sheet } from '@/components/ui';
import { TODAY } from '@/lib/dates';
import { ROLE_DEPTS, ROLE_NAMES, addStaff, canPickAnyBranch, canSetSalary, updateStaff } from '@/store/actions/staff';
import { useApp } from '@/store/hooks';
import { isOwner, me, myBranch, staffOf } from '@/store/selectors';
import { closeSheet, openSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'staff-form';
const ROLES = Object.keys(ROLE_NAMES) as Role[];

/** Add someone to staff (no id) or change their record. */
export function StaffFormSheet({ id }: { id?: string }) {
  const s = useApp();
  const existing = id ? staffOf(s, id) : undefined;
  const owner = isOwner(s);
  const salaryOk = canSetSalary(s);
  const anyBranch = canPickAnyBranch(s);
  const self = existing?.id === s.actor;

  const [name, setName] = useState(existing?.name ?? '');
  const [role, setRole] = useState<Role>(existing?.role ?? 'tailor');
  const [branch, setBranch] = useState(existing?.branch ?? myBranch(s));
  const [dept, setDept] = useState(existing?.dept ?? ROLE_DEPTS.tailor);
  const [deptTouched, setDeptTouched] = useState(!!existing);
  const [salary, setSalary] = useState(existing && existing.salary ? String(existing.salary / 100) : '');
  const [hired, setHired] = useState(existing?.hired ?? TODAY);

  if (id && !existing) return null;

  const roleLocked = self || (existing?.role === 'owner' && !owner);
  const roleOptions = ROLES.filter((r) => r !== 'owner' || owner || existing?.role === 'owner');
  const branchOptions = anyBranch ? s.branches : s.branches.filter((b) => b.id === me(s).branch);

  return (
    <Sheet
      title={existing ? 'Edit ' + existing.name : 'Add staff'}
      description={existing ? 'Their role, branch, start date and pay.' : 'They get a badge number and PIN for clocking in.'}
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            {existing ? 'Save changes' : 'Add to staff'}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          const input = { name, role, branch, dept, salaryNaira: salary, hired };
          if (existing) updateStaff(existing.id, input);
          else {
            /* Open the new record, so the person just added is in front of you, not on page 2. */
            const newId = addStaff(input);
            if (newId) openSheet({ type: 'staff', id: newId });
          }
        }}
      >
        <FormGrid>
          <Field label="Full name" full>
            <Input placeholder="Adaeze Okonkwo" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Role" hint={self ? 'You cannot change your own role.' : roleLocked ? 'Only the owner can change this.' : undefined}>
            <Select
              value={role}
              disabled={roleLocked}
              onChange={(e) => {
                const r = e.target.value as Role;
                setRole(r);
                if (!deptTouched) setDept(ROLE_DEPTS[r]);
              }}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {ROLE_NAMES[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Branch" hint={anyBranch ? undefined : 'You manage your own branch only.'}>
            <Select value={branch} disabled={!anyBranch} onChange={(e) => setBranch(e.target.value)}>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department">
            <Input
              placeholder="Production"
              value={dept}
              onChange={(e) => {
                setDept(e.target.value);
                setDeptTouched(true);
              }}
            />
          </Field>
          <Field label="Started">
            <Input type="date" value={hired} onChange={(e) => setHired(e.target.value)} />
          </Field>
          <Field label="Salary a month" full hint={salaryOk ? undefined : 'Finance or the owner sets pay.'}>
            <Input
              prefix="₦"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder={salaryOk ? '0' : 'Set by finance'}
              className="tabular-nums"
              disabled={!salaryOk}
              value={salaryOk ? salary : ''}
              onChange={(e) => setSalary(e.target.value)}
            />
          </Field>
        </FormGrid>
      </form>
    </Sheet>
  );
}
