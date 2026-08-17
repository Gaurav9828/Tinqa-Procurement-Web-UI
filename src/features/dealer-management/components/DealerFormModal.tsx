import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { Validator, type ValidationRule } from '../../../utils/validator';
import type {
  CategoryResponse,
  DealerResponse,
  CreateDealerRequest,
  UpdateDealerRequest,
} from '../types/dealer.types';

interface DealerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDealerRequest | UpdateDealerRequest) => Promise<boolean>;
  dealer?: DealerResponse | null;
  categories: CategoryResponse[];
  isSubmitting: boolean;
  actionError?: string | null;
}

interface FormState {
  name: string;
  tradeName: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  googleMapsUrl: string;
  gstin: string;
  isGstVerified: boolean;
  panNumber: string;
  businessSince: string;
  employeeCount: string;
  offersShipping: boolean;
  doesBulkDealing: boolean;
  doesWholesaleDealing: boolean;
  categoryIds: number[];
  isActive: boolean;
}

const INITIAL_FORM_STATE: FormState = {
  name: '',
  tradeName: '',
  email: '',
  phoneNumber: '',
  alternatePhoneNumber: '',
  street: '',
  landmark: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  googleMapsUrl: '',
  gstin: '',
  isGstVerified: false,
  panNumber: '',
  businessSince: '',
  employeeCount: '',
  offersShipping: false,
  doesBulkDealing: true,
  doesWholesaleDealing: true,
  categoryIds: [],
  isActive: true,
};

export const DealerFormModal: React.FC<DealerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  dealer,
  categories,
  isSubmitting,
  actionError,
}) => {
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (dealer) {
      setFormData({
        name: dealer.name || '',
        tradeName: dealer.tradeName || '',
        email: dealer.email || '',
        phoneNumber: dealer.phoneNumber || '',
        alternatePhoneNumber: dealer.alternatePhoneNumber || '',
        street: dealer.street || '',
        landmark: dealer.landmark || '',
        city: dealer.city || '',
        state: dealer.state || '',
        country: dealer.country || 'India',
        pincode: dealer.pincode || '',
        googleMapsUrl: dealer.googleMapsUrl || '',
        gstin: dealer.gstin || '',
        isGstVerified: dealer.isGstVerified ?? false,
        panNumber: dealer.panNumber || '',
        businessSince: dealer.businessSince ? String(dealer.businessSince) : '',
        employeeCount: dealer.employeeCount ? String(dealer.employeeCount) : '',
        offersShipping: dealer.offersShipping ?? false,
        doesBulkDealing: dealer.doesBulkDealing ?? true,
        doesWholesaleDealing: dealer.doesWholesaleDealing ?? true,
        categoryIds: dealer.categories?.map((c) => c.id) || [],
        isActive: dealer.isActive ?? true,
      });
    } else {
      setFormData(INITIAL_FORM_STATE);
    }
    setTouched({});
  }, [dealer, isOpen]);

  const validationErrors = useMemo(() => {
    const rules: Record<string, { value: unknown; rule: ValidationRule }> = {
      name: { value: formData.name, rule: { required: true, customMessage: 'Dealer name is required.' } },
      email: { value: formData.email, rule: { required: true, type: 'email' } },
      phoneNumber: { value: formData.phoneNumber, rule: { required: true, type: 'phone' } },
      alternatePhoneNumber: { value: formData.alternatePhoneNumber, rule: { type: 'phone' } },
      street: { value: formData.street, rule: { required: true, customMessage: 'Street address is required.' } },
      city: { value: formData.city, rule: { required: true, customMessage: 'City is required.' } },
      state: { value: formData.state, rule: { required: true, customMessage: 'State is required.' } },
      country: { value: formData.country, rule: { required: true, customMessage: 'Country is required.' } },
      pincode: { value: formData.pincode, rule: { required: true, type: 'pincode' } },
      googleMapsUrl: { value: formData.googleMapsUrl, rule: { type: 'url' } },
      gstin: { value: formData.gstin, rule: { type: 'gstin' } },
      panNumber: { value: formData.panNumber, rule: { type: 'pan' } },
      businessSince: {
        value: formData.businessSince ? parseInt(formData.businessSince, 10) : undefined,
        rule: {
          type: 'number',
          min: 1800,
          max: new Date().getFullYear(),
          customMessage: 'Enter a valid year (1800 - present).',
        },
      },
      employeeCount: {
        value: formData.employeeCount ? parseInt(formData.employeeCount, 10) : undefined,
        rule: {
          type: 'number',
          min: 0,
          customMessage: 'Employee count cannot be negative.',
        },
      },
      categoryIds: {
        value: formData.categoryIds,
        rule: {
          required: true,
          customMessage: 'At least one category must be assigned.',
        },
      },
    };

    const errors: Record<string, string> = {};
    Object.entries(rules).forEach(([field, config]) => {
      const err = Validator.validateField(config.value, config.rule);
      if (err) errors[field] = err;
    });

    return errors;
  }, [formData]);

  const isValid = Object.keys(validationErrors).length === 0;

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleChange = useCallback((field: keyof FormState, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleCategory = useCallback((catId: number) => {
    setTouched((prev) => ({ ...prev, categoryIds: true }));
    setFormData((prev) => {
      const exists = prev.categoryIds.includes(catId);
      const categoryIds = exists
        ? prev.categoryIds.filter((id) => id !== catId)
        : [...prev.categoryIds, catId];
      return { ...prev, categoryIds };
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      // Mark all validated fields as touched to display validation messages
      const allTouched = Object.keys(validationErrors).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      );
      setTouched((prev) => ({ ...prev, ...allTouched }));
      return;
    }

    const payload: CreateDealerRequest | UpdateDealerRequest = {
      name: formData.name.trim(),
      tradeName: formData.tradeName.trim() || undefined,
      email: formData.email.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      alternatePhoneNumber: formData.alternatePhoneNumber.trim() || undefined,
      street: formData.street.trim(),
      landmark: formData.landmark.trim() || undefined,
      city: formData.city.trim(),
      state: formData.state.trim(),
      country: formData.country.trim(),
      pincode: formData.pincode.trim(),
      googleMapsUrl: formData.googleMapsUrl.trim() || undefined,
      gstin: formData.gstin.trim().toUpperCase() || undefined,
      isGstVerified: formData.isGstVerified,
      panNumber: formData.panNumber.trim().toUpperCase() || undefined,
      businessSince: formData.businessSince ? parseInt(formData.businessSince, 10) : undefined,
      employeeCount: formData.employeeCount ? parseInt(formData.employeeCount, 10) : undefined,
      offersShipping: formData.offersShipping,
      doesBulkDealing: formData.doesBulkDealing,
      doesWholesaleDealing: formData.doesWholesaleDealing,
      categoryIds: formData.categoryIds,
      ...(dealer ? { isActive: formData.isActive } : {}),
    };

    const success = await onSubmit(payload);
    if (success) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {dealer ? 'Edit Dealer Details' : 'Register Authorized Dealer'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form id="dealer-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {actionError && <Alert type="error" message={actionError} />}

          {!isValid && Object.keys(touched).length > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Please resolve all highlighted errors before submitting the form.</span>
            </div>
          )}

          {/* Basic & Legal Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Basic & Legal Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Dealer Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onBlur={() => handleBlur('name')}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Acme Industrial Traders"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.name && validationErrors.name && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="tradeName" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Trade Name
                </label>
                <input
                  id="tradeName"
                  type="text"
                  value={formData.tradeName}
                  onChange={(e) => handleChange('tradeName', e.target.value)}
                  placeholder="e.g. Acme Supplies"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              <div>
                <label htmlFor="gstin" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  GSTIN Number
                </label>
                <input
                  id="gstin"
                  type="text"
                  value={formData.gstin}
                  onBlur={() => handleBlur('gstin')}
                  onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.gstin && validationErrors.gstin && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.gstin}</p>
                )}
              </div>

              <div>
                <label htmlFor="panNumber" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  PAN Number
                </label>
                <input
                  id="panNumber"
                  type="text"
                  value={formData.panNumber}
                  onBlur={() => handleBlur('panNumber')}
                  onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.panNumber && validationErrors.panNumber && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.panNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onBlur={() => handleBlur('email')}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@dealer.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.email && validationErrors.email && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phoneNumber"
                  type="text"
                  value={formData.phoneNumber}
                  onBlur={() => handleBlur('phoneNumber')}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.phoneNumber && validationErrors.phoneNumber && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="alternatePhoneNumber" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Alternate Phone
                </label>
                <input
                  id="alternatePhoneNumber"
                  type="text"
                  value={formData.alternatePhoneNumber}
                  onBlur={() => handleBlur('alternatePhoneNumber')}
                  onChange={(e) => handleChange('alternatePhoneNumber', e.target.value)}
                  placeholder="+91 9123456789"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.alternatePhoneNumber && validationErrors.alternatePhoneNumber && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.alternatePhoneNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="googleMapsUrl" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Google Maps Location Link
                </label>
                <input
                  id="googleMapsUrl"
                  type="url"
                  value={formData.googleMapsUrl}
                  onBlur={() => handleBlur('googleMapsUrl')}
                  onChange={(e) => handleChange('googleMapsUrl', e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.googleMapsUrl && validationErrors.googleMapsUrl && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.googleMapsUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Location */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Address Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="street" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="street"
                  type="text"
                  value={formData.street}
                  onBlur={() => handleBlur('street')}
                  onChange={(e) => handleChange('street', e.target.value)}
                  placeholder="Plot 42, Industrial Area Phase 2"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.street && validationErrors.street && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.street}</p>
                )}
              </div>

              <div>
                <label htmlFor="landmark" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Landmark
                </label>
                <input
                  id="landmark"
                  type="text"
                  value={formData.landmark}
                  onChange={(e) => handleChange('landmark', e.target.value)}
                  placeholder="Near Metro Pillar 140"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onBlur={() => handleBlur('city')}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Greater Noida"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.city && validationErrors.city && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="state" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  id="state"
                  type="text"
                  value={formData.state}
                  onBlur={() => handleBlur('state')}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Uttar Pradesh"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.state && validationErrors.state && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.state}</p>
                )}
              </div>

              <div>
                <label htmlFor="country" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  id="country"
                  type="text"
                  value={formData.country}
                  onBlur={() => handleBlur('country')}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="India"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.country && validationErrors.country && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.country}</p>
                )}
              </div>

              <div>
                <label htmlFor="pincode" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  id="pincode"
                  type="text"
                  value={formData.pincode}
                  onBlur={() => handleBlur('pincode')}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="201310"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.pincode && validationErrors.pincode && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.pincode}</p>
                )}
              </div>
            </div>
          </div>

          {/* Business Capabilities & Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Business Capabilities & Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="businessSince" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Business Since (Year)
                </label>
                <input
                  id="businessSince"
                  type="number"
                  value={formData.businessSince}
                  onBlur={() => handleBlur('businessSince')}
                  onChange={(e) => handleChange('businessSince', e.target.value)}
                  placeholder="2018"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.businessSince && validationErrors.businessSince && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.businessSince}</p>
                )}
              </div>

              <div>
                <label htmlFor="employeeCount" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Employee Count
                </label>
                <input
                  id="employeeCount"
                  type="number"
                  value={formData.employeeCount}
                  onBlur={() => handleBlur('employeeCount')}
                  onChange={(e) => handleChange('employeeCount', e.target.value)}
                  placeholder="25"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                {touched.employeeCount && validationErrors.employeeCount && (
                  <p className="mt-1 text-[11px] text-red-500">{validationErrors.employeeCount}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={formData.offersShipping}
                  onChange={(e) => handleChange('offersShipping', e.target.checked)}
                  className="rounded text-[#0071e3] focus:ring-[#0071e3]"
                />
                Offers Shipping
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={formData.doesBulkDealing}
                  onChange={(e) => handleChange('doesBulkDealing', e.target.checked)}
                  className="rounded text-[#0071e3] focus:ring-[#0071e3]"
                />
                Bulk Dealing
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={formData.doesWholesaleDealing}
                  onChange={(e) => handleChange('doesWholesaleDealing', e.target.checked)}
                  className="rounded text-[#0071e3] focus:ring-[#0071e3]"
                />
                Wholesale Dealing
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={formData.isGstVerified}
                  onChange={(e) => handleChange('isGstVerified', e.target.checked)}
                  className="rounded text-[#0071e3] focus:ring-[#0071e3]"
                />
                GST Verified
              </label>
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Assigned Categories <span className="text-red-500">*</span>
            </span>
            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 max-h-36 overflow-y-auto">
              {categories.map((cat) => {
                const isSelected = formData.categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#0071e3] text-white'
                        : 'bg-black/5 dark:bg-white/10 text-gray-700 dark:text-neutral-300 hover:bg-black/10'
                    }`}
                  >
                    {cat.name} ({cat.code})
                  </button>
                );
              })}
            </div>
            {touched.categoryIds && validationErrors.categoryIds && (
              <p className="text-[11px] text-red-500">{validationErrors.categoryIds}</p>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="dealer-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : dealer ? 'Update Dealer' : 'Save Dealer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};