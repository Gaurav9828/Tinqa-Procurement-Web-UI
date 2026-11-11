import React from 'react';
import { DECENCY_HINT } from '../../utils/decency';

/** The courtesy reminder shown under every box where staff write to or about a customer. */
export const DecencyHint: React.FC<{ id?: string }> = ({ id }) => (
  <p id={id} className="text-[10px] text-gray-400 px-1 mt-1">
    {DECENCY_HINT}
  </p>
);
