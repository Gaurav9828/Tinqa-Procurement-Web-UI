import React from 'react';
import { Eye, Edit3, Trash2, ShieldAlert, KeyRound } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { EmployeeRoleBadge } from './EmployeeRoleBadge';
import { EmployeeConstants } from '../types/employee.types';
import type { EmployeeResponse } from '../types/employee.types';

interface Props {
  employees: EmployeeResponse[];
  isLoading: boolean;
  /** The row is the signed-in admin's own record — they cannot delete themselves. */
  isSelf: (employee: EmployeeResponse) => boolean;
  onView: (id: number) => void;
  onEdit: (employee: EmployeeResponse) => void;
  onDelete: (employee: EmployeeResponse) => void;
  /** Opens the designation / level editor. */
  onManageAccess: (employee: EmployeeResponse) => void;
}

export const EmployeeTable: React.FC<Props> = ({
  employees,
  isLoading,
  isSelf,
  onView,
  onEdit,
  onDelete,
  onManageAccess,
}) => {
  const { can, canAny } = useAccess();
  const canFinalize = can('EMPLOYEE_DELETE');
  const canEdit = can('EMPLOYEE_UPDATE');
  const canManageAccess = canAny('EMPLOYEE_UPDATE', 'EMPLOYEE_APPROVE');
  const canOpenLifecycle = canAny('EMPLOYEE_REQUEST_DELETION', 'EMPLOYEE_DELETE', 'EMPLOYEE_UPDATE');

  if (isLoading) {
    return (
      <div className="apple-card p-12 text-center text-gray-500 dark:text-neutral-400">
        <div className="inline-block w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-sm">Loading employee directory...</p>
      </div>
    );
  }

  // Records waiting for deletion are only shown to those who can finalize it
  const visibleEmployees = employees.filter(
    (emp) => !(emp.status === EmployeeConstants.WAITING_FOR_DELETION && !canFinalize)
  );

  if (visibleEmployees.length === 0) {
    return (
      <div className="apple-card p-12 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-gray-400 mx-auto" />
        <h3 className="text-sm font-semibold">No Employee Records Found</h3>
        <p className="text-xs text-gray-500">Try adjusting your search criteria or filters.</p>
      </div>
    );
  }

  return (
    <div className="apple-card overflow-hidden border border-black/10 dark:border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="p-4">Employee</th>
              <th className="p-4">Code</th>
              <th className="p-4">Designation &amp; Level</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {visibleEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div>
                    <span className="font-semibold text-sm text-black dark:text-white block">
                      {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                    </span>
                    <span className="text-[11px] text-gray-400">{emp.username}</span>
                  </div>
                </td>
                <td className="p-4 font-mono font-medium text-[#0071e3]">
                  {emp.employeeCode}
                </td>
                <td className="p-4">
                  <div className="font-medium text-black dark:text-white">{emp.designationLabel || emp.designation || 'Not assigned'}</div>
                  <div className="text-[11px] text-gray-400">{emp.department}</div>
                  <div className="mt-1">
                    <EmployeeRoleBadge role={emp.role} />
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-black dark:text-white">{emp.phone}</div>
                  <div className="text-[11px] text-gray-400">{emp.personalEmail || 'N/A'}</div>
                </td>
                <td className="p-4">
                  <EmployeeStatusBadge status={emp.status} />
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onView(emp.id)}
                      className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {canManageAccess && (
                      <button
                        type="button"
                        onClick={() => onManageAccess(emp)}
                        className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-500 hover:text-[#0071e3] transition-colors"
                        title={isSelf(emp) ? 'View your access' : 'Manage access'}
                        aria-label={`Manage access for ${emp.displayName}`}
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(emp)}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                        title="Edit Employee"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {canOpenLifecycle && (
                    <button
                      type="button"
                      onClick={() => onDelete(emp)}
                      disabled={isSelf(emp)}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        emp.status === EmployeeConstants.WAITING_FOR_DELETION && canFinalize
                          ? 'text-red-600 bg-red-500/10 hover:bg-red-500/20'
                          : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                      title={
                        isSelf(emp)
                          ? 'You cannot delete your own record'
                          : emp.status === EmployeeConstants.WAITING_FOR_DELETION
                          ? canFinalize
                            ? 'Finalize Deletion (Permanent)'
                            : 'Waiting for an employee approver'
                          : 'Request Deletion'
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};