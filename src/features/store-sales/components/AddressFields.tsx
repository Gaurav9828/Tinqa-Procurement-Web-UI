import React from 'react';
import { CommonInput } from '../../../components/ui/FormInputs';
import { usePincodeLookup } from '../../../hooks/usePincodeLookup';
import { PINCODE_MESSAGES } from '../../../utils/pincode';
import type { StoreAddressRequest } from '../types/storeSale.types';
import type { FieldErrors } from '../utils/storeSale.utils';

interface Props {
  value: StoreAddressRequest;
  onChange: (next: StoreAddressRequest) => void;
  /** Keyed `<prefix><field>`, as validateAddress returns them. */
  errors: FieldErrors;
  prefix?: string;
  disabled?: boolean;
}

/** A delivery address. A valid PIN code fills city and state (they stay editable). */
export const AddressFields: React.FC<Props> = ({ value, onChange, errors, prefix = 'address.', disabled }) => {
  const set = (field: keyof StoreAddressRequest) => (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [field]: event.target.value });
  const pincode = usePincodeLookup(value.postalCode, {
    onFound: (location) => onChange({ ...value, city: location.city, state: location.state }),
  });
  const error = (field: string) => errors[`${prefix}${field}`];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <CommonInput label="Recipient name" required value={value.recipientName} onChange={set('recipientName')} error={error('recipientName')} maxLength={50} disabled={disabled} />
      <CommonInput label="Recipient mobile" required type="tel" inputMode="numeric" placeholder="98765 43210" value={value.phoneNumber} onChange={set('phoneNumber')} error={error('phoneNumber')} maxLength={16} disabled={disabled} />
      <div className="sm:col-span-2">
        <CommonInput label="Address line 1" required value={value.addressLine1} onChange={set('addressLine1')} error={error('addressLine1')} maxLength={120} disabled={disabled} />
      </div>
      <div className="sm:col-span-2">
        <CommonInput label="Address line 2" value={value.addressLine2 ?? ''} onChange={set('addressLine2')} error={error('addressLine2')} maxLength={120} disabled={disabled} />
      </div>
      <div>
        <CommonInput label="PIN code" required inputMode="numeric" value={value.postalCode} onChange={set('postalCode')} error={error('postalCode')} maxLength={6} disabled={disabled} />
        {pincode.status !== 'idle' && !error('postalCode') && (
          <p className="mt-1 px-1 text-[11px] text-gray-500 dark:text-neutral-400">{PINCODE_MESSAGES[pincode.status]}</p>
        )}
      </div>
      <CommonInput label="City" required value={value.city} onChange={set('city')} error={error('city')} maxLength={60} disabled={disabled} />
      <CommonInput label="State" required value={value.state} onChange={set('state')} error={error('state')} maxLength={60} disabled={disabled} />
      <CommonInput label="Country" value={value.country} readOnly />
    </div>
  );
};
