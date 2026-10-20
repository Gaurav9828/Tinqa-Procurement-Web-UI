import type { jsPDF as JsPdf } from 'jspdf';
import {
  GENERAL_NOTES,
  GUIDE_CHANGELOG,
  GUIDE_FLOWS,
  GUIDE_ROLE_IDS,
  GUIDE_UPDATED,
  GUIDE_VERSION,
  ROLE_GUIDES,
  flowsFor,
  isOwnStep,
  type GuideFlow,
  type GuideRoleId,
  type StepKind,
} from '../content/guideContent';
import { menuLabel } from '../utils/guideLabels';

// The built-in PDF font only has Latin-1 glyphs
const safe = (value: string) =>
  value
    .replace(/₹/g, 'Rs. ')
    .replace(/→/g, '->')
    .replace(/›/g, '>')
    .replace(/·/g, '-')
    .replace(/[–—−]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

type Rgb = [number, number, number];

const INK: Rgb = [20, 33, 43];
const MUTED: Rgb = [91, 104, 115];
const ACCENT: Rgb = [0, 113, 227];
const REJECT: Rgb = [190, 18, 60];
const KIND_COLOR: Record<StepKind, Rgb> = {
  maker: [43, 94, 167],
  checker: [5, 150, 105],
  external: [217, 119, 6],
  end: [13, 92, 99],
};

/** "Dealer Manager" → TinQa-User-Guide-Dealer-Manager.pdf */
export const guideFileName = (role: GuideRoleId | null) =>
  `TinQa-User-Guide-${role ? ROLE_GUIDES[role].name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'All-Roles'}.pdf`;

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Builds the guide for one role (only that role and the flows it takes part in), or the whole guide when role is null. */
export const buildGuidePdf = async (role: GuideRoleId | null): Promise<JsPdf> => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  const bottom = pageHeight - margin - 14;
  let y = margin;

  const ensure = (needed: number) => {
    if (y + needed > bottom) {
      doc.addPage();
      y = margin;
    }
  };
  const font = (size: number, style: 'normal' | 'bold' = 'normal', color: Rgb = INK) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const wrap = (value: string, width: number) => doc.splitTextToSize(safe(value), width) as string[];
  const paragraph = (value: string, size = 10, style: 'normal' | 'bold' = 'normal', color: Rgb = INK, indent = 0) => {
    font(size, style, color);
    wrap(value, contentWidth - indent).forEach((line) => {
      ensure(size + 4);
      doc.text(line, margin + indent, y + size);
      y += size + 4;
    });
  };
  const heading = (value: string) => {
    ensure(40);
    y += 14;
    font(14, 'bold', INK);
    doc.text(safe(value), margin, y + 14);
    y += 20;
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + 36, y);
    y += 10;
  };
  const subheading = (value: string) => {
    ensure(28);
    y += 6;
    paragraph(value.toUpperCase(), 8, 'bold', MUTED);
    y += 2;
  };
  const bullets = (items: string[], color: Rgb = ACCENT) => {
    items.forEach((item) => {
      font(10, 'normal', INK);
      const lines = wrap(item, contentWidth - 16);
      ensure(lines.length * 14 + 2);
      doc.setFillColor(...color);
      doc.rect(margin + 2, y + 5, 5, 5, 'F');
      lines.forEach((line) => {
        doc.text(line, margin + 16, y + 10);
        y += 14;
      });
      y += 2;
    });
  };

  const flow = (item: GuideFlow, index: number) => {
    ensure(70);
    y += 8;
    paragraph(`${index}. ${item.title}`, 11.5, 'bold', INK);
    paragraph(item.summary, 9.5, 'normal', MUTED);
    y += 4;
    item.steps.forEach((step, stepIndex) => {
      const own = isOwnStep(step, role);
      const textWidth = contentWidth - 30;
      font(10, 'normal');
      const body = wrap(step.text, textWidth);
      const where = step.where ? wrap(`Where: ${step.where}`, textWidth) : [];
      const otherwise = step.otherwise ? wrap(step.otherwise, textWidth) : [];
      const height = 14 + body.length * 13 + (where.length + otherwise.length) * 12 + 8;
      ensure(height + 4);
      const top = y;
      if (own) {
        doc.setFillColor(235, 243, 253);
        doc.rect(margin, top, contentWidth, height, 'F');
      }
      doc.setFillColor(...KIND_COLOR[step.kind]);
      doc.rect(margin, top, 3, height, 'F');
      font(8, 'bold', KIND_COLOR[step.kind]);
      const label = `${stepIndex + 1}  ${safe(step.label).toUpperCase()}`;
      doc.text(label, margin + 12, top + 11);
      if (own) {
        const labelWidth = doc.getTextWidth(label);
        font(7, 'bold', ACCENT);
        doc.text('YOU', margin + 18 + labelWidth, top + 11);
      }
      let lineY = top + 25;
      font(10, own ? 'bold' : 'normal', INK);
      body.forEach((line) => {
        doc.text(line, margin + 12, lineY);
        lineY += 13;
      });
      font(8.5, 'normal', MUTED);
      where.forEach((line) => {
        doc.text(line, margin + 12, lineY);
        lineY += 12;
      });
      font(8.5, 'normal', REJECT);
      otherwise.forEach((line) => {
        doc.text(line, margin + 12, lineY);
        lineY += 12;
      });
      y = top + height + 4;
    });
  };

  const roleSection = (id: GuideRoleId, ownGuide: boolean) => {
    const guide = ROLE_GUIDES[id];
    heading(ownGuide ? 'Your role' : guide.name);
    paragraph(guide.summary, 10.5);
    subheading(ownGuide ? 'Your menu' : 'Menu');
    const menu = guide.menu.map((nav) => (guide.levelTwoMenu?.includes(nav) ? `${menuLabel(nav)} (Level 2 only)` : menuLabel(nav)));
    paragraph([...menu, 'My Profile'].join('  |  '), 10);
    subheading(ownGuide ? 'What you do' : 'Does');
    bullets(guide.does, KIND_COLOR.maker);
    subheading('Approvals');
    if (guide.approves.length) {
      paragraph(ownGuide ? 'At Level 2 you also approve or reject:' : 'At Level 2 also approves or rejects:', 9.5, 'normal', MUTED);
      bullets(guide.approves, KIND_COLOR.checker);
    } else {
      paragraph(
        id === 'DEALER'
          ? 'Every change you request is checked by a Dealer Manager at TinQa.'
          : 'None. This role works at Level 1; what it prepares is approved by a manager.',
        10
      );
    }
    if (guide.tips.length) {
      subheading('Good to know');
      bullets(guide.tips, KIND_COLOR.external);
    }
  };

  // Cover block
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageWidth, 6, 'F');
  font(9, 'bold', ACCENT);
  doc.text('TINQA PROCUREMENT  -  USER GUIDE', margin, y + 10);
  y += 22;
  font(24, 'bold', INK);
  wrap(role ? `${ROLE_GUIDES[role].name} guide` : 'Complete user guide', contentWidth).forEach((line) => {
    doc.text(line, margin, y + 22);
    y += 28;
  });
  paragraph(
    role
      ? `What a ${ROLE_GUIDES[role].name} does in TinQa and how their work moves from step to step.`
      : 'Every role in TinQa, what each one does and how work moves between them.',
    11,
    'normal',
    MUTED
  );
  paragraph(`Version ${GUIDE_VERSION}  -  updated ${formatDate(GUIDE_UPDATED)}`, 8.5, 'normal', MUTED);
  y += 4;

  if (role) {
    roleSection(role, true);
    const flows = flowsFor(role);
    heading('How your work flows');
    paragraph('Highlighted steps marked YOU are yours. The other steps show who comes before and after you.', 9.5, 'normal', MUTED);
    flows.forEach((item, index) => flow(item, index + 1));
    if (role !== 'DEALER') {
      heading('For everyone');
      bullets(GENERAL_NOTES);
    }
  } else {
    heading('How access works');
    bullets([
      'Each employee has a designation (job title) and a level. The designation decides which modules open; nothing is granted by hand.',
      ...GENERAL_NOTES,
    ]);
    GUIDE_ROLE_IDS.forEach((id) => roleSection(id, false));
    heading('Flows');
    GUIDE_FLOWS.forEach((item, index) => flow(item, index + 1));
    heading("What's new");
    GUIDE_CHANGELOG.forEach((entry) => {
      subheading(formatDate(entry.date));
      bullets(entry.changes);
    });
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    font(8, 'normal', MUTED);
    doc.text(safe(role ? `TinQa User Guide · ${ROLE_GUIDES[role].name}` : 'TinQa User Guide'), margin, pageHeight - margin + 10);
    doc.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - margin + 10, { align: 'right' });
  }
  return doc;
};

export const downloadGuidePdf = async (role: GuideRoleId | null) => {
  const doc = await buildGuidePdf(role);
  doc.save(guideFileName(role));
};
