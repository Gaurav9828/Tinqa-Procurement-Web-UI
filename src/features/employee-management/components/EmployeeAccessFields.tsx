import React from 'react';
import { AlertTriangle, Info, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import type { AccessCatalog } from '../../../config/access';
import {
  EMPLOYEE_ROLE_OPTIONS,
  creationNeedsApproval,
  designationHasApprovalLevel,
  employeeRoleLabel,
  findDesignation,
  isEmployeeRole,
  previewGroups,
} from '../utils/employeeRole';

interface Props {
  catalog: AccessCatalog | null;
  catalogError: string | null;
  onRetryCatalog: () => void;
  designation: string;
  role: string;
  /** The level the record has on the server (edit mode); null when creating. */
  savedRole: string | null;
  savedDesignation: string | null;
  /** The department the record has on the server (edit mode); shown until a designation is picked. */
  savedDepartment?: string | null;
  isEditMode: boolean;
  /** The admin is editing their own record: nothing here can change. */
  isSelfLocked: boolean;
  /** The signed-in admin holds EMPLOYEE_APPROVE: may set levels and assign Super Admin. */
  canApproveEmployees: boolean;
  /** The signed-in admin holds EMPLOYEE_UPDATE (or is creating). */
  canEditDesignation: boolean;
  errors: { designation?: string; role?: string };
  onDesignationChange: (code: string) => void;
  onRoleChange: (role: string) => void;
}

const GroupChip: React.FC<{ label: string; muted?: boolean }> = ({ label, muted }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
      muted
        ? 'bg-black/[0.03] dark:bg-white/[0.04] text-gray-400 border-black/5 dark:border-white/10 line-through'
        : 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400 border-blue-500/20'
    }`}
  >
    {label}
  </span>
);

/**
 * Designation and admin level, with a preview of the access they grant. The backend enforces every rule shown
 * here (no self-changes, Super Admin and level changes need an employee approver); the form only guides.
 */
export const EmployeeAccessFields: React.FC<Props> = ({
  catalog,
  catalogError,
  onRetryCatalog,
  designation,
  role,
  savedRole,
  savedDesignation,
  savedDepartment = null,
  isEditMode,
  isSelfLocked,
  canApproveEmployees,
  canEditDesignation,
  errors,
  onDesignationChange,
  onRoleChange,
}) => {
  const designationEditable = !isSelfLocked && canEditDesignation && !!catalog;
  // Only admin accounts have a level, and only an employee approver sets it
  const isAdminAccount = !isEditMode || isEmployeeRole(savedRole);
  // A designation without approval powers only exists at Level 1, so there is nothing to choose
  const levelLocked = !!designation && !!catalog && !designationHasApprovalLevel(catalog, designation);
  const levelEditable = !isSelfLocked && canApproveEmployees && isAdminAccount && !levelLocked;

  const designationOptions = (catalog?.designations ?? []).map((entry) => {
    const restricted = entry.code === 'SUPER_ADMIN' && !canApproveEmployees && savedDesignation !== 'SUPER_ADMIN';
    return {
      value: entry.code,
      label: restricted ? `${entry.label} (needs an employee approver)` : entry.label,
      disabled: restricted,
    };
  });

  const selected = findDesignation(catalog, designation);
  const { granted, withheld } = previewGroups(catalog, designation, role);
  const accessChanged = isEditMode && (designation !== (savedDesignation ?? '') || role !== (savedRole ?? ''));
  const waitsForApproval = !isEditMode && !!designation && creationNeedsApproval(canApproveEmployees, role, designation);

  return (
    <section aria-label="Access and role" className="md:col-span-3 rounded-2xl border border-black/10 dark:border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-[#0071e3]" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-neutral-300">Access &amp; role</h4>
      </div>

      {catalogError && (
        <div role="alert" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/10 text-red-600 text-xs">
          <span>{catalogError}</span>
          <button type="button" onClick={onRetryCatalog} className="flex items-center gap-1 font-semibold cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {designationEditable ? (
          <CommonSelect
            label="Designation"
            name="designation"
            required={!isEditMode}
            placeholder="Select a designation"
            options={designationOptions}
            value={designation}
            onChange={(e) => onDesignationChange(e.target.value)}
            error={errors.designation}
          />
        ) : (
          <CommonInput
            label="Designation"
            name="designation"
            readOnly
            disabled
            value={selected?.label ?? (catalog ? designation || 'Not assigned' : 'Loading designations…')}
            onChange={() => {}}
            error={errors.designation}
          />
        )}

        {/* Never chosen: the department follows the designation (the backend enforces it) */}
        <CommonInput
          label="Department (from designation)"
          name="department"
          readOnly
          disabled
          value={selected?.department ?? savedDepartment ?? 'Select a designation'}
          onChange={() => {}}
        />

        {levelEditable ? (
          <CommonSelect
            label="Admin level"
            name="role"
            required
            placeholder="Select a level"
            options={EMPLOYEE_ROLE_OPTIONS}
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            error={errors.role}
          />
        ) : (
          <CommonInput
            label="Admin level"
            name="role"
            readOnly
            disabled
            value={employeeRoleLabel(levelLocked && isAdminAccount ? 'ADMIN_L1' : isEditMode ? savedRole : role) ?? 'Not available'}
            onChange={() => {}}
            error={errors.role}
          />
        )}
      </div>

      {selected && <p className="text-xs text-gray-500 dark:text-neutral-400">{selected.description}</p>}

      {levelLocked && isAdminAccount && !isSelfLocked && (
        <p className="text-[11px] text-gray-500 dark:text-neutral-400 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          {selected?.label} has no approval powers, so the admin level is always Level 1.
        </p>
      )}

      {selected && (
        <div className="space-y-2" aria-label="Access preview">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> This account will be able to
          </p>
          <div className="flex flex-wrap gap-1.5">
            {granted.map((group) => (
              <GroupChip key={group.code} label={group.label} />
            ))}
          </div>
          {withheld.length > 0 && (
            <>
              <p className="text-[11px] text-gray-500 dark:text-neutral-400">Level 2 would also allow:</p>
              <div className="flex flex-wrap gap-1.5">
                {withheld.map((group) => (
                  <GroupChip key={group.code} label={group.label} muted />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!isSelfLocked && !canApproveEmployees && (
        <p className="text-[11px] text-gray-500 dark:text-neutral-400 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          {isEditMode
            ? 'Only an administrator who can approve employees can change the admin level or assign Super Admin.'
            : 'New accounts you create are Level 1. An administrator who can approve employees can raise the level later.'}
        </p>
      )}

      {waitsForApproval && (
        <p role="note" className="text-[11px] p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          This account will wait for another administrator to approve it before it can sign in
          {role === 'ADMIN_L2' || designation === 'SUPER_ADMIN' ? ' (Level 2 and Super Admin accounts always need a second person).' : '.'}
        </p>
      )}

      {accessChanged && (
        <p role="note" className="text-[11px] p-2.5 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-blue-400 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          The new access applies at once in procurement screens; storefront actions update after they sign in again.
        </p>
      )}
    </section>
  );
};
