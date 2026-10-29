import { useCallback, useState } from 'react';
import { clientDemoApi } from '../api/clientDemoApi';
import type { ApiResponse } from '../../../types/common.types';
import type { DemoDetail, DemoPayload } from '../types/clientDemo.types';
import { useNotify } from '../../../hooks/useNotify';

/** Raised inside `save` when the server refuses a step, so the rest is skipped. */
class StepFailed extends Error {
  readonly response: unknown;
  readonly failure: string;

  constructor(response: unknown, failure: string) {
    super(failure);
    this.response = response;
    this.failure = failure;
  }
}

const dataOf = async <T,>(call: Promise<ApiResponse<T>>, failure: string): Promise<T> => {
  const res = await call;
  if (!res.success || res.data === null || res.data === undefined) throw new StepFailed(res, failure);
  return res.data;
};

/** The ids of the bills a save created, oldest first: the plan's new bills, in the order they were sent. */
const createdBillIds = (saved: DemoDetail, knownIds: ReadonlySet<number>): number[] =>
  saved.expenses.filter((expense) => expense.kind !== 'OTHER' && !knownIds.has(expense.id))
    .map((expense) => expense.id).sort((a, b) => a - b);

/** Attaches each chosen invoice to its planned bill: `files[i]` belongs to `payload.plannedBills[i]`. */
const attachInvoices = async (saved: DemoDetail, payload: DemoPayload, files: (File | null)[], knownIds: ReadonlySet<number>) => {
  const created = createdBillIds(saved, knownIds);
  let nextCreated = 0;
  const bills = payload.plannedBills ?? [];
  for (let index = 0; index < bills.length; index++) {
    const billId = bills[index].id ?? created[nextCreated++];
    const file = files[index];
    if (file && billId !== undefined) {
      await dataOf(clientDemoApi.attachInvoice('manager', saved.id, billId, file),
        `${saved.reference} was saved, but the invoice ${file.name} could not be attached. Attach it on the demo's page.`);
    }
  }
};

/**
 * Saves the scheduling wizard: the plan with its day-by-day stays and meals in one request, then the invoices chosen in
 * the quotation, then — when asked — sends the quotation for approval. `files[i]` is the invoice of
 * `payload.plannedBills[i]`; `knownIds` are the bills the demo had before. Returns the demo's id once it exists (so the
 * page can open it even if a later step failed), or null when nothing was saved.
 */
export const useDemoWizardSave = () => {
  const notify = useNotify();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (id: number | null, payload: DemoPayload, files: (File | null)[], knownIds: ReadonlySet<number>, sendForApproval: boolean): Promise<number | null> => {
      setIsSaving(true);
      let saved: DemoDetail | null = null;
      try {
        saved = await dataOf(id === null ? clientDemoApi.create(payload) : clientDemoApi.update(id, payload),
          id === null ? 'The demo could not be saved.' : 'The demo could not be updated.');
        await attachInvoices(saved, payload, files, knownIds);
        if (sendForApproval) {
          await dataOf(clientDemoApi.submit(saved.id), `${saved.reference} was saved as a draft, but the quotation could not be sent.`);
          notify.success(`${saved.reference} saved and sent for approval.`);
        } else {
          notify.success(id === null ? `${saved.reference} saved as a draft.` : `${saved.reference} updated.`);
        }
        return saved.id;
      } catch (err: unknown) {
        if (err instanceof StepFailed) notify.error(err.response, err.failure);
        else notify.error(err, saved ? `${saved.reference} was saved, but not everything went through.` : 'The demo could not be saved.');
        return saved?.id ?? null;
      } finally {
        setIsSaving(false);
      }
    },
    [notify]
  );

  return { save, isSaving };
};
