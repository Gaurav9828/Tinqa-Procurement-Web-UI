import { useCallback, useEffect, useState } from 'react';
import { barcodeApi } from '../api/barcodeApi';
import type { BarcodeDecision, BarcodeRequest, CreateBarcodeRequest } from '../types/barcode.types';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useNotify } from '../../../hooks/useNotify';

/** Asking for a barcode change. A Super Admin's own request is applied straight away (the server says which). */
export const useBarcodeRequestAction = () => {
  const { isSubmitting, run } = useApiAction();
  const submit = (payload: CreateBarcodeRequest) =>
    run(() => barcodeApi.createRequest(payload), { success: 'Barcode request sent.', failure: 'The barcode request was not accepted.' });
  return { isSubmitting, submit };
};

/** The barcode requests waiting for a Super Admin (BARCODE_APPROVE); nothing loads for anyone else. */
export const useBarcodeRequests = (options: { quiet?: boolean } = {}) => {
  const { can } = useAccess();
  const allowed = can('BARCODE_APPROVE');
  const notify = useNotify();
  const quiet = options.quiet ?? false;
  // null until the first load has answered; `version` asks for a fresh load
  const [requests, setRequests] = useState<BarcodeRequest[] | null>(null);
  const [version, setVersion] = useState(0);
  const { isSubmitting, run } = useApiAction();

  useEffect(() => {
    if (!allowed) return;
    let current = true;
    const fail = (err: unknown) => {
      if (current && !quiet) notify.error(err, 'Barcode requests could not be loaded.');
    };
    barcodeApi.getRequests('PENDING').then(
      (res) => {
        if (!res.success) fail(res);
        if (current) setRequests(res.success ? res.data ?? [] : []);
      },
      (err: unknown) => {
        fail(err);
        if (current) setRequests([]);
      }
    );
    return () => {
      current = false;
    };
  }, [allowed, version, notify, quiet]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const decide = async (request: BarcodeRequest, decision: BarcodeDecision): Promise<boolean> => {
    const ok = await run(() => barcodeApi.decide(request.id, decision), {
      success: decision.decision === 'APPROVED' ? 'Barcode request approved.' : 'Barcode request rejected.',
      failure: 'The decision could not be recorded.',
    });
    if (ok) refresh();
    return ok;
  };

  const list = requests ?? [];
  return { allowed, requests: list, count: list.length, isLoading: allowed && requests === null, isSubmitting, refresh, decide };
};
