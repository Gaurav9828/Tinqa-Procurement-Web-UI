import React from 'react';
import { Link } from 'react-router-dom';
import { History, LifeBuoy, ShoppingBag, ShoppingCart, UserPlus } from 'lucide-react';
import type { TimelineEvent } from '../utils/customer.utils';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';

const ICONS: Record<TimelineEvent['kind'], React.ReactNode> = {
  registered: <UserPlus className="w-3.5 h-3.5 text-emerald-600" />,
  order: <ShoppingBag className="w-3.5 h-3.5 text-[#0071e3]" />,
  cart: <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />,
  ticket: <LifeBuoy className="w-3.5 h-3.5 text-purple-500" />,
};

/** The customer's activity on one line each, newest first (the orders shown above, the cart and tickets). */
export const CustomerTimeline: React.FC<{ events: TimelineEvent[] }> = ({ events }) => (
  <section aria-label="Activity" className="apple-card overflow-hidden">
    <header className="px-5 py-3 border-b border-black/10 dark:border-white/10">
      <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
        <History className="w-4 h-4 text-gray-500" /> Activity
      </h2>
    </header>
    <ol className="p-4 space-y-3 text-xs">
      {events.map((event, index) => (
        <li key={`${event.kind}-${event.at}-${index}`} className="flex gap-3">
          <span className="mt-0.5 shrink-0">{ICONS[event.kind]}</span>
          <div className="min-w-0">
            <p className="text-black dark:text-white">
              {event.link ? (
                <Link to={event.link} className="hover:underline">
                  {event.title}
                </Link>
              ) : (
                event.title
              )}
            </p>
            {event.detail && <p className="text-gray-500 truncate">{event.detail}</p>}
            <time dateTime={event.at} className="text-[10px] text-gray-400">
              {formatDateTime(event.at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  </section>
);
