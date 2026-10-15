import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { employeeRoleLabel } from '../utils/employeeRole';

interface Props {
  role?: string | null;
}

/** The access level from the API. Hidden when the response has no `role` — never inferred from designation. */
export const EmployeeRoleBadge: React.FC<Props> = ({ role }) => {
  const label = employeeRoleLabel(role);
  if (!label) return null;

  const isLevel2 = role === 'ADMIN_L2';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
        isLevel2
          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
          : 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400 border-blue-500/20'
      }`}
    >
      <ShieldCheck className="w-3 h-3" /> {label}
    </span>
  );
};
