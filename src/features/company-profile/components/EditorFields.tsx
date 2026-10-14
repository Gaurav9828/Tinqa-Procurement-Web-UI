import React, { useId, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Link2, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { companyProfileApi } from '../api/companyProfileApi';
import type { AssetPurpose } from '../types/companyProfile.types';
import { parseApiError } from '../../../utils/apiError';
import { isHttpsUrl, LIMITS } from '../utils/companyProfileForm';
import { ProfileImage, type ImageVariant } from './ProfileDisplay';
import { BUTTON, precheckAsset } from '../utils/companyProfileUi';

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
  maxLength?: number;
  required?: boolean;
  /** Shows "12/40". */
  counter?: boolean;
  type?: 'text' | 'email' | 'tel' | 'url';
  placeholder?: string;
  disabled?: boolean;
  upperCase?: boolean;
  className?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  error,
  hint,
  maxLength,
  required,
  counter,
  type = 'text',
  placeholder,
  disabled,
  upperCase,
  className = '',
}) => {
  const id = useId();
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
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        // Allow a little over the limit so the counter/validation explain it instead of silently truncating.
        maxLength={maxLength ? maxLength + 20 : undefined}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        onChange={(e) => onChange(upperCase ? e.target.value.toUpperCase() : e.target.value)}
        className={`${inputClass(error)} ${upperCase ? 'uppercase font-mono' : ''}`}
      />
      <FieldError id={`${id}-msg`} message={error ?? hint} tone={error ? 'error' : 'hint'} />
    </div>
  );
};

const ACCEPTED: Record<AssetPurpose, { accept: string; hint: string }> = {
  LOGO: { accept: '.png,.svg,.webp,image/png,image/svg+xml,image/webp', hint: 'PNG, SVG or WEBP, up to 1 MB.' },
  LOGO_DARK: { accept: '.png,.svg,.webp,image/png,image/svg+xml,image/webp', hint: 'PNG, SVG or WEBP, up to 1 MB. Shown on dark backgrounds.' },
  FAVICON: { accept: '.ico,.png,.svg,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml', hint: 'ICO, PNG or SVG, square (32×32 or 48×48), up to 1 MB.' },
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
    const problem = precheckAsset(file);
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
              <button type="button" disabled={disabled || uploading} onClick={() => onChange('')} className={BUTTON.secondary} aria-label={`Remove ${label.toLowerCase()}`}>
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
