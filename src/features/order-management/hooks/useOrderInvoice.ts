import { useCallback, useEffect, useState } from 'react';
import { orderApi } from '../api/orderApi';
import type { OrderInvoice } from '../types/order.types';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';

/** Only PDFs are read and checked; the server refuses anything else. */
export const INVOICE_ACCEPT = 'application/pdf,.pdf';
export const INVOICE_MAX_BYTES = 25 * 1024 * 1024;

/**
 * The supplier's invoice of a procurement order: loads it (PROCUREMENT_ORDER_VIEW) only while `enabled`, uploads a new
 * one (PROCUREMENT_ORDER_UPDATE_STATUS) and downloads the stored PDF. Errors and results go to the global alert.
 */
export const useOrderInvoice = (orderId: number | null, enabled: boolean) => {
  const { can } = useAccess();
  const notify = useNotify();
  // Keyed by order, so another order's invoice is never shown and loading follows from what has arrived
  const [loaded, setLoaded] = useState<{ orderId: number; invoice: OrderInvoice | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const canView = can('PROCUREMENT_ORDER_VIEW');
  const canUpload = can('PROCUREMENT_ORDER_UPDATE_STATUS');
  const active = enabled && orderId !== null && canView;
  const invoice = active && loaded?.orderId === orderId ? loaded.invoice : null;
  const loading = active && loaded?.orderId !== orderId;

  useEffect(() => {
    if (!active || orderId === null) return;
    let current = true;
    orderApi
      .getInvoice(orderId)
      .then((res) => {
        if (current) setLoaded({ orderId, invoice: res.success ? res.data ?? null : null });
      })
      .catch((err: unknown) => {
        if (!current) return;
        setLoaded({ orderId, invoice: null });
        notify.error(err, "Couldn't load the supplier's invoice.");
      });
    return () => {
      current = false;
      // Reopened later, the order is read again rather than shown as it was
      setLoaded(null);
    };
  }, [orderId, active, notify]);

  const upload = useCallback(
    async (file: File): Promise<OrderInvoice | null> => {
      if (orderId === null || !canUpload) return null;
      if (!/\.pdf$/i.test(file.name)) {
        notify.error("Upload the supplier's invoice as a PDF.");
        return null;
      }
      if (file.size > INVOICE_MAX_BYTES) {
        notify.error('The invoice is larger than 25 MB.');
        return null;
      }
      setUploading(true);
      try {
        const res = await orderApi.uploadInvoice(orderId, file);
        if (!res.success || !res.data) {
          notify.error(res, "Couldn't upload the invoice.");
          return null;
        }
        setLoaded({ orderId, invoice: res.data });
        if (res.data.matched) notify.success(res.message || 'Invoice matches the quotation.');
        else notify.warning(res.message || 'The invoice needs a check before the order can be delivered.');
        return res.data;
      } catch (err: unknown) {
        notify.error(err, "Couldn't upload the invoice.");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [orderId, canUpload, notify]
  );

  const download = useCallback(async () => {
    if (orderId === null || !canView) return;
    try {
      const blob = await orderApi.downloadInvoice(orderId);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = invoice?.fileName || `invoice-order-${orderId}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      notify.error(err, "Couldn't download the invoice.");
    }
  }, [orderId, canView, invoice, notify]);

  return { invoice, loading, uploading, canUpload, upload, download };
};
