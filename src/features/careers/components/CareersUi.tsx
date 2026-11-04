import React from 'react';
import { NavLink } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import { CHOICE_TONE, SOLID_TONE, type ActionTone } from '../../../components/ui/actionTones';
import { useAccess } from '../../../hooks/useAccess';
import { APPLICANTS_PATH, CAREERS_PATH } from '../utils/careers';

export const SEARCH_MAX_LENGTH = 100;

/** A server search box: typing settles for 2 s before it searches (useSearchTerm); Enter searches at once. */
export const SearchBox: React.FC<{ label: string; placeholder: string; value: string; onChange: (value: string) => void; onSearchNow: () => void }> = ({
  label,
  placeholder,
  value,
  onChange,
  onSearchNow,
}) => (
  <label className="relative flex-1 min-w-[12rem]">
    <span className="sr-only">{label}</span>
    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input
      type="search"
      aria-label={label}
      value={value}
      maxLength={SEARCH_MAX_LENGTH}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onSearchNow()}
      placeholder={placeholder}
      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
    />
  </label>
);

/** A row of filter chips; the chosen one is filled. */
export const Chips = <T extends string>({
  label,
  options,
  value,
  tone = 'primary',
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  tone?: ActionTone;
  onChange: (value: T) => void;
}) => (
  <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className={`px-3 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${value === option.value ? CHOICE_TONE[tone].active : CHOICE_TONE[tone].idle}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export const RefreshButton: React.FC<{ label: string; busy: boolean; onClick: () => void }> = ({ label, busy, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
  >
    <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
  </button>
);

/** A solid action button in its action's colour (approve green, reject red, caution amber, others blue). */
export const ActionButton: React.FC<{
  label: string;
  icon?: React.ReactNode;
  tone: ActionTone;
  disabled?: boolean;
  title?: string;
  small?: boolean;
  onClick: () => void;
}> = ({ label, icon, tone, disabled, title, small, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`inline-flex items-center gap-1.5 ${small ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'} rounded-xl font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE[tone]}`}
  >
    {icon}
    {label}
  </button>
);

/** Openings | All applicants, each shown only to those who may open it. */
export const CareersTabs: React.FC = () => {
  const { can } = useAccess();
  const tab = (to: string, label: string) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  );
  return (
    <nav aria-label="Careers" className="inline-flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
      {can('CAREER_OPENING_VIEW') && tab(CAREERS_PATH, 'Openings')}
      {can('CAREER_APPLICATION_VIEW') && tab(APPLICANTS_PATH, 'All applicants')}
    </nav>
  );
};

export const EmptyRow: React.FC<{ colSpan: number; children: React.ReactNode }> = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className="py-10 text-center text-gray-500" role="status">
      {children}
    </td>
  </tr>
);
