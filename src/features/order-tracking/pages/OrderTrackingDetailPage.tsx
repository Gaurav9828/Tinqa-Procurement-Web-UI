import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useAdminOrderDetail } from '../hooks/useAdminOrderDetail';
import { useTrackingStatuses } from '../hooks/useTrackingStatuses';
import { useStatusUpdate } from '../hooks/useStatusUpdate';
import { TrackingTimeline } from '../components/TrackingTimeline';
import { StatusUpdateForm } from '../components/StatusUpdateForm';
import { TrackingStatusBadge } from '../components/TrackingStatusBadge';
import { OrderTrackingStateMessage } from '../components/OrderTrackingStateMessage';
import { StageProgress } from '../components/StageProgress';
import { ShippingAddressLink } from '../components/ShippingAddressLink';
import { getAllowedStatuses, type WorkflowContext } from '../utils/statusWorkflow';
import { formatCurrency, formatDateTime, formatStatusLabel, formatUpdater, getCurrentEntry } from '../utils/orderTracking.utils';
import type { StatusUpdateMode } from '../types/orderTracking.types';
import { useAccess } from '../../../hooks/useAccess';
import { ORDER_TRACKING_LIST_PATH, type OrderDetailLocationState } from '../utils/orderTrackingRoutes';

const Field: React.FC<{ label: string; children: React.ReactNode; testId?: string }> = ({ label, children, testId }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="mt-1 text-black dark:text-white truncate" data-testid={testId}>
      {children}
    </dd>
  </div>
);

const Card: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`apple-card p-5 space-y-4 ${className}`}>
    {title && <h2 className="text-sm font-semibold text-black dark:text-white">{title}</h2>}
    {children}
  </div>
);

/** Full-width order detail page: /order-tracking/:orderNumber */
export const OrderTrackingDetailPage: React.FC = () => {
  const { orderNumber = '' } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromList = !!(location.state as OrderDetailLocationState | null)?.fromList;

  const detail = useAdminOrderDetail(orderNumber || null);
  const statusList = useTrackingStatuses();
  const knownStatuses = useMemo(() => new Set(statusList.statuses.map((option) => option.status)), [statusList.statuses]);

  // Start each order at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [orderNumber]);

  // Back to the exact list view (URL filters/page, then scroll is restored by the list).
  // Opened directly (new tab, bookmark)? There is no list entry to go back to, so open the list.
  const goBack = () => {
    if (cameFromList) navigate(-1);
    else navigate(ORDER_TRACKING_LIST_PATH);
  };

  // Workflow position comes from the server-loaded history: the current event and the one before it.
  const workflow = useMemo<WorkflowContext>(() => {
    const current = getCurrentEntry(detail.timeline);
    const index = current ? detail.timeline.findIndex((e) => e.id === current.id) : -1;
    return {
      currentStatus: current?.status ?? detail.order?.orderStatus ?? null,
      previousStatus: index > 0 ? detail.timeline[index - 1].status : null,
    };
  }, [detail.timeline, detail.order?.orderStatus]);

  // A status must exist on the server AND be a valid move from the current stage.
  const isAllowed = useCallback(
    (mode: StatusUpdateMode, status: string) => knownStatuses.has(status) && getAllowedStatuses(mode, workflow).includes(status),
    [knownStatuses, workflow]
  );

  // After a change (or a 409 conflict) reload from the server — no optimistic audit values.
  const { refresh } = detail;
  const { isSubmitting, submit } = useStatusUpdate(isAllowed, { onSuccess: refresh, onConflict: refresh });

  // UX only: the backend authorizes every request from the bearer token.
  const { hasFeature } = useAccess();
  const canUpdate = hasFeature('MANAGE_ORDER_TRACKING');

  const { order, timeline } = detail;
  const currentEvent = getCurrentEntry(timeline);

  return (
    <section aria-label={`Order ${orderNumber} details`} className="p-6 space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={goBack}
            className="mt-0.5 flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
          </button>
          <div className="min-w-0">
            <h1 className="font-mono text-xl font-bold text-black dark:text-white truncate flex items-center gap-2">
              {orderNumber}
              {detail.isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-gray-400" aria-label="Refreshing order" />}
            </h1>
            {order && <p className="text-gray-500 dark:text-neutral-400 mt-0.5">Placed {formatDateTime(order.createdAt)}</p>}
          </div>
        </div>
        {order && (
          <button
            type="button"
            onClick={() => detail.refresh()}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${detail.isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        )}
      </div>

      {detail.isLoading ? (
        <div className="apple-card flex justify-center py-16 text-gray-400" role="status" aria-label="Loading order details">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : detail.errorKind || !order ? (
        <OrderTrackingStateMessage variant={detail.errorKind ?? 'unknown'} onRetry={detail.retry} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <Card>
              <StageProgress currentStatus={workflow.currentStatus} />

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
                <Field label="Order status" testId="order-status">
                  <TrackingStatusBadge status={order.orderStatus} />
                </Field>
                <Field label="Current tracking" testId="current-tracking">
                  {currentEvent ? <TrackingStatusBadge status={currentEvent.status} /> : <span className="text-gray-400">No tracking yet</span>}
                </Field>
                <Field label="Last updated" testId="last-updated">
                  {formatDateTime(order.updatedAt)} by{' '}
                  <span className={order.updatedBy ? 'font-semibold' : 'italic text-gray-500'}>{formatUpdater(order.updatedBy)}</span>
                </Field>
              </dl>

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Customer">{order.customer?.name || '—'}</Field>
                <Field label="Email">{order.customer?.email || '—'}</Field>
                <Field label="Payment">
                  {[order.paymentMethod, order.paymentStatus && formatStatusLabel(order.paymentStatus)].filter(Boolean).join(' · ') || '—'}
                </Field>
                <Field label="Subtotal">{formatCurrency(order.subtotal)}</Field>
                <Field label="Shipping">{formatCurrency(order.shippingFee)}</Field>
                <Field label="Total">{formatCurrency(order.totalAmount)}</Field>
              </dl>

              <ShippingAddressLink address={order.shippingAddress} addressId={order.addressId} />

              {order.notes && (
                <p className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 whitespace-pre-line">
                  {order.notes}
                </p>
              )}
            </Card>

            {(order.items?.length ?? 0) > 0 && (
              <Card title={`Items (${order.itemCount})`}>
                <table className="w-full text-left">
                  <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="pb-2 font-semibold">Product</th>
                      <th className="pb-2 font-semibold text-right">Price</th>
                      <th className="pb-2 font-semibold text-right">Qty</th>
                      <th className="pb-2 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                    {order.items!.map((item) => (
                      <tr key={item.productId}>
                        <td className="py-2 pr-2">{item.title}</td>
                        <td className="py-2 text-right whitespace-nowrap">{formatCurrency(item.price)}</td>
                        <td className="py-2 text-right">×{item.quantity}</td>
                        <td className="py-2 text-right whitespace-nowrap font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          <div className="space-y-6 min-w-0 lg:sticky lg:top-20">
            {canUpdate && (
              <Card title="Change Status">
                <StatusUpdateForm
                  orderNumber={orderNumber}
                  statuses={statusList.statuses}
                  statusesLoading={statusList.isLoading}
                  statusesError={statusList.hasError}
                  onRetryStatuses={statusList.retry}
                  workflow={workflow}
                  isSubmitting={isSubmitting}
                  onSubmit={submit}
                />
              </Card>
            )}
            <Card title="Tracking History">
              <TrackingTimeline entries={timeline} />
            </Card>
          </div>
        </div>
      )}
    </section>
  );
};
