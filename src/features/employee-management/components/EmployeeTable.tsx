import React from 'react';
import { Eye, Edit3, Trash2, ShieldAlert } from 'lucide-react';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { EmployeeConstants } from '../types/employee.types';
import type { EmployeeResponse } from '../types/employee.types';

interface Props {
  employees: EmployeeResponse[];
  isLoading: boolean;
  userRole: string;
  onView: (id: number) => void;
  onEdit: (employee: EmployeeResponse) => void;
  onDelete: (employee: EmployeeResponse) => void;
}

export const EmployeeTable: React.FC<Props> = ({
  employees,
  isLoading,
  userRole,
  onView,
  onEdit,
  onDelete,
}) => {
  const isL2User = userRole === 'ADMIN_L2';

  if (isLoading) {
    return (
      <div className="apple-card p-12 text-center text-gray-500 dark:text-neutral-400">
        <div className="inline-block w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-sm">Loading employee directory...</p>
      </div>
    );
  }

  // Filter out employees waiting for deletion if current user isn't L2
  const visibleEmployees = employees.filter(
    (emp) => !(emp.status === EmployeeConstants.WAITING_FOR_DELETION && !isL2User)
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
              <th className="p-4">Department & Role</th>
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
                  <div className="font-medium text-black dark:text-white">{emp.designation}</div>
                  <div className="text-[11px] text-gray-400">{emp.department}</div>
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
                    <button
                      type="button"
                      onClick={() => onEdit(emp)}
                      className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                      title="Edit Employee"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(emp)}
                      className={`p-2 rounded-lg transition-colors ${
                        emp.status === EmployeeConstants.WAITING_FOR_DELETION && isL2User
                          ? 'text-red-600 bg-red-500/10 hover:bg-red-500/20'
                          : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                      title={
                        emp.status === EmployeeConstants.WAITING_FOR_DELETION
                          ? isL2User
                            ? 'Finalize Deletion (Permanent)'
                            : 'Pending L2 Deletion Approval'
                          : 'Request Deletion'
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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