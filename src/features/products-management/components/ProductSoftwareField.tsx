import React from 'react';
import { Cpu } from 'lucide-react';
import { inputClassName, labelClassName } from '../utils/productFormLayout';
import { SOFTWARE_NAME_MAX, SOFTWARE_VERSION_MAX, softwareLine, type SoftwareForm } from '../utils/productSoftware';

interface ProductSoftwareFieldProps {
  value: SoftwareForm;
  onChange: (value: SoftwareForm) => void;
  /** `softwareName` / `softwareVersion` errors, from the form's check or the server. */
  errors: Record<string, string>;
  disabled?: boolean;
}

const fieldClass = (error: string | undefined) => `${inputClassName} ${error ? '!border-rose-500/60' : ''}`;

/**
 * Optional, but set apart in its own tinted box so it isn't missed: most products run software (firmware, an app or an
 * operating system). Its name and version are shown to customers with the specifications, like "iOS 17.2" on a phone.
 */
export const ProductSoftwareField: React.FC<ProductSoftwareFieldProps> = ({ value, onChange, errors, disabled }) => {
  const line = softwareLine(value.name, value.version);
  return (
    <fieldset
      data-testid="product-software"
      className="p-4 rounded-xl border border-[#0071e3]/25 bg-[#0071e3]/[0.04] dark:bg-[#0071e3]/10 space-y-3"
    >
      <legend className="sr-only">Software</legend>
      <div className="flex items-start gap-3">
        <span className="shrink-0 p-2 rounded-lg bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400">
          <Cpu className="w-4 h-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-black dark:text-white">
            Software <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            The firmware, app or operating system the product runs, and its version. Customers see it with the
            specifications. Fill in both, or leave both empty.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-software-name" className={labelClassName}>Software name</label>
          <input
            id="product-software-name"
            type="text"
            value={value.name}
            maxLength={SOFTWARE_NAME_MAX}
            disabled={disabled}
            aria-invalid={!!errors.softwareName}
            aria-describedby={errors.softwareName ? 'product-software-name-error' : undefined}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="e.g. TinQa OS"
            className={fieldClass(errors.softwareName)}
          />
          {errors.softwareName && (
            <p id="product-software-name-error" role="alert" className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
              {errors.softwareName}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="product-software-version" className={labelClassName}>Software version</label>
          <input
            id="product-software-version"
            type="text"
            value={value.version}
            maxLength={SOFTWARE_VERSION_MAX}
            disabled={disabled}
            aria-invalid={!!errors.softwareVersion}
            aria-describedby={errors.softwareVersion ? 'product-software-version-error' : undefined}
            onChange={(e) => onChange({ ...value, version: e.target.value })}
            placeholder="e.g. 2.1.0"
            className={fieldClass(errors.softwareVersion)}
          />
          {errors.softwareVersion && (
            <p id="product-software-version-error" role="alert" className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
              {errors.softwareVersion}
            </p>
          )}
        </div>
      </div>

      {line && !errors.softwareName && !errors.softwareVersion && (
        <p data-testid="product-software-preview" className="text-[11px] text-gray-500 dark:text-gray-400">
          Customers see: <span className="font-medium text-black dark:text-white">Software · {line}</span>
        </p>
      )}
    </fieldset>
  );
};
