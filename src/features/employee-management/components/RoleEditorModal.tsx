import React, { useState } from 'react';
import { Loader2, RefreshCw, ShieldPlus, X } from 'lucide-react';
import { CommonInput, CommonTextArea } from '../../../components/ui/FormInputs';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import type { AccessCatalog } from '../../../config/access';
import { useGrantableGroups } from '../hooks/useCustomRoles';
import type { RolePayload, RoleSummary } from '../types/role.types';
import { ALWAYS_INCLUDED_GROUP, ROLE_LIMITS, roleCodeFromLabel, validateRoleForm } from '../utils/customRoles';

interface Props {
  /** The custom role being edited; null creates a new one. */
  role: RoleSummary | null;
  catalog: AccessCatalog | null;
  isSubmitting: boolean;
  onClose: () => void;
  /** Resolves to true once saved. */
  onSave: (payload: RolePayload) => Promise<boolean>;
}

/**
 * Create or edit a custom role: label, department, description and the permission groups it carries, picked from the
 * groups the signed-in admin may grant (GET /v1/access/roles/grantable-groups, loaded only while this is open).
 */
export const RoleEditorModal: React.FC<Props> = ({ role, catalog, isSubmitting, onClose, onSave }) => {
  const grantable = useGrantableGroups(true);
  const [label, setLabel] = useState(role?.label ?? '');
  const [department, setDepartment] = useState(role?.department ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [groups, setGroups] = useState<string[]>(() => (role?.groups ?? []).filter((code) => code !== ALWAYS_INCLUDED_GROUP));
  const [showErrors, setShowErrors] = useState(false);

  const options = (grantable.data ?? []).filter((group) => group.code !== ALWAYS_INCLUDED_GROUP);
  const grantableCodes = new Set(options.map((group) => group.code));
  // Groups the role already has that this admin doesn't hold: kept as they are, they can't be changed here
  const lockedGroups = grantable.data ? groups.filter((code) => !grantableCodes.has(code)) : [];
  const groupLabel = (code: string) => catalog?.groups.find((group) => group.code === code)?.label ?? code;

  const errors = validateRoleForm({ label, department, description, groups });
  const code = role?.code ?? roleCodeFromLabel(label);

  const toggle = (groupCode: string) =>
    setGroups((prev) => (prev.includes(groupCode) ? prev.filter((c) => c !== groupCode) : [...prev, groupCode]));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    const payload: RolePayload = { label: label.trim(), department: department.trim(), description: description.trim(), groups };
    if (role) payload.active = role.active;
    if (await onSave(payload)) onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={role ? `Edit role ${role.label}` : 'New role'}
        onSubmit={submit}
        noValidate
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#0071e3]">
              <ShieldPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-black dark:text-white">{role ? `Edit ${role.label}` : 'New role'}</h3>
              <p className="text-xs text-gray-500">
                Employees with this role get the groups below. Level 1 employees never get the groups marked Level 2 only.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CommonInput label="Role name" name="label" required maxLength={ROLE_LIMITS.label} value={label}
            placeholder="e.g. Marketing Executive" onChange={(e) => setLabel(e.target.value)} error={showErrors ? errors.label : undefined} />
          <CommonInput label="Department" name="department" required maxLength={ROLE_LIMITS.department} value={department}
            placeholder="e.g. Marketing" onChange={(e) => setDepartment(e.target.value)} error={showErrors ? errors.department : undefined} />
        </div>
        <p className="text-[11px] text-gray-500 dark:text-neutral-400">
          Code: <span className="font-mono">{code || '…'}</span>
          {role ? ' (never changes)' : ' (made from the name; it never changes once saved)'}
        </p>
        <CommonTextArea label="What this role does" name="description" rows={2} maxLength={ROLE_LIMITS.description} value={description}
          onChange={(e) => setDescription(e.target.value)} error={showErrors ? errors.description : undefined} />

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-gray-600 dark:text-neutral-300">Permission groups</legend>
          <p className="text-[11px] text-gray-500 dark:text-neutral-400">
            You can give only the groups you hold yourself. Self-service (own profile, payslips, demos and meetings) is always included.
          </p>
          {grantable.isLoading && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading groups…
            </p>
          )}
          {grantable.loadFailed && (
            <button type="button" onClick={grantable.refresh} className="flex items-center gap-1 text-xs font-semibold text-[#0071e3] cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Load the groups again
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {options.map((group) => (
              <label key={group.code}
                className="flex items-start gap-2 p-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <input type="checkbox" className="mt-0.5" checked={groups.includes(group.code)} onChange={() => toggle(group.code)} />
                <span className="space-y-0.5">
                  <span className="block font-medium text-black dark:text-white">{group.label}</span>
                  {group.approvalLevel && (
                    <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      Level 2 only
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {lockedGroups.length > 0 && (
            <p role="note" className="text-[11px] p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Kept as they are (you don't hold them): {lockedGroups.map(groupLabel).join(', ')}.
            </p>
          )}
          {showErrors && errors.groups && <p className="text-[11px] text-red-500 font-medium">{errors.groups}</p>}
        </fieldset>

        <div className="flex justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || !grantable.data}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer ${SOLID_TONE.primary}`}>
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {role ? 'Save role' : 'Create role'}
          </button>
        </div>
      </form>
    </div>
  );
};
