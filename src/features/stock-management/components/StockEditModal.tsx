import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save } from 'lucide-react';
import { Validator, type ValidationRule } from '../../../utils/validator';
import type { StockResponse, UpdateStockRequest } from '../types/stock.types';
import { useDealerList } from '../../dealer-management/hooks/useDealerList';
import { useItemList } from '../../item-management/hooks/useItemList';
import { CommonInput, CommonSelect, CommonCheckbox } from '../../../components/ui/FormInputs';
import { Alert } from '../../../components/ui/Alert';
import { AttributeInputBuilder } from '../../../components/ui/AttributeInputBuilder';

interface StockEditModalProps {
    isOpen: boolean;
    stock: StockResponse | null;
    isSubmitting: boolean;
    error?: string | null;
    onClose: () => void;
    onRequestSubmit: (id: number, data: UpdateStockRequest) => Promise<void> | void;
}

interface FormState {
    batchNumber: string;
    dealerId: string;
    itemId: string;
    unitsPassedTest: string;
    defectedUnits: string;
    hasTested: boolean;
    dateOfArrival: string;
    additionalInfo: Record<string, any>;
    isActive: boolean;
}

export const StockEditModal: React.FC<StockEditModalProps> = ({
    isOpen,
    stock,
    isSubmitting,
    error: externalError,
    onClose,
    onRequestSubmit,
}) => {
    const { dealers } = useDealerList();
    const { items } = useItemList();

    const [formData, setFormData] = useState<FormState>({
        batchNumber: '',
        dealerId: '',
        itemId: '',
        unitsPassedTest: '0',
        defectedUnits: '0',
        hasTested: false,
        dateOfArrival: new Date().toISOString().split('T')[0],
        additionalInfo: {},
        isActive: true,
    });

    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (externalError) {
            setSubmitError(externalError);
        }
    }, [externalError]);

    useEffect(() => {
        if (isOpen && stock) {
            setFormData({
                batchNumber: stock.batchNumber || '',
                dealerId: String(stock.dealerId || ''),
                itemId: String(stock.itemId || ''),
                unitsPassedTest: String(stock.unitsPassedTest ?? 0),
                defectedUnits: String(stock.defectedUnits ?? 0),
                hasTested: Boolean(stock.hasTested),
                dateOfArrival: stock.dateOfArrival || new Date().toISOString().split('T')[0],
                additionalInfo: stock.additionalInfo || {},
                isActive: stock.isActive ?? true,
            });
            setTouched({});
            setSubmitError(null);
        }
    }, [isOpen, stock]);

    const dealerOptions = useMemo(
        () => dealers?.map((d) => ({ label: d.name, value: d.id })) || [],
        [dealers]
    );

    const itemOptions = useMemo(
        () => items?.map((i) => ({ label: i.name, value: i.id })) || [],
        [items]
    );

    const validationRules = useMemo<Record<keyof FormState, ValidationRule>>(() => ({
        batchNumber: { required: true, customMessage: 'Batch number is required.' },
        dealerId: { required: true, customMessage: 'Dealer selection is required.' },
        itemId: { required: true, customMessage: 'Item selection is required.' },
        dateOfArrival: { required: true, customMessage: 'Date of arrival is required.' },
        unitsPassedTest: { type: 'number', min: 0, customMessage: 'Passed units cannot be negative.' },
        defectedUnits: { type: 'number', min: 0, customMessage: 'Defected units cannot be negative.' },
        hasTested: {},
        additionalInfo: {},
        isActive: {},
    }), []);

    const validationErrors = useMemo(() => {
        const errors: Record<string, string> = {};

        (Object.keys(validationRules) as Array<keyof FormState>).forEach((field) => {
            const rule = validationRules[field];
            if (rule && Object.keys(rule).length > 0) {
                let valueToValidate: unknown = formData[field];
                if (field === 'unitsPassedTest' || field === 'defectedUnits') {
                    valueToValidate = formData[field] !== '' ? Number(formData[field]) : '';
                }
                const err = Validator.validateField(valueToValidate, rule);
                if (err) errors[field] = err;
            }
        });

        return errors;
    }, [formData, validationRules]);

    const isValid = Object.keys(validationErrors).length === 0;

    const handleBlur = useCallback((field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    }, []);

    const handleChange = useCallback((field: keyof FormState, value: unknown) => {
        setSubmitError(null);
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stock) return;

        if (!isValid) {
            const allTouched = Object.keys(validationErrors).reduce((acc, k) => ({ ...acc, [k]: true }), {});
            setTouched((prev) => ({ ...prev, ...allTouched }));
            setSubmitError('Please fix highlighted validation errors before saving.');
            return;
        }

        setSubmitError(null);
        const payload: UpdateStockRequest = {
            batchNumber: formData.batchNumber.trim(),
            dealerId: Number(formData.dealerId),
            itemId: Number(formData.itemId),
            unitsPassedTest: Number(formData.unitsPassedTest),
            defectedUnits: Number(formData.defectedUnits),
            hasTested: formData.hasTested,
            dateOfArrival: formData.dateOfArrival,
            additionalInfo: formData.additionalInfo,
            isActive: formData.isActive,
        };

        try {
            await onRequestSubmit(stock.id, payload);
        } catch (err: any) {
            setSubmitError(err?.message || 'Server error occurred while updating stock entry.');
        }
    };

    if (!isOpen || !stock) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-black dark:text-white">Edit Stock Batch</h2>
                        <p className="text-[11px] font-mono text-gray-500">{stock.stockIdentityNumber}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="stock-edit-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                    {submitError && (
                        <Alert
                            type="error"
                            message={submitError}
                            onClose={() => setSubmitError(null)}
                        />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <CommonInput
                            label="Batch Number"
                            required
                            disabled
                            value={formData.batchNumber}
                            onBlur={() => handleBlur('batchNumber')}
                            onChange={(e) => handleChange('batchNumber', e.target.value)}
                            error={touched.batchNumber ? validationErrors.batchNumber : undefined}
                        />

                        <CommonInput
                            label="Date of Arrival"
                            type="date"
                            required
                            min={formData.dateOfArrival}
                            value={formData.dateOfArrival}
                            onBlur={() => handleBlur('dateOfArrival')}
                            onChange={(e) => handleChange('dateOfArrival', e.target.value)}
                            error={touched.dateOfArrival ? validationErrors.dateOfArrival : undefined}
                        />

                        {/* Dealer Selection */}
                        <div className="sm:col-span-2">
                            <CommonSelect
                                label="Dealer"
                                required
                                options={dealerOptions}
                                placeholder="Select Dealer..."
                                value={formData.dealerId}
                                onBlur={() => handleBlur('dealerId')}
                                onChange={(e) => handleChange('dealerId', e.target.value)}
                                error={touched.dealerId ? validationErrors.dealerId : undefined}
                            />
                        </div>

                        {/* Item Selection */}
                        <div className="sm:col-span-2">
                            <CommonSelect
                                label="Item"
                                required
                                options={itemOptions}
                                placeholder="Select Item..."
                                value={formData.itemId}
                                onBlur={() => handleBlur('itemId')}
                                onChange={(e) => handleChange('itemId', e.target.value)}
                                error={touched.itemId ? validationErrors.itemId : undefined}
                            />
                        </div>

                        <CommonInput
                            label="Units Passed Test"
                            type="number"
                            value={formData.unitsPassedTest}
                            onBlur={() => handleBlur('unitsPassedTest')}
                            onChange={(e) => handleChange('unitsPassedTest', e.target.value)}
                            error={touched.unitsPassedTest ? validationErrors.unitsPassedTest : undefined}
                        />

                        <CommonInput
                            label="Defected Units"
                            type="number"
                            value={formData.defectedUnits}
                            onBlur={() => handleBlur('defectedUnits')}
                            onChange={(e) => handleChange('defectedUnits', e.target.value)}
                            error={touched.defectedUnits ? validationErrors.defectedUnits : undefined}
                        />

                        <div className="pt-2 sm:col-span-2 space-y-2">
                            <CommonCheckbox
                                label="Has Passed Quality Testing"
                                checked={formData.hasTested}
                                onChange={(checked) => handleChange('hasTested', checked)}
                            />
                            <CommonCheckbox
                                label="Is Active"
                                checked={formData.isActive}
                                onChange={(checked) => handleChange('isActive', checked)}
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
                        form="stock-edit-form"
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0071e3]/90 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <Save className="w-4 h-4" />
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};