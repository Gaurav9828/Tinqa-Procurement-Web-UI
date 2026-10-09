import React from 'react';

/** Backend field errors that have no inline slot in the product form (warranty/component errors are shown on their row). */
export const FormFieldErrors: React.FC<{ errors: Record<string, string> }> = ({ errors }) => {
  const entries = Object.entries(errors).filter(([key]) => !/^(warranties|components)\[\d+\]/.test(key));
  if (entries.length === 0) return null;
  return (
    <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-1">
      <p className="font-semibold">The server rejected some fields:</p>
      <ul className="list-disc pl-4">
        {entries.map(([field, message]) => (
          <li key={field}>
            <span className="font-mono">{field}</span>: {message}
          </li>
        ))}
      </ul>
    </div>
  );
};
