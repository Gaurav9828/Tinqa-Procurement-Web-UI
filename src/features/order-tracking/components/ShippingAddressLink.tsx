import React, { useId, useState } from 'react';
import { ChevronDown, MapPin, Phone } from 'lucide-react';
import type { OrderShippingAddress } from '../types/orderTracking.types';

interface Props {
  /** `undefined` = the server doesn't send it yet; `null` = the order has no address recorded. */
  address: OrderShippingAddress | null | undefined;
  addressId: number | null;
}

/** A single "Shipping address" link that reveals the address the customer chose for this order. */
export const ShippingAddressLink: React.FC<Props> = ({ address, addressId }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const cityLine = address ? [address.city, address.state, address.postalCode].filter(Boolean).join(', ') : '';

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 text-[#0071e3] dark:text-blue-400 font-medium hover:underline cursor-pointer"
      >
        <MapPin className="w-3.5 h-3.5" />
        Shipping address
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={panelId} className="mt-2 p-3 rounded-xl border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300">
          {address ? (
            <address aria-label="Shipping address" className="not-italic space-y-0.5 leading-relaxed">
              {address.recipientName && <p className="font-semibold text-black dark:text-white">{address.recipientName}</p>}
              {address.addressLine1 && <p>{address.addressLine1}</p>}
              {address.addressLine2 && <p>{address.addressLine2}</p>}
              {cityLine && <p>{cityLine}</p>}
              {address.country && <p>{address.country}</p>}
              {address.phoneNumber && (
                <p className="pt-1">
                  <a href={`tel:${address.phoneNumber.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 hover:underline">
                    <Phone className="w-3 h-3" /> {address.phoneNumber}
                  </a>
                </p>
              )}
            </address>
          ) : address === null ? (
            <p>No shipping address was recorded for this order.</p>
          ) : (
            <p className="text-gray-500">
              The shipping address isn't available from the server yet
              {addressId ? ` (customer address #${addressId})` : ''}. The admin order API needs to include it.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
