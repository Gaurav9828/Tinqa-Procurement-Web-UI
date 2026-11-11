import React, { useMemo, useState } from 'react';
import { Loader2, LogOut, MapPinCheck, Plus, Trash2 } from 'lucide-react';
import { CommonInput } from '../../../components/ui/FormInputs';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { CHOICE_TONE, ICON_DANGER } from '../../../components/ui/actionTones';
import type { CheckpointEvent, CheckpointLeg, ShipmentCheckpoint } from '../types/orderTracking.types';
import type { OrderMutationResult } from '../hooks/useOrderMutation';
import type { AddCheckpointRequest } from '../types/orderTracking.types';
import { formatDateTime, formatUpdater } from '../utils/orderTracking.utils';
import {
  CHECKPOINT_CITY_MAX_LENGTH,
  CHECKPOINT_PLACE_MAX_LENGTH,
  toDateTimeLocal,
  validateCheckpoint,
  type CheckpointInput,
} from '../utils/returnForms';

interface Props {
  checkpoints: ShipmentCheckpoint[];
  /** Leg a new checkpoint would join in the current status, or null when none can be added now. */
  openLeg: CheckpointLeg | null;
  /** May add (staff or rider route — decided by the page). */
  canAdd: boolean;
  /** May delete (CUSTOMER_ORDER_TRACKING_UPDATE), only on the leg that is still under way. */
  canDelete: boolean;
  isSubmitting: boolean;
  onAdd: (payload: AddCheckpointRequest) => Promise<OrderMutationResult>;
  onDelete: (checkpointId: number) => Promise<OrderMutationResult>;
}

const LEG_LABEL: Record<CheckpointLeg, string> = { DELIVERY: 'Delivery', RETURN: 'Return' };
const EVENT_LABEL: Record<CheckpointEvent, string> = { ARRIVED: 'Reached', DEPARTED: 'Left' };
const EMPTY: CheckpointInput = { event: 'ARRIVED', place: '', city: '', pincode: '', occurredAt: '' };

const describe = (checkpoint: ShipmentCheckpoint) => `${EVENT_LABEL[checkpoint.event]} ${checkpoint.place}`;

/**
 * Hub checkpoints TinQa's own delivery team records: "Reached <place>" / "Left <place>", any number per day, per leg.
 * The customer sees them on their tracking page. Data comes with the order detail; nothing is fetched here.
 */
export const CheckpointsPanel: React.FC<Props> = ({ checkpoints, openLeg, canAdd, canDelete, isSubmitting, onAdd, onDelete }) => {
  const [input, setInput] = useState<CheckpointInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<ShipmentCheckpoint | null>(null);
  const showForm = canAdd && !!openLeg;

  const byLeg = useMemo(
    () =>
      (['DELIVERY', 'RETURN'] as CheckpointLeg[])
        .map((leg) => ({ leg, items: checkpoints.filter((c) => c.leg === leg) }))
        .filter((group) => group.items.length > 0),
    [checkpoints]
  );

  if (!showForm && byLeg.length === 0) return null;

  const set = (field: keyof CheckpointInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const checked = validateCheckpoint(input, new Date());
    if (checked.errors) {
      setErrors(checked.errors);
      return;
    }
    const result = await onAdd(checked.payload);
    if (result.ok) {
      setInput(EMPTY);
      setErrors({});
    } else setErrors(result.fieldErrors);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await onDelete(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <section aria-label="Hub checkpoints" className="apple-card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-black dark:text-white">Hub checkpoints</h2>

      {byLeg.length === 0 && <p className="text-gray-500">No checkpoints yet.</p>}
      {byLeg.map(({ leg, items }) => (
        <div key={leg} className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{LEG_LABEL[leg]}</h3>
          <ol aria-label={`${LEG_LABEL[leg]} checkpoints`} className="space-y-2">
            {items.map((checkpoint) => {
              const Icon = checkpoint.event === 'ARRIVED' ? MapPinCheck : LogOut;
              const deletable = canDelete && openLeg === leg;
              return (
                <li key={checkpoint.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
                  <Icon
                    className={`w-4 h-4 mt-px shrink-0 ${checkpoint.event === 'ARRIVED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-black dark:text-white break-words">
                      {describe(checkpoint)}
                      {(checkpoint.city || checkpoint.pincode) && (
                        <span className="font-normal text-gray-500">
                          {' '}
                          · {[checkpoint.city, checkpoint.pincode && `PIN ${checkpoint.pincode}`].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </p>
                    <p className="text-gray-500">
                      {formatDateTime(checkpoint.occurredAt)} by{' '}
                      <span className={checkpoint.recordedBy ? 'font-semibold' : 'italic'}>{formatUpdater(checkpoint.recordedBy)}</span>
                    </p>
                  </div>
                  {deletable && (
                    <button
                      type="button"
                      aria-label={`Delete checkpoint ${describe(checkpoint)}`}
                      onClick={() => setPendingDelete(checkpoint)}
                      disabled={isSubmitting}
                      className={`p-1.5 rounded-lg cursor-pointer disabled:opacity-50 ${ICON_DANGER}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}

      {showForm && (
        <form onSubmit={handleSubmit} noValidate aria-label="Add checkpoint" className="space-y-3 pt-3 border-t border-black/5 dark:border-white/10">
          <p className="text-[11px] text-gray-500">
            Add a checkpoint to the {LEG_LABEL[openLeg!].toLowerCase()} trip. The customer sees it on their tracking page.
          </p>
          <div role="radiogroup" aria-label="Checkpoint" className="flex gap-2">
            {(['ARRIVED', 'DEPARTED'] as CheckpointEvent[]).map((event) => {
              const active = input.event === event;
              return (
                <button
                  key={event}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isSubmitting}
                  onClick={() => set('event', event)}
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                    active ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle
                  }`}
                >
                  {EVENT_LABEL[event]}
                </button>
              );
            })}
          </div>
          <CommonInput
            label="Place"
            required
            maxLength={CHECKPOINT_PLACE_MAX_LENGTH}
            placeholder="e.g. Lucknow hub"
            value={input.place}
            error={errors.place}
            disabled={isSubmitting}
            onChange={(e) => set('place', e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CommonInput
              label="City (optional)"
              aria-label="City"
              maxLength={CHECKPOINT_CITY_MAX_LENGTH}
              value={input.city}
              error={errors.city}
              disabled={isSubmitting}
              onChange={(e) => set('city', e.target.value)}
            />
            <CommonInput
              label="PIN code (optional)"
              aria-label="PIN code"
              inputMode="numeric"
              maxLength={6}
              value={input.pincode}
              error={errors.pincode}
              disabled={isSubmitting}
              onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <CommonInput
            label="Time (optional, defaults to now)"
            aria-label="Time"
            type="datetime-local"
            max={toDateTimeLocal(new Date())}
            value={input.occurredAt}
            error={errors.occurredAt}
            disabled={isSubmitting}
            onChange={(e) => set('occurredAt', e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !input.place.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add checkpoint
            </button>
          </div>
        </form>
      )}

      <ConfirmationModal
        isOpen={!!pendingDelete}
        actionType="DELETE"
        title="Delete this checkpoint?"
        description={pendingDelete ? `"${describe(pendingDelete)}" will be removed from the order and from the customer's tracking page.` : ''}
        confirmLabel="Delete checkpoint"
        isSubmitting={isSubmitting}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
};
