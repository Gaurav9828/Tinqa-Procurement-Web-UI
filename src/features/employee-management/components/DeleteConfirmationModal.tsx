import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { EmployeeConstants } from '../types/employee.types';
import type { EmployeeResponse, EmployeeStatus } from '../types/employee.types';
interface Props {
  isOpen: boolean;
  employee: EmployeeResponse | null;
  userRole: string;
  isSubmitting: boolean;
  onClose: () => void;
  onRequestDeletion: (id: number) => Promise<boolean>;
  onFinalizeDelete: (id: number) => Promise<boolean>;
  onUpdateStatus: (id: number, status: EmployeeStatus) => Promise<boolean>;
}

export const DeleteConfirmationModal: React.FC<Props> = ({
  isOpen,
  employee,
  userRole,
  isSubmitting,
  onClose,
  onRequestDeletion,
  onFinalizeDelete,
  onUpdateStatus,
}) => {
  if (!isOpen || !employee) return null;

  const isWaitingForDeletion = employee.status === EmployeeConstants.WAITING_FOR_DELETION;
  const isL2User = userRole === 'ADMIN_L2';
  const [selectedCustomStatus, setSelectedCustomStatus] = useState<EmployeeStatus>(employee.status);

  const handleAction = async () => {
    if (isWaitingForDeletion && isL2User) {
      const ok = await onFinalizeDelete(employee.id);
      if (ok) onClose();
    } else {
      const ok = await onRequestDeletion(employee.id);
      if (ok) onClose();
    }
  };

  const handleCustomStatusChange = async () => {
    const ok = await onUpdateStatus(employee.id, selectedCustomStatus);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-full ${
              isWaitingForDeletion && isL2User
                ? 'bg-red-500/10 text-red-600'
                : 'bg-amber-500/10 text-amber-600'
            }`}
          >
            {isWaitingForDeletion && isL2User ? (
              <Trash2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-black dark:text-white">
              {isWaitingForDeletion && isL2User
                ? 'Finalize Permanent Deletion'
                : 'Employee Lifecycle Action'}
            </h3>
            <p className="text-xs text-gray-500">
              Target: <strong className="text-black dark:text-white">{employee.displayName}</strong> (
              {employee.employeeCode})
            </p>
          </div>
        </div>

        {/* L2 Flexible Status Override Section */}
        {isL2User && (
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0071e3]">
              <ShieldCheck className="w-4 h-4" /> Admin L2 Control Override
            </div>
            <p className="text-[11px] text-gray-500">
              As an ADMIN_L2, you can also change this employee's status directly without deleting:
            </p>
            <div className="flex items-center gap-2">
              <select
                value={selectedCustomStatus}
                onChange={(e) => setSelectedCustomStatus(e.target.value as EmployeeStatus)}
                className="flex-1 p-2 bg-white dark:bg-neutral-800 border rounded-lg text-xs font-medium"
              >
                <option value={EmployeeConstants.ACTIVE}>ACTIVE</option>
                <option value={EmployeeConstants.FIRST_LOGIN}>FIRST_LOGIN</option>
                <option value={EmployeeConstants.BLOCKED}>BLOCKED</option>
                <option value={EmployeeConstants.IN_ACTIVE}>IN_ACTIVE</option>
                <option value={EmployeeConstants.WAITING_FOR_DELETION}>
                  WAITING_FOR_DELETION
                </option>
              </select>
              <button
                type="button"
                onClick={handleCustomStatusChange}
                disabled={isSubmitting || selectedCustomStatus === employee.status}
                className="px-3 py-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
              >
                Update Status
              </button>
            </div>
          </div>
        )}

        {/* Standard Deletion Workflows */}
        <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-xs space-y-2">
          {isWaitingForDeletion && isL2User ? (
            <p className="text-red-600 font-medium">
              CRITICAL: Confirming will permanently erase the employee record from the database.
            </p>
          ) : (
            <p className="text-gray-600 dark:text-neutral-300">
              Mark employee status as <strong>WAITING_FOR_DELETION</strong> for approval.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black"
          >
            Cancel
          </button>
          <button
            onClick={handleAction}
            disabled={isSubmitting}
            className={`px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-2 ${
              isWaitingForDeletion && isL2User
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
              </>
            ) : isWaitingForDeletion && isL2User ? (
              'Confirm Permanent Delete'
            ) : (
              'Mark Waiting for Deletion'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};