import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, ChevronDown, Pencil, Plus, Power, RefreshCw, Trash2, Users, X } from 'lucide-react';
import { useAccessCatalog } from '../../../hooks/useAccessCatalog';
import { useAccess } from '../../../hooks/useAccess';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import type { AccessCatalog, PermissionEntry } from '../../../config/access';
import { useRoleActions, useRoles } from '../hooks/useCustomRoles';
import type { RoleSummary } from '../types/role.types';
import { RoleEditorModal } from './RoleEditorModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** One row of the list: a role from GET /v1/access/roles, or (without ROLE_VIEW) a catalog designation. */
type RoleRow = Omit<RoleSummary, 'employeeCount'> & { employeeCount: number | null };

const rowsFromCatalog = (catalog: AccessCatalog): RoleRow[] =>
  catalog.designations.map((entry) => ({
    id: entry.id ?? null,
    code: entry.code,
    label: entry.label,
    department: entry.department,
    description: entry.description,
    groups: entry.groups,
    custom: !!entry.custom,
    active: entry.active !== false,
    employeeCount: null,
    createdByName: null,
    updatedAt: null,
  }));

const Badge: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${className}`}>{children}</span>
);

/**
 * Reference of every designation, the permission groups it carries and the actions in each group, straight from
 * the server, so admins can see what a designation means before assigning it. With ROLE_VIEW it lists every role
 * (built-in and custom, active or not) with its employee count; ROLE_MANAGE creates, edits, deactivates and deletes
 * custom roles. Built-in roles are read-only. Nothing loads while closed.
 */
export const AccessCatalogModal: React.FC<Props> = ({ isOpen, onClose }) => (isOpen ? <RolesAndPermissions onClose={onClose} /> : null);

const RolesAndPermissions: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { can } = useAccess();
  const { catalog, error, isLoading, retry } = useAccessCatalog();
  const canViewRoles = can('ROLE_VIEW');
  const canManage = can('ROLE_MANAGE');
  const roles = useRoles(true);
  const actions = useRoleActions(roles.refresh);

  const [expanded, setExpanded] = useState<string | null>(null);
  // undefined: editor closed; null: new role
  const [editing, setEditing] = useState<RoleSummary | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<RoleSummary | null>(null);
  const [inUse, setInUse] = useState<RoleSummary | null>(null);

  const permissionsByGroup = useMemo(() => {
    const map = new Map<string, PermissionEntry[]>();
    catalog?.permissions.forEach((permission) => {
      map.set(permission.group, [...(map.get(permission.group) ?? []), permission]);
    });
    return map;
  }, [catalog]);

  const catalogRows = catalog ? rowsFromCatalog(catalog) : null;
  const rows: RoleRow[] | null = canViewRoles ? roles.data : catalogRows;
  const loading = canViewRoles ? roles.isLoading && !roles.data : isLoading;

  const confirmDelete = async () => {
    if (!deleting) return;
    const outcome = await actions.remove(deleting);
    if (outcome === 'inUse') setInUse(deleting);
    setDeleting(null);
  };

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
          <div className="flex items-center gap-2">
            {canManage && (
              <button type="button" onClick={() => setEditing(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${SOLID_TONE.primary}`}>
                <Plus className="w-3.5 h-3.5" /> New role
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading designations…</p>}
        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/10 text-red-600 text-xs">
            <span>{error}</span>
            <button type="button" onClick={retry} className="flex items-center gap-1 font-semibold cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}
        {canViewRoles && roles.loadFailed && !roles.data && (
          <button type="button" onClick={roles.refresh} className="flex items-center gap-1 text-xs font-semibold text-[#0071e3] cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Load the roles again
          </button>
        )}

        {inUse && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
            <span className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {inUse.label} is still held by employees, so it can't be deleted. Deactivate it instead: they keep it, nobody new gets it.
            </span>
            <span className="flex items-center gap-2">
              <button type="button" disabled={actions.isSubmitting}
                onClick={async () => {
                  if (await actions.setActive(inUse, false)) setInUse(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.warning}`}>
                Deactivate
              </button>
              <button type="button" onClick={() => setInUse(null)} aria-label="Dismiss" className="p-1 rounded-lg hover:bg-amber-500/20 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        )}

        {catalog && rows && (
          <ul className="space-y-2" aria-label="Roles">
            {rows.map((row) => {
              const isOpenRow = expanded === row.code;
              const groups = row.groups.map(
                (code) => catalog.groups.find((group) => group.code === code) ?? { code, label: code, approvalLevel: false }
              );
              const manageable = canManage && row.custom && row.id !== null;
              const role = row as RoleSummary;
              return (
                <li key={row.code} aria-label={row.label}
                  className={`rounded-xl border border-black/10 dark:border-white/10 ${row.active ? '' : 'opacity-75'}`}>
                  <div className="flex items-start justify-between gap-3 p-3.5">
                    <button
                      type="button"
                      aria-expanded={isOpenRow}
                      onClick={() => setExpanded(isOpenRow ? null : row.code)}
                      className="flex-1 text-left space-y-1 cursor-pointer"
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-black dark:text-white">{row.label}</span>
                        {row.custom ? (
                          <Badge className="bg-blue-500/10 text-[#0071e3] border-blue-500/20">Custom</Badge>
                        ) : (
                          <Badge className="bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 border-black/10 dark:border-white/10">Built-in · read-only</Badge>
                        )}
                        {!row.active && <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Inactive</Badge>}
                      </span>
                      <span className="block text-[11px] text-gray-500 dark:text-neutral-400">
                        {row.department}
                        {row.employeeCount !== null && (
                          <span className="inline-flex items-center gap-1 ml-2">
                            <Users className="w-3 h-3" /> {row.employeeCount} {row.employeeCount === 1 ? 'employee' : 'employees'}
                          </span>
                        )}
                        {row.custom && row.createdByName && <span className="ml-2">· created by {row.createdByName}</span>}
                      </span>
                      {row.description && <span className="block text-xs text-gray-500 dark:text-neutral-400">{row.description}</span>}
                      <span className="flex flex-wrap gap-1.5 pt-1">
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
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {manageable && (
                        <>
                          <button type="button" onClick={() => setEditing(role)} aria-label={`Edit ${row.label}`}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${CHOICE_TONE.primary.idle}`}>
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button type="button" disabled={actions.isSubmitting} onClick={() => actions.setActive(role, !row.active)}
                            aria-label={`${row.active ? 'Deactivate' : 'Activate'} ${row.label}`}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${
                              row.active ? CHOICE_TONE.warning.idle : CHOICE_TONE.approve.idle
                            }`}>
                            <Power className="w-3 h-3" /> {row.active ? 'Deactivate' : 'Activate'}
                          </button>
                          {row.employeeCount === 0 && (
                            <button type="button" onClick={() => setDeleting(role)} aria-label={`Delete ${row.label}`}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${CHOICE_TONE.danger.idle}`}>
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          )}
                        </>
                      )}
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpenRow ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
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

      {editing !== undefined && (
        <RoleEditorModal
          role={editing}
          catalog={catalog}
          isSubmitting={actions.isSubmitting}
          onClose={() => setEditing(undefined)}
          onSave={(payload) => (editing ? actions.update(editing.id ?? 0, payload) : actions.create(payload))}
        />
      )}

      <ConfirmationModal
        isOpen={!!deleting}
        actionType="DELETE"
        title="Delete role"
        description={deleting ? `Delete the role "${deleting.label}"? No employee holds it. This can't be undone.` : ''}
        tone="danger"
        confirmLabel="Delete role"
        isSubmitting={actions.isSubmitting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
