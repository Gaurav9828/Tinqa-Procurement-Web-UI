import { useCallback, useState } from 'react';
import { customersApi } from '../api/customersApi';
import type { CustomerDetail, CustomerEditForm, CustomerField } from '../types/customer.types';
import { toUpdatePayload } from '../utils/customer.utils';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { getApiFieldErrors } from '../../../utils/apiError';

/**
 * Changing a customer's details. A Super Admin (CUSTOMER_UPDATE) saves the change at once; customer care
 * (CUSTOMER_CHANGE_REQUEST) sends it to the Super Admin as a notification instead. Results go through the global alert.
 */
export const useCustomerChanges = (customer: CustomerDetail | null, onSaved: (updated: CustomerDetail) => void) => {
  const { can } = useAccess();
  const canEdit = can('CUSTOMER_UPDATE');
  const canRequest = can('CUSTOMER_CHANGE_REQUEST');
  const action = useApiAction();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const save = useCallback(
    async (changes: Partial<Record<CustomerField, string>>, form: CustomerEditForm): Promise<boolean> => {
      if (!customer) return false;
      setServerErrors({});
      const saved: { customer: CustomerDetail | null } = { customer: null };
      const ok = await action.run(
        async () => {
          const res = await customersApi.update(customer.id, toUpdatePayload(changes, form.reason));
          saved.customer = res.data ?? null;
          return res;
        },
        { success: 'Customer details updated.', failure: 'The details could not be saved.', onError: (err) => setServerErrors(getApiFieldErrors(err)) }
      );
      if (ok && saved.customer) onSaved(saved.customer);
      return ok;
    },
    [action, customer, onSaved]
  );

  const request = useCallback(
    async (changes: Partial<Record<CustomerField, string>>, form: CustomerEditForm): Promise<boolean> => {
      if (!customer) return false;
      setServerErrors({});
      return action.run(
        () => customersApi.requestChange({ customerId: customer.id, customerName: customer.name, changes, reason: form.reason.trim() }),
        {
          success: 'Change requested. A Super Admin has been notified.',
          failure: 'The change could not be requested.',
          onError: (err) => setServerErrors(getApiFieldErrors(err)),
        }
      );
    },
    [action, customer]
  );

  return {
    canEdit,
    canRequest,
    isSubmitting: action.isSubmitting,
    serverErrors,
    clearServerErrors: () => setServerErrors({}),
    submit: canEdit ? save : request,
  };
};
