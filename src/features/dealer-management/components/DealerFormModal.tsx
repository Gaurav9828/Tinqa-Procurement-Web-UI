import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, Loader2, RefreshCw } from 'lucide-react';
import { Validator, type ValidationRule } from '../../../utils/validator';
import { usePincodeLookup } from '../../../hooks/usePincodeLookup';
import { PINCODE_MESSAGES, applyPincodeLocation } from '../../../utils/pincode';
import { hasFormChanges } from '../../../utils/formChanges';
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
  /** The item categories; a dealer quotes only for items in the categories assigned here. */
  categories: CategoryResponse[];
  isSubmitting: boolean;
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
  district: string;
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
  district: '',
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
}) => {
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  // What the form opened with; Save stays disabled until something differs from it.
  const [baseline, setBaseline] = useState<FormState>(INITIAL_FORM_STATE);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (dealer) {
      const initial: FormState = {
        name: dealer.name || '',
        tradeName: dealer.tradeName || '',
        email: dealer.email || '',
        phoneNumber: dealer.phoneNumber || '',
        alternatePhoneNumber: dealer.alternatePhoneNumber || '',
        street: dealer.street || '',
        landmark: dealer.landmark || '',
        city: dealer.city || '',
        district: dealer.district || '',
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
      };
      setFormData(initial);
      setBaseline(initial);
    } else {
      setFormData(INITIAL_FORM_STATE);
      setBaseline(INITIAL_FORM_STATE);
    }
    setTouched({});
  }, [dealer, isOpen]);

  // City, district and state come from the PIN code (Indian addresses only).
  const isIndia = !formData.country.trim() || formData.country.trim().toLowerCase() === 'india';
  const pincodeLookup = usePincodeLookup(formData.pincode, {
    enabled: isOpen && isIndia,
    onFound: (location, pin) => {
      const keepExisting = pin === (dealer?.pincode ?? '').trim();
      const apply = (prev: FormState) => ({ ...prev, ...applyPincodeLocation(prev, location, keepExisting) });
      setFormData(apply);
      // Filling blanks for the saved PIN isn't a user edit, so it doesn't enable Save on its own.
      if (dealer && keepExisting) setBaseline(apply);
    },
  });
  const placeLocked = pincodeLookup.locked;

  const validationErrors = useMemo(() => {
    const rules: Record<string, { value: unknown; rule: ValidationRule }> = {
      name: { value: formData.name, rule: { required: true, customMessage: 'Dealer name is required.' } },
      email: { value: formData.email, rule: { required: true, type: 'email' } },
      phoneNumber: { value: formData.phoneNumber, rule: { required: true, type: 'phone' } },
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
    if (!errors.pincode && pincodeLookup.status === 'notFound') errors.pincode = PINCODE_MESSAGES.notFound;
    // The alternate number is required, must be valid and must differ from the main one.
    const phonePair = Validator.validatePhonePair(formData.phoneNumber, formData.alternatePhoneNumber);
    if (phonePair.alternate) errors.alternatePhoneNumber = phonePair.alternate;

    return errors;
  }, [formData, pincodeLookup.status]);

  const isValid = Object.keys(validationErrors).length === 0;
  const hasChanges = useMemo(
    () =>
      hasFormChanges(
        { ...formData, categoryIds: [...formData.categoryIds].sort((a, b) => a - b) },
        { ...baseline, categoryIds: [...baseline.categoryIds].sort((a, b) => a - b) }
      ),
    [formData, baseline]
  );

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

    if (pincodeLookup.status === 'loading' || !hasChanges) return;
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
      alternatePhoneNumber: formData.alternatePhoneNumber.trim(),
      street: formData.street.trim(),
      landmark: formData.landmark.trim() || undefined,
      city: formData.city.trim(),
      district: formData.district.trim() || undefined,
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
    <>
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
                  Alternate Phone <span className="text-red-500">*</span>
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
                <label htmlFor="pincode" className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.pincode}
                    onBlur={() => handleBlur('pincode')}
                    onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
                    placeholder="201310"
                    aria-describedby="pincode-status"
                    aria-invalid={!!(touched.pincode && validationErrors.pincode)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                  {pincodeLookup.status === 'loading' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  )}
                </div>
                {touched.pincode && validationErrors.pincode ? (
                  <p id="pincode-status" className="mt-1 text-[11px] text-red-500">{validationErrors.pincode}</p>
                ) : pincodeLookup.status === 'notFound' ? (
                  <p id="pincode-status" className="mt-1 text-[11px] text-red-500">{PINCODE_MESSAGES.notFound}</p>
                ) : pincodeLookup.status === 'error' ? (
                  <p id="pincode-status" className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    {PINCODE_MESSAGES.error}
                    <button type="button" onClick={pincodeLookup.retry} className="inline-flex items-center gap-0.5 font-semibold underline cursor-pointer">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </p>
                ) : (
                  <p id="pincode-status" className="mt-1 text-[11px] text-gray-500" aria-live="polite">
                    {pincodeLookup.status === 'loading'
                      ? PINCODE_MESSAGES.loading
                      : pincodeLookup.location?.areas.length
                        ? `Areas: ${pincodeLookup.location.areas.slice(0, 4).join(', ')}${pincodeLookup.location.areas.length > 4 ? '…' : ''}`
                        : isIndia
                          ? 'City, district and state are filled from the PIN code.'
                          : ''}
                  </p>
                )}
              </div>

              {(
                [
                  ['city', 'City', true, 'Greater Noida'],
                  ['district', 'District', false, 'Gautam Buddha Nagar'],
                  ['state', 'State', true, 'Uttar Pradesh'],
                ] as const
              ).map(([field, label, required, placeholder]) => (
                <div key={field}>
                  <label htmlFor={field} className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                    {label} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id={field}
                    type="text"
                    value={formData[field]}
                    readOnly={placeLocked}
                    aria-readonly={placeLocked}
                    title={placeLocked ? 'Filled from the PIN code' : undefined}
                    onBlur={() => handleBlur(field)}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder={placeLocked ? '' : placeholder}
                    className={`w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                      placeLocked ? 'bg-black/10 dark:bg-white/10 text-gray-600 dark:text-neutral-300 cursor-not-allowed' : 'bg-black/5 dark:bg-white/5'
                    }`}
                  />
                  {touched[field] && validationErrors[field] && (
                    <p className="mt-1 text-[11px] text-red-500">
                      {placeLocked ? 'Enter a valid PIN code to fill this in.' : validationErrors[field]}
                    </p>
                  )}
                </div>
              ))}

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
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Assigned Categories <span className="text-red-500">*</span>
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                The dealer sees and quotes only for items in these categories.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 max-h-36 overflow-y-auto">
              {categories.length === 0 && (
                <span className="text-[11px] text-gray-400">
                  No categories yet — create them under Item Management.
                </span>
              )}
              {categories.map((cat) => {
                const isSelected = formData.categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
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
            disabled={isSubmitting || !isValid || !hasChanges || pincodeLookup.status === 'loading'}
            title={!hasChanges ? 'No changes to save.' : undefined}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : dealer ? 'Update Dealer' : 'Save Dealer'}</span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
};