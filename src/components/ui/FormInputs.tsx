import React, { useState } from 'react';
import { AlertCircle, ChevronDown, Eye, EyeOff } from 'lucide-react';

/* Shared Input Container Wrapper */
interface InputWrapperProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

const InputWrapper: React.FC<InputWrapperProps> = ({ label, required, error, children }) => (
  <div className="relative pt-2 space-y-1 w-full">
    <div
      className={`relative rounded-xl border transition-colors ${
        error
          ? 'border-red-500/80 focus-within:border-red-500'
          : 'border-black/20 dark:border-white/20 focus-within:border-[#0071e3] dark:focus-within:border-blue-400'
      }`}
    >
      <div className="absolute -top-2.5 left-3 px-1.5 bg-white dark:bg-[#161617] text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 pointer-events-none z-10">
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold">*</span>}
      </div>
      {children}
    </div>
    {error && (
      <p className="text-[11px] text-red-500 flex items-center gap-1 px-1 font-medium">
        <AlertCircle className="w-3 h-3 shrink-0" /> {error}
      </p>
    )}
  </div>
);

/* 1. Common Text / Password / Number Input */
interface CommonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const CommonInput: React.FC<CommonInputProps> = ({
  label,
  required,
  error,
  type = 'text',
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <InputWrapper label={label} required={required} error={error}>
      <div className="relative flex items-center">
        <input
          type={effectiveType}
          className={`w-full px-3.5 py-3 bg-transparent text-sm text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none rounded-xl ${
            isPassword ? 'pr-10' : ''
          } ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </InputWrapper>
  );
};

/* 2. Common Select Dropdown */
interface OptionItem {
  label: string;
  value: string | number;
}

interface CommonSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: (string | OptionItem)[];
  error?: string;
  placeholder?: string;
}

export const CommonSelect: React.FC<CommonSelectProps> = ({
  label,
  options,
  required,
  error,
  placeholder = 'Select an option',
  value,
  className = '',
  ...props
}) => (
  <InputWrapper label={label} required={required} error={error}>
    <div className="relative flex items-center">
      <select
        value={value}
        className={`w-full px-3.5 py-3 bg-transparent text-sm text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none cursor-pointer appearance-none rounded-xl pr-10 ${className}`}
        {...props}
      >
        <option value="" disabled className="bg-white dark:bg-[#1c1c1e] text-gray-400">
          {placeholder}
        </option>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={val} value={val} className="bg-white dark:bg-[#1c1c1e]">
              {lbl}
            </option>
          );
        })}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-3 text-gray-400 pointer-events-none" />
    </div>
  </InputWrapper>
);

/* 3. Common Textarea */
interface CommonTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const CommonTextArea: React.FC<CommonTextAreaProps> = ({
  label,
  required,
  error,
  rows = 3,
  className = '',
  ...props
}) => (
  <InputWrapper label={label} required={required} error={error}>
    <textarea
      rows={rows}
      className={`w-full px-3.5 py-3 bg-transparent text-sm text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none rounded-xl resize-y ${className}`}
      {...props}
    />
  </InputWrapper>
);

/* 4. Common Radio Group */
interface RadioOption {
  label: string;
  value: string;
}

interface CommonRadioGroupProps {
  label: string;
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}

export const CommonRadioGroup: React.FC<CommonRadioGroupProps> = ({
  label,
  name,
  options,
  value,
  onChange,
  required,
  error,
}) => (
  <div className="space-y-1.5 pt-1">
    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
      <span>{label}</span>
      {required && <span className="text-red-500 font-bold">*</span>}
    </div>
    <div className="flex flex-wrap items-center gap-4 pt-1">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={(e) => onChange(e.target.value)}
            className="w-4 h-4 text-[#0071e3] border-gray-300 focus:ring-[#0071e3] cursor-pointer"
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
    {error && (
      <p className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
        <AlertCircle className="w-3 h-3 shrink-0" /> {error}
      </p>
    )}
  </div>
);

/* 5. Common Checkbox */
interface CommonCheckboxProps {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export const CommonCheckbox: React.FC<CommonCheckboxProps> = ({
  label,
  checked,
  onChange,
  error,
}) => (
  <div className="space-y-1">
    <label className="flex items-start gap-2.5 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded text-[#0071e3] border-gray-300 focus:ring-[#0071e3] cursor-pointer shrink-0"
      />
      <span>{label}</span>
    </label>
    {error && (
      <p className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
        <AlertCircle className="w-3 h-3 shrink-0" /> {error}
      </p>
    )}
  </div>
);