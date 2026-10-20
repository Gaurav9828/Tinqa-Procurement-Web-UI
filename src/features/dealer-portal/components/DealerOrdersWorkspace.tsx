import React, { useMemo, useState } from 'react';
import { BellRing, Clock, Eye, Loader2, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useDealerOrders } from '../hooks/useDealerOrders';
import type { DealerChange, DealerOrder, OrderResponseRequest } from '../types/dealerPortal.types';
import { dealerStage, type DealerStage } from '../utils/dealerOrderStage';
import { DealerStatusBadge } from './DealerStatusBadge';
import { PrintMenu } from '../../printing/components/PrintMenu';
import { QuotationFormModal } from './QuotationFormModal';
import { DealerOrderDetailModal } from './DealerOrderDetailModal';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { formatUnit } from '../../../constants/unitsOfMeasure';
import { SOLID_TONE } from '../../../components/ui/actionTones';

type Mode = 'quotations' | 'orders';

const ORDER_TABS: { stage: DealerStage; label: string }[] = [
  { stage: 'ongoing', label: 'Upcoming & ongoing' },
  { stage: 'past', label: 'Past orders' },
];

const COPY: Record<Mode, { title: string; description: string; empty: string }> = {
  quotations: {
    title: 'My Quotations',
    description:
      'Quotations you raised, and those the procurement team prepared for you. You can request changes until a quotation becomes an order; each change is applied once a dealer manager approves it.',
    empty: 'No open quotations.',
  },
  orders: {
    title: 'My Orders',
    description: 'Orders placed with you once their quotation was approved. Print the purchase order, and the bill once delivered.',
    empty: 'No orders here yet.',
  },
};

/** The dealer's own quotations or orders, with what they may do on each. */
export const DealerOrdersWorkspace: React.FC<{ mode: Mode }> = ({ mode }) => {
  const portal = useDealerOrders();
  const [tab, setTab] = useState<DealerStage>('ongoing');
  const [form, setForm] = useState<{ order: DealerOrder | null } | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewVersion, setViewVersion] = useState(0);

  const stage: DealerStage = mode === 'quotations' ? 'quotation' : tab;
  const rows = useMemo(() => portal.orders.filter((order) => dealerStage(order.orderStatus) === stage), [portal.orders, stage]);
  const counts = useMemo(() => {
    const result: Record<DealerStage, number> = { quotation: 0, ongoing: 0, past: 0 };
    portal.orders.forEach((order) => {
      result[dealerStage(order.orderStatus)] += 1;
    });
    return result;
  }, [portal.orders]);
  const awaiting = useMemo(() => portal.orders.filter((order) => order.awaitingYourResponse), [portal.orders]);
  const copy = COPY[mode];

  const openForm = (order: DealerOrder | null) => {
    portal.loadItems();
    setForm({ order });
  };

  const afterAction = (ok: boolean) => {
    if (ok) setViewVersion((version) => version + 1);
    return ok;
  };

  const withdraw = async (change: DealerChange) => afterAction(await portal.withdrawChange(change.id));
  const respond = async (order: DealerOrder, payload: OrderResponseRequest) =>
    afterAction(await portal.respondToOrder(order.id, payload));
  const ship = async (order: DealerOrder) => afterAction(await portal.markShipped(order.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{copy.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={portal.refresh}
            aria-label="Refresh"
            className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${portal.isLoading ? 'animate-spin' : ''}`} />
          </button>
          {mode === 'quotations' && portal.canQuote && (
            <button
              type="button"
              onClick={() => openForm(null)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer ${SOLID_TONE.primary}`}
            >
              <Plus className="w-4 h-4" /> New quotation
            </button>
          )}
        </div>
      </div>

      {mode === 'orders' && portal.canRespond && awaiting.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#0071e3]/30 bg-[#0071e3]/5 px-4 py-3 text-sm">
          <BellRing className="w-4 h-4 text-[#0071e3] dark:text-blue-400 shrink-0" />
          <span className="flex-1 min-w-0">
            {awaiting.length === 1 ? '1 order is' : `${awaiting.length} orders are`} waiting for you to accept or reject.
          </span>
          {awaiting.length === 1 && (
            <button
              type="button"
              onClick={() => setViewingId(awaiting[0].id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${SOLID_TONE.primary}`}
            >
              Review {awaiting[0].orderNumber}
            </button>
          )}
        </div>
      )}

      {mode === 'orders' && (
        <div role="tablist" className="flex items-center gap-6 border-b border-black/10 dark:border-white/10">
          {ORDER_TABS.map(({ stage: id, label }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`pb-2 text-sm font-medium cursor-pointer ${
                tab === id ? 'text-[#0071e3] dark:text-blue-400 font-semibold border-b-2 border-[#0071e3]' : 'text-gray-500 hover:text-black dark:hover:text-white'
              }`}
            >
              {label} <span className="text-xs text-gray-400">({counts[id]})</span>
            </button>
          ))}
        </div>
      )}

      <div className="apple-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-black/10 dark:border-white/10">
              <th className="px-4 py-3 font-semibold">Number</th>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Quantity</th>
              <th className="px-4 py-3 font-semibold text-right">Total</th>
              <th className="px-4 py-3 font-semibold">{mode === 'quotations' ? 'Quoted on' : 'Expected'}</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {portal.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </td>
              </tr>
            )}
            {!portal.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  {copy.empty}
                </td>
              </tr>
            )}
            {rows.map((order) => (
              <tr key={order.id} className="border-b last:border-0 border-black/5 dark:border-white/5 align-top">
                <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                <td className="px-4 py-3">{order.itemName}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {order.orderQuantity} {order.unitType && formatUnit(order.unitType).split(' — ')[0]}
                </td>
                <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{formatCurrency(order.totalPrice)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDate(mode === 'quotations' ? order.orderDate : order.actualDelivery ?? order.expectedDelivery)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <DealerStatusBadge status={order.orderStatus} />
                    {order.awaitingYourResponse && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0071e3] dark:text-blue-400">
                        <BellRing className="w-3 h-3" /> Needs your response
                      </span>
                    )}
                    {order.pendingChange && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3" /> Change awaiting approval
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingId(order.id)}
                      aria-label={`View ${order.orderNumber}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> {order.awaitingYourResponse && portal.canRespond ? 'Respond' : 'View'}
                    </button>
                    {order.changeable && portal.canRequestChange && (
                      <button
                        type="button"
                        onClick={() => openForm(order)}
                        aria-label={`Request a change to ${order.orderNumber}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-[#0071e3]/30 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/10 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Change
                      </button>
                    )}
                    <PrintMenu orderId={order.id} status={order.orderStatus} compact />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <QuotationFormModal
          order={form.order}
          items={portal.items}
          isSubmitting={portal.isSubmitting}
          onClose={() => setForm(null)}
          onCreate={portal.createQuotation}
          onRequestChange={async (orderId, payload) => afterAction(await portal.requestChange(orderId, payload))}
        />
      )}

      {viewingId !== null && (
        <DealerOrderDetailModal
          orderId={viewingId}
          version={viewVersion}
          isSubmitting={portal.isSubmitting}
          onClose={() => setViewingId(null)}
          onRequestChange={(order) => openForm(order)}
          onWithdrawChange={withdraw}
          onRespond={respond}
          onShip={ship}
        />
      )}
    </div>
  );
};
