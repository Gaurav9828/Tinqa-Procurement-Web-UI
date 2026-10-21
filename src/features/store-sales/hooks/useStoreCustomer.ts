import { useCallback, useState } from 'react';
import { storeSaleApi } from '../api/storeSaleApi';
import type { StoreAddressRequest, StoreCustomer, StoreCustomerRequest } from '../types/storeSale.types';
import { toAddressPayload, toCustomerPayload, toStorePhone } from '../utils/storeSale.utils';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode } from '../../../utils/apiError';

/**
 * The customer a sale is for: found by exact mobile number or email (agents look customers up, never browse them),
 * or registered at the counter. Results and failures go through the global alert.
 */
export const useStoreCustomer = () => {
  const { can } = useAccess();
  const canRegister = can('STORE_CUSTOMER_REGISTER');
  const notify = useNotify();
  const action = useApiAction();
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  /** The last lookup found nobody: offer to register them. */
  const [notFound, setNotFound] = useState(false);

  const lookup = useCallback(
    async (typed: string) => {
      const value = typed.trim();
      if (!value) return;
      setIsLooking(true);
      setNotFound(false);
      try {
        const res = await storeSaleApi.findCustomer(value.includes('@') ? value : toStorePhone(value));
        if (res.success && res.data) setCustomer(res.data);
        else notify.error(res, 'The customer could not be looked up.');
      } catch (err: unknown) {
        if (getApiErrorCode(err) === 'CUSTOMER_NOT_FOUND') {
          setCustomer(null);
          setNotFound(true);
        } else {
          notify.error(err, 'The customer could not be looked up.');
        }
      } finally {
        setIsLooking(false);
      }
    },
    [notify]
  );

  const register = useCallback(
    async (form: StoreCustomerRequest): Promise<boolean> => {
      const created: { customer: StoreCustomer | null } = { customer: null };
      const ok = await action.run(
        async () => {
          const res = await storeSaleApi.registerCustomer(toCustomerPayload(form));
          created.customer = res.data ?? null;
          return res;
        },
        { success: 'Customer registered.', failure: 'The customer could not be registered.' }
      );
      if (ok && created.customer) {
        setCustomer(created.customer);
        setNotFound(false);
      }
      return ok;
    },
    [action]
  );

  const addAddress = useCallback(
    async (address: StoreAddressRequest): Promise<boolean> => {
      if (!customer) return false;
      const updated: { customer: StoreCustomer | null } = { customer: null };
      const ok = await action.run(
        async () => {
          const res = await storeSaleApi.addAddress(customer.id, toAddressPayload(address));
          updated.customer = res.data ?? null;
          return res;
        },
        { success: 'Address added.', failure: 'The address could not be added.' }
      );
      if (ok && updated.customer) setCustomer(updated.customer);
      return ok;
    },
    [action, customer]
  );

  const clear = useCallback(() => {
    setCustomer(null);
    setNotFound(false);
  }, []);

  return { customer, notFound, isLooking, isSaving: action.isSubmitting, canRegister, lookup, register, addAddress, clear };
};
