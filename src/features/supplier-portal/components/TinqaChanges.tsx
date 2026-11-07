import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { TermChange } from '../types/supplierPortal.types';

interface Props {
  changes: TermChange[];
  /** Still waiting for the supplier's answer: they are asked to check before accepting. */
  awaitingResponse: boolean;
}

/**
 * Every term TinQa changed from what the supplier quoted, side by side (e.g. Advance payment: you quoted 30%, now 20%),
 * so the supplier accepts an order knowing exactly what is different from their quotation.
 */
export const TinqaChanges: React.FC<Props> = ({ changes, awaitingResponse }) => (
  <section
    aria-label="Changed by TinQa"
    className="space-y-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4"
  >
    <div>
      <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4" /> TinQa changed your quotation
      </h3>
      <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
        {awaitingResponse
          ? 'These terms are not what you quoted. Check each one before you accept: accepting means you agree to them.'
          : 'These terms differ from what you quoted.'}
      </p>
    </div>
    <table className="w-full text-xs" aria-label="Changes TinQa made to your quotation">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
          <th scope="col" className="py-1 pr-3 font-medium">Term</th>
          <th scope="col" className="py-1 pr-3 font-medium">You quoted</th>
          <th scope="col" className="py-1 font-medium">Now</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((change) => (
          <tr key={change.field} className="border-t border-amber-500/20">
            <th scope="row" className="py-1.5 pr-3 text-left font-medium">{change.label}</th>
            <td className="py-1.5 pr-3 text-gray-500 line-through decoration-gray-400">{change.quoted}</td>
            <td className="py-1.5 font-semibold text-amber-700 dark:text-amber-300">{change.current}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);
