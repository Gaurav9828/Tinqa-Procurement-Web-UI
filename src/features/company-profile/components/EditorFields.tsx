import React, { useId, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Link2, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { companyProfileApi } from '../api/companyProfileApi';
import type { AssetPurpose } from '../types/companyProfile.types';
import { parseApiError } from '../../../utils/apiError';
import { isHttpsUrl, LIMITS, shippingRowStarts, type LoginPageText, type LoginPortal, type ShippingRuleRow } from '../utils/companyProfileForm';
import { ProfileImage, YouTubePreview, type ImageVariant } from './ProfileDisplay';
import { BUTTON, precheckAsset } from '../utils/companyProfileUi';
import { rupees } from '../utils/companyProfile.utils';

const inputClass = (error?: string) =>
  `w-full px-3 py-2 rounded-xl border bg-transparent text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-60 ${
    error ? 'border-rose-500/80' : 'border-black/15 dark:border-white/15'
  }`;

export const FieldError: React.FC<{ id?: string; message?: string | null; tone?: 'error' | 'hint' }> = ({ id, message, tone = 'error' }) =>
  message ? (
    <p id={id} role={tone === 'error' ? 'alert' : undefined} className={`flex items-start gap-1 text-[11px] mt-1 ${tone === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {message}
    </p>
  ) : null;

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string | null;
  /** Neutral help text under the input. */
  description?: React.ReactNode;
  maxLength?: number;
  required?: boolean;
  /** Shows "12/40". */
  counter?: boolean;
  type?: 'text' | 'email' | 'tel' | 'url';
  placeholder?: string;
  disabled?: boolean;
  /** Shown greyed out but still focusable and announced (e.g. values filled from the PIN code). */
  readOnly?: boolean;
  upperCase?: boolean;
  className?: string;
  /** Extra content inside the input box, on the right (e.g. a spinner). */
  adornment?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  error,
  hint,
  description,
  maxLength,
  required,
  counter,
  type = 'text',
  placeholder,
  disabled,
  readOnly,
  upperCase,
  className = '',
  adornment,
  inputMode,
}) => {
  const id = useId();
  const describedBy = [error || hint ? `${id}-msg` : null, description ? `${id}-desc` : null].filter(Boolean).join(' ');
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-end justify-between mb-1">
        <label htmlFor={id} className="font-semibold text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </label>
        {counter && maxLength && (
          <span className={`text-[10px] ${value.trim().length > maxLength ? 'text-rose-500' : 'text-gray-400'}`}>
            {value.trim().length}/{maxLength}
          </span>
        )}
      </div>
      <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        inputMode={inputMode}
        placeholder={placeholder}
        // Allow a little over the limit so the counter/validation explain it instead of silently truncating.
        maxLength={maxLength ? maxLength + 20 : undefined}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        onChange={(e) => onChange(upperCase ? e.target.value.toUpperCase() : e.target.value)}
        className={`${inputClass(error)} ${upperCase ? 'uppercase font-mono' : ''} ${readOnly ? 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300 cursor-not-allowed' : ''}`}
      />
      {adornment && <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">{adornment}</span>}
      </div>
      <FieldError id={`${id}-msg`} message={error ?? hint} tone={error ? 'error' : 'hint'} />
      {description && (
        <div id={`${id}-desc`} className="text-[11px] text-gray-500 mt-1 space-y-0.5">
          {description}
        </div>
      )}
    </div>
  );
};

interface HomeVideoFieldsProps {
  enabled: boolean;
  url: string;
  onEnabledChange: (enabled: boolean) => void;
  onUrlChange: (url: string) => void;
  error?: string;
  disabled?: boolean;
}

/** Switch + YouTube link + thumbnail preview. The link stays editable while off, so it survives toggling. */
export const HomeVideoFields: React.FC<HomeVideoFieldsProps> = ({ enabled, url, onEnabledChange, onUrlChange, error, disabled }) => (
  <div className="space-y-4">
    <label className="inline-flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
      <input
        type="checkbox"
        role="switch"
        checked={enabled}
        disabled={disabled}
        onChange={(e) => onEnabledChange(e.target.checked)}
        className="w-4 h-4 rounded border-black/15 text-[#0071e3] focus:ring-2 focus:ring-[#0071e3] cursor-pointer"
      />
      Show background video on the home page
    </label>
    <div className={`space-y-3 transition-opacity ${enabled ? '' : 'opacity-60'}`}>
      <TextField
        label="YouTube link"
        type="url"
        placeholder="https://www.youtube.com/watch?v=…"
        maxLength={LIMITS.homeVideoUrl}
        value={url}
        onChange={onUrlChange}
        error={error}
        disabled={disabled}
        description={
          <>
            <p>Plays muted and on loop behind the storefront home page. Visitors can't pause or control it.</p>
            {!enabled && url.trim() && <p className="italic">Saved, but not shown while the video is off.</p>}
          </>
        }
      />
      <YouTubePreview url={url} />
    </div>
  </div>
);

const ACCEPTED: Record<AssetPurpose, { accept: string; hint: string }> = {
  LOGO: { accept: '.png,.svg,.webp,image/png,image/svg+xml,image/webp', hint: 'PNG, SVG or WEBP, up to 1 MB.' },
  LOGO_DARK: { accept: '.png,.svg,.webp,image/png,image/svg+xml,image/webp', hint: 'PNG, SVG or WEBP, up to 1 MB. Shown on dark backgrounds.' },
  FAVICON: { accept: '.ico,.png,.svg,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml', hint: 'ICO, PNG or SVG, square (32×32 or 48×48), up to 1 MB.' },
  LOGIN_IMAGE: {
    accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    hint: 'JPG, PNG or WEBP, up to 5 MB. A tall photo works best (at least 1200×1600); it is cropped to fill half the screen.',
  },
};

interface AssetFieldProps {
  label: string;
  purpose: AssetPurpose;
  variant: ImageVariant;
  value: string;
  onChange: (url: string) => void;
  /** Called with each uploaded URL, so it is accepted by validation even if it isn't an https URL. */
  onUploaded: (url: string) => void;
  error?: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

/** Image field: preview, Upload (picker or drag & drop), paste an https URL, Remove. */
export const AssetField: React.FC<AssetFieldProps> = ({ label, purpose, variant, value, onChange, onUploaded, error, disabled, onBusyChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const config = ACCEPTED[purpose];
  const uploading = progress !== null;

  const upload = async (file: File | undefined) => {
    if (!file || disabled || uploading) return;
    setUploadError(null);
    const problem = precheckAsset(file, purpose);
    if (problem) return setUploadError(problem);
    setProgress(0);
    onBusyChange?.(true);
    try {
      const res = await companyProfileApi.uploadAsset(file, purpose, setProgress);
      if (!res.success || !res.data?.url) throw res;
      onUploaded(res.data.url);
      onChange(res.data.url);
    } catch (err: unknown) {
      const parsed = parseApiError(err, 'The upload failed.');
      setUploadError(parsed.errors.find((e) => e.field === 'file')?.message ?? parsed.message);
    } finally {
      setProgress(null);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const applyPasted = () => {
    const url = pasted.trim();
    if (!isHttpsUrl(url)) return setUploadError('Paste a full https:// URL.');
    setUploadError(null);
    onChange(url);
    setPasting(false);
    setPasted('');
  };

  return (
    <div className="space-y-2" role="group" aria-label={label}>
      <span className="block font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-dashed ${
          dragging ? 'border-[#0071e3] bg-blue-500/5' : 'border-black/15 dark:border-white/15'
        }`}
      >
        <ProfileImage url={value || null} alt={label} variant={variant} />
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={disabled || uploading} onClick={() => inputRef.current?.click()} className={BUTTON.secondary}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? `Uploading ${progress}%` : 'Upload'}
            </button>
            <button type="button" disabled={disabled || uploading} onClick={() => setPasting((p) => !p)} className={BUTTON.secondary}>
              <Link2 className="w-3.5 h-3.5" /> Paste URL
            </button>
            {value && (
              <button type="button" disabled={disabled || uploading} onClick={() => onChange('')} className={`${BUTTON.secondary} text-rose-600 dark:text-rose-400`} aria-label={`Remove ${label.toLowerCase()}`}>
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400">{config.hint} Drag a file here or use Upload.</p>
          {uploading && (
            <div className="h-1.5 w-40 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} upload progress`}>
              <div className="h-full bg-[#0071e3]" style={{ width: `${progress}%` }} />
            </div>
          )}
          {value && <p className="text-[10px] text-gray-400 break-all">{value}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          className="hidden"
          aria-label={`${label} file`}
          data-testid={`asset-input-${purpose}`}
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </div>
      {pasting && (
        <div className="flex gap-2">
          <input
            type="url"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="https://cdn.example.com/logo.png"
            aria-label={`${label} URL`}
            className={inputClass()}
          />
          <button type="button" onClick={applyPasted} className={BUTTON.secondary}>
            Use
          </button>
        </div>
      )}
      <FieldError message={uploadError ?? error} />
    </div>
  );
};

interface ShippingRulesEditorProps {
  rows: ShippingRuleRow[];
  onChange: (rows: ShippingRuleRow[]) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

/**
 * Shipping fee by order value. Each row starts where the previous one ends (the first at ₹0) and the last row
 * covers every larger order, so the admin only enters "up to" values and fees.
 */
export const ShippingRulesEditor: React.FC<ShippingRulesEditorProps> = ({ rows, onChange, errors, disabled }) => {
  const starts = shippingRowStarts(rows);
  const update = (index: number, patch: Partial<ShippingRuleRow>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const full = rows.length >= LIMITS.shippingRules;
  // A new row goes last; the previous last row now needs an upper limit
  const add = () => onChange([...rows, { upTo: '', fee: '' }]);
  const remove = (index: number) => {
    const next = rows.filter((_, j) => j !== index);
    // Removing the last row makes the one before it open-ended
    if (index === rows.length - 1 && next.length > 0) next[next.length - 1] = { ...next[next.length - 1], upTo: '' };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-gray-500">No rules: every order ships free.</p>}
      {rows.length > 0 && (
        <ol aria-label="Shipping rules editor" className="space-y-2">
          {rows.map((row, i) => {
            const last = i === rows.length - 1;
            const start = starts[i];
            const upToError = errors[`shippingRules[${i}].maxOrderValue`];
            const feeError = errors[`shippingRules[${i}].fee`] ?? errors[`shippingRules[${i}].minOrderValue`];
            return (
              <li key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start rounded-xl border border-black/10 dark:border-white/10 p-3">
                <div>
                  <span className="block text-[11px] text-gray-500 mb-1">From order value</span>
                  <span className="block py-2 font-mono">{start === null ? '—' : rupees(start)}</span>
                </div>
                <div>
                  <label htmlFor={`shipping-upto-${i}`} className="block text-[11px] text-gray-500 mb-1">
                    Up to (not including)
                  </label>
                  {last ? (
                    <span className="block py-2 text-gray-500">and above</span>
                  ) : (
                    <input
                      id={`shipping-upto-${i}`}
                      inputMode="decimal"
                      value={row.upTo}
                      disabled={disabled}
                      aria-label={`Rule ${i + 1} up to`}
                      aria-invalid={!!upToError}
                      placeholder="e.g. 10000"
                      onChange={(e) => update(i, { upTo: e.target.value })}
                      className={inputClass(upToError)}
                    />
                  )}
                  <FieldError message={upToError} />
                </div>
                <div>
                  <label htmlFor={`shipping-fee-${i}`} className="block text-[11px] text-gray-500 mb-1">
                    Shipping fee (₹)
                  </label>
                  <input
                    id={`shipping-fee-${i}`}
                    inputMode="decimal"
                    value={row.fee}
                    disabled={disabled}
                    aria-label={`Rule ${i + 1} fee`}
                    aria-invalid={!!feeError}
                    placeholder="0 = free"
                    onChange={(e) => update(i, { fee: e.target.value })}
                    className={inputClass(feeError)}
                  />
                  <FieldError message={feeError} />
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => remove(i)}
                  aria-label={`Remove shipping rule ${i + 1}`}
                  className="self-center p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 cursor-pointer disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex items-center gap-3">
        <button type="button" disabled={disabled || full} onClick={add} className={BUTTON.secondary}>
          <Plus className="w-3.5 h-3.5" /> Add rule
        </button>
        <span className="text-[10px] text-gray-400">
          {rows.length}/{LIMITS.shippingRules} rules
        </span>
      </div>
      <FieldError message={errors.shippingRules} />
    </div>
  );
};

interface InvoiceTermsEditorProps {
  terms: string[];
  onChange: (terms: string[]) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

/** Ordered list editor: add / remove / move up / move down, max 10 lines of 300 characters. */
export const InvoiceTermsEditor: React.FC<InvoiceTermsEditorProps> = ({ terms, onChange, errors, disabled }) => {
  const update = (index: number, value: string) => onChange(terms.map((t, i) => (i === index ? value : t)));
  const move = (index: number, delta: number) => {
    const next = [...terms];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  const full = terms.length >= LIMITS.invoiceTerms;

  return (
    <div className="space-y-2">
      {terms.length === 0 && <p className="text-gray-500">No invoice terms.</p>}
      <ol aria-label="Invoice terms editor" className="space-y-2">
        {terms.map((term, i) => {
          const error = errors[`invoiceTerms[${i}]`];
          return (
            <li key={i} className="flex gap-2 items-start">
              <span className="w-5 pt-2 text-right text-gray-400 font-semibold">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <textarea
                  rows={2}
                  value={term}
                  disabled={disabled}
                  aria-label={`Invoice term ${i + 1}`}
                  aria-invalid={!!error}
                  maxLength={LIMITS.invoiceTerm + 20}
                  onChange={(e) => update(i, e.target.value)}
                  className={`${inputClass(error)} resize-y`}
                />
                <div className="flex justify-between">
                  <FieldError message={error} />
                  <span className={`text-[10px] ml-auto ${term.trim().length > LIMITS.invoiceTerm ? 'text-rose-500' : 'text-gray-400'}`}>
                    {term.trim().length}/{LIMITS.invoiceTerm}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Move term ${i + 1} up`} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" disabled={disabled || i === terms.length - 1} onClick={() => move(i, 1)} aria-label={`Move term ${i + 1} down`} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button type="button" disabled={disabled} onClick={() => onChange(terms.filter((_, j) => j !== i))} aria-label={`Remove term ${i + 1}`} className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-600 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-3">
        <button type="button" disabled={disabled || full} onClick={() => onChange([...terms, ''])} className={BUTTON.secondary}>
          <Plus className="w-3.5 h-3.5" /> Add term
        </button>
        <span className="text-[10px] text-gray-400">
          {terms.length}/{LIMITS.invoiceTerms} lines
        </span>
      </div>
      <FieldError message={errors.invoiceTerms} />
    </div>
  );
};

interface LoginTextFieldsProps {
  portal: LoginPortal;
  value: LoginPageText;
  onChange: (value: LoginPageText) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

/** One portal's sign-in page text: headline, optional tagline and up to 4 highlight points (all optional). */
export const LoginTextFields: React.FC<LoginTextFieldsProps> = ({ portal, value, onChange, errors, disabled }) => {
  const id = useId();
  const points = value.highlights;
  const setPoints = (highlights: string[]) => onChange({ ...value, highlights });
  const move = (index: number, delta: number) => {
    const next = [...points];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setPoints(next);
  };
  const tagline = value.tagline.trim();
  const taglineError = errors[`${portal}Tagline`];
  const full = points.length >= LIMITS.loginHighlights;

  return (
    <div className="space-y-3">
      <TextField
        label="Headline"
        counter
        maxLength={LIMITS.loginHeadline}
        value={value.headline}
        onChange={(headline) => onChange({ ...value, headline })}
        error={errors[`${portal}Headline`]}
        disabled={disabled}
      />
      <div>
        <div className="flex items-end justify-between mb-1">
          <label htmlFor={`${id}-tagline`} className="font-semibold text-gray-700 dark:text-gray-300">
            Tagline <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <span className={`text-[10px] ${tagline.length > LIMITS.loginTagline ? 'text-rose-500' : 'text-gray-400'}`}>
            {tagline.length}/{LIMITS.loginTagline}
          </span>
        </div>
        <textarea
          id={`${id}-tagline`}
          rows={2}
          value={value.tagline}
          disabled={disabled}
          aria-invalid={!!taglineError}
          maxLength={LIMITS.loginTagline + 20}
          onChange={(e) => onChange({ ...value, tagline: e.target.value })}
          className={`${inputClass(taglineError)} resize-y`}
        />
        <FieldError message={taglineError} />
      </div>

      <div className="space-y-2">
        <span className="block font-semibold text-gray-700 dark:text-gray-300">Highlight points</span>
        {points.length === 0 && <p className="text-gray-500">No points.</p>}
        <ol aria-label={`${portal === 'adminLogin' ? 'Admin' : 'Storefront'} sign-in points`} className="space-y-2">
          {points.map((point, i) => {
            const error = errors[`${portal}Highlights[${i}]`];
            return (
              <li key={i} className="flex gap-2 items-start">
                <div className="flex-1 min-w-0">
                  <input
                    value={point}
                    disabled={disabled}
                    aria-label={`Point ${i + 1}`}
                    aria-invalid={!!error}
                    maxLength={LIMITS.loginHighlight + 20}
                    onChange={(e) => setPoints(points.map((p, j) => (j === i ? e.target.value : p)))}
                    className={inputClass(error)}
                  />
                  <FieldError message={error} />
                </div>
                <div className="flex gap-1 pt-1.5">
                  <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Move point ${i + 1} up`} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" disabled={disabled || i === points.length - 1} onClick={() => move(i, 1)} aria-label={`Move point ${i + 1} down`} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" disabled={disabled} onClick={() => setPoints(points.filter((_, j) => j !== i))} aria-label={`Remove point ${i + 1}`} className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-600 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-3">
          <button type="button" disabled={disabled || full} onClick={() => setPoints([...points, ''])} className={BUTTON.secondary}>
            <Plus className="w-3.5 h-3.5" /> Add point
          </button>
          <span className="text-[10px] text-gray-400">
            {points.length}/{LIMITS.loginHighlights} points
          </span>
        </div>
        <FieldError message={errors[`${portal}Highlights`]} />
      </div>
    </div>
  );
};
