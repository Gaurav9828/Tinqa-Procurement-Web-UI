import type { PaymentMethod } from '../../order-management/utils/paymentPlan';
import { useEffect, useState } from 'react';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, OrderStatus } from '../../../types/common.types';
import { useAccess } from '../../../hooks/useAccess';
import { supplierPortalApi } from '../../supplier-portal/api/supplierPortalApi';
import { orderApi } from '../../order-management/api/orderApi';
import { supplierApi } from '../../supplier-management/api/supplierApi';
import type { CompanyAddress } from '../../company-profile/types/companyProfile.types';

/** The company on the letterhead: GET /company/profile on the storefront backend, public. */
export interface PrintCompany {
  brandName: string | null;
  legalName: string | null;
  logoUrl: string | null;
  gstin: string | null;
  pan: string | null;
  address: CompanyAddress | null;
  supportEmail: string | null;
  supportPhone: string | null;
  website: string | null;
  invoiceTerms: string[] | null;
}

export interface PrintParty {
  name: string;
  tradeName?: string | null;
  addressLines: string[];
  gstin?: string | null;
  pan?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface PrintOrder {
  orderNumber: string;
  orderStatus: OrderStatus;
  itemName: string;
  itemSku?: string | null;
  orderQuantity: number;
  unitType: string;
  unitPrice: number;
  shipmentPrice: number;
  totalPrice: number;
  taxBreakup: Record<string, unknown> | null;
  orderDate: string;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  note?: string | null;
  /** Payment plan (absent on orders made before plans existed) */
  advancePercent?: number | null;
  midtermPercent?: number | null;
  expectedPaymentMethod?: PaymentMethod | null;
}

export interface Printable {
  order: PrintOrder;
  supplier: PrintParty;
  company: PrintCompany | null;
}

const joinAddress = (parts: (string | null | undefined)[]) => parts.filter((part): part is string => !!part && !!part.trim());

const fetchCompany = async (): Promise<PrintCompany | null> => {
  try {
    return (await ecommerceAxiosClient.get<ApiResponse<PrintCompany | null>>('/company/profile')).data.data ?? null;
  } catch {
    // The letterhead is a nicety: the document still prints without it.
    return null;
  }
};

/**
 * Everything a printed quotation, purchase order or bill needs. A supplier loads it from their own portal endpoints;
 * staff from the order endpoints (and the supplier's details only when they may view suppliers).
 */
export const usePrintableOrder = (orderId: number) => {
  const { can } = useAccess();
  const isSupplier = can('SUPPLIER_PORTAL_VIEW');
  const isStaff = can('PROCUREMENT_ORDER_VIEW');
  const canViewSuppliers = can('SUPPLIER_VIEW');
  const [printable, setPrintable] = useState<Printable | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const load = async (): Promise<Printable> => {
      if (isSupplier) {
        const [orderRes, profileRes, company] = await Promise.all([
          supplierPortalApi.getOrder(orderId),
          supplierPortalApi.getProfile(),
          fetchCompany(),
        ]);
        if (!orderRes.success || !orderRes.data) throw new Error(orderRes.message || 'Order not found.');
        const order = orderRes.data;
        const supplier = profileRes.data;
        return {
          order,
          company,
          supplier: {
            name: supplier?.name ?? '',
            tradeName: supplier?.tradeName,
            addressLines: joinAddress([supplier?.street, supplier?.landmark, [supplier?.city, supplier?.state, supplier?.pincode].filter(Boolean).join(', ')]),
            gstin: supplier?.gstin,
            pan: supplier?.panNumber,
            phone: supplier?.phoneNumber,
            email: supplier?.email,
          },
        };
      }
      if (!isStaff) throw new Error("You don't have access to this order.");
      const orderRes = await orderApi.getOrderById(orderId);
      if (!orderRes.success || !orderRes.data) throw new Error(orderRes.message || 'Order not found.');
      const order = orderRes.data;
      const [supplierRes, company] = await Promise.all([
        canViewSuppliers ? supplierApi.getSupplierById(order.supplierId).catch(() => null) : Promise.resolve(null),
        fetchCompany(),
      ]);
      const supplier = supplierRes?.data;
      return {
        order: { ...order, note: typeof order.additionalInfo?.supplierNote === 'string' ? order.additionalInfo.supplierNote : null },
        company,
        supplier: {
          name: supplier?.name ?? order.supplierName,
          tradeName: supplier?.tradeName,
          addressLines: supplier
            ? joinAddress([supplier.street, supplier.landmark, [supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ')])
            : [],
          gstin: supplier?.gstin,
          pan: supplier?.panNumber,
          phone: supplier?.phoneNumber,
          email: supplier?.email,
        },
      };
    };
    load()
      .then((result) => current && setPrintable(result))
      .catch((err: unknown) => current && setError(err instanceof Error ? err.message : 'This document could not be loaded.'));
    return () => {
      current = false;
    };
  }, [orderId, isSupplier, isStaff, canViewSuppliers]);

  return { printable, error };
};
