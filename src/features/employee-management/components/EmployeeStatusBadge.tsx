import React from 'react';
import { EmployeeConstants } from '../types/employee.types';
import type { EmployeeStatus } from '../types/employee.types';
import { CheckCircle2, AlertOctagon, UserX, Clock, ShieldAlert } from 'lucide-react';
import { HasAccess } from '../../../auth/HasAccess';

interface Props {
    status: EmployeeStatus;
}

export const EmployeeStatusBadge: React.FC<Props> = ({ status }) => {
    switch (status) {
        case EmployeeConstants.ACTIVE:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
            );
        case EmployeeConstants.FIRST_LOGIN:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Clock className="w-3.5 h-3.5" /> First Login
                </span>
            );
        case EmployeeConstants.BLOCKED:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    <ShieldAlert className="w-3.5 h-3.5" /> Blocked
                </span>
            );
        case EmployeeConstants.IN_ACTIVE:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 dark:text-neutral-400 border border-gray-500/20">
                    <UserX className="w-3.5 h-3.5" /> Inactive
                </span>
            );
        case EmployeeConstants.WAITING_FOR_DELETION:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-red-400 border border-amber-500/20 animate-pulse">
                    <AlertOctagon className="w-3.5 h-3.5" /> Waiting for Deletion
                </span>
            );
        case EmployeeConstants.APPROVAL_PENDING:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                    <AlertOctagon className="w-3.5 h-3.5" /> Waiting for Approval
                </span>
            );
        default:
            return <span className="text-xs text-gray-400">{status}</span>;
    }
};