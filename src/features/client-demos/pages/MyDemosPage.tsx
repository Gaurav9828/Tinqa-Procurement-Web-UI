import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useMyDemos } from '../hooks/useClientDemoData';
import { DemoTable } from '../components/DemoTable';
import { myDemoPath } from '../utils/clientDemo';

/**
 * My Demos: the client demos you are tagged on as attending staff. While an approved demo runs you record your own
 * hotel, food and travel bills on it, with the invoice or ticket.
 */
export const MyDemosPage: React.FC = () => {
  const mine = useMyDemos();
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">My Demos</h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
            Client demos and meetings you attend. Add your stay, food and travel bills to an approved demo while it runs.
          </p>
        </div>
        <button type="button" onClick={mine.refresh} aria-label="Refresh my demos"
          className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${mine.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <section className="apple-card p-5">
        <DemoTable demos={mine.data ?? []} isLoading={mine.isLoading} label="My demos" pathOf={(demo) => myDemoPath(demo.id)}
          actionLabel={(demo) => (demo.status === 'APPROVED' ? 'Add bills' : 'Open')}
          empty={mine.loadFailed ? 'Your demos could not be loaded.' : 'You are not tagged on any client demo yet.'} />
      </section>
    </div>
  );
};
