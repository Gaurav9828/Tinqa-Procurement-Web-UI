import React from 'react';
import { Plus } from 'lucide-react';
import { MAX_DAYS, MAX_VISITS, todayIso } from '../../utils/clientDemo';
import { planBlocks, takenFor } from '../../utils/timeBlocks';
import { ClientCard } from './ClientCard';
import { PlanField } from './PlanField';
import type { ClientActions, PlanStepProps } from './planStepProps';

/**
 * Step 1: when the trip starts and how many days it takes, then every client visited, each at its own time (visits on
 * the same day never overlap, nor a journey: time already taken is shaded grey on the clock).
 */
export const ClientsStep: React.FC<PlanStepProps & ClientActions & { isNew: boolean; days: number }> = ({
  isNew,
  days,
  onAddClient,
  onChangeClient,
  onRemoveClient,
  ...props
}) => {
  const { form, errors } = props;
  const blocks = planBlocks(form);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        <PlanField plan={props} name="startDate" label="Start date" required type="date" min={isNew ? todayIso() : undefined} />
        <PlanField plan={props} name="numberOfDays" label="Number of days" required type="number" min={1} max={MAX_DAYS} />
        <p className="text-gray-500 pt-3">A trip can visit several clients, e.g. three hotels over two days.</p>
      </div>
      <div className="space-y-4">
        {form.clients.map((client, index) => (
          <ClientCard key={client.key} client={client} index={index} days={days} startDate={form.startDate} errors={errors}
            taken={takenFor(blocks, `client-${client.key}`, 'busy')}
            removable={form.clients.length > 1} onChange={(patch) => onChangeClient(client.key, patch)} onRemove={() => onRemoveClient(client.key)} />
        ))}
        {errors.clients && <p className="text-rose-500">{errors.clients}</p>}
        <button type="button" onClick={onAddClient} disabled={form.clients.length >= MAX_VISITS}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#0071e3]/40 text-[#0071e3] dark:text-blue-400 font-semibold hover:bg-[#0071e3]/10 cursor-pointer disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" /> Add another client
        </button>
      </div>
    </>
  );
};
