import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { PromoCodeDetail, PromoCodeRequest, PromoDiscountType, PromoScope } from '../types/promoCode.types';
import { useCodeSuggestion } from '../hooks/usePromoCodeActions';
import {
  PROMO_AMOUNT_MAX,
  PROMO_CODE_MAX_LENGTH,
  PROMO_DESCRIPTION_MAX_LENGTH,
  emptyForm,
  expiryOf,
  formOf,
  normaliseCode,
  todayInIndia,
  toRequest,
  validateForm,
  type PerCustomerChoice,
  type PromoForm,
  type PromoFormErrors,
  type TotalChoice,
  type ValidityChoice,
} from '../utils/promoCodeForm';
import { ChoiceGroup, PromoDialog } from './PromoUi';
import { CustomerPicker, ProductPicker } from './PromoPickers';
import { CommonCheckbox, CommonInput } from '../../../components/ui/FormInputs';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';

const SCOPES = [
  { value: 'ALL', label: 'All' },
  { value: 'SELECTED', label: 'Selected' },
] as const satisfies readonly { value: PromoScope; label: string }[];

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'AMOUNT', label: 'Amount (₹)' },
] as const satisfies readonly { value: PromoDiscountType; label: string }[];

const PER_CUSTOMER = [
  { value: 'ONCE', label: 'One time' },
  { value: 'TWICE', label: '2 times' },
  { value: 'UNLIMITED', label: 'Unlimited' },
  { value: 'CUSTOM', label: 'Custom' },
] as const satisfies readonly { value: PerCustomerChoice; label: string }[];

const TOTAL = [
  { value: 'UNLIMITED', label: 'Unlimited' },
  { value: 'LIMITED', label: 'Set a number' },
] as const satisfies readonly { value: TotalChoice; label: string }[];

const VALIDITY = [
  { value: '6M', label: '6 months' },
  { value: '1Y', label: '1 year' },
  { value: '2Y', label: '2 years' },
  { value: 'CUSTOM', label: 'Custom dates' },
] as const satisfies readonly { value: ValidityChoice; label: string }[];

// Server field names (docs/promo-codes.md › validation errors) → the form field that shows them
const SERVER_FIELD: Record<string, keyof PromoFormErrors> = {
  code: 'code',
  description: 'description',
  discountPercentage: 'discountPercentage',
  amountOff: 'amountOff',
  customerIds: 'customerIds',
  products: 'products',
  maxUnitsPerProduct: 'maxUnitsPerProduct',
  usageLimitPerCustomer: 'perCustomerCustom',
  totalUsageLimit: 'totalLimit',
  startsOn: 'startsOn',
  expiresOn: 'expiresOn',
};

const Help: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-[11px] text-gray-500 dark:text-neutral-400 px-1">{children}</p>;

const ErrorText: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p role="alert" className="text-[11px] text-red-500 font-medium px-1">{message}</p> : null;

/**
 * Creating (no `detail`) or editing a promo code (Super Admin, PROMO_CODE_MANAGE). Creating asks the server for an
 * unused code once, when the form opens; it can be replaced ("Suggest another") or typed over. Once created the code
 * itself never changes; everything else can (customers, products and their units, limits, dates).
 */
export const PromoCodeFormModal: React.FC<{
  detail: PromoCodeDetail | null;
  busy: boolean;
  serverErrors: Record<string, string>;
  onSubmit: (body: PromoCodeRequest) => Promise<boolean>;
  onClose: () => void;
}> = ({ detail, busy, serverErrors, onSubmit, onClose }) => {
  const creating = detail === null;
  const [today] = useState(() => todayInIndia());
  const [form, setForm] = useState<PromoForm>(() => (detail ? formOf(detail) : emptyForm(today)));
  const [submitted, setSubmitted] = useState(false);
  const { suggest, isSuggesting } = useCodeSuggestion();
  const asked = useRef(false);

  // The code suggestion: once, when the create form opens. Never fills over what was already typed.
  useEffect(() => {
    if (!creating || asked.current) return;
    asked.current = true;
    void suggest().then((code) => {
      if (code) setForm((prev) => (prev.code ? prev : { ...prev, code }));
    });
  }, [creating, suggest]);

  const suggestAnother = async () => {
    const code = await suggest();
    if (code) setForm((prev) => ({ ...prev, code }));
  };

  const errors = useMemo(() => validateForm(form, { creating, checkCode: creating, today }), [form, creating, today]);
  const server = useMemo(() => {
    const mapped: PromoFormErrors = {};
    for (const [field, message] of Object.entries(serverErrors)) {
      const key = SERVER_FIELD[field];
      if (key) mapped[key] = message;
    }
    return mapped;
  }, [serverErrors]);
  const shown = (key: keyof PromoFormErrors) => (submitted ? errors[key] : undefined) ?? server[key];

  const set = <K extends keyof PromoForm>(key: K, value: PromoForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  // Only one kind of discount at a time: choosing one clears the other
  const chooseDiscountType = (discountType: PromoDiscountType) =>
    setForm((prev) => ({ ...prev, discountType, discountPercentage: discountType === 'PERCENTAGE' ? prev.discountPercentage : '', amountOff: discountType === 'AMOUNT' ? prev.amountOff : '' }));
  const text = (key: keyof PromoForm) => (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value as never);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    if (await onSubmit(toRequest(form))) onClose();
  };

  const expiresOn = expiryOf(form);
  const title = creating ? 'New promo code' : `Edit ${detail.code}`;

  return (
    <PromoDialog wide label={title} title={title} subtitle="Customers type the code at checkout; the website never shows or suggests it." busy={busy} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <section className="space-y-1">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <CommonInput
                label="Code"
                required
                value={form.code}
                readOnly={!creating}
                maxLength={PROMO_CODE_MAX_LENGTH}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => set('code', normaliseCode(e.target.value))}
                error={shown('code')}
                className="font-mono"
              />
            </div>
            {creating && (
              <button
                type="button"
                onClick={() => void suggestAnother()}
                disabled={isSuggesting || busy}
                className={`mb-0.5 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium cursor-pointer disabled:opacity-60 ${CHOICE_TONE.primary.idle}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSuggesting ? 'animate-spin' : ''}`} /> Suggest another
              </button>
            )}
          </div>
          <Help>
            {creating
              ? 'TINQA followed by 3 to 15 capital letters or digits (e.g. TINQADIWALI26). Keep the suggested one or type your own; it must not be in use. It cannot be changed later.'
              : 'The code itself never changes. Everything else can, for later orders.'}
          </Help>
        </section>

        <CommonInput label="Description (staff only)" value={form.description} maxLength={PROMO_DESCRIPTION_MAX_LENGTH} onChange={text('description')} error={shown('description')} placeholder="e.g. Diwali offer for returning customers" />

        <section className="space-y-2">
          <ChoiceGroup label="Discount as" name="discountType" value={form.discountType} options={DISCOUNT_TYPES} onChange={chooseDiscountType} />
          <div className="grid grid-cols-2 gap-3">
            <CommonInput
              label="Discount %"
              required={form.discountType === 'PERCENTAGE'}
              disabled={form.discountType !== 'PERCENTAGE'}
              inputMode="decimal"
              value={form.discountPercentage}
              onChange={text('discountPercentage')}
              error={shown('discountPercentage')}
              placeholder="e.g. 20"
            />
            <CommonInput
              label="Amount off (₹)"
              required={form.discountType === 'AMOUNT'}
              disabled={form.discountType !== 'AMOUNT'}
              inputMode="decimal"
              value={form.amountOff}
              onChange={text('amountOff')}
              error={shown('amountOff')}
              placeholder="e.g. 200"
            />
          </div>
          <Help>
            One of the two, never both. A percentage is above 0 and below 100 (at most 99.99); an amount is above ₹0 and at most ₹
            {PROMO_AMOUNT_MAX.toLocaleString('en-IN')}, taken off each unit the promo works on. Either is taken off the list price and{' '}
            <strong>replaces</strong> the product's own discount, it is never added to it: list price ₹1,000 with 5 % off and a 20 % (or ₹200) promo
            costs ₹800, not ₹750. Where the product's own discount is as big or bigger, the promo does nothing on that product, and an amount never
            makes a unit free. Bundle discounts are not added on top either.
          </Help>
        </section>

        <section className="space-y-2">
          <ChoiceGroup label="Customers" name="customerScope" value={form.customerScope} options={SCOPES} onChange={(v) => set('customerScope', v)} />
          {form.customerScope === 'SELECTED' ? (
            <CustomerPicker chosen={form.customers} onChange={(customers) => set('customers', customers)} error={shown('customerIds')} />
          ) : (
            <Help>Any signed-in customer who has the code.</Help>
          )}
        </section>

        <section className="space-y-2">
          <ChoiceGroup label="Products" name="productScope" value={form.productScope} options={SCOPES} onChange={(v) => set('productScope', v)} />
          {form.productScope === 'SELECTED' ? (
            <>
              <ProductPicker chosen={form.products} onChange={(products) => set('products', products)} showErrors={submitted} error={shown('products')} />
              <Help>
                For each product, on how many of its units in one order the promo works: all units, or a number. With RudraX on 1, three RudraX in
                the cart get the promo on one; the other two keep their normal price.
              </Help>
            </>
          ) : (
            <Help>Every product in the order.</Help>
          )}
        </section>

        {form.productScope === 'ALL' && (
          <section className="space-y-1">
            <CommonInput label="Units per product" inputMode="numeric" value={form.maxUnitsPerProduct} onChange={text('maxUnitsPerProduct')} error={shown('maxUnitsPerProduct')} placeholder="Empty = every unit" />
            <Help>
              On how many units of each product in one order the promo works. Leave empty for every unit. With 1, three RudraX in the cart get the
              promo on one RudraX; the other two keep their normal price.
            </Help>
          </section>
        )}

        <section className="space-y-2">
          <ChoiceGroup label="Uses per customer" name="perCustomer" value={form.perCustomer} options={PER_CUSTOMER} onChange={(v) => set('perCustomer', v)} />
          {form.perCustomer === 'CUSTOM' && (
            <CommonInput label="Times one customer may use it" inputMode="numeric" value={form.perCustomerCustom} onChange={text('perCustomerCustom')} error={shown('perCustomerCustom')} />
          )}
          {form.perCustomer !== 'CUSTOM' && <ErrorText message={server.perCustomerCustom} />}
          <Help>One use is one order. A cancelled order gives its use back.</Help>
        </section>

        <section className="space-y-2">
          <ChoiceGroup label="Total uses" name="total" value={form.total} options={TOTAL} onChange={(v) => set('total', v)} />
          {form.total === 'LIMITED' && (
            <CommonInput label="Times it may be used in all" inputMode="numeric" value={form.totalLimit} onChange={text('totalLimit')} error={shown('totalLimit')} />
          )}
          {form.total !== 'LIMITED' && <ErrorText message={server.totalLimit} />}
        </section>

        <section className="space-y-2">
          <ChoiceGroup label="Valid for" name="validity" value={form.validity} options={VALIDITY} onChange={(v) => setForm((prev) => ({ ...prev, validity: v, expiresOn: expiryOf(prev) }))} />
          <div className="grid grid-cols-2 gap-3">
            <CommonInput label="First day" type="date" required value={form.startsOn} onChange={text('startsOn')} error={shown('startsOn')} />
            <CommonInput
              label="Last day"
              type="date"
              required
              value={expiresOn}
              readOnly={form.validity !== 'CUSTOM'}
              min={form.startsOn || undefined}
              onChange={text('expiresOn')}
              error={shown('expiresOn')}
            />
          </div>
          <Help>Both days included, India time.</Help>
        </section>

        {creating && (
          <CommonCheckbox label="Switch it on now (customers can use it within its dates)" checked={form.active} onChange={(checked) => set('active', checked)} />
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
          <button type="button" onClick={onClose} disabled={busy} className={`px-3 py-1.5 rounded-xl border font-medium cursor-pointer ${CHOICE_TONE.danger.idle}`}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium cursor-pointer disabled:opacity-60 ${SOLID_TONE.approve}`}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {creating ? 'Create promo code' : 'Save changes'}
          </button>
        </div>
      </form>
    </PromoDialog>
  );
};
