import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, RefreshCw, X } from 'lucide-react';
import { useAccessCatalog } from '../../../hooks/useAccessCatalog';
import type { PermissionEntry } from '../../../config/access';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Reference of every designation, the permission groups it carries and the actions in each group, straight from
 * the server's catalog, so admins can see what a designation means before assigning it.
 */
export const AccessCatalogModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { catalog, error, isLoading, retry } = useAccessCatalog();
  const [expanded, setExpanded] = useState<string | null>(null);

  const permissionsByGroup = useMemo(() => {
    const map = new Map<string, PermissionEntry[]>();
    catalog?.permissions.forEach((permission) => {
      map.set(permission.group, [...(map.get(permission.group) ?? []), permission]);
    });
    return map;
  }, [catalog]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Roles and permissions"
        className="w-full max-w-3xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#0071e3]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-black dark:text-white">Roles &amp; permissions</h3>
              <p className="text-xs text-gray-500">
                A designation decides which areas someone works in. Level 1 can prepare work there; Level 2 can also approve.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading && <p className="text-sm text-gray-500">Loading designations…</p>}
        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/10 text-red-600 text-xs">
            <span>{error}</span>
            <button type="button" onClick={retry} className="flex items-center gap-1 font-semibold cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {catalog && (
          <ul className="space-y-2">
            {catalog.designations.map((designation) => {
              const isOpenRow = expanded === designation.code;
              const groups = designation.groups
                .map((code) => catalog.groups.find((group) => group.code === code))
                .filter((group): group is NonNullable<typeof group> => !!group);
              return (
                <li key={designation.code} className="rounded-xl border border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    aria-expanded={isOpenRow}
                    onClick={() => setExpanded(isOpenRow ? null : designation.code)}
                    className="w-full text-left p-3.5 flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-black dark:text-white">{designation.label}</p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400">{designation.description}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {groups.map((group) => (
                          <span
                            key={group.code}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              group.approvalLevel
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                : 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400 border-blue-500/20'
                            }`}
                          >
                            {group.label}
                            {group.approvalLevel && <span className="font-bold">· L2</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpenRow ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpenRow && (
                    <div className="px-3.5 pb-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groups.map((group) => (
                        <div key={group.code} className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] p-2.5">
                          <p className="text-[11px] font-semibold text-gray-700 dark:text-neutral-200">
                            {group.label}
                            {group.approvalLevel && <span className="ml-1 text-purple-600 dark:text-purple-400">(Level 2 only)</span>}
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {(permissionsByGroup.get(group.code) ?? []).map((permission) => (
                              <li key={permission.code} className="text-[11px] text-gray-500 dark:text-neutral-400">
                                {permission.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
