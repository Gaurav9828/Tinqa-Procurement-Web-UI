import React, { useMemo } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { ReturnPanel } from '../../order-tracking/components/ReturnPanel';
import { useOrderReturn } from '../../order-tracking/hooks/useOrderReturn';
import type { ReturnTicketContext } from '../../order-tracking/types/orderTracking.types';
import type { TicketMessage, TicketOrderContext } from '../types/supportTicket.types';

interface Props {
  orderNumber: string;
  order: TicketOrderContext;
  /** The ticket the return is requested from: the customer's reason is one of their messages in it. */
  referenceNumber: string;
  messages: TicketMessage[] | null | undefined;
  ticketClosed: boolean;
  /** Reloads the ticket, which carries the order's return. */
  onChanged: () => void;
}

/**
 * The order's return, right in the support chat. This is the only place a return is requested: Customer Support
 * (REFUND_REQUEST) picks one of the customer's own messages here as their reason. Store Managers (RETURN_ENABLE) decide
 * requests raised by someone else and change the charge. The return comes with the ticket's order context (no extra
 * call); every action reloads the ticket.
 */
export const TicketReturnSection: React.FC<Props> = ({ orderNumber, order, referenceNumber, messages, ticketClosed, onChanged }) => {
  const { can } = useAccess();
  const canManage = can('REFUND_REQUEST');
  const canDecide = can('RETURN_ENABLE');
  const actions = useOrderReturn(orderNumber, { onOrderChanged: onChanged });
  const ticket = useMemo<ReturnTicketContext>(
    () => ({ referenceNumber, messages, closed: ticketClosed }),
    [referenceNumber, messages, ticketClosed]
  );
  if (!canManage && !order.returnInfo) return null;
  return (
    <ReturnPanel
      orderNumber={orderNumber}
      orderStatus={order.status}
      orderAmount={order.orderAmount ?? null}
      shippingFee={order.shippingFee ?? null}
      returnInfo={order.returnInfo ?? null}
      canManage={canManage}
      canDecide={canDecide}
      ticket={ticket}
      actions={actions}
    />
  );
};
