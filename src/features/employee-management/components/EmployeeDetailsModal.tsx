import React from 'react';
import {
  X,
  UserCheck,
  Calendar,
  IndianRupee,
  Phone,
  Mail,
  Building,
  Key,
  Briefcase,
  User,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';
import type { EmployeeResponse } from '../types/employee.types';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';

interface Props {
  employee: EmployeeResponse | null;
  isLoading: boolean;
  onClose: () => void;
}

export const EmployeeDetailsModal: React.FC<Props> = ({ employee, isLoading, onClose }) => {
  if (!employee && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0071e3]" />
            <h3 className="font-bold text-base text-black dark:text-white">
              Admin Overview: Employee Profile
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
            Loading full employee profile...
          </div>
        ) : employee ? (
          <div className="space-y-5">
            {/* Primary Profile Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-black dark:text-white">
                    {employee.displayName || `${employee.firstName} ${employee.lastName}`}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-[#0071e3] border border-blue-500/20">
                    {employee.employeeCode}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                  Full Name: {employee.firstName} {employee.middleName ? `${employee.middleName} ` : ''}
                  {employee.lastName}
                </p>
              </div>
              <div className="self-start sm:self-auto">
                <EmployeeStatusBadge status={employee.status} />
              </div>
            </div>

            {/* Section 1: System Credentials & Identity */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#0071e3]" /> System Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400">User ID</p>
                  <p className="font-mono font-semibold text-black dark:text-white">
                    #{employee.userId}
                  </p>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400">Username</p>
                  <p className="font-mono font-semibold text-black dark:text-white">
                    {employee.username}
                  </p>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400">Database Record ID</p>
                  <p className="font-mono font-semibold text-black dark:text-white">
                    #{employee.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Emails */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#0071e3]" /> Contact Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#0071e3] shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] text-gray-400">Work Email (System)</p>
                    <p className="font-medium truncate text-black dark:text-white">
                      {employee.workEmail || `${employee.username}@TinQa.com`}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] text-gray-400">Personal Email</p>
                    <p className="font-medium truncate text-black dark:text-white">
                      {employee.personalEmail || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#0071e3] shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Primary Phone</p>
                    <p className="font-medium text-black dark:text-white">{employee.phone}</p>
                  </div>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Alternate Phone</p>
                    <p className="font-medium text-black dark:text-white">
                      {employee.alternatePhone || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Position & Demographics */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#0071e3]" /> Employment & Demographics
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Department</p>
                    <p className="font-medium text-black dark:text-white">{employee.department}</p>
                  </div>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Designation</p>
                    <p className="font-medium text-black dark:text-white">{employee.designation}</p>
                  </div>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Employment Type</p>
                    <p className="font-medium text-black dark:text-white">
                      {employee.employmentType}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-2.5">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Gender</p>
                    <p className="font-medium text-black dark:text-white">{employee.gender}</p>
                  </div>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Date of Birth</p>
                    <p className="font-medium text-black dark:text-white">
                      {employee.dateOfBirth}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center gap-2.5">
                  <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Salary</p>
                    <p className="font-semibold text-black dark:text-white">
                      {employee.salaryCurrency} {employee.salaryAmount?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Timeline & Audit Metadata */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0071e3]" /> System Audit & Timeline
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400">Joining Date</p>
                  <p className="font-medium text-black dark:text-white">{employee.joiningDate}</p>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400">Leaving Date</p>
                  <p className="font-medium text-black dark:text-white">
                    {employee.leavingDate || 'Active Service'}
                  </p>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400">Created At</p>
                  <p className="font-mono text-[11px] text-gray-600 dark:text-neutral-400">
                    {new Date(employee.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400">Last Updated At</p>
                  <p className="font-mono text-[11px] text-gray-600 dark:text-neutral-400">
                    {new Date(employee.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-black/10 dark:border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};