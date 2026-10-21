import React, { useState } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { Pager } from '../../../components/ui/Pager';
import { useAccess } from '../../../hooks/useAccess';
import { formatPaymentStatus } from '../../order-tracking/utils/payment.utils';
import { useStoreSales, type StoreSalesScope } from '../hooks/useStoreSales';
import { STORE_SALE_PAYMENT_FILTERS } from '../utils/storeSale.constants';
import { StoreSalesTable } from './StoreSalesTable';

const ALL_PAYMENTS = 'ALL';

interface Props {
  scope: StoreSalesScope;
  title: string;
  description: string;
  backLabel?: string;
}

/** A filterable page of store sales: the agent's own, or every agent's for store and finance staff. */
export const StoreSalesPanel: React.FC<Props> = ({ scope, title, description, backLabel }) => {
  const { can } = useAccess();
  const list = useStoreSales(scope);
  const [sellerInput, setSellerInput] = useState('');

  return (
    <section aria-label={title} className="apple-card p-5 space-y-4 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            {title} <span className="text-xs text-gray-400">({list.total})</span>
          </h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-1 max-w-2xl">{description}</p>
        </div>
        <button type="button" onClick={list.refresh} aria-label="Refresh store sales"
          className="p-2 rounded-xl border border-[#0071e3]/40 bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/20 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${list.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="sm:w-64">
          <CommonSelect
            label="Payment"
            value={list.paymentStatus || ALL_PAYMENTS}
            onChange={(event) => list.filterByStatus(event.target.value === ALL_PAYMENTS ? '' : event.target.value)}
            options={[{ label: 'All payments', value: ALL_PAYMENTS }, ...STORE_SALE_PAYMENT_FILTERS.map((status) => ({ label: formatPaymentStatus(status), value: status }))]}
          />
        </div>
        {scope === 'all' && (
          <form className="flex gap-2 sm:items-end flex-1" onSubmit={(event) => { event.preventDefault(); list.filterBySeller(sellerInput); }}>
            <div className="flex-1 sm:max-w-xs">
              <CommonInput label="Seller login (exact)" value={sellerInput} onChange={(event) => setSellerInput(event.target.value)} maxLength={255} />
            </div>
            <button type="submit" className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold cursor-pointer ${SOLID_TONE.primary}`}>
              <Search className="w-4 h-4" /> Filter
            </button>
          </form>
        )}
      </div>

      {list.sales.length === 0 ? (
        <p className="text-sm text-gray-500">
          {list.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : list.loadFailed ? 'Store sales could not be loaded.' : 'No store sales match.'}
        </p>
      ) : (
        <StoreSalesTable sales={list.sales} showSeller={scope === 'all'} canOpenOrder={can('CUSTOMER_ORDER_VIEW')} backLabel={backLabel} />
      )}
      <Pager page={list.page} totalPages={list.totalPages} disabled={list.isLoading} onPage={list.setPage} />
    </section>
  );
};
