import React from 'react';
import type { Printable, PrintParty } from '../hooks/usePrintableOrder';
import type { PrintDocument } from '../printDocuments';
import { dealerStatusLabel } from '../../dealer-portal/utils/dealerOrderStage';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { formatUnit } from '../../../constants/unitsOfMeasure';
import { readTaxBreakup } from '../../order-management/utils/quotationTax';

const TITLE: Record<PrintDocument, string> = {
  quotation: 'Quotation',
  order: 'Purchase Order',
  bill: 'Bill',
};

const NUMBER_LABEL: Record<PrintDocument, string> = {
  quotation: 'Quotation no.',
  order: 'PO no.',
  bill: 'Bill no.',
};

/**
 * The tax lines and total: the quotation's GST breakup (CGST + SGST or IGST at its rate, cess), or for older orders
 * the numeric entries of a free-form breakup, e.g. { "CGST 9%": 90 }.
 */
const taxSummary = (breakup: Record<string, unknown> | null, totalPrice: number): { lines: [string, number][]; grandTotal: number } => {
  const gst = readTaxBreakup(breakup);
  if (gst) {
    const lines: [string, number][] =
      gst.supplyType === 'INTRA_STATE'
        ? [[`CGST @ ${gst.gstRate / 2}%`, gst.cgst], [`SGST @ ${gst.gstRate / 2}%`, gst.sgst]]
        : [[`IGST @ ${gst.gstRate}%`, gst.igst]];
    if (gst.cess) lines.push(['Cess', gst.cess]);
    return { lines, grandTotal: gst.grandTotal };
  }
  const lines = Object.entries(breakup ?? {})
    .map(([label, value]): [string, number] => [label, Number(value)])
    .filter(([, value]) => Number.isFinite(value) && value !== 0);
  return { lines, grandTotal: totalPrice + lines.reduce((sum, [, value]) => sum + value, 0) };
};

const Party: React.FC<{ heading: string; party: PrintParty }> = ({ heading, party }) => (
  <div className="flex-1 min-w-0 rounded-lg border border-black/15 p-3 text-xs leading-relaxed">
    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{heading}</p>
    <p className="text-sm font-semibold">{party.name || '—'}</p>
    {party.tradeName && <p>{party.tradeName}</p>}
    {party.addressLines.map((line) => (
      <p key={line}>{line}</p>
    ))}
    {party.gstin && <p>GSTIN: {party.gstin}</p>}
    {party.pan && <p>PAN: {party.pan}</p>}
    {party.phone && <p>Phone: {party.phone}</p>}
    {party.email && <p>Email: {party.email}</p>}
  </div>
);

/**
 * One printable page: the company letterhead, buyer (the company) and supplier (the dealer), the line and totals.
 * Always light on white, whatever the app theme, because it is meant for paper.
 */
export const PrintableDocument: React.FC<{ document: PrintDocument; printable: Printable }> = ({ document, printable }) => {
  const { order, supplier, company } = printable;
  const subtotal = Number(order.unitPrice) * Number(order.orderQuantity);
  const { lines: taxes, grandTotal } = taxSummary(order.taxBreakup, Number(order.totalPrice));
  const hsnSac = readTaxBreakup(order.taxBreakup)?.hsnSac;
  const companyName = company?.legalName || company?.brandName || 'TinQa';
  const companyAddress = company?.address;
  const buyer: PrintParty = {
    name: companyName,
    tradeName: company?.legalName && company?.brandName && company.brandName !== company.legalName ? company.brandName : null,
    addressLines: [
      companyAddress?.line1,
      companyAddress?.line2,
      [companyAddress?.city, companyAddress?.state, companyAddress?.postalCode].filter(Boolean).join(', '),
    ].filter((line): line is string => !!line && !!line.trim()),
    gstin: company?.gstin,
    pan: company?.pan,
    phone: company?.supportPhone,
    email: company?.supportEmail,
  };
  const documentDate = document === 'bill' ? order.actualDelivery ?? order.orderDate : order.orderDate;

  return (
    <article className="mx-auto w-full max-w-[800px] bg-white text-black p-8 print:p-0 shadow-sm print:shadow-none rounded-xl print:rounded-none">
      <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div className="flex items-center gap-3 min-w-0">
          {company?.logoUrl && (
            <img
              src={company.logoUrl}
              alt=""
              className="max-h-14 max-w-[160px] object-contain"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold">{companyName}</p>
            {company?.website && <p className="text-xs text-gray-600">{company.website}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <h1 className="text-2xl font-bold tracking-tight uppercase">{TITLE[document]}</h1>
          <p className="text-xs mt-1">
            {NUMBER_LABEL[document]} <span className="font-mono font-semibold">{order.orderNumber}</span>
          </p>
          <p className="text-xs">Date: {formatDate(documentDate)}</p>
          {document === 'quotation' && <p className="text-xs">Status: {dealerStatusLabel(order.orderStatus)}</p>}
        </div>
      </header>

      <section className="flex flex-col sm:flex-row print:flex-row gap-3 mt-5">
        <Party heading={document === 'bill' ? 'Billed to' : 'Buyer'} party={buyer} />
        <Party heading={document === 'bill' ? 'Billed by' : 'Supplier'} party={supplier} />
      </section>

      <table className="w-full mt-6 text-sm border-collapse">
        <thead>
          <tr className="border-y border-black/40 text-left text-xs uppercase tracking-wide">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Item</th>
            <th className="py-2 pr-2 text-right">Quantity</th>
            <th className="py-2 pr-2 text-right">Unit price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black/15 align-top">
            <td className="py-2 pr-2">1</td>
            <td className="py-2 pr-2">
              {order.itemName}
              {order.itemSku && <span className="block text-xs text-gray-600 font-mono">{order.itemSku}</span>}
              {hsnSac && <span className="block text-xs text-gray-600">HSN/SAC {hsnSac}</span>}
            </td>
            <td className="py-2 pr-2 text-right whitespace-nowrap">
              {order.orderQuantity} {formatUnit(order.unitType).split(' — ')[0]}
            </td>
            <td className="py-2 pr-2 text-right whitespace-nowrap">{formatCurrency(order.unitPrice)}</td>
            <td className="py-2 text-right whitespace-nowrap">{formatCurrency(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <dl className="ml-auto mt-3 w-full max-w-xs text-sm">
        <div className="flex justify-between py-1">
          <dt>Subtotal</dt>
          <dd>{formatCurrency(subtotal)}</dd>
        </div>
        <div className="flex justify-between py-1">
          <dt>Shipment</dt>
          <dd>{formatCurrency(order.shipmentPrice)}</dd>
        </div>
        {taxes.map(([label, value]) => (
          <div key={label} className="flex justify-between py-1">
            <dt>{label}</dt>
            <dd>{formatCurrency(value)}</dd>
          </div>
        ))}
        <div className="flex justify-between py-2 mt-1 border-t-2 border-black font-bold">
          <dt>Total</dt>
          <dd data-testid="print-total">{formatCurrency(grandTotal)}</dd>
        </div>
      </dl>

      <section className="mt-6 grid grid-cols-2 gap-4 text-xs">
        <div>
          {order.expectedDelivery && <p>Expected delivery: {formatDate(order.expectedDelivery)}</p>}
          {order.actualDelivery && <p>Delivered on: {formatDate(order.actualDelivery)}</p>}
          {order.note && <p className="mt-1">Remarks: {order.note}</p>}
        </div>
        {document === 'bill' && (company?.invoiceTerms ?? []).length > 0 && (
          <div>
            <p className="font-semibold mb-1">Terms</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              {(company?.invoiceTerms ?? []).map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <footer className="mt-12 flex justify-between text-xs">
        <div className="text-gray-600">Generated from TinQa Procurement. Amounts in Indian Rupees.</div>
        <div className="text-center">
          <div className="w-44 border-t border-black pt-1">Authorised signatory</div>
        </div>
      </footer>
    </article>
  );
};
