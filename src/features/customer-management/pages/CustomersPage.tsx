import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Contact, RefreshCw, Search, ShoppingCart } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { CustomerTable } from '../components/CustomerTable';
import { SectionState } from '../components/SectionState';
import { CUSTOMER_SEARCH_MAX_LENGTH, customerPath } from '../utils/customer.utils';
import { CHOICE_TONE } from '../../../components/ui/actionTones';
import { Pager } from '../../../components/ui/Pager';

/** Customer Management: /customers. Search customers, or list those who left items in their cart, and open one. */
export const CustomersPage: React.FC = () => {
  const list = useCustomers();
  const navigate = useNavigate();

  const renderList = () => {
    if (list.customers.length === 0) {
      return (
        <div className="apple-card">
          <SectionState
            isLoading={list.isLoading}
            errorKind={list.errorKind}
            onRetry={list.refetch}
            empty={list.search || list.withCart ? 'No customers match.' : 'No customers yet.'}
          />
        </div>
      );
    }
    return (
      <>
        <CustomerTable customers={list.customers} isLoading={list.isLoading} onOpen={(customer) => navigate(customerPath(customer.id))} />
        <Pager page={list.page} totalPages={list.totalPages} disabled={list.isLoading} onPage={list.setPage} />
      </>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <Contact className="w-5 h-5 text-[#0071e3]" /> Customer Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Storefront customers, their purchases and carts{list.hasLoaded ? ` (${list.totalElements} customers)` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => list.refetch()}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${list.isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search customers</span>
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={list.search}
            maxLength={CUSTOMER_SEARCH_MAX_LENGTH}
            onChange={(e) => list.setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && list.searchNow()}
            placeholder="Search by name, email or phone"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </label>
        <button
          type="button"
          aria-pressed={list.withCart}
          onClick={() => list.setWithCart(!list.withCart)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
            list.withCart ? CHOICE_TONE.warning.active : CHOICE_TONE.warning.idle
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Items left in cart
        </button>
      </div>

      {renderList()}
    </div>
  );
};
