import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '../../utils/passwordPolicy';

/** Live checklist of the password policy; each rule turns green as soon as it's met. */
export const PasswordRequirements: React.FC<{ password: string; id?: string }> = ({ password, id }) => (
  <ul id={id} aria-label="Password requirements" className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 pt-2">
    {PASSWORD_RULES.map((rule) => {
      const met = rule.test(password);
      return (
        <li
          key={rule.id}
          data-met={met}
          className={`flex items-center gap-1.5 text-[11px] ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-neutral-400'}`}
        >
          {met ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden /> : <Circle className="w-3.5 h-3.5 shrink-0" aria-hidden />}
          <span>
            {rule.label}
            <span className="sr-only">{met ? ' (met)' : ' (not met)'}</span>
          </span>
        </li>
      );
    })}
  </ul>
);
