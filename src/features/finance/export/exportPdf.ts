import { chartImages } from './chartImage';
import type { FinanceReport, ReportTable } from './report.types';

// The built-in PDF font has no ₹ or − glyph
const safe = (value: string | number) =>
  String(value).replace(/₹/g, 'Rs. ').replace(/−/g, '-').replace(/–/g, '-').replace(/·/g, '-');

const money = (value: string | number) =>
  typeof value === 'number' ? safe(value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : safe(value);

/** A4 report: text, headline figures, chart pictures and tables, with page breaks. */
export const exportPdf = async (report: FinanceReport) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensure = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const text = (value: string, size: number, style: 'normal' | 'bold' = 'normal', color = 20) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(safe(value), contentWidth) as string[];
    lines.forEach((line) => {
      ensure(size + 4);
      doc.text(line, margin, y + size);
      y += size + 4;
    });
  };
  const table = (data: ReportTable) => {
    const columns = data.columns.length;
    const widths = data.columns.map((_, i) => (i === 0 ? contentWidth * (columns > 2 ? 0.34 : 0.6) : 0));
    const rest = (contentWidth - widths[0]) / Math.max(1, columns - 1);
    for (let i = 1; i < columns; i++) widths[i] = rest;
    const row = (cells: (string | number)[], bold: boolean) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(8);
      const wrapped = cells.map((cell, i) => doc.splitTextToSize(i > 0 && typeof cell === 'number' ? money(cell) : safe(cell), widths[i] - 6) as string[]);
      const height = Math.max(...wrapped.map((lines) => lines.length)) * 10 + 6;
      ensure(height);
      let x = margin;
      wrapped.forEach((lines, i) => {
        const right = i > 0 && typeof cells[i] === 'number';
        lines.forEach((line, li) => doc.text(line, right ? x + widths[i] - 3 : x + 3, y + 10 + li * 10, { align: right ? 'right' : 'left' }));
        x += widths[i];
      });
      doc.setDrawColor(225);
      doc.line(margin, y + height, margin + contentWidth, y + height);
      y += height;
    };
    if (data.title) text(data.title, 10, 'bold');
    doc.setTextColor(20);
    row(data.columns, true);
    data.rows.forEach((cells) => row(cells, false));
    y += 10;
  };

  text(report.title, 18, 'bold');
  text(report.subtitle, 10, 'normal', 90);
  text(`Generated ${new Date().toLocaleString('en-IN')}${report.generatedBy ? ` by ${report.generatedBy}` : ''}`, 8, 'normal', 120);
  y += 8;

  for (const section of report.sections) {
    ensure(60);
    doc.setDrawColor(200);
    doc.line(margin, y, margin + contentWidth, y);
    y += 10;
    text(section.title, 13, 'bold');
    if (section.definition) text(section.definition, 9, 'normal', 70);
    if (section.formula) text(`Formula: ${section.formula}`, 9, 'bold', 70);
    section.headline?.forEach((item) => text(`${item.label}: ${item.value}`, 10, 'normal', 20));
    for (const image of await chartImages(section.charts)) {
      const scale = Math.min(1, contentWidth / image.width);
      const w = image.width * scale;
      const h = image.height * scale;
      ensure(h + 8);
      doc.addImage(image.dataUrl, 'PNG', margin, y, w, h);
      y += h + 8;
    }
    section.tables?.forEach(table);
    y += 6;
  }
  doc.save(`${report.fileName}.pdf`);
};
