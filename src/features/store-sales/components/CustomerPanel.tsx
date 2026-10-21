import React, { useState } from 'react';
import { Loader2, MapPinPlus, Search, UserPlus, UserRound } from 'lucide-react';
import { CommonInput } from '../../../components/ui/FormInputs';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import type { StoreAddressRequest, StoreCustomer, StoreCustomerRequest } from '../types/storeSale.types';
import { emptyAddress, formatAddress, validateAddress, type FieldErrors } from '../utils/storeSale.utils';
import { AddressFields } from './AddressFields';
import { RegisterCustomerForm } from './RegisterCustomerForm';
import { CustomerDetails } from './CustomerDetails';

interface Props {
  customer: StoreCustomer | null;
  notFound: boolean;
  isLooking: boolean;
  isSaving: boolean;
  canRegister: boolean;
  addressId: number | null;
  onAddressChange: (addressId: number) => void;
  onLookup: (query: string) => void;
  onRegister: (form: StoreCustomerRequest) => Promise<boolean>;
  onAddAddress: (address: StoreAddressRequest) => Promise<boolean>;
  onClear: () => void;
}

/** Step 1: who is buying. Look the customer up by mobile or email; register them when they are new. */
export const CustomerPanel: React.FC<Props> = ({
  customer, notFound, isLooking, isSaving, canRegister, addressId, onAddressChange, onLookup, onRegister, onAddAddress, onClear,
}) => {
  const [query, setQuery] = useState('');
  const [registering, setRegistering] = useState(false);
  const [newAddress, setNewAddress] = useState<StoreAddressRequest | null>(null);
  const [addressSubmitted, setAddressSubmitted] = useState(false);
  const addressErrors: FieldErrors = newAddress && addressSubmitted ? validateAddress(newAddress) : {};

  const saveAddress = async () => {
    if (!newAddress) return;
    setAddressSubmitted(true);
    if (Object.keys(validateAddress(newAddress)).length > 0) return;
    if (await onAddAddress(newAddress)) {
      setNewAddress(null);
      setAddressSubmitted(false);
    }
  };

  return (
    <section aria-label="Customer" className="apple-card p-5 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <UserRound className="w-4 h-4 text-[#0071e3]" /> 1. Customer
      </h2>

      {customer ? (
        <div className="space-y-3">
          <CustomerDetails customer={customer} onClear={onClear} />

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Deliver to</legend>
            {customer.addresses.length === 0 && <p className="text-xs text-amber-600">No saved address. Add one below.</p>}
            {customer.addresses.map((address) => (
              <label key={address.id} className={`flex items-start gap-2 p-3 rounded-xl border text-xs cursor-pointer ${addressId === address.id ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
                <input type="radio" name="store-sale-address" className="mt-0.5" checked={addressId === address.id} onChange={() => onAddressChange(address.id)} />
                <span>
                  <span className="font-semibold">{address.recipientName}</span> · {address.phoneNumber}
                  <span className="block">{formatAddress(address)}</span>
                </span>
              </label>
            ))}
            {canRegister && !newAddress && (
              <button type="button" onClick={() => setNewAddress({ ...emptyAddress(), recipientName: customer.name, phoneNumber: customer.phoneNumber ?? '' })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${CHOICE_TONE.primary.idle}`}>
                <MapPinPlus className="w-4 h-4" /> Add a delivery address
              </button>
            )}
          </fieldset>

          {newAddress && (
            <div className="space-y-3 p-3 rounded-xl border border-black/10 dark:border-white/10">
              <AddressFields value={newAddress} onChange={setNewAddress} errors={addressErrors} prefix="address." />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setNewAddress(null)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${SOLID_TONE.danger}`}>Cancel</button>
                <button type="button" disabled={isSaving} onClick={saveAddress} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.approve}`}>
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save address
                </button>
              </div>
            </div>
          )}
        </div>
      ) : registering ? (
        <RegisterCustomerForm
          initialContact={query}
          isSaving={isSaving}
          onCancel={() => setRegistering(false)}
          onRegister={async (form) => {
            const ok = await onRegister(form);
            if (ok) setRegistering(false);
            return ok;
          }}
        />
      ) : (
        <div className="space-y-3">
          <form
            className="flex flex-col sm:flex-row gap-2 sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              onLookup(query);
            }}
          >
            <div className="flex-1">
              <CommonInput label="Customer's mobile number or email" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="98765 43210" />
            </div>
            <button type="submit" disabled={isLooking || !query.trim()} className={`inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.primary}`}>
              {isLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Find
            </button>
          </form>
          {notFound && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              No customer has this mobile number or email.
              {canRegister && (
                <button type="button" onClick={() => setRegistering(true)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${SOLID_TONE.approve}`}>
                  <UserPlus className="w-4 h-4" /> Register them
                </button>
              )}
            </div>
          )}
          {canRegister && !notFound && (
            <button type="button" onClick={() => setRegistering(true)} className="text-xs font-semibold text-[#0071e3] hover:underline cursor-pointer">
              New customer? Register them
            </button>
          )}
        </div>
      )}
    </section>
  );
};
