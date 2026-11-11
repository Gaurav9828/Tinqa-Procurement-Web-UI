import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquareWarning, RefreshCw } from 'lucide-react';
import { useAdminOrderDetail } from '../hooks/useAdminOrderDetail';
import { useTrackingStatuses } from '../hooks/useTrackingStatuses';
import { useStatusUpdate } from '../hooks/useStatusUpdate';
import { TrackingTimeline } from '../components/TrackingTimeline';
import { StatusUpdateForm } from '../components/StatusUpdateForm';
import { TrackingStatusBadge } from '../components/TrackingStatusBadge';
import { OrderTrackingStateMessage } from '../components/OrderTrackingStateMessage';
import { StageProgress } from '../components/StageProgress';
import { PreOrderReviewCard } from '../components/PreOrderReviewCard';
import { usePreOrderApproval } from '../hooks/usePreOrderApproval';
import { ShippingAddressLink } from '../components/ShippingAddressLink';
import { PaymentDetailsCard } from '../components/PaymentDetailsCard';
import { StoreSaleCard } from '../../store-sales/components/StoreSaleCard';
import { RefundPanel } from '../../refunds/components/RefundPanel';
import { useOrderRefunds } from '../../refunds/hooks/useOrderRefunds';
import { OrderProfitCard } from '../components/OrderProfitCard';
import { ReturnPanel } from '../components/ReturnPanel';
import { CheckpointsPanel } from '../components/CheckpointsPanel';
import { OrderUnitsCard } from '../components/OrderUnitsCard';
import { CopyableId } from '../components/CopyableId';
import { useOrderReturn } from '../hooks/useOrderReturn';
import { useCheckpoints } from '../hooks/useCheckpoints';
import { useDeliveryCodeResend } from '../hooks/useDeliveryCodeResend';
import { getAllowedStatuses, getCheckpointLeg, getDeliveryOutcomes, getStage, isFullyPaid, type WorkflowContext } from '../utils/statusWorkflow';
import { formatCurrency, formatDateTime, formatUpdater, getCurrentEntry, hasPreOrderLines, sortTimeline } from '../utils/orderTracking.utils';
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
  const navState = location.state as OrderDetailLocationState | null;
  // Opened from somewhere in the app (order list, support ticket…): Back returns there.
  const canGoBackInHistory = !!navState?.fromList || !!navState?.backLabel;
  const backLabel = navState?.backLabel ?? 'Back to orders';

  const detail = useAdminOrderDetail(orderNumber || null);
  const refunds = useOrderRefunds(orderNumber || null);
  const statusList = useTrackingStatuses();
  const knownStatuses = useMemo(() => new Set(statusList.statuses.map((option) => option.status)), [statusList.statuses]);

  // Start each order at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [orderNumber]);

  // Back to the exact list view (URL filters/page, then scroll is restored by the list).
  // Opened directly (new tab, bookmark)? There is no list entry to go back to, so open the list.
  const goBack = () => {
    if (canGoBackInHistory) navigate(-1);
    else navigate(ORDER_TRACKING_LIST_PATH);
  };

  // Workflow position comes from the server-loaded history: the current event (or the order status).
  const workflow = useMemo<WorkflowContext>(
    () => ({
      currentStatus: getCurrentEntry(detail.timeline)?.status ?? detail.order?.orderStatus ?? null,
      paymentStatus: detail.order?.paymentStatus ?? null,
      hasReturn: !!detail.order?.returnInfo,
      returnChargePaid: detail.order?.returnInfo?.chargeStatus === 'PAID',
    }),
    [detail.timeline, detail.order?.orderStatus, detail.order?.paymentStatus, detail.order?.returnInfo]
  );
  const statusHistory = useMemo(() => sortTimeline(detail.timeline).map((entry) => entry.status), [detail.timeline]);

  // While a cancelled order is open or being refunded, show why it was cancelled (the reason is the event's notes),
  // so the admin can check it before refunding.
  const cancellation = useMemo(() => {
    const status = workflow.currentStatus;
    const relevant = status === 'CANCELLED' || (getStage(status) === 'REFUND' && !statusHistory.includes('DELIVERED'));
    if (!relevant) return null;
    return [...sortTimeline(detail.timeline)].reverse().find((entry) => entry.status === 'CANCELLED') ?? null;
  }, [workflow.currentStatus, statusHistory, detail.timeline]);

  // UX only: the backend authorizes every request from the bearer token.
  const { can } = useAccess();
  const canUpdateAnyStatus = can('CUSTOMER_ORDER_TRACKING_UPDATE');
  // Delivery riders record delivery outcomes only, through their own endpoint.
  const deliveryOnly = !canUpdateAnyStatus && can('DELIVERY_STATUS_UPDATE');
  const canUpdate = canUpdateAnyStatus || deliveryOnly;
  const canApprovePreOrder = can('CUSTOMER_ORDER_PRE_ORDER_APPROVE');
  const canManageReturns = can('REFUND_REQUEST');
  // Store Managers decide Customer Support's requests (raised from the customer's ticket) and change the charge
  const canDecideReturns = can('RETURN_ENABLE');

  // A status must exist on the server AND be a valid move from the current stage (a delivery outcome, for riders).
  const isAllowed = useCallback(
    (status: string) =>
      knownStatuses.has(status) && (deliveryOnly ? getDeliveryOutcomes(workflow) : getAllowedStatuses(workflow)).includes(status),
    [knownStatuses, workflow, deliveryOnly]
  );

  // After a change (or a 409 conflict) reload from the server — no optimistic audit values.
  // A status or refund change can affect both the order and its refunds, so both are reloaded.
  const { refresh } = detail;
  const { refresh: refreshRefunds } = refunds;
  const refreshAll = useCallback(() => {
    refresh();
    refreshRefunds();
  }, [refresh, refreshRefunds]);
  const { isSubmitting, submit } = useStatusUpdate(isAllowed, { onSuccess: refreshAll, onConflict: refreshAll, deliveryOnly });
  // Pre-orders are approved only through the dedicated endpoint; the result is reloaded from the server.
  const { approve: approvePreOrder, isApproving } = usePreOrderApproval(orderNumber, refresh);
  // Return steps change only the order; the inspection also requests a refund.
  const returns = useOrderReturn(orderNumber, { onOrderChanged: refresh, onRefundChanged: refreshAll });
  // Hub checkpoints: staff through their route, riders (DELIVERY_STATUS_UPDATE only) through theirs. Only the order reloads.
  const checkpoints = useCheckpoints(orderNumber, { riderRoute: deliveryOnly }, refresh);
  // The customer asked the delivery partner for their delivery code again
  const deliveryCodeResend = useDeliveryCodeResend(orderNumber, { riderRoute: deliveryOnly });

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
            <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
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
            onClick={refreshAll}
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
              <StageProgress currentStatus={workflow.currentStatus} paid={isFullyPaid(order.paymentStatus)} history={statusHistory} />

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
                {/* The order amount never includes shipping (owner's rule): returns refund it at most */}
                <Field label="Order amount">{formatCurrency(order.subtotal)}</Field>
                <Field label="Shipping">{formatCurrency(order.shippingFee)}</Field>
                <Field label="Total paid (incl. shipping)">{formatCurrency(order.totalAmount)}</Field>
                {order.deliveryTrackingId && (
                  <Field label="Delivery tracking ID" testId="delivery-tracking-id">
                    <CopyableId value={order.deliveryTrackingId} label="Delivery tracking ID" />
                  </Field>
                )}
                {order.returnInfo?.trackingId && (
                  <Field label="Return tracking ID" testId="return-tracking-id">
                    <CopyableId value={order.returnInfo.trackingId} label="Return tracking ID" />
                  </Field>
                )}
              </dl>

              <ShippingAddressLink address={order.shippingAddress} addressId={order.addressId} />

              {order.notes && (
                <p className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 whitespace-pre-line">
                  {order.notes}
                </p>
              )}
            </Card>

            <PaymentDetailsCard order={order} />

            <ReturnPanel
              orderNumber={orderNumber}
              orderStatus={workflow.currentStatus}
              orderAmount={order.subtotal ?? null}
              shippingFee={order.shippingFee ?? null}
              returnInfo={order.returnInfo ?? null}
              canManage={canManageReturns}
              canDecide={canDecideReturns}
              actions={returns}
            />

            <RefundPanel orderNumber={orderNumber} refunds={refunds} onChanged={refreshAll} />

            <OrderProfitCard orderNumber={orderNumber} revision={`${order.orderStatus}-${order.paymentStatus}-${timeline.length}`} />

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
                        <td className="py-2 pr-2">
                          {item.title}
                          {Number(item.bundleDiscountAmount) > 0 && (
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                              Bundle discount on {item.bundleQuantity} with its product: −{formatCurrency(Number(item.bundleDiscountAmount))}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">{formatCurrency(item.price)}</td>
                        <td className="py-2 text-right">×{item.quantity}</td>
                        <td className="py-2 text-right whitespace-nowrap font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {order.units && order.units.length > 0 && (
              <OrderUnitsCard
                orderNumber={orderNumber}
                units={order.units}
                currentStatus={workflow.currentStatus}
                canRecord={canUpdateAnyStatus}
                onRecorded={refresh}
              />
            )}
          </div>

          <div className="space-y-6 min-w-0 lg:sticky lg:top-20">
            {order.salesChannel === 'STORE' && <StoreSaleCard order={order} />}
            {(hasPreOrderLines(order) || order.orderStatus === 'PRE_ORDER_PENDING') && (
              <PreOrderReviewCard order={order} canAct={canApprovePreOrder} isApproving={isApproving} onApprove={approvePreOrder} />
            )}
            {cancellation && (
              <section aria-label="Cancellation" className="apple-card p-5 space-y-2 border-rose-500/30">
                <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-1.5">
                  <MessageSquareWarning className="w-4 h-4 text-rose-500" /> Cancellation
                </h2>
                <p className="text-gray-500">
                  Cancelled {formatDateTime(cancellation.createdAt)} by{' '}
                  <span className={cancellation.updatedBy ? 'font-semibold text-black dark:text-white' : 'italic'}>{formatUpdater(cancellation.updatedBy)}</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Reason</p>
                <p data-testid="cancellation-reason" className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-black dark:text-white whitespace-pre-line break-words">
                  {cancellation.notes?.trim() || <span className="italic text-gray-500">No reason was given.</span>}
                </p>
                {isFullyPaid(order.paymentStatus) && workflow.currentStatus === 'CANCELLED' && (
                  <p className="text-amber-700 dark:text-amber-400">The order was paid. Check the reason, then use Request refund in the Refunds section.</p>
                )}
              </section>
            )}
            {canUpdate && (
              <Card title={deliveryOnly ? 'Delivery update' : 'Next step'}>
                <StatusUpdateForm
                  orderNumber={orderNumber}
                  statuses={statusList.statuses}
                  statusesLoading={statusList.isLoading}
                  statusesError={statusList.hasError}
                  onRetryStatuses={statusList.retry}
                  workflow={workflow}
                  isSubmitting={isSubmitting}
                  onSubmit={submit}
                  deliveryOnly={deliveryOnly}
                  deliveryCodeResend={deliveryCodeResend}
                  units={order.units}
                />
              </Card>
            )}
            <CheckpointsPanel
              checkpoints={order.checkpoints ?? []}
              openLeg={getCheckpointLeg(workflow.currentStatus)}
              canAdd={canUpdate}
              canDelete={canUpdateAnyStatus}
              isSubmitting={checkpoints.isSubmitting}
              onAdd={checkpoints.addCheckpoint}
              onDelete={checkpoints.deleteCheckpoint}
            />
            <Card title="Tracking History">
              <TrackingTimeline entries={timeline} />
            </Card>
          </div>
        </div>
      )}
    </section>
  );
};
