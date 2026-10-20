import { chartImages, downloadBlob } from './chartImage';
import type { FinanceReport } from './report.types';

const MONEY_FORMAT = '"₹"#,##,##0.00;[Red]-"₹"#,##,##0.00';

/** One sheet per section: its figures and tables as real numbers, its charts as pictures beside them. */
export const exportExcel = async (report: FinanceReport) => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = report.generatedBy ?? 'TinQa';
  workbook.created = new Date();
  const usedNames = new Set<string>();
  const sheetName = (title: string) => {
    const base = title.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Sheet';
    let name = base;
    for (let i = 2; usedNames.has(name.toLowerCase()); i++) name = `${base.slice(0, 25)} ${i}`;
    usedNames.add(name.toLowerCase());
    return name;
  };

  for (const section of report.sections) {
    const sheet = workbook.addWorksheet(sheetName(section.title));
    sheet.addRow([section.title]).font = { bold: true, size: 14 };
    sheet.addRow([report.subtitle]).font = { color: { argb: 'FF666666' } };
    if (section.definition) sheet.addRow([section.definition]);
    if (section.formula) sheet.addRow([`Formula: ${section.formula}`]).font = { italic: true };
    section.headline?.forEach((item) => sheet.addRow([item.label, item.value]));
    sheet.addRow([]);

    let widest = 2;
    for (const table of section.tables ?? []) {
      if (table.title) sheet.addRow([table.title]).font = { bold: true };
      const header = sheet.addRow(table.columns);
      header.font = { bold: true };
      header.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0EFEC' } };
      });
      table.rows.forEach((cells) => {
        const row = sheet.addRow(cells);
        table.moneyColumns?.forEach((index) => {
          row.getCell(index + 1).numFmt = MONEY_FORMAT;
        });
      });
      sheet.addRow([]);
      widest = Math.max(widest, table.columns.length);
    }
    sheet.getColumn(1).width = 42;
    for (let i = 2; i <= widest; i++) sheet.getColumn(i).width = 18;

    let anchorRow = 0;
    for (const image of await chartImages(section.charts)) {
      const id = workbook.addImage({ base64: image.dataUrl, extension: 'png' });
      const width = Math.min(640, image.width);
      const height = (image.height / image.width) * width;
      sheet.addImage(id, { tl: { col: widest + 1, row: anchorRow }, ext: { width, height } });
      anchorRow += Math.ceil(height / 20) + 1;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${report.fileName}.xlsx`);
};

/** Plain CSV of one table (opens in any spreadsheet). */
export const exportCsv = (fileName: string, columns: string[], rows: (string | number)[][]) => {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [columns, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `${fileName}.csv`);
};
