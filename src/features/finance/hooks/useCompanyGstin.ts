import { useEffect, useState } from 'react';
import { financeApi } from '../api/financeApi';

let cached: string | null | undefined;

/**
 * The company's GSTIN from the public company profile, once per session. Used only to suggest CGST + SGST or IGST
 * from a supplier's GSTIN; null (no suggestion) when it is missing or can't be loaded.
 */
export const useCompanyGstin = (): string | null => {
  const [gstin, setGstin] = useState<string | null>(cached ?? null);
  useEffect(() => {
    if (cached !== undefined) return;
    let alive = true;
    financeApi
      .companyGstin()
      .then((value) => {
        cached = value;
        if (alive) setGstin(value);
      })
      .catch(() => {
        // Only a convenience: the user picks the supply type themselves
      });
    return () => {
      alive = false;
    };
  }, []);
  return gstin;
};
