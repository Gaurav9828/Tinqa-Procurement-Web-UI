import { useCallback, useMemo, useState } from 'react';
import { storeSaleApi } from '../api/storeSaleApi';
import type { StorePaymentMethod, StoreQuote, StoreSale } from '../types/storeSale.types';
import { useApiAction } from '../../../hooks/useApiAction';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode } from '../../../utils/apiError';
import { MAX_QUANTITY_PER_PRODUCT } from '../utils/storeSale.constants';

const PRICE_CHANGED = 'CONFLICT_PRICE_CHANGED';

/**
 * The cart of a store sale and its booking. The total always comes from the server (POST /quote) and is fetched only
 * when the agent asks for it; any change to the cart drops it, so a sale is never booked on a stale total.
 */
export const useStoreSaleCheckout = (onBooked?: (sale: StoreSale) => void) => {
  const notify = useNotify();
  const action = useApiAction();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [quote, setQuote] = useState<StoreQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  const lines = useMemo(
    () => Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId: Number(productId), quantity })),
    [quantities]
  );

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setQuantities((current) => ({ ...current, [productId]: Math.max(0, Math.min(MAX_QUANTITY_PER_PRODUCT, quantity)) }));
    setQuote(null);
  }, []);

  const reset = useCallback(() => {
    setQuantities({});
    setQuote(null);
  }, []);

  const requestQuote = useCallback(async () => {
    if (lines.length === 0) return;
    setIsQuoting(true);
    try {
      const res = await storeSaleApi.quote(lines);
      if (res.success && res.data) setQuote(res.data);
      else notify.error(res, 'The total could not be worked out.');
    } catch (err: unknown) {
      notify.error(err, 'The total could not be worked out.');
    } finally {
      setIsQuoting(false);
    }
  }, [lines, notify]);

  const book = useCallback(
    async (details: { customerId: number; addressId: number; paymentMethod: StorePaymentMethod; notes: string; receiptNumber: string }) => {
      if (!quote) return false;
      const booked: { sale: StoreSale | null } = { sale: null };
      const ok = await action.run(
        async () => {
          const res = await storeSaleApi.placeOrder({
            customerId: details.customerId,
            addressId: details.addressId,
            paymentMethod: details.paymentMethod,
            items: lines,
            totalAmount: quote.totalAmount,
            shippingFee: quote.shippingFee,
            notes: details.notes.trim() || undefined,
            cashReceiptNumber: details.paymentMethod === 'CASH' ? details.receiptNumber.trim() || undefined : undefined,
          });
          booked.sale = res.data ?? null;
          return res;
        },
        {
          success: 'Order booked.',
          failure: 'The order could not be booked.',
          // The price or shipping changed since the quote: show the new total to agree with the customer
          onError: (err) => {
            if (getApiErrorCode(err) === PRICE_CHANGED) {
              setQuote(null);
              void requestQuote();
            }
          },
        }
      );
      if (ok && booked.sale) {
        reset();
        onBooked?.(booked.sale);
      }
      return ok;
    },
    [action, lines, onBooked, quote, requestQuote, reset]
  );

  return { quantities, lines, quote, isQuoting, isBooking: action.isSubmitting, setQuantity, requestQuote, book, reset };
};
