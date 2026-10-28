import React from 'react';
import { Presentation, RefreshCw } from 'lucide-react';
import type { DemoSummary } from '../types/clientDemo.types';
import { DemoTable } from './DemoTable';
import { demoPath } from '../utils/clientDemo';

/**
 * The Approvals Hub's Client demos tab: quotations (planned budgets), completions (costs to book) and Super Admin
 * corrections waiting for a decision, oldest first. Review opens the demo, where its bills are checked and decided.
 */
export const ClientDemoApprovalsPanel: React.FC<{ demos: DemoSummary[]; isLoading: boolean; onRefresh: () => void }> = ({ demos, isLoading, onRefresh }) => (
  <section aria-label="Client demos awaiting approval" className="apple-card p-5 space-y-4 text-xs">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Presentation className="w-4 h-4 text-[#0071e3]" /> Client demos awaiting approval
          <span className="text-xs text-gray-400">({demos.length})</span>
        </h2>
        <p className="text-gray-500 dark:text-neutral-400 mt-1 max-w-2xl">
          Approve a quotation before the visit, and a completion (or a Super Admin’s correction) after it: that books the bills as
          travel & conveyance. You can’t decide on a demo you planned, sent or attend.
        </p>
      </div>
      <button type="button" onClick={onRefresh} aria-label="Refresh client demos"
        className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
    <DemoTable demos={demos} isLoading={isLoading} label="Client demos awaiting approval" empty="No client demos waiting."
      pathOf={(demo) => demoPath(demo.id)} actionLabel={(demo) => (demo.decidableByYou ? 'Review' : 'Open')} />
  </section>
);
