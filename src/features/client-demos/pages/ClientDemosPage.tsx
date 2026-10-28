import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import { useAccess } from '../../../hooks/useAccess';
import { useDemoList } from '../hooks/useClientDemoData';
import { DemoTable } from '../components/DemoTable';
import type { DemoStatus } from '../types/clientDemo.types';
import { CLIENT_DEMOS_PATH, STATUS_LABELS, demoPath, inrAmount } from '../utils/clientDemo';

const shift = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
};

const endOfMonth = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  const date = new Date(y, m, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Client Demos & Meetings: every visit to a client for a demo appointment or a promotion, filtered by when it starts
 * and its status. Demo managers schedule new ones here, step by step.
 */
export const ClientDemosPage: React.FC = () => {
  const { can } = useAccess();
  const [from, setFrom] = useState(() => shift(-1));
  const [to, setTo] = useState(() => endOfMonth(shift(2)));
  const [status, setStatus] = useState<DemoStatus | ''>('');
  const list = useDemoList(from, to, status || null);
  const demos = list.data ?? [];
  const count = (...statuses: DemoStatus[]) => demos.filter((demo) => statuses.includes(demo.status)).length;
  const booked = demos.filter((demo) => demo.status === 'COMPLETED').reduce((sum, demo) => sum + demo.bookedTotal, 0);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Client Demos & Meetings</h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1 max-w-3xl">
            Demos and promotions at hotels, offices, hospitals and other clients: planned as a quotation, approved, their stay, food and
            travel bills recorded, and the completion approved before the costs are booked as travel & conveyance.
          </p>
        </div>
        {can('DEMO_MANAGE') && (
          <Link to={`${CLIENT_DEMOS_PATH}/new`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold">
            <CalendarPlus className="w-4 h-4" /> Schedule a demo
          </Link>
        )}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          ['Awaiting approval', count('QUOTATION_PENDING', 'COMPLETION_PENDING')],
          ['Approved & running', count('APPROVED', 'REOPENED')],
          ['Completed', count('COMPLETED')],
          ['Booked as travel', inrAmount(booked)],
        ].map(([label, value]) => (
          <div key={label} className="apple-card px-4 py-3">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-xl font-bold mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="apple-card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <CommonInput label="Starting from" type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          <CommonInput label="Starting until" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
          <CommonSelect label="Status" value={status} placeholder="Every status"
            options={[{ value: '', label: 'Every status' }, ...(Object.keys(STATUS_LABELS) as DemoStatus[]).map((value) => ({ value, label: STATUS_LABELS[value] }))]}
            onChange={(e) => setStatus(e.target.value as DemoStatus | '')} />
          <button type="button" onClick={list.refresh} aria-label="Refresh client demos"
            className="justify-self-start p-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${list.isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <DemoTable demos={demos} isLoading={list.isLoading} label="Client demos" pathOf={(demo) => demoPath(demo.id)}
          actionLabel={(demo) => (demo.decidableByYou ? 'Review' : 'Open')}
          empty={list.loadFailed ? 'The client demos could not be loaded.' : 'No demos start in this period.'} />
      </section>
    </div>
  );
};
