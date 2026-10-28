import React from 'react';
import { Link } from 'react-router-dom';
import { useAccess } from '../../../hooks/useAccess';

/** A barcode, linked to its trace for those who can trace barcodes. */
export const BarcodeCode: React.FC<{ code: string }> = ({ code }) => {
  const { can } = useAccess();
  if (!can('BARCODE_VIEW')) return <span className="font-mono">{code}</span>;
  return (
    <Link to={`/barcodes?code=${encodeURIComponent(code)}`} className="font-mono text-[#0071e3] hover:underline" title="Trace this barcode">
      {code}
    </Link>
  );
};
