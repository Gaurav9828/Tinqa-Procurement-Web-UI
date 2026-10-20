import React, { useState } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { OverviewPanel } from '../components/OverviewPanel';
import { VouchersPanel } from '../components/VouchersPanel';
import { LedgerPanel } from '../components/LedgerPanel';
import { GstPanel } from '../components/GstPanel';

type Tab = 'overview' | 'gst' | 'expenses' | 'ledger';
const TAB_KEY = 'finance.tab';

const readTab = (): Tab => {
  try {
    const saved = sessionStorage.getItem(TAB_KEY);
    return saved === 'gst' || saved === 'expenses' || saved === 'ledger' ? saved : 'overview';
  } catch {
    return 'overview';
  }
};

/**
 * Accounts & Finance: the company account's analytics (Overview), GST charged, paid and payable (GST), its expenses and
 * other vouchers (Expenses) and every posted entry (Ledger). Each tab shows only for those allowed to use it.
 */
export const FinancePage: React.FC = () => {
  const { can, canAny } = useAccess();
  const [selected, setSelected] = useState<Tab>(readTab);
  const tabs = [
    { id: 'overview' as const, label: 'Overview', allowed: can('FINANCE_REPORT_VIEW') },
    { id: 'gst' as const, label: 'GST', allowed: can('FINANCE_REPORT_VIEW') },
    { id: 'expenses' as const, label: 'Expenses & vouchers', allowed: canAny('EXPENSE_VIEW', 'EXPENSE_SUBMIT') },
    { id: 'ledger' as const, label: 'Ledger', allowed: can('FINANCE_REPORT_VIEW') },
  ].filter((t) => t.allowed);
  const tab = tabs.some((t) => t.id === selected) ? selected : tabs[0]?.id;

  const select = (next: Tab) => {
    setSelected(next);
    try {
      sessionStorage.setItem(TAB_KEY, next);
    } catch {
      // Not remembered
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Accounts & Finance</h1>
        <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
          One company account, from ₹0: customer payments come in, refunds, dealer purchases and approved expenses go out — every rupee accounted for.
        </p>
      </div>

      {tabs.length > 1 && (
        <div role="tablist" aria-label="Finance sections" className="inline-flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
          {tabs.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => select(id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                tab === id ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'overview' && <OverviewPanel />}
      {tab === 'gst' && <GstPanel />}
      {tab === 'expenses' && (
        <VouchersPanel
          title="Expenses & vouchers"
          description="Raise every rupee the company spends — raw materials, wires and consumables, shipping, office maintenance, travel — or receives outside sales (capital, loans). A different approver approves it, and only then is it posted to the account."
        />
      )}
      {tab === 'ledger' && <LedgerPanel />}
    </div>
  );
};
