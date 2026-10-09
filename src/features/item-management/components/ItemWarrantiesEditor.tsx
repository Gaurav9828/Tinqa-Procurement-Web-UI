import React, { useId, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import {
  emptyWarrantyForm,
  errorsForCard,
  formatWarrantyDuration,
  parseDuration,
  suggestWarrantyTitle,
  summarizeWarranty,
  updateWarrantyForm,
  warrantyErrorKey,
  WARRANTY_PROVIDER_MAX,
  WARRANTY_TITLE_MAX,
  WARRANTY_TYPE_OPTIONS,
  WARRANTY_UNIT_OPTIONS,
  type WarrantyFormItem,
} from '../utils/itemWarranty';

/** `edited` lists the error keys to clear, or 'all' when cards were added/removed (indexes shift). */
export type WarrantyEditorChange<T extends WarrantyFormItem = WarrantyFormItem> = (items: T[], edited: string[] | 'all') => void;

interface Props<T extends WarrantyFormItem> {
  items: T[];
  onChange: WarrantyEditorChange<T>;
  /** Keyed like the backend: `warranties[i].<field>`. */
  errors: Record<string, string>;
  /** Item edit mode: shows the Active toggle and marks unsaved cards "New" (overridable below). */
  isEdit: boolean;
  disabled?: boolean;
  showActiveToggle?: boolean;
  markNew?: boolean;
  /** Factory for "Add warranty" (defaults to an empty item warranty). */
  newItem?: () => T;
  /** Cards that start collapsed (default: saved ones). */
  startCollapsed?: (item: T) => boolean;
  /** Confirmation text when removing a saved warranty. */
  removeDescription?: (item: T) => string;
  /** Cards that can't be edited or removed here (e.g. copies of an item's warranties). */
  readOnly?: (item: T) => boolean;
  /** Shown on read-only cards. */
  readOnlyNote?: string;
  /** Extra badges in a card header (e.g. where a warranty came from). */
  renderBadges?: (item: T) => React.ReactNode;
  /** Extra read-only line at the bottom of an open card (e.g. audit info). */
  renderFooter?: (item: T) => React.ReactNode;
  heading?: string;
  description?: string;
}

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
    hasError ? 'border-rose-500' : 'border-black/10 dark:border-white/10'
  }`;
const labelClass = 'block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1';

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1 text-[11px] text-rose-500">
      {message}
    </p>
  ) : null;

/** Repeatable warranty cards. Used by the item form and (with the props above) the product form. */
export const ItemWarrantiesEditor = <T extends WarrantyFormItem>({
  items,
  onChange,
  errors,
  isEdit,
  disabled,
  showActiveToggle = isEdit,
  markNew = isEdit,
  newItem = emptyWarrantyForm as unknown as () => T,
  startCollapsed = (item) => item.id !== undefined,
  removeDescription = (item) => `"${item.title.trim() || 'This warranty'}": this warranty will be deleted when you save.`,
  renderBadges,
  renderFooter,
  readOnly = () => false,
  readOnlyNote = 'Read-only.',
  heading = 'Warranties',
  description = 'An item can have zero, one or many warranties.',
}: Props<T>) => {
  const baseId = useId();
  // Saved warranties start collapsed so long lists stay manageable; new cards start open.
  // `toggled` holds the cards the user flipped from that default.
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const [pendingRemoval, setPendingRemoval] = useState<T | null>(null);
  const defaultCollapsed = startCollapsed;
  const isCollapsedByUser = (item: T) => defaultCollapsed(item) !== toggled.has(item.uid);

  const setCollapsedFor = (item: T, value: boolean) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (value !== defaultCollapsed(item)) next.add(item.uid);
      else next.delete(item.uid);
      return next;
    });
  const setAllCollapsed = (value: boolean) =>
    setToggled(new Set(items.filter((item) => defaultCollapsed(item) !== value).map((item) => item.uid)));

  const update = (index: number, patch: Partial<WarrantyFormItem>, field?: string) => {
    const next = items.map((item, i) => (i === index ? (updateWarrantyForm(item, patch) as T) : item));
    const edited = [field ? warrantyErrorKey(index, field) : warrantyErrorKey(index)];
    // A type/duration change can also refresh the suggested title, so clear its error too.
    if (field && field !== 'title' && !items[index].titleEdited) edited.push(warrantyErrorKey(index, 'title'));
    onChange(next, edited);
  };

  const add = () => onChange([...items, newItem()], 'all');
  const remove = (uid: string) => onChange(items.filter((item) => item.uid !== uid), 'all');
  const requestRemove = (item: T) => (item.id === undefined ? remove(item.uid) : setPendingRemoval(item));

  const allCollapsed = items.length > 0 && items.every(isCollapsedByUser);

  return (
    <section aria-label="Warranties" className="space-y-3 pt-2 border-t border-black/10 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> {heading}
          </h3>
          <p className="text-[11px] text-gray-400">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => setAllCollapsed(!allCollapsed)}
              className="text-xs text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
            >
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </button>
          )}
          <button
            type="button"
            onClick={add}
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0071e3] bg-[#0071e3]/10 hover:bg-[#0071e3]/15 rounded-xl cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add warranty
          </button>
        </div>
      </div>

      {items.length === 0 && <p className="text-xs text-gray-400 italic">No warranties added.</p>}

      {items.map((item, index) => {
        const cardErrors = errorsForCard(errors, index);
        const isReadOnly = readOnly(item);
        const cardDisabled = disabled || isReadOnly;
        const errorCount = Object.keys(cardErrors).length;
        // A card with errors is always open so the errors are visible.
        const isCollapsed = isCollapsedByUser(item) && errorCount === 0;
        const id = (field: string) => `${baseId}-${index}-${field}`;
        const describedBy = (field: string) => (cardErrors[field] ? `${id(field)}-error` : undefined);
        const summary = summarizeWarranty(item) || 'Incomplete warranty';
        const suggestion = suggestWarrantyTitle(item.warrantyType, item.durationValue, item.durationUnit);

        return (
          <div
            key={item.uid}
            role="group"
            aria-label={`Warranty ${index + 1}`}
            data-inactive={!item.isActive}
            className={`rounded-xl border ${errorCount ? 'border-rose-500/40' : 'border-black/10 dark:border-white/10'} ${
              item.isActive ? 'bg-black/[0.01] dark:bg-white/[0.01]' : 'bg-black/[0.04] dark:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setCollapsedFor(item, !isCollapsed)}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} warranty ${index + 1}`}
                className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />}
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-black dark:text-white truncate">
                    {item.title.trim() || `Warranty ${index + 1}`}
                  </span>
                  <span className="block text-[11px] text-gray-500 truncate" data-testid="warranty-summary">
                    {summary}
                  </span>
                </span>
              </button>
              {!item.isActive && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full border bg-gray-500/10 text-gray-500 border-gray-500/20 shrink-0">
                  Inactive
                </span>
              )}
              {renderBadges?.(item)}
              {item.id === undefined && markNew && <span className="text-[10px] font-medium text-[#0071e3] shrink-0">New</span>}
              {errorCount > 0 && (
                <span className="text-[10px] font-semibold text-rose-500 shrink-0">
                  {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                </span>
              )}
              <button
                type="button"
                onClick={() => requestRemove(item)}
                disabled={cardDisabled}
                aria-label={`Remove warranty ${index + 1}`}
                title={isReadOnly ? 'Remove the item from Components to remove its warranties' : 'Remove warranty'}
                className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {!isCollapsed && (
              <div className="px-3 pb-3 space-y-3 border-t border-black/5 dark:border-white/5 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={id('warrantyType')} className={labelClass}>
                      Type *
                    </label>
                    <select
                      id={id('warrantyType')}
                      value={item.warrantyType}
                      disabled={cardDisabled}
                      aria-invalid={!!cardErrors.warrantyType}
                      aria-describedby={describedBy('warrantyType')}
                      onChange={(e) => update(index, { warrantyType: e.target.value as WarrantyFormItem['warrantyType'] }, 'warrantyType')}
                      className={inputClass(!!cardErrors.warrantyType)}
                    >
                      <option value="">Select type…</option>
                      {WARRANTY_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <FieldError id={`${id('warrantyType')}-error`} message={cardErrors.warrantyType} />
                  </div>

                  <div>
                    <span className={labelClass} id={id('duration-label')}>
                      Duration *
                    </span>
                    <div className="flex gap-2" role="group" aria-labelledby={id('duration-label')}>
                      <input
                        id={id('durationValue')}
                        // Text + numeric keypad: native number validation would block submit before our per-card errors show.
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="e.g. 3"
                        aria-label="Duration"
                        value={item.durationValue}
                        disabled={cardDisabled}
                        aria-invalid={!!cardErrors.durationValue}
                        aria-describedby={describedBy('durationValue')}
                        onChange={(e) => update(index, { durationValue: e.target.value }, 'durationValue')}
                        className={`${inputClass(!!cardErrors.durationValue)} min-w-0`}
                      />
                      <select
                        id={id('durationUnit')}
                        aria-label="Duration unit"
                        value={item.durationUnit}
                        disabled={cardDisabled}
                        aria-invalid={!!cardErrors.durationUnit}
                        aria-describedby={describedBy('durationUnit')}
                        onChange={(e) => update(index, { durationUnit: e.target.value as WarrantyFormItem['durationUnit'] }, 'durationUnit')}
                        className={`${inputClass(!!cardErrors.durationUnit)} !w-auto shrink-0`}
                      >
                        <option value="">Unit…</option>
                        {WARRANTY_UNIT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {parseDuration(item.durationValue) !== null && item.durationUnit && (
                      <p className="mt-1 text-[11px] text-gray-500" data-testid="duration-preview">
                        {formatWarrantyDuration(parseDuration(item.durationValue), item.durationUnit)}
                      </p>
                    )}
                    <FieldError id={`${id('durationValue')}-error`} message={cardErrors.durationValue} />
                    <FieldError id={`${id('durationUnit')}-error`} message={cardErrors.durationUnit} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor={id('title')} className={labelClass}>
                        Title *
                      </label>
                      <span className={`text-[10px] tabular-nums ${item.title.trim().length > WARRANTY_TITLE_MAX ? 'text-rose-500' : 'text-gray-400'}`}>
                        {item.title.trim().length}/{WARRANTY_TITLE_MAX}
                      </span>
                    </div>
                    <input
                      id={id('title')}
                      type="text"
                      value={item.title}
                      placeholder={suggestion || 'e.g. 3 Years Manufacturer Warranty'}
                      disabled={cardDisabled}
                      aria-invalid={!!cardErrors.title}
                      aria-describedby={describedBy('title')}
                      onChange={(e) => update(index, { title: e.target.value }, 'title')}
                      className={inputClass(!!cardErrors.title)}
                    />
                    {!isReadOnly && item.titleEdited && suggestion && item.title.trim() !== suggestion && (
                      <button
                        type="button"
                        onClick={() => update(index, { title: suggestion }, 'title')}
                        className="mt-1 text-[11px] text-[#0071e3] hover:underline cursor-pointer"
                      >
                        Use "{suggestion}"
                      </button>
                    )}
                    <FieldError id={`${id('title')}-error`} message={cardErrors.title} />
                  </div>

                  <div>
                    <label htmlFor={id('provider')} className={labelClass}>
                      Provider
                    </label>
                    <input
                      id={id('provider')}
                      type="text"
                      value={item.provider}
                      placeholder="Brand, manufacturer or dealer"
                      disabled={cardDisabled}
                      aria-invalid={!!cardErrors.provider}
                      aria-describedby={describedBy('provider')}
                      onChange={(e) => update(index, { provider: e.target.value }, 'provider')}
                      className={inputClass(!!cardErrors.provider)}
                    />
                    {item.provider.trim().length > WARRANTY_PROVIDER_MAX * 0.9 && (
                      <p className="mt-1 text-[10px] text-gray-400 tabular-nums">
                        {item.provider.trim().length}/{WARRANTY_PROVIDER_MAX}
                      </p>
                    )}
                    <FieldError id={`${id('provider')}-error`} message={cardErrors.provider} />
                  </div>
                </div>

                {(
                  [
                    ['coverage', 'Coverage', 'What is covered'],
                    ['exclusions', 'Exclusions', 'What is not covered'],
                    ['termsAndConditions', 'Terms & Conditions', 'Claim process, conditions…'],
                  ] as const
                ).map(([field, label, placeholder]) => (
                  <div key={field}>
                    <label htmlFor={id(field)} className={labelClass}>
                      {label}
                    </label>
                    <textarea
                      id={id(field)}
                      rows={2}
                      value={item[field]}
                      placeholder={placeholder}
                      disabled={cardDisabled}
                      aria-invalid={!!cardErrors[field]}
                      aria-describedby={describedBy(field)}
                      onChange={(e) => update(index, { [field]: e.target.value }, field)}
                      className={`${inputClass(!!cardErrors[field])} resize-y`}
                    />
                    <FieldError id={`${id(field)}-error`} message={cardErrors[field]} />
                  </div>
                ))}

                {showActiveToggle && (
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={item.isActive}
                      disabled={cardDisabled}
                      onChange={(e) => update(index, { isActive: e.target.checked })}
                      className="rounded border-black/10 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer"
                    />
                    Active
                  </label>
                )}

                {isReadOnly && (
                  <p className="text-[11px] text-gray-500 italic" data-testid="read-only-note">
                    {readOnlyNote}
                  </p>
                )}
                <FieldError id={id('card-error')} message={cardErrors['']} />
                {renderFooter?.(item)}
              </div>
            )}
          </div>
        );
      })}

      {items.length >= 3 && (
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="flex items-center gap-1 text-xs font-semibold text-[#0071e3] hover:underline cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Add another warranty
        </button>
      )}

      <ConfirmationModal
        isOpen={!!pendingRemoval}
        actionType="DELETE"
        title="Remove warranty?"
        description={pendingRemoval ? removeDescription(pendingRemoval) : ''}
        isSubmitting={false}
        onClose={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) remove(pendingRemoval.uid);
          setPendingRemoval(null);
        }}
      />
    </section>
  );
};
