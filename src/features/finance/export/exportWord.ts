import { chartImages, dataUrlToBytes, downloadBlob } from './chartImage';
import type { FinanceReport } from './report.types';

const formatCell = (value: string | number) =>
  typeof value === 'number' ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value;

/** A Word document (.docx) with the same sections, charts and tables as the PDF. */
export const exportWord = async (report: FinanceReport) => {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType } = docx;
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({ text: report.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: report.subtitle, color: '666666' })] }),
    new Paragraph({
      children: [new TextRun({ text: `Generated ${new Date().toLocaleString('en-IN')}${report.generatedBy ? ` by ${report.generatedBy}` : ''}`, size: 16, color: '888888' })],
    }),
  ];

  for (const section of report.sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }));
    if (section.definition) children.push(new Paragraph({ children: [new TextRun({ text: section.definition, color: '444444' })] }));
    if (section.formula) children.push(new Paragraph({ children: [new TextRun({ text: `Formula: ${section.formula}`, italics: true })] }));
    section.headline?.forEach((item) =>
      children.push(new Paragraph({ children: [new TextRun({ text: `${item.label}: `, bold: true }), new TextRun(item.value)] }))
    );
    for (const image of await chartImages(section.charts)) {
      const width = Math.min(600, image.width);
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              type: 'png',
              data: dataUrlToBytes(image.dataUrl),
              transformation: { width, height: Math.round((image.height / image.width) * width) },
            }),
          ],
        })
      );
    }
    for (const table of section.tables ?? []) {
      if (table.title) children.push(new Paragraph({ text: table.title, heading: HeadingLevel.HEADING_3 }));
      const row = (cells: (string | number)[], header: boolean) =>
        new TableRow({
          tableHeader: header,
          children: cells.map(
            (cell, i) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: i > 0 && typeof cell === 'number' ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    children: [new TextRun({ text: String(formatCell(cell)), bold: header, size: 18 })],
                  }),
                ],
              })
          ),
        });
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [row(table.columns, true), ...table.rows.map((cells) => row(cells, false))],
        }),
        new Paragraph({ text: '' })
      );
    }
  }

  const document = new Document({ creator: report.generatedBy ?? 'TinQa', title: report.title, sections: [{ children }] });
  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `${report.fileName}.docx`);
};
