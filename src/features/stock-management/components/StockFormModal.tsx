import { useNotify } from '../../../hooks/useNotify';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Save, ChevronDown, Check, Eye } from 'lucide-react';
import { Validator, type ValidationRule } from '../../../utils/validator';
import type { CreateStockFromOrderRequest } from '../types/stock.types';
import { useOrderList } from '../../order-management/hooks/useOrderList';
import { useItemOptions, useStockOptions } from '../../../hooks/useLookupOptions';
import { CommonInput, CommonCheckbox, CommonSelect } from '../../../components/ui/FormInputs';
import { AttributeInputBuilder } from '../../../components/ui/AttributeInputBuilder'; // Adjust path if needed

import type { OrderResponse } from '../../order-management/types/order.types';
import { OrderPreviewModal } from '../../order-management/components/OrderPreviewModal';

interface StockFormModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    initialOrderNumber?: string; // <--- Added prop for pre-selecting order ID
    onClose: () => void;
    onRequestSubmit: (data: CreateStockFromOrderRequest) => Promise<void> | void;
}

// Defected units and "Has Passed Quality Testing" are derived from the order quantity and the
// units that passed, so they are not editable form state.
interface FormState {
    orderNumber: string;
    /** '' until the tester picks a value. */
    unitsPassedTest: string;
    dateOfArrival: string;
    additionalInfo: Record<string, string>;
}

const DEFAULT_FORM: FormState = {
    orderNumber: '',
    unitsPassedTest: '',
    dateOfArrival: new Date().toISOString().split('T')[0],
    additionalInfo: {},
};

/** Above this order quantity a select gets unwieldy; a bounded number input is used instead. */
const MAX_PASSED_OPTIONS = 5000;

/** 0…quantity in whole units (a fractional quantity, e.g. 12.5 KG, is offered as the last option). */
const passedTestOptions = (quantity: number): string[] => {
    const whole = Array.from({ length: Math.floor(quantity) + 1 }, (_, i) => String(i));
    return Number.isInteger(quantity) ? whole : [...whole, String(quantity)];
};

/** Avoids float noise like 2.9999999 when subtracting decimal quantities. */
const roundUnits = (value: number) => Math.round(value * 1000) / 1000;

export const StockFormModal: React.FC<StockFormModalProps> = ({
    isOpen,
    isSubmitting,
    initialOrderNumber, // <--- Destructured prop
    onClose,
    onRequestSubmit,
}) => {
    // Only fetch once the modal is actually opened.
    // Stock can only be created from delivered orders.
    const { orders, isLoading } = useOrderList({ enabled: isOpen, initialStatus: 'DELIVERED' });
    const { options: items } = useItemOptions(isOpen);
    // One order, one stock entry: orders that already have one are not offered (the backend enforces it too).
    const { options: existingStocks } = useStockOptions(isOpen);
    const stockByOrder = useMemo(
        () => new Map(existingStocks.map((stock) => [stock.orderNumber.toLowerCase(), stock.stockIdentityNumber])),
        [existingStocks]
    );
    const availableOrders = useMemo(
        () => orders.filter((o) => !stockByOrder.has(o.orderNumber.toLowerCase())),
        [orders, stockByOrder]
    );
    
    const [formData, setFormData] = useState<FormState>({
        ...DEFAULT_FORM,
        orderNumber: initialOrderNumber || '',
    });
    
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const notify = useNotify();

    const [showOrderSuggestions, setShowOrderSuggestions] = useState<boolean>(false);
    const [selectedPreviewOrder, setSelectedPreviewOrder] = useState<OrderResponse | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);


    // Reset or initialize local state on modal close/open
    useEffect(() => {
        if (isOpen) {
            setFormData({
                ...DEFAULT_FORM,
                orderNumber: initialOrderNumber || '',
            });
            setTouched({});
        }
    }, [isOpen, initialOrderNumber]);

    // Close order suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowOrderSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const matchingOrders = useMemo(() => {
        if (!formData.orderNumber.trim()) return availableOrders;
        const query = formData.orderNumber.toLowerCase().trim();
        return availableOrders.filter(
            (o) =>
                o.orderNumber.toLowerCase().includes(query) ||
                (o.itemName && o.itemName.toLowerCase().includes(query)) ||
                (o.dealerName && o.dealerName.toLowerCase().includes(query))
        );
    }, [availableOrders, formData.orderNumber]);

    // A typed order number that already has stock is reported, never selected.
    const existingStockForOrder = stockByOrder.get(formData.orderNumber.trim().toLowerCase()) ?? null;

    const selectedOrder = useMemo(() => {
        return availableOrders.find(
            (o) => o.orderNumber.toLowerCase() === formData.orderNumber.trim().toLowerCase()
        );
    }, [availableOrders, formData.orderNumber]);

    const isOrderSelected = Boolean(selectedOrder);

    // Everything below follows from the order quantity and the units that passed.
    const totalUnits = selectedOrder ? Number(selectedOrder.orderQuantity) || 0 : null;
    const passedUnits = formData.unitsPassedTest === '' ? null : Number(formData.unitsPassedTest);
    const defectedUnits = totalUnits !== null && passedUnits !== null ? roundUnits(totalUnits - passedUnits) : null;
    const hasTested = totalUnits !== null && totalUnits > 0 && passedUnits === totalUnits;

    const minDateOfArrival = useMemo(() => {
        if (!selectedOrder?.orderDate) return undefined;
        return new Date(selectedOrder.orderDate).toISOString().split('T')[0];
    }, [selectedOrder]);

    useEffect(() => {
        if (minDateOfArrival && formData.dateOfArrival && formData.dateOfArrival < minDateOfArrival) {
            setFormData((prev) => ({ ...prev, dateOfArrival: minDateOfArrival }));
        }
    }, [minDateOfArrival, formData.dateOfArrival]);

    const validationErrors = useMemo(() => {
        const rules: Record<string, { value: unknown; rule: ValidationRule }> = {
            orderNumber: {
                value: formData.orderNumber,
                rule: { required: true, customMessage: 'Order Number is required.' },
            },
            dateOfArrival: {
                value: formData.dateOfArrival,
                rule: { required: true, customMessage: 'Date of arrival is required.' },
            },
        };

        const errors: Record<string, string> = {};
        Object.entries(rules).forEach(([field, config]) => {
            const err = Validator.validateField(config.value, config.rule);
            if (err) errors[field] = err;
        });

        if (existingStockForOrder) {
            errors.orderNumber = `Order ${formData.orderNumber.trim()} already has stock entry ${existingStockForOrder}. An order can be used for only one stock entry.`;
        }

        if (totalUnits !== null) {
            const passed = formData.unitsPassedTest === '' ? NaN : Number(formData.unitsPassedTest);
            if (formData.unitsPassedTest === '') errors.unitsPassedTest = 'Select how many units passed the test.';
            else if (!Number.isFinite(passed) || passed < 0 || passed > totalUnits) {
                errors.unitsPassedTest = `Passed units must be between 0 and ${totalUnits} (order quantity).`;
            }
        }

        if (
            minDateOfArrival &&
            formData.dateOfArrival &&
            formData.dateOfArrival < minDateOfArrival
        ) {
            errors.dateOfArrival = `Arrival date cannot be before order date (${minDateOfArrival}).`;
        }

        return errors;
    }, [formData, minDateOfArrival, totalUnits, existingStockForOrder]);

    const isValid = Object.keys(validationErrors).length === 0;

    const handleBlur = useCallback((field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    }, []);

    const handleChange = useCallback((field: keyof FormState, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleSelectOrder = (orderNum: string) => {
        const selected = orders.find((o) => o.orderNumber === orderNum);
        const orderMinDate = selected?.orderDate
            ? new Date(selected.orderDate).toISOString().split('T')[0]
            : undefined;

        setFormData((prev) => ({
            ...prev,
            orderNumber: orderNum,
            // A different order has a different quantity, so the tester picks again.
            unitsPassedTest: prev.orderNumber === orderNum ? prev.unitsPassedTest : '',
            dateOfArrival:
                orderMinDate && prev.dateOfArrival < orderMinDate ? orderMinDate : prev.dateOfArrival,
        }));
        setShowOrderSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) {
            const allTouched = Object.keys(validationErrors).reduce((acc, k) => ({ ...acc, [k]: true }), {});
            setTouched((prev) => ({ ...prev, ...allTouched }));
            notify.error('Please fix highlighted validation errors before saving.');
            return;
        }

        const payload: CreateStockFromOrderRequest = {
            orderNumber: formData.orderNumber.trim(),
            unitsPassedTest: passedUnits ?? 0,
            defectedUnits: defectedUnits ?? 0,
            hasTested,
            dateOfArrival: formData.dateOfArrival,
            additionalInfo: formData.additionalInfo,
        };

        try {
            await onRequestSubmit(payload);
        } catch (err: unknown) {
            notify.error(err, 'Server error occurred while creating stock entry.');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[90vh]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
                        <h2 className="text-lg font-semibold text-black dark:text-white">
                            Create Stock Entry from Order
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form id="stock-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 flex items-center gap-2">
                                <div className="relative flex-1" ref={dropdownRef}>
                                    <CommonInput
                                        label="Order Number"
                                        required
                                        value={formData.orderNumber}
                                        onFocus={() => setShowOrderSuggestions(true)}
                                        onBlur={() => handleBlur('orderNumber')}
                                        onChange={(e) => {
                                            setFormData((prev) => ({ ...prev, orderNumber: e.target.value, unitsPassedTest: '' }));
                                            setShowOrderSuggestions(true);
                                        }}
                                        placeholder="Search or select order..."
                                        error={touched.orderNumber || existingStockForOrder ? validationErrors.orderNumber : undefined}
                                    />
                                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />

                                    {showOrderSuggestions && (
                                        <div className="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 shadow-lg text-xs">
                                            {isLoading ? (
                                                <div className="p-3 text-center text-gray-400">Loading orders...</div>
                                            ) : matchingOrders.length > 0 ? (
                                                matchingOrders.map((order) => (
                                                    <button
                                                        type="button"
                                                        key={order.id}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleSelectOrder(order.orderNumber);
                                                        }}
                                                        className="w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between transition-colors border-b last:border-0 border-black/5 dark:border-white/5 cursor-pointer"
                                                    >
                                                        <div>
                                                            <div className="font-mono font-semibold text-black dark:text-white">
                                                                {order.orderNumber}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 dark:text-neutral-400">
                                                                {order.dealerName} • {order.itemName}
                                                            </div>
                                                        </div>
                                                        {formData.orderNumber === order.orderNumber && (
                                                            <Check className="w-3.5 h-3.5 text-[#0071e3]" />
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-3 text-center text-gray-400">
                                                    No matching orders without a stock entry
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    title="Preview Order Details"
                                    disabled={!isOrderSelected}
                                    onClick={() => selectedOrder && setSelectedPreviewOrder(selectedOrder)}
                                    className={`p-2 border-0 bg-transparent rounded-lg transition-colors flex items-center justify-center shrink-0 self-center ${
                                        isOrderSelected
                                            ? 'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer'
                                            : 'opacity-30 cursor-not-allowed'
                                    }`}
                                >
                                    <Eye
                                        className={`w-5 h-5 transition-colors pointer-events-none ${
                                            isOrderSelected
                                                ? 'text-[#0071e3]'
                                                : 'text-gray-400 dark:text-neutral-500'
                                        }`}
                                    />
                                </button>
                            </div>

                            <CommonInput
                                label="Date of Arrival"
                                type="date"
                                required
                                disabled={!isOrderSelected}
                                min={minDateOfArrival}
                                value={formData.dateOfArrival}
                                onBlur={() => handleBlur('dateOfArrival')}
                                onChange={(e) => handleChange('dateOfArrival', e.target.value)}
                                error={touched.dateOfArrival ? validationErrors.dateOfArrival : undefined}
                            />

                            {totalUnits !== null && totalUnits > MAX_PASSED_OPTIONS ? (
                                <CommonInput
                                    label={`Units Passed Test (of ${totalUnits})`}
                                    type="number"
                                    required
                                    min={0}
                                    max={totalUnits}
                                    value={formData.unitsPassedTest}
                                    onBlur={() => handleBlur('unitsPassedTest')}
                                    onChange={(e) => handleChange('unitsPassedTest', e.target.value)}
                                    error={touched.unitsPassedTest ? validationErrors.unitsPassedTest : undefined}
                                />
                            ) : (
                                <CommonSelect
                                    label={totalUnits !== null ? `Units Passed Test (of ${totalUnits})` : 'Units Passed Test'}
                                    required
                                    disabled={!isOrderSelected}
                                    placeholder={isOrderSelected ? 'Select passed units' : 'Select an order first'}
                                    options={totalUnits !== null ? passedTestOptions(totalUnits) : []}
                                    value={formData.unitsPassedTest}
                                    onBlur={() => handleBlur('unitsPassedTest')}
                                    onChange={(e) => {
                                        handleChange('unitsPassedTest', e.target.value);
                                        handleBlur('unitsPassedTest');
                                    }}
                                    error={touched.unitsPassedTest ? validationErrors.unitsPassedTest : undefined}
                                    data-testid="units-passed-select"
                                />
                            )}

                            <CommonInput
                                label="Defected Units"
                                type="number"
                                readOnly
                                disabled={!isOrderSelected}
                                value={defectedUnits === null ? '' : String(defectedUnits)}
                                placeholder="Calculated"
                                title="Order quantity − units passed test"
                                data-testid="defected-units"
                            />

                            <div className="pt-2 sm:col-span-2 space-y-1">
                                <CommonCheckbox
                                    label="Has Passed Quality Testing"
                                    // Set automatically: checked only when every unit passed.
                                    disabled
                                    checked={hasTested}
                                    onChange={() => undefined}
                                />
                                <p className="text-[11px] text-gray-400 pl-6">
                                    {passedUnits === null
                                        ? 'Ticked automatically when every unit passes the test.'
                                        : hasTested
                                          ? 'All units passed the test.'
                                          : `${defectedUnits} unit${defectedUnits === 1 ? '' : 's'} failed the test.`}
                                </p>
                            </div>

                            {/* Additional Info Attribute Builder */}
                            <div className="sm:col-span-2 pt-2">
                                <AttributeInputBuilder
                                    existingItems={items}
                                    attributes={formData.additionalInfo}
                                    onChange={(updatedAttributes) => handleChange('additionalInfo', updatedAttributes)}
                                />
                            </div>
                        </div>
                    </form>

                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/10 dark:border-white/10 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="stock-form"
                            disabled={isSubmitting || !isOrderSelected}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0071e3]/90 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? 'Submitting...' : 'Submit Entry'}
                        </button>
                    </div>
                </div>
            </div>

            {selectedPreviewOrder && (
                <OrderPreviewModal
                    order={selectedPreviewOrder}
                    onClose={() => setSelectedPreviewOrder(null)}
                />
            )}
        </>
    );
};