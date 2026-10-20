import React, { useCallback, useState } from 'react';
import { Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import type { VoucherStatus } from '../types/finance.types';
import { useFinanceCategories, useVoucherList } from '../hooks/useFinanceData';
import { useVoucherAccess } from '../hooks/useVoucherAccess';
import { useVoucherActions } from '../hooks/useVoucherActions';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useAccess } from '../../../hooks/useAccess';
import { VOUCHER_STATUS_LABELS } from '../utils/metrics';
import { VoucherTable } from './VoucherTable';
import { VoucherFormModal } from './VoucherFormModal';
import { Pager } from '../../../components/ui/Pager';

const PAGE_SIZE = 20;
const ALL = 'ALL';
const selectClass = 'px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs text-black dark:text-white cursor-pointer';

/**
 * Expenses and other vouchers: filters, the list with its actions, and "New" for those who may raise them.
 * The Approvals hub uses it opened on "Awaiting approval".
 */
export const VouchersPanel: React.FC<{ title: string; description: string; defaultStatus?: VoucherStatus; onChanged?: () => void }> = ({
  title,
  description,
  defaultStatus,
  onChanged,
}) => {
  const { can } = useAccess();
  const access = useVoucherAccess();
  const categories = useFinanceCategories();
  const [status, setStatus] = useState<VoucherStatus | typeof ALL>(defaultStatus ?? ALL);
  const [category, setCategory] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const { term: searchTerm, pending: searchPending, flush: searchNow } = useSearchTerm(search);

  const { data, isLoading, loadFailed, refresh } = useVoucherList({
    status: status === ALL ? undefined : status,
    category: category || undefined,
    submittedBy: mineOnly ? access.username ?? undefined : undefined,
    search: searchTerm || undefined,
    page,
    size: PAGE_SIZE,
  }, !searchPending);
  const changed = useCallback(() => {
    refresh();
    onChanged?.();
  }, [refresh, onChanged]);
  const creator = useVoucherActions(changed);
  const rows = data?.content ?? [];
  const canView = can('EXPENSE_VIEW');

  return (
    <section aria-label={title} className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white">{title}</h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-0.5 max-w-2xl">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {access.canSubmit && (
            <button type="button" onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> New expense
            </button>
          )}
          {canView && (
            <button type="button" onClick={refresh} disabled={isLoading} aria-label="Refresh vouchers"
              className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {canView ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input aria-label="Search vouchers" value={search} placeholder="Search title, number, payee, order…"
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                onKeyDown={(e) => e.key === 'Enter' && searchNow()}
                className="pl-8 pr-3 py-2 w-64 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-black dark:text-white" />
            </label>
            <select aria-label="Voucher status" className={selectClass} value={status}
              onChange={(e) => { setStatus(e.target.value as VoucherStatus | typeof ALL); setPage(0); }}>
              <option value={ALL} className="bg-white dark:bg-[#1c1c1e]">All statuses</option>
              {(Object.keys(VOUCHER_STATUS_LABELS) as VoucherStatus[]).map((s) => (
                <option key={s} value={s} className="bg-white dark:bg-[#1c1c1e]">{VOUCHER_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select aria-label="Voucher category" className={selectClass} value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
              <option value="" className="bg-white dark:bg-[#1c1c1e]">All categories</option>
              {categories.filter((c) => !c.system).map((c) => (
                <option key={c.code} value={c.code} className="bg-white dark:bg-[#1c1c1e]">{c.label}</option>
              ))}
            </select>
            {access.canSubmit && (
              <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={mineOnly} onChange={(e) => { setMineOnly(e.target.checked); setPage(0); }} />
                Raised by me
              </label>
            )}
          </div>

          {isLoading && !data ? (
            <div className="flex justify-center py-10 text-gray-400" role="status" aria-label="Loading vouchers">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : loadFailed && !data ? (
            <div className="py-10 text-center text-gray-500 space-y-2">
              <p>Vouchers couldn't be loaded.</p>
              <button type="button" onClick={refresh} className="font-semibold text-black dark:text-white cursor-pointer">Try again</button>
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-gray-500" role="status">
              {status === 'SUBMITTED' ? 'Nothing is awaiting approval.' : 'No vouchers match these filters.'}
            </p>
          ) : (
            <VoucherTable vouchers={rows} categories={categories} onChanged={changed} />
          )}
          <Pager page={page} totalPages={data?.totalPages ?? 0} disabled={isLoading} onPage={setPage} />
        </>
      ) : (
        <p className="py-6 text-gray-500">You can raise expenses here; the list of vouchers is visible to finance staff.</p>
      )}

      {creating && (
        <VoucherFormModal categories={categories} isSubmitting={creator.isSubmitting} onClose={() => setCreating(false)}
          onSubmit={(payload, documents) => creator.save(null, payload, documents)} />
      )}
    </section>
  );
};
