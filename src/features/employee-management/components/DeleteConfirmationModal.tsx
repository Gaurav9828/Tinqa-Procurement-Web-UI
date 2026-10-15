import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2, ShieldCheck, Info } from 'lucide-react';
import { EmployeeConstants } from '../types/employee.types';
import type { EmployeeResponse, EmployeeStatus } from '../types/employee.types';
import { useAccess } from '../../../hooks/useAccess';

interface Props {
  isOpen: boolean;
  employee: EmployeeResponse | null;
  isSubmitting: boolean;
  onClose: () => void;
  onRequestDeletion: (id: number) => Promise<boolean>;
  onFinalizeDelete: (id: number) => Promise<boolean>;
  onUpdateStatus: (id: number, status: EmployeeStatus) => Promise<boolean>;
}

// Statuses an admin may set directly; deletion and approval states have their own workflows
const DIRECT_STATUSES: EmployeeStatus[] = [
  EmployeeConstants.ACTIVE,
  EmployeeConstants.FIRST_LOGIN,
  EmployeeConstants.BLOCKED,
  EmployeeConstants.IN_ACTIVE,
];

export const DeleteConfirmationModal: React.FC<Props> = ({ isOpen, employee, ...rest }) =>
  // Keyed by employee so the status picker starts from that employee's current status
  isOpen && employee ? <LifecycleDialog key={employee.id} isOpen employee={employee} {...rest} /> : null;

const LifecycleDialog: React.FC<Props & { employee: EmployeeResponse }> = ({
  employee,
  isSubmitting,
  onClose,
  onRequestDeletion,
  onFinalizeDelete,
  onUpdateStatus,
}) => {
  const { can } = useAccess();
  const [selectedCustomStatus, setSelectedCustomStatus] = useState<EmployeeStatus | ''>(
    DIRECT_STATUSES.includes(employee.status) ? employee.status : ''
  );

  const isWaitingForDeletion = employee.status === EmployeeConstants.WAITING_FOR_DELETION;
  const canFinalize = can('EMPLOYEE_DELETE');
  const canRequest = can('EMPLOYEE_REQUEST_DELETION');
  // Status can't be changed here while the account waits for an approval decision
  const canChangeStatus = can('EMPLOYEE_UPDATE') && employee.status !== EmployeeConstants.APPROVAL_PENDING;
  const finalizing = isWaitingForDeletion && canFinalize;
  const primaryAvailable = isWaitingForDeletion ? canFinalize : canRequest;

  const handleAction = async () => {
    const ok = finalizing ? await onFinalizeDelete(employee.id) : await onRequestDeletion(employee.id);
    if (ok) onClose();
  };

  const handleCustomStatusChange = async () => {
    if (!selectedCustomStatus) return;
    const ok = await onUpdateStatus(employee.id, selectedCustomStatus);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={finalizing ? 'Finalize permanent deletion' : 'Employee lifecycle action'}
        className="w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${finalizing ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
            {finalizing ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-bold text-sm text-black dark:text-white">
              {finalizing ? 'Finalize Permanent Deletion' : 'Employee Lifecycle Action'}
            </h3>
            <p className="text-xs text-gray-500">
              Target: <strong className="text-black dark:text-white">{employee.displayName}</strong> ({employee.employeeCode})
            </p>
          </div>
        </div>

        {canChangeStatus && (
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0071e3]">
              <ShieldCheck className="w-4 h-4" /> Change status instead
            </div>
            <p className="text-[11px] text-gray-500">You can also block or deactivate this employee without deleting them:</p>
            <div className="flex items-center gap-2">
              <select
                aria-label="New status"
                value={selectedCustomStatus}
                onChange={(e) => setSelectedCustomStatus(e.target.value as EmployeeStatus)}
                className="flex-1 p-2 bg-white dark:bg-neutral-800 border rounded-lg text-xs font-medium"
              >
                <option value="" disabled>
                  Select a status
                </option>
                {DIRECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCustomStatusChange}
                disabled={isSubmitting || !selectedCustomStatus || selectedCustomStatus === employee.status}
                className="px-3 py-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
              >
                Update Status
              </button>
            </div>
          </div>
        )}

        <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-xs space-y-2">
          {finalizing ? (
            <p className="text-red-600 font-medium">CRITICAL: Confirming will permanently erase the employee record from the database.</p>
          ) : isWaitingForDeletion ? (
            <p className="text-gray-600 dark:text-neutral-300 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" /> This deletion is waiting for an employee approver to finalize it.
            </p>
          ) : canRequest ? (
            <p className="text-gray-600 dark:text-neutral-300">
              Mark employee status as <strong>WAITING_FOR_DELETION</strong> for approval.
            </p>
          ) : (
            <p className="text-gray-600 dark:text-neutral-300">Your designation doesn't include requesting employee deletions.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black">
            {primaryAvailable ? 'Cancel' : 'Close'}
          </button>
          {primaryAvailable && (
            <button
              onClick={handleAction}
              disabled={isSubmitting}
              className={`px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-2 ${
                finalizing ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                </>
              ) : finalizing ? (
                'Confirm Permanent Delete'
              ) : (
                'Mark Waiting for Deletion'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
