/** A finance report as the exporters see it: sections of text, headline figures, chart pictures and tables. */
export interface ReportTable {
  title?: string;
  columns: string[];
  /** Cells are text, or numbers in rupees (spreadsheets keep them numeric). */
  rows: (string | number)[][];
  /** Column indexes that hold rupee amounts. */
  moneyColumns?: number[];
}

export interface ReportSection {
  title: string;
  definition?: string;
  formula?: string;
  headline?: { label: string; value: string }[];
  /** Live chart elements; turned into pictures at export time. */
  charts?: (SVGSVGElement | null | undefined)[];
  tables?: ReportTable[];
}

export interface FinanceReport {
  title: string;
  subtitle: string;
  generatedBy?: string;
  sections: ReportSection[];
  fileName: string;
}

export interface ChartImage {
  dataUrl: string;
  width: number;
  height: number;
}
