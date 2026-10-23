import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { useCustomer } from '../hooks/useCustomer';
import { useCustomerChanges } from '../hooks/useCustomerChanges';
import { CustomerProfileCard } from '../components/CustomerProfileCard';
import { CustomerOrdersSection } from '../components/CustomerOrdersSection';
import { CustomerCartSection } from '../components/CustomerCartSection';
import { CustomerTicketsSection } from '../components/CustomerTicketsSection';
import { CustomerTimeline } from '../components/CustomerTimeline';
import { CustomerChangeModal } from '../components/CustomerChangeModal';
import { SectionState } from '../components/SectionState';
import { CUSTOMERS_PATH, buildTimeline } from '../utils/customer.utils';
import { orderDetailPath } from '../../order-tracking/utils/orderTrackingRoutes';
import { ticketDetailPath } from '../../support-tickets/utils/supportTicket.utils';
import { useAccess } from '../../../hooks/useAccess';

const CustomerView: React.FC<{ customerId: number }> = ({ customerId }) => {
  const data = useCustomer(customerId);
  const changes = useCustomerChanges(data.customer, data.applyCustomer);
  const { can } = useAccess();
  const canOpenOrder = can('CUSTOMER_ORDER_VIEW');
  const canOpenTicket = can('SUPPORT_TICKET_VIEW');
  const [changing, setChanging] = useState(false);

  const timeline = useMemo(
    () =>
      data.customer
        ? buildTimeline(data.customer, data.orders, data.cart, data.tickets, {
            order: canOpenOrder ? orderDetailPath : undefined,
            ticket: canOpenTicket ? ticketDetailPath : undefined,
          })
        : [],
    [data.customer, data.orders, data.cart, data.tickets, canOpenOrder, canOpenTicket]
  );

  if (!data.customer) {
    return (
      <div className="apple-card">
        <SectionState isLoading={data.detailLoading} errorKind={data.detailError} onRetry={data.retryDetail} />
      </div>
    );
  }

  return (
    <>
      <CustomerProfileCard
        customer={data.customer}
        canEdit={changes.canEdit}
        canRequest={changes.canRequest}
        onChange={() => {
          changes.clearServerErrors();
          setChanging(true);
        }}
      />
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <CustomerOrdersSection
            orders={data.orders}
            total={data.ordersTotal}
            page={data.ordersPage}
            totalPages={data.ordersTotalPages}
            isLoading={data.ordersLoading}
            errorKind={data.ordersError}
            canOpenOrder={canOpenOrder}
            onPage={data.setOrdersPage}
            onRetry={data.retryOrders}
          />
          <CustomerCartSection items={data.cart} isLoading={data.cartLoading} errorKind={data.cartError} onRetry={data.retryCart} />
          <CustomerTicketsSection
            tickets={data.tickets}
            total={data.ticketsTotal}
            isLoading={data.ticketsLoading}
            errorKind={data.ticketsError}
            canOpenTicket={canOpenTicket}
            onRetry={data.retryTickets}
          />
        </div>
        <CustomerTimeline events={timeline} />
      </div>
      {changing && (
        <CustomerChangeModal
          customer={data.customer}
          mode={changes.canEdit ? 'edit' : 'request'}
          busy={changes.isSubmitting}
          serverErrors={changes.serverErrors}
          onSubmit={changes.submit}
          onClose={() => setChanging(false)}
        />
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={data.refreshAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
    </>
  );
};

/** One customer: /customers/:customerId. Profile, orders, cart, tickets and activity; edit or request a change. */
export const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams();
  const id = Number(customerId);
  const valid = Number.isInteger(id) && id > 0;

  return (
    <div className="p-6 space-y-6">
      <Link to={CUSTOMERS_PATH} className="inline-flex items-center gap-1 text-xs text-[#0071e3] hover:underline">
        <ChevronLeft className="w-3.5 h-3.5" /> All customers
      </Link>
      {valid ? (
        // Keyed so moving to another customer starts from a clean page
        <CustomerView key={id} customerId={id} />
      ) : (
        <div className="apple-card">
          <SectionState errorKind="notFound" />
        </div>
      )}
    </div>
  );
};
