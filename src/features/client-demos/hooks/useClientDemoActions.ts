import { useCallback, useRef, useState } from 'react';
import { clientDemoApi } from '../api/clientDemoApi';
import type { ApiResponse } from '../../../types/common.types';
import type { DemoDetail, DemoMode, DemoPayload, ExpensePayload } from '../types/clientDemo.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind } from '../../../utils/apiErrorKind';

/**
 * Every demo action: one in flight at a time, the outcome through the global alert (the server's message). A demo
 * the server returns is handed to `onDemo` so the page shows it without another request; when the server refused
 * because the demo changed meanwhile, `onStale` reloads it.
 */
export const useClientDemoActions = (mode: DemoMode, onDemo: (demo: DemoDetail) => void, onStale: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const notify = useNotify();

  const run = useCallback(
    async (call: () => Promise<ApiResponse<DemoDetail>>, success: string, failure: string, quiet = false): Promise<DemoDetail | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const res = await call();
        if (!res.success || !res.data) {
          notify.error(res, failure);
          return null;
        }
        if (!quiet) notify.success(res.message || success);
        onDemo(res.data);
        return res.data;
      } catch (err: unknown) {
        notify.error(err, failure);
        const kind = getApiErrorKind(err);
        if (kind === 'conflict' || kind === 'notFound') onStale();
        return null;
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [notify, onDemo, onStale]
  );

  /**
   * Adds or changes a bill, then attaches its invoice file when one was chosen. The new bill is the one that wasn't
   * there before.
   */
  const saveBill = useCallback(
    async (demo: DemoDetail, expenseId: number | null, payload: ExpensePayload, file: File | null): Promise<boolean> => {
      const before = new Set(demo.expenses.map((expense) => expense.id));
      const saved = await run(
        () => (expenseId === null ? clientDemoApi.addExpense(mode, demo.id, payload) : clientDemoApi.updateExpense(mode, demo.id, expenseId, payload)),
        expenseId === null ? 'Bill added.' : 'Bill updated.',
        expenseId === null ? 'The bill could not be added.' : 'The bill could not be updated.',
        file !== null
      );
      if (!saved) return false;
      if (!file) return true;
      const id = expenseId ?? saved.expenses.find((expense) => !before.has(expense.id))?.id;
      if (id === undefined) return true;
      const attached = await run(() => clientDemoApi.attachInvoice(mode, demo.id, id, file), 'Bill saved with its invoice.',
        'The bill was saved, but its invoice could not be attached. Try attaching it again.');
      return attached !== null;
    },
    [mode, run]
  );

  return {
    isSubmitting,
    saveBill,
    attachInvoice: (demoId: number, expenseId: number, file: File) =>
      run(() => clientDemoApi.attachInvoice(mode, demoId, expenseId, file), 'Invoice attached.', 'The invoice could not be attached.'),
    removeBill: (demoId: number, expenseId: number, reason: string | null) =>
      run(() => clientDemoApi.removeExpense(mode, demoId, expenseId, reason), 'Bill removed.', 'The bill could not be removed.'),
    update: (demoId: number, payload: DemoPayload) =>
      run(() => clientDemoApi.update(demoId, payload), 'Demo updated.', 'The demo could not be updated.'),
    submit: (demoId: number) => run(() => clientDemoApi.submit(demoId), 'Quotation sent for approval.', 'The quotation could not be sent.'),
    complete: (demoId: number, outcome: string) =>
      run(() => clientDemoApi.complete(demoId, outcome), 'Completion sent for approval.', 'The completion could not be sent.'),
    withdraw: (demoId: number) => run(() => clientDemoApi.withdraw(demoId), 'Withdrawn from approval.', 'It could not be withdrawn.'),
    cancel: (demoId: number, reason: string) => run(() => clientDemoApi.cancel(demoId, reason), 'Demo cancelled.', 'The demo could not be cancelled.'),
    decide: (demoId: number, decision: 'APPROVED' | 'REJECTED', reason: string | null) =>
      run(() => clientDemoApi.decide(demoId, decision, reason), decision === 'APPROVED' ? 'Approved.' : 'Rejected.',
        decision === 'APPROVED' ? 'It could not be approved.' : 'It could not be rejected.'),
    handOut: (demoId: number, barcodes: string[]) =>
      run(() => clientDemoApi.handOut(mode, demoId, barcodes), 'Handed out: the units are out of stock until they come back.',
        'The units could not be handed out.'),
    handBack: (demoId: number, barcodes: string[]) =>
      run(() => clientDemoApi.handBack(mode, demoId, barcodes), 'Handed back: the units are in stock again.', 'The units could not be handed back.'),
    writeOff: (demoId: number, barcode: string, reason: string) =>
      run(() => clientDemoApi.writeOff(demoId, barcode, reason), 'Unit written off.', 'The unit could not be written off.'),
    reopen: (demoId: number, reason: string) =>
      run(() => clientDemoApi.reopen(demoId, reason), 'Reopened for correction.', 'The demo could not be reopened.'),
  };
};
