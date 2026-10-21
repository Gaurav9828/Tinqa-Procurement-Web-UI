import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { CheckoutPanel } from '../components/CheckoutPanel';
import { CustomerPanel } from '../components/CustomerPanel';
import { ProductPicker } from '../components/ProductPicker';
import { StoreSalesPanel } from '../components/StoreSalesPanel';
import { useStoreCustomer } from '../hooks/useStoreCustomer';
import { useStoreProducts } from '../hooks/useStoreProducts';
import { useStoreSaleCheckout } from '../hooks/useStoreSaleCheckout';

type Tab = 'new' | 'mine' | 'all';

const TABS: { id: Tab; label: string }[] = [
  { id: 'new', label: 'New sale' },
  { id: 'mine', label: 'My sales' },
  { id: 'all', label: 'All store sales' },
];

/** The booking flow: customer → products → total and payment. Mounted only for STORE_ORDER_CREATE holders. */
const NewSale: React.FC<{ onBooked: () => void }> = ({ onBooked }) => {
  const notify = useNotify();
  const customer = useStoreCustomer();
  const products = useStoreProducts();
  const [addressId, setAddressId] = useState<number | null>(null);
  const checkout = useStoreSaleCheckout((sale) => {
    notify.success(
      sale.paymentStatus === 'PAID'
        ? `Order ${sale.orderNumber} booked and paid. The customer is emailed the receipt and how to sign in.`
        : `Order ${sale.orderNumber} booked. The customer is emailed how to sign in and pay online.`
    );
    customer.clear();
    setAddressId(null);
    products.refresh();
    onBooked();
  });
  // The default address is chosen until the agent picks another
  const chosenAddressId = addressId ?? customer.customer?.addresses[0]?.id ?? null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
      <div className="xl:col-span-2 space-y-4">
        <CustomerPanel
          customer={customer.customer}
          notFound={customer.notFound}
          isLooking={customer.isLooking}
          isSaving={customer.isSaving}
          canRegister={customer.canRegister}
          addressId={chosenAddressId}
          onAddressChange={setAddressId}
          onLookup={customer.lookup}
          onRegister={customer.register}
          onAddAddress={customer.addAddress}
          onClear={() => {
            customer.clear();
            setAddressId(null);
          }}
        />
        <ProductPicker products={products.products} isLoading={products.isLoading} quantities={checkout.quantities} onQuantity={checkout.setQuantity} />
      </div>
      <CheckoutPanel
        hasItems={checkout.lines.length > 0}
        quote={checkout.quote}
        isQuoting={checkout.isQuoting}
        isBooking={checkout.isBooking}
        ready={!!customer.customer && chosenAddressId !== null}
        onQuote={checkout.requestQuote}
        onBook={(details) =>
          customer.customer && chosenAddressId !== null
            ? checkout.book({ customerId: customer.customer.id, addressId: chosenAddressId, ...details })
            : Promise.resolve(false)
        }
      />
    </div>
  );
};

/**
 * /store-sales — selling agents book orders for walk-in customers (cash or online) and follow their own sales.
 * Store and finance staff see every agent's sales.
 */
export const StoreSalesPage: React.FC = () => {
  const { can } = useAccess();
  const available = TABS.filter(({ id }) =>
    id === 'new' ? can('STORE_ORDER_CREATE') : id === 'mine' ? can('STORE_ORDER_VIEW') : can('STORE_SALES_VIEW_ALL')
  );
  const [selected, setSelected] = useState<Tab>(available[0]?.id ?? 'new');
  const tab = available.some(({ id }) => id === selected) ? selected : available[0]?.id;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Store className="w-6 h-6 text-[#0071e3]" /> Store Sales
        </h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
          Sell to walk-in customers: register them, book their order, and take cash or let them pay online. The customer is
          emailed their receipt and login details.
        </p>
      </header>

      {available.length > 1 && (
        <div role="tablist" aria-label="Store sales" className="inline-flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
          {available.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setSelected(id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === id ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'new' && <NewSale onBooked={() => can('STORE_ORDER_VIEW') && setSelected('mine')} />}
      {tab === 'mine' && (
        <StoreSalesPanel scope="mine" title="My sales" description="Orders you booked, and whether the customer's email (receipt and login details) went out." />
      )}
      {tab === 'all' && (
        <StoreSalesPanel scope="all" title="All store sales"
          description="Every agent's sales, who sold them and how they were paid. Cash is booked to the company account when the agent records it." />
      )}
    </div>
  );
};
