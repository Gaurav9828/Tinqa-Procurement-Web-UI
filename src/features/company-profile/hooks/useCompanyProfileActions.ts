import { useCallback, useState } from 'react';
import axios from 'axios';
import { companyProfileApi } from '../api/companyProfileApi';
import type { CompanyProfileFields, CompanyProfileVersion, SaveDraftRequest } from '../types/companyProfile.types';
import type { ApiResponse } from '../../../types/common.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiFieldErrors, parseApiError } from '../../../utils/apiError';
import { ERROR_MESSAGES } from '../utils/companyProfile.utils';

export interface ActionResult {
  ok: boolean;
  version?: CompanyProfileVersion;
  /** Backend errorCode, e.g. CONCURRENT_UPDATE. */
  code?: string | null;
  /** VALIDATION_FAILED field errors keyed by field path ("address.postalCode", "invoiceTerms[2]"). */
  fieldErrors?: Record<string, string>;
}

/** 409s mean the server state moved on: the caller re-fetches. */
const STALE_CODES = new Set(['PENDING_CHANGE_EXISTS', 'INVALID_STATE_TRANSITION', 'CONCURRENT_UPDATE']);

/**
 * Every company-profile mutation. Outcomes are reported through the global alert; 403s are shown as
 * permission errors (the shared client never logs out on 403). `onStale` runs after any 409.
 */
export const useCompanyProfileActions = ({ onStale }: { onStale?: () => void } = {}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const notify = useNotify();

  const perform = useCallback(
    async (
      name: string,
      call: () => Promise<ApiResponse<CompanyProfileVersion>>,
      messages: { success?: string; failure: string }
    ): Promise<ActionResult> => {
      setBusy(name);
      try {
        const res = await call();
        if (!res.success || !res.data) {
          notify.error(res, messages.failure);
          return { ok: false, code: parseApiError(res).errorCode, fieldErrors: getApiFieldErrors(res) };
        }
        if (messages.success) notify.success(messages.success);
        return { ok: true, version: res.data };
      } catch (err: unknown) {
        const parsed = parseApiError(err, messages.failure);
        const code = parsed.errorCode;
        // Prefer the server's text; use the documented wording only when a known code came without one.
        const body = axios.isAxiosError(err) ? (err.response?.data as { message?: unknown } | undefined) : undefined;
        const hasServerText = (typeof body?.message === 'string' && body.message.trim() !== '') || parsed.errors.length > 0;
        notify.error(!hasServerText && code && ERROR_MESSAGES[code] ? ERROR_MESSAGES[code] : err, messages.failure);
        if (code && STALE_CODES.has(code)) onStale?.();
        return { ok: false, code, fieldErrors: getApiFieldErrors(err) };
      } finally {
        setBusy(null);
      }
    },
    [notify, onStale]
  );

  return {
    /** Name of the action in flight (buttons are disabled meanwhile — no double submits). */
    busy,
    createDraft: (body: CompanyProfileFields | { copyFromLive: true }) =>
      perform('create', () => companyProfileApi.createDraft(body), { success: 'Draft created.', failure: 'Could not create the draft.' }),
    saveDraft: (id: number, body: SaveDraftRequest, success = 'Draft saved.') =>
      perform('save', () => companyProfileApi.saveDraft(id, body), { success, failure: 'Could not save the draft.' }),
    submitDraft: (id: number) =>
      perform('submit', () => companyProfileApi.submitDraft(id), {
        success: 'Submitted for approval. The live profile stays unchanged until a Level 2 admin approves it.',
        failure: 'Could not submit the draft.',
      }),
    withdraw: (id: number) =>
      perform('withdraw', () => companyProfileApi.withdraw(id), { success: 'Request withdrawn.', failure: 'Could not withdraw the request.' }),
    approve: (id: number) =>
      perform('approve', () => companyProfileApi.approve(id), {
        success: 'Approved. The new company profile is live.',
        failure: 'Could not approve the change.',
      }),
    reject: (id: number, comment: string) =>
      perform('reject', () => companyProfileApi.reject(id, comment), {
        success: 'Change rejected. The maker can see your comment.',
        failure: 'Could not reject the change.',
      }),
  };
};
