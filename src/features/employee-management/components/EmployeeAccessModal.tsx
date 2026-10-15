import React, { useState } from 'react';
import { KeyRound, Save, X } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useAccess } from '../../../hooks/useAccess';
import { useAccessCatalog } from '../../../hooks/useAccessCatalog';
import type { EmployeeResponse, UpdateEmployeeRequest } from '../types/employee.types';
import type { EmployeeSaveResult } from '../hooks/useEmployeeActions';
import { EmployeeAccessFields } from './EmployeeAccessFields';
import { designationHasApprovalLevel, employeeRoleLabel, findDesignation, isEmployeeRole } from '../utils/employeeRole';

interface Props {
  employee: EmployeeResponse | null;
  /** The employee is the signed-in admin: everything is read-only. */
  isSelf: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (id: number, payload: UpdateEmployeeRequest) => Promise<EmployeeSaveResult>;
}

/** Change one employee's designation and admin level, with a preview of the access that results. */
export const EmployeeAccessModal: React.FC<Props> = ({ employee, ...rest }) =>
  // Keyed by employee so each opening starts from that employee's saved values
  employee ? <AccessEditor key={employee.id} employee={employee} {...rest} /> : null;

const AccessEditor: React.FC<Props & { employee: EmployeeResponse }> = ({ employee, isSelf, isSubmitting, onClose, onSave }) => {
  const { can } = useAccess();
  const { catalog, error: catalogError, retry } = useAccessCatalog();
  const [designation, setDesignation] = useState(employee.designation ?? '');
  const [role, setRole] = useState(employee.role ?? '');
  const [errors, setErrors] = useState<{ designation?: string; role?: string }>({});
  const [confirming, setConfirming] = useState(false);

  const canApproveEmployees = can('EMPLOYEE_APPROVE');
  const payload: UpdateEmployeeRequest = {};
  if (designation && designation !== employee.designation) payload.designation = designation;
  if (canApproveEmployees && isEmployeeRole(role) && role !== employee.role) payload.role = role;
  const hasChanges = Object.keys(payload).length > 0;
  const nextDesignation = payload.designation ?? employee.designation;
  // What the server will end up with: Level 2 only where the designation has approval powers
  const nextRole =
    isEmployeeRole(employee.role) && !designationHasApprovalLevel(catalog, nextDesignation) ? 'ADMIN_L1' : payload.role ?? employee.role;

  const describe = (code: string, level: string | null | undefined) =>
    `${findDesignation(catalog, code)?.label ?? (code || 'No designation')} · ${employeeRoleLabel(level) ?? 'no level'}`;

  const save = async () => {
    const result = await onSave(employee.id, payload);
    setConfirming(false);
    if (result.ok) {
      onClose();
    } else {
      setErrors({ designation: result.fieldErrors.designation, role: result.fieldErrors.role });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Manage access for ${employee.displayName}`}
          className="w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#0071e3]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-black dark:text-white">Manage access</h3>
                <p className="text-xs text-gray-500">
                  {employee.displayName} ({employee.employeeCode}) · currently {describe(employee.designation, employee.role)}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSelf && (
            <p role="note" className="text-xs p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              This is your own account. Another administrator has to change your designation or level.
            </p>
          )}

          <EmployeeAccessFields
            catalog={catalog}
            catalogError={catalogError}
            onRetryCatalog={retry}
            designation={designation}
            role={role}
            savedRole={employee.role ?? null}
            savedDesignation={employee.designation}
            savedDepartment={employee.department}
            isEditMode
            isSelfLocked={isSelf}
            canApproveEmployees={canApproveEmployees}
            canEditDesignation={can('EMPLOYEE_UPDATE')}
            errors={errors}
            onDesignationChange={(code) => {
              setDesignation(code);
              // No approval powers means Level 1 only (the server applies the same rule)
              if (!designationHasApprovalLevel(catalog, code) && isEmployeeRole(role)) setRole('ADMIN_L1');
              setErrors((prev) => ({ ...prev, designation: undefined }));
            }}
            onRoleChange={(value) => {
              setRole(value);
              setErrors((prev) => ({ ...prev, role: undefined }));
            }}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              disabled={isSelf || !hasChanges || isSubmitting}
              onClick={() => setConfirming(true)}
              className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" /> Save access
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirming}
        actionType="UPDATE"
        title="Change this employee's access?"
        description={`${employee.displayName}: ${describe(employee.designation, employee.role)} → ${describe(
          nextDesignation,
          nextRole
        )}. They can do this from their next request.`}
        isSubmitting={isSubmitting}
        onClose={() => setConfirming(false)}
        onConfirm={save}
      />
    </>
  );
};
