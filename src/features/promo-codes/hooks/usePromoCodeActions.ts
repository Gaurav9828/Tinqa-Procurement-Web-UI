import { useCallback, useState } from 'react';
import { promoCodesApi } from '../api/promoCodesApi';
import type { PromoCodeDetail, PromoCodeRequest } from '../types/promoCode.types';
import type { ApiResponse } from '../../../types/common.types';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode, getApiFieldErrors } from '../../../utils/apiError';

/**
 * The Super Admin's changes (PROMO_CODE_MANAGE): create, edit, switch off and on, delete and restore; and sharing
 * (PROMO_CODE_SHARE): email a chosen customers' code to them, show an everyone code on the storefront. Results go
 * through the global alert; field errors from the server come back for the form. Without the permission nothing here
 * is ever sent.
 */
export const usePromoCodeActions = () => {
  const { can } = useAccess();
  const canManage = can('PROMO_CODE_MANAGE');
  const canShare = can('PROMO_CODE_SHARE');
  const action = useApiAction();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const onError = useCallback((err: unknown) => {
    const fields = getApiFieldErrors(err);
    if (getApiErrorCode(err) === 'PROMO_CODE_TAKEN') fields.code = 'This code is already taken. Pick another.';
    setServerErrors(fields);
  }, []);

  /** Creates (no id) or saves the code; resolves to the saved detail, or null when it failed. */
  const save = useCallback(
    async (id: number | null, body: PromoCodeRequest): Promise<PromoCodeDetail | null> => {
      if (!canManage) return null;
      setServerErrors({});
      const saved: { detail: PromoCodeDetail | null } = { detail: null };
      const ok = await action.run(
        async () => {
          const res = id === null ? await promoCodesApi.create(body) : await promoCodesApi.update(id, body);
          saved.detail = res.data ?? null;
          return res;
        },
        { success: id === null ? 'Promo code created.' : 'Promo code saved.', failure: 'The promo code could not be saved.', onError }
      );
      return ok ? saved.detail : null;
    },
    [action, canManage, onError]
  );

  /** One change answered with the detail as saved; resolves to it, or null when it failed or isn't allowed. */
  const change = useCallback(
    async (
      call: () => Promise<ApiResponse<PromoCodeDetail>>,
      messages: { success: string; failure: string },
      allowed: boolean = canManage
    ): Promise<PromoCodeDetail | null> => {
      if (!allowed) return null;
      const saved: { detail: PromoCodeDetail | null } = { detail: null };
      const ok = await action.run(async () => {
        const res = await call();
        saved.detail = res.data ?? null;
        return res;
      }, messages);
      return ok ? saved.detail : null;
    },
    [action, canManage]
  );

  /** Switches the code on or off. */
  const setActive = useCallback(
    (id: number, active: boolean) =>
      change(() => promoCodesApi.setActive(id, active), {
        success: active ? 'Promo code switched on.' : 'Promo code switched off.',
        failure: active ? 'The promo code could not be switched on.' : 'The promo code could not be switched off.',
      }),
    [change]
  );

  /** Soft delete: hidden from the list (the Deleted filter shows it) and unusable until restored. */
  const remove = useCallback(
    (id: number) => change(() => promoCodesApi.remove(id), { success: 'Promo code deleted.', failure: 'The promo code could not be deleted.' }),
    [change]
  );

  /** Brings a deleted code back as it was. */
  const restore = useCallback(
    (id: number) => change(() => promoCodesApi.restore(id), { success: 'Promo code restored.', failure: 'The promo code could not be restored.' }),
    [change]
  );

  /** Emails the code to these of its customers (empty: all of them). */
  const share = useCallback(
    (id: number, customerIds: number[]) =>
      change(
        () => promoCodesApi.share(id, customerIds),
        {
          success: customerIds.length === 1 ? 'Promo code emailed to the customer.' : 'Promo code emailed to its customers.',
          failure: 'The promo code could not be emailed.',
        },
        canShare
      ),
    [change, canShare]
  );

  /** Shows an everyone code on the storefront, or stops showing it. */
  const setShownOnStorefront = useCallback(
    (id: number, shown: boolean) =>
      change(
        () => promoCodesApi.setShownOnStorefront(id, shown),
        {
          success: shown ? 'Promo code shown on the storefront.' : 'Promo code removed from the storefront.',
          failure: shown ? 'The promo code could not be shown on the storefront.' : 'The promo code could not be removed from the storefront.',
        },
        canShare
      ),
    [change, canShare]
  );

  return {
    canManage,
    canShare,
    isSubmitting: action.isSubmitting,
    serverErrors,
    clearServerErrors: useCallback(() => setServerErrors({}), []),
    save,
    setActive,
    remove,
    restore,
    share,
    setShownOnStorefront,
  };
};

/**
 * GET /admin/promo-codes/code-suggestion (PROMO_CODE_MANAGE): asked once when the create form opens, and again on
 * "Suggest another". Never for an edit or for someone who can't create codes.
 */
export const useCodeSuggestion = () => {
  const canManage = useAccess().can('PROMO_CODE_MANAGE');
  const notify = useNotify();
  const [isSuggesting, setIsSuggesting] = useState(false);

  const suggest = useCallback(async (): Promise<string | null> => {
    if (!canManage) return null;
    setIsSuggesting(true);
    try {
      const res = await promoCodesApi.suggestCode();
      if (res.success && res.data?.code) return res.data.code;
      notify.error(res, 'No code could be suggested. Type one instead.');
      return null;
    } catch (err: unknown) {
      notify.error(err, 'No code could be suggested. Type one instead.');
      return null;
    } finally {
      setIsSuggesting(false);
    }
  }, [canManage, notify]);

  return { suggest, isSuggesting };
};
