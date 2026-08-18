import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Save, ChevronDown, Check, Eye } from 'lucide-react';
import { Validator, type ValidationRule } from '../../../utils/validator';
import type { CreateStockFromOrderRequest } from '../types/stock.types';
import { useOrderList } from '../../order-management/hooks/useOrderList';
import { useItemList } from '../../item-management/hooks/useItemList';
import { CommonInput, CommonCheckbox } from '../../../components/ui/FormInputs';
import { Alert } from '../../../components/ui/Alert';
import { AttributeInputBuilder } from '../../../components/ui/AttributeInputBuilder'; // Adjust path if needed

import type { OrderResponse } from '../../order-management/types/order.types';
import { OrderPreviewModal } from '../../order-management/components/OrderPreviewModal';

interface StockFormModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    error?: string | null;
    initialOrderNumber?: string; // <--- Added prop for pre-selecting order ID
    onClose: () => void;
    onRequestSubmit: (data: CreateStockFromOrderRequest) => Promise<void> | void;
}

interface FormState {
    orderNumber: string;
    unitsPassedTest: string;
    defectedUnits: string;
    hasTested: boolean;
    dateOfArrival: string;
    additionalInfo: Record<string, string>;
}

const DEFAULT_FORM: FormState = {
    orderNumber: '',
    unitsPassedTest: '0',
    defectedUnits: '0',
    hasTested: false,
    dateOfArrival: new Date().toISOString().split('T')[0],
    additionalInfo: {},
};

export const StockFormModal: React.FC<StockFormModalProps> = ({
    isOpen,
    isSubmitting,
    error: externalError,
    initialOrderNumber, // <--- Destructured prop
    onClose,
    onRequestSubmit,
}) => {
    const { orders, updateStatusFilter, isLoading } = useOrderList();
    const { items } = useItemList();
    
    const [formData, setFormData] = useState<FormState>({
        ...DEFAULT_FORM,
        orderNumber: initialOrderNumber || '',
    });
    
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [showOrderSuggestions, setShowOrderSuggestions] = useState<boolean>(false);
    const [selectedPreviewOrder, setSelectedPreviewOrder] = useState<OrderResponse | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync external server error from parent page/hook
    useEffect(() => {
        if (externalError) {
            setSubmitError(externalError);
        }
    }, [externalError]);

    // Reset or initialize local state on modal close/open
    useEffect(() => {
        if (isOpen) {
            setFormData({
                ...DEFAULT_FORM,
                orderNumber: initialOrderNumber || '',
            });
            setTouched({});
            setSubmitError(null);
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
        updateStatusFilter('DELIVERED');
        if (!formData.orderNumber.trim()) return orders;
        const query = formData.orderNumber.toLowerCase().trim();
        return orders.filter(
            (o) =>
                o.orderNumber.toLowerCase().includes(query) ||
                (o.itemName && o.itemName.toLowerCase().includes(query)) ||
                (o.dealerName && o.dealerName.toLowerCase().includes(query))
        );
    }, [orders, formData.orderNumber]);

    const selectedOrder = useMemo(() => {
        return orders.find(
            (o) => o.orderNumber.toLowerCase() === formData.orderNumber.trim().toLowerCase()
        );
    }, [orders, formData.orderNumber]);

    const isOrderSelected = Boolean(selectedOrder);

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

        if (formData.unitsPassedTest !== '') {
            rules.unitsPassedTest = {
                value: Number(formData.unitsPassedTest),
                rule: { type: 'number', min: 0, customMessage: 'Passed units cannot be negative.' },
            };
        }

        if (formData.defectedUnits !== '') {
            rules.defectedUnits = {
                value: Number(formData.defectedUnits),
                rule: { type: 'number', min: 0, customMessage: 'Defected units cannot be negative.' },
            };
        }

        const errors: Record<string, string> = {};
        Object.entries(rules).forEach(([field, config]) => {
            const err = Validator.validateField(config.value, config.rule);
            if (err) errors[field] = err;
        });

        if (
            minDateOfArrival &&
            formData.dateOfArrival &&
            formData.dateOfArrival < minDateOfArrival
        ) {
            errors.dateOfArrival = `Arrival date cannot be before order date (${minDateOfArrival}).`;
        }

        return errors;
    }, [formData, minDateOfArrival]);

    const isValid = Object.keys(validationErrors).length === 0;

    const handleBlur = useCallback((field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    }, []);

    const handleChange = useCallback((field: keyof FormState, value: unknown) => {
        setSubmitError(null);
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleSelectOrder = (orderNum: string) => {
        setSubmitError(null);
        const selected = orders.find((o) => o.orderNumber === orderNum);
        const orderMinDate = selected?.orderDate
            ? new Date(selected.orderDate).toISOString().split('T')[0]
            : undefined;

        setFormData((prev) => ({
            ...prev,
            orderNumber: orderNum,
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
            setSubmitError('Please fix highlighted validation errors before saving.');
            return;
        }

        setSubmitError(null);
        const payload: CreateStockFromOrderRequest = {
            orderNumber: formData.orderNumber.trim(),
            unitsPassedTest: formData.unitsPassedTest !== '' ? Number(formData.unitsPassedTest) : 0,
            defectedUnits: formData.defectedUnits !== '' ? Number(formData.defectedUnits) : 0,
            hasTested: formData.hasTested,
            dateOfArrival: formData.dateOfArrival,
            additionalInfo: formData.additionalInfo,
        };

        try {
            await onRequestSubmit(payload);
        } catch (err: any) {
            setSubmitError(err?.message || 'Server error occurred while creating stock entry.');
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
                        {submitError && (
                            <Alert
                                type="error"
                                message={submitError}
                                onClose={() => setSubmitError(null)}
                            />
                        )}

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
                                            handleChange('orderNumber', e.target.value);
                                            setShowOrderSuggestions(true);
                                        }}
                                        placeholder="Search or select order..."
                                        error={touched.orderNumber ? validationErrors.orderNumber : undefined}
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
                                                <div className="p-3 text-center text-gray-400">No matching orders found</div>
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

                            <CommonInput
                                label="Units Passed Test"
                                type="number"
                                disabled={!isOrderSelected}
                                value={formData.unitsPassedTest}
                                onBlur={() => handleBlur('unitsPassedTest')}
                                onChange={(e) => handleChange('unitsPassedTest', e.target.value)}
                                error={touched.unitsPassedTest ? validationErrors.unitsPassedTest : undefined}
                            />

                            <CommonInput
                                label="Defected Units"
                                type="number"
                                disabled={!isOrderSelected}
                                value={formData.defectedUnits}
                                onBlur={() => handleBlur('defectedUnits')}
                                onChange={(e) => handleChange('defectedUnits', e.target.value)}
                                error={touched.defectedUnits ? validationErrors.defectedUnits : undefined}
                            />

                            <div className="pt-2 sm:col-span-2">
                                <CommonCheckbox
                                    label="Has Passed Quality Testing"
                                    disabled={!isOrderSelected}
                                    checked={formData.hasTested}
                                    onChange={(checked) => handleChange('hasTested', checked)}
                                />
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