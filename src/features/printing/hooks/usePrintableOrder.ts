import { useEffect, useState } from 'react';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, OrderStatus } from '../../../types/common.types';
import { useAccess } from '../../../hooks/useAccess';
import { dealerPortalApi } from '../../dealer-portal/api/dealerPortalApi';
import { orderApi } from '../../order-management/api/orderApi';
import { dealerApi } from '../../dealer-management/api/dealerApi';
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
 * Everything a printed quotation, purchase order or bill needs. A dealer loads it from their own portal endpoints;
 * staff from the order endpoints (and the dealer's details only when they may view dealers).
 */
export const usePrintableOrder = (orderId: number) => {
  const { can } = useAccess();
  const isDealer = can('DEALER_PORTAL_VIEW');
  const isStaff = can('PROCUREMENT_ORDER_VIEW');
  const canViewDealers = can('DEALER_VIEW');
  const [printable, setPrintable] = useState<Printable | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const load = async (): Promise<Printable> => {
      if (isDealer) {
        const [orderRes, profileRes, company] = await Promise.all([
          dealerPortalApi.getOrder(orderId),
          dealerPortalApi.getProfile(),
          fetchCompany(),
        ]);
        if (!orderRes.success || !orderRes.data) throw new Error(orderRes.message || 'Order not found.');
        const order = orderRes.data;
        const dealer = profileRes.data;
        return {
          order,
          company,
          supplier: {
            name: dealer?.name ?? '',
            tradeName: dealer?.tradeName,
            addressLines: joinAddress([dealer?.street, dealer?.landmark, [dealer?.city, dealer?.state, dealer?.pincode].filter(Boolean).join(', ')]),
            gstin: dealer?.gstin,
            pan: dealer?.panNumber,
            phone: dealer?.phoneNumber,
            email: dealer?.email,
          },
        };
      }
      if (!isStaff) throw new Error("You don't have access to this order.");
      const orderRes = await orderApi.getOrderById(orderId);
      if (!orderRes.success || !orderRes.data) throw new Error(orderRes.message || 'Order not found.');
      const order = orderRes.data;
      const [dealerRes, company] = await Promise.all([
        canViewDealers ? dealerApi.getDealerById(order.dealerId).catch(() => null) : Promise.resolve(null),
        fetchCompany(),
      ]);
      const dealer = dealerRes?.data;
      return {
        order: { ...order, note: typeof order.additionalInfo?.dealerNote === 'string' ? order.additionalInfo.dealerNote : null },
        company,
        supplier: {
          name: dealer?.name ?? order.dealerName,
          tradeName: dealer?.tradeName,
          addressLines: dealer
            ? joinAddress([dealer.street, dealer.landmark, [dealer.city, dealer.state, dealer.pincode].filter(Boolean).join(', ')])
            : [],
          gstin: dealer?.gstin,
          pan: dealer?.panNumber,
          phone: dealer?.phoneNumber,
          email: dealer?.email,
        },
      };
    };
    load()
      .then((result) => current && setPrintable(result))
      .catch((err: unknown) => current && setError(err instanceof Error ? err.message : 'This document could not be loaded.'));
    return () => {
      current = false;
    };
  }, [orderId, isDealer, isStaff, canViewDealers]);

  return { printable, error };
};
