import { useCallback, useState } from 'react';
import { clientDemoApi } from '../api/clientDemoApi';
import type { ApiResponse } from '../../../types/common.types';
import type { DemoDetail, DemoPayload, ExpensePayload } from '../types/clientDemo.types';
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

/**
 * Saves the scheduling wizard: the plan (new or changed), then a new demo's planned stays as its first bills, then —
 * when asked — sends the quotation for approval. Returns the demo's id once it exists (so the page can open it even if
 * a later step failed), or null when nothing was saved.
 */
export const useDemoWizardSave = () => {
  const notify = useNotify();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (id: number | null, payload: DemoPayload, stays: ExpensePayload[], sendForApproval: boolean): Promise<number | null> => {
      setIsSaving(true);
      let saved: DemoDetail | null = null;
      try {
        saved = await dataOf(id === null ? clientDemoApi.create(payload) : clientDemoApi.update(id, payload),
          id === null ? 'The demo could not be saved.' : 'The demo could not be updated.');
        for (const stay of stays) {
          await dataOf(clientDemoApi.addExpense('manager', saved.id, stay), `The stay at ${stay.vendorName} could not be added. Add it on the demo's page.`);
        }
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
