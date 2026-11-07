import React, { useMemo, useState } from 'react';
import { ArrowLeft, Loader2, PackagePlus, Save, ScanBarcode, Trash2 } from 'lucide-react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useNotify } from '../../../hooks/useNotify';
import { useComponentLimit } from '../hooks/useComponentLimit';
import { useStockEntryEditor, type StockEntryTarget } from '../hooks/useStockEntryEditor';
import { STOCK_NOTE_MAX_LENGTH } from '../utils/stockAdjustment';
import { describeProblems, filledRowCount } from '../utils/stockEntryGrid';
import { LimitNote, UnitsToAdd } from './StockEntryUnits';
import { StockEntryGrid } from './StockEntryGrid';

interface Props {
  target: StockEntryTarget;
  onClose: () => void;
  /** Stock was added: the product list shows the new stock. */
  onSubmitted: () => void;
  /** A draft was created, saved, submitted or deleted: the drafts list reloads. */
  onDraftsChanged: () => void;
}

const BUTTON = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const CONFIRM = {
  delete: { title: 'Delete this draft?', text: 'Delete this draft and every barcode entered in it? Item stock is not affected.', action: 'Delete draft' },
  discard: { title: 'Discard unsaved changes?', text: 'Leave without saving? Changes since the last save are lost.', action: 'Discard changes' },
} as const;

// Asks before deleting the draft or leaving with unsaved changes
const ConfirmBar: React.FC<{ kind: keyof typeof CONFIRM; onConfirm: () => void; onCancel: () => void }> = ({ kind, onConfirm, onCancel }) => (
  <div role="alertdialog" aria-label={CONFIRM[kind].title} className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs">
    <span className="text-amber-800 dark:text-amber-300">{CONFIRM[kind].text}</span>
    <button type="button" className={`${BUTTON} ${SOLID_TONE.danger}`} onClick={onConfirm}>
      {CONFIRM[kind].action}
    </button>
    <button type="button" className={`${BUTTON} bg-black/5 dark:bg-white/10 text-black dark:text-white`} onClick={onCancel}>
      Keep working
    </button>
  </div>
);

/** One product's stock entry: how many units, then the barcodes of each unit and its pieces, row by row. */
export const StockEntryEditor: React.FC<Props> = ({ target, onClose, onSubmitted, onDraftsChanged }) => {
  const notify = useNotify();
  const editor = useStockEntryEditor(target, () => {
    onSubmitted();
    onClose();
  }, onDraftsChanged);
  const { columns, rows, components, busy, draft } = editor;
  const [confirm, setConfirm] = useState<'delete' | 'discard' | null>(null);
  // What the components in stock allow, and their pieces offered in the cells
  const limit = useComponentLimit(components, !editor.isLoading && !editor.loadFailed);
  const maxUnits = limit.maxUnits;
  // No more units than can be built: unknown or exceeded, nothing is saved or added
  const buildable = maxUnits !== null && maxUnits >= 1;
  const withinLimit = buildable && rows.length <= maxUnits;
  const minimum = Math.max(1, filledRowCount(rows));

  const problems = useMemo(
    () => describeProblems(editor.serverErrors, editor.typedProblems, columns),
    [editor.serverErrors, editor.typedProblems, columns]
  );

  const allComplete = editor.completeRows === rows.length;
  const canSubmit = !busy && withinLimit && allComplete && editor.typedProblems.size === 0;

  if (editor.isLoading) {
    return (
      <p className="flex items-center gap-2 p-6 text-xs text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading the stock entry draft…
      </p>
    );
  }
  if (editor.loadFailed) {
    return (
      <div className="p-6 space-y-3 text-xs">
        <p role="alert" className="text-rose-600">This draft couldn't be loaded. It may have been submitted or deleted by someone else.</p>
        <button type="button" onClick={onClose} className={`${BUTTON} bg-black/5 dark:bg-white/10 text-black dark:text-white`}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to stock entries
        </button>
      </div>
    );
  }

  return (
    <section aria-label={`Stock entry for ${editor.productTitle}`} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-emerald-600" /> Add stock: {editor.productTitle}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5" data-testid="stock-entry-progress">
            {editor.completeRows} of {rows.length} unit{rows.length === 1 ? '' : 's'} complete
            {draft ? ` · draft saved by ${draft.updatedBy ?? draft.createdBy ?? 'someone'}` : ' · not saved yet'}
            {editor.dirty ? ' · unsaved changes' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (editor.dirty ? setConfirm('discard') : onClose())}
          className={`${BUTTON} self-start bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10`}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to stock entries
        </button>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-gray-500">
        <ScanBarcode className="w-3.5 h-3.5 mt-px shrink-0 text-[#0071e3]" />
        One row per unit: scan the unit's new barcode, then the barcode of every piece fitted into that unit (a component used
        twice has two columns). Click a piece cell to pick from the pieces in stock, or type or scan it. Enter moves to the next
        cell; a block copied from a spreadsheet can be pasted into the first cell. Save a draft at any
        time and continue later; nothing leaves item stock until the entry is submitted.
      </p>

      <div className="flex flex-wrap items-end gap-4 text-xs">
        <UnitsToAdd limit={limit} rows={rows.length} minimum={minimum} onChange={editor.setQuantity} disabled={!!busy} />
        <div className="space-y-1 flex-1 min-w-[16rem]">
          <label htmlFor="stock-entry-note" className="block font-semibold text-gray-700 dark:text-gray-300">
            Reason (optional)
          </label>
          <input
            id="stock-entry-note"
            type="text"
            maxLength={STOCK_NOTE_MAX_LENGTH}
            value={editor.note}
            disabled={!!busy}
            onChange={(event) => editor.setNote(event.target.value)}
            placeholder="e.g. Assembled batch, November"
            className="w-full px-2 py-1.5 rounded-lg border border-black/10 dark:border-white/15 bg-transparent text-black dark:text-white"
          />
        </div>
      </div>

      <LimitNote limit={limit} rows={rows.length} />

      {/* No rows to scan until at least one unit can be built */}
      {buildable && (
      <StockEntryGrid
        columns={columns}
        rows={rows}
        onChange={editor.edit}
        typedProblems={editor.typedProblems}
        serverCells={editor.serverErrors.cells}
        serverRows={editor.serverErrors.rows}
        pieces={limit.limit ? limit.pieces : null}
        disabled={!!busy}
        onPasteOverflow={(dropped) =>
          notify.warning(`${dropped} pasted barcode${dropped === 1 ? '' : 's'} didn't fit the grid. Add more units first, then paste again.`)
        }
      />
      )}

      {problems.length > 0 && (
        <div role="alert" className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-400 space-y-0.5" data-testid="stock-entry-problems">
          {problems.slice(0, 8).map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
          {problems.length > 8 && <p>…and {problems.length - 8} more (the cells are marked red).</p>}
        </div>
      )}

      {confirm && (
        <ConfirmBar
          kind={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            if (confirm === 'discard') onClose();
            else void editor.remove().then((ok) => ok && onClose());
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {draft && (
            <button type="button" disabled={!!busy} onClick={() => setConfirm('delete')} className={`${BUTTON} ${SOLID_TONE.danger}`}>
              {busy === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete draft
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!allComplete && <span className="text-[11px] text-gray-500">Submit is available once every unit is complete.</span>}
          <button type="button" disabled={!!busy || !withinLimit} onClick={() => void editor.save()} className={`${BUTTON} ${SOLID_TONE.primary}`}>
            {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save draft
          </button>
          <button type="button" disabled={!canSubmit} onClick={() => void editor.submit()} className={`${BUTTON} ${SOLID_TONE.approve}`}>
            {busy === 'submit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackagePlus className="w-3.5 h-3.5" />} Add {rows.length} unit
            {rows.length === 1 ? '' : 's'} to stock
          </button>
        </div>
      </div>
    </section>
  );
};
