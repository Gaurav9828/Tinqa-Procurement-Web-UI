import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, Loader2 } from 'lucide-react';
import { StatusStepper } from '../../../components/ui/StatusStepper';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import type { DemoDetail, DemoExpense, DemoMode, ExpenseKind } from '../types/clientDemo.types';
import { clientDemoApi } from '../api/clientDemoApi';
import { useDemo } from '../hooks/useClientDemoData';
import { useClientDemoActions } from '../hooks/useClientDemoActions';
import { useInvoiceFile } from '../hooks/useInvoiceFile';
import { DemoStatusBadge } from '../components/DemoStatusBadge';
import { DemoBills } from '../components/DemoBills';
import { DemoTimeline } from '../components/DemoTimeline';
import { DemoOverview } from '../components/DemoOverview';
import { DemoActions, type DemoAction } from '../components/DemoActions';
import { BillDialog } from '../components/BillDialog';
import { ReasonDialog } from '../components/ReasonDialog';
import { CLIENT_DEMOS_PATH, DEMO_TYPE_LABELS, MY_DEMOS_PATH, WORKFLOW_STEPS, changeNeedsReason, inrAmount, workflowIndex } from '../utils/clientDemo';
import { approvalSummary, demoAbilities, isCorrection, nextStepHint, waitingFor } from '../utils/demoAccess';

type Dialog =
  | { kind: 'bill'; expense: DemoExpense | null; initialKind: ExpenseKind; day: number | null }
  | { kind: 'remove-bill'; expense: DemoExpense }
  | { kind: 'approve' | 'reject' | 'complete' | 'cancel' | 'reopen' | 'delete' }
  | null;

type Actions = ReturnType<typeof useClientDemoActions>;

/** The dialog that is open, if any: each asks what its action needs and closes when it succeeded. */
const DemoDialog: React.FC<{
  demo: DemoDetail;
  dialog: Exclude<Dialog, null>;
  actions: Actions;
  deleting: ReturnType<typeof useApiAction>;
  onClose: () => void;
}> = ({ demo, dialog, actions, deleting, onClose }) => {
  const busy = actions.isSubmitting;
  const done = async (result: Promise<DemoDetail | null>) => (await result) !== null;
  const bills = demo.expenses.length;
  switch (dialog.kind) {
    case 'bill':
      return (
        <BillDialog demo={demo} expense={dialog.expense} initialKind={dialog.initialKind} initialDay={dialog.day} isSubmitting={busy}
          onClose={onClose} onSave={(payload, file) => actions.saveBill(demo, dialog.expense?.id ?? null, payload, file)} />
      );
    case 'remove-bill':
      return (
        <ReasonDialog title="Remove this bill?" subtitle={`${inrAmount(dialog.expense.amount)} comes off the demo’s total.`} label="Reason"
          required={changeNeedsReason(demo.status)} confirmLabel="Remove bill" tone="danger" isSubmitting={busy} onClose={onClose}
          onConfirm={(reason) => done(actions.removeBill(demo.id, dialog.expense.id, reason || null))} />
      );
    case 'approve':
      return (
        <ReasonDialog title={`Approve the ${waitingFor(demo)}?`} subtitle={approvalSummary(demo)} required={false} label="Note (optional)"
          confirmLabel="Approve" tone="approve" isSubmitting={busy} onClose={onClose}
          onConfirm={(note) => done(actions.decide(demo.id, 'APPROVED', note || null))} />
      );
    case 'reject':
      return (
        <ReasonDialog title={`Reject the ${waitingFor(demo)}?`} subtitle="It goes back with your reason." label="Reason" confirmLabel="Reject"
          tone="danger" isSubmitting={busy} onClose={onClose} onConfirm={(reason) => done(actions.decide(demo.id, 'REJECTED', reason))} />
      );
    case 'complete':
      return (
        <ReasonDialog title={demo.status === 'REOPENED' ? 'Send the correction for approval?' : 'Send for completion?'}
          subtitle={`${inrAmount(demo.total)} in ${bills} ${bills === 1 ? 'bill' : 'bills'} against a ${inrAmount(demo.proposedBudget)} budget. Bills are locked while it waits.`}
          label="Outcome of the visit" maxLength={1000} placeholder="What was demonstrated, the client’s response, next steps"
          confirmLabel="Send for approval" tone="approve" isSubmitting={busy} onClose={onClose}
          onConfirm={(outcome) => done(actions.complete(demo.id, outcome))} />
      );
    case 'cancel':
      return (
        <ReasonDialog title="Cancel this demo?" subtitle="The tagged staff are told." label="Reason" confirmLabel="Cancel demo" tone="danger"
          isSubmitting={busy} onClose={onClose} onConfirm={(reason) => done(actions.cancel(demo.id, reason))} />
      );
    case 'reopen':
      return (
        <ReasonDialog title="Reopen for correction?"
          subtitle={`${inrAmount(demo.bookedTotal)} stays booked. Once you have corrected it, the completion is approved again and only the difference is booked.`}
          label="Reason" confirmLabel="Reopen" tone="warning" isSubmitting={busy} onClose={onClose}
          onConfirm={(reason) => done(actions.reopen(demo.id, reason))} />
      );
    case 'delete':
      return (
        <ConfirmationModal isOpen actionType="DELETE" title="Delete this draft?" description={`${demo.reference} (${demo.clientName}) and its bills are removed.`}
          confirmLabel="Delete draft" tone="danger" isSubmitting={deleting.isSubmitting} onClose={onClose}
          onConfirm={async () => {
            if (await deleting.run(() => clientDemoApi.remove(demo.id), { success: 'Draft deleted.', failure: 'The draft could not be deleted.' })) onClose();
          }} />
      );
  }
};

/** Where the demo is: the progress track, what happens next, and any reason given on the way. */
const DemoProgress: React.FC<{ demo: DemoDetail; mode: DemoMode; blockedApprover: boolean }> = ({ demo, mode, blockedApprover }) => {
  const { status } = demo;
  const sentBack = status === 'DRAFT' || status === 'APPROVED' || status === 'REOPENED';
  return (
    <section className="apple-card p-5 space-y-3">
      <StatusStepper label="Demo progress" steps={WORKFLOW_STEPS} currentIndex={workflowIndex(status)} muted={status === 'CANCELLED'}
        complete={status === 'COMPLETED'} warning={status === 'REOPENED'} tone={status === 'REOPENED' ? 'purple' : 'blue'} />
      <p className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#0071e3]" /> {nextStepHint(demo, mode)}
      </p>
      {demo.rejectionReason && sentBack && (
        <p className="text-xs text-rose-600 dark:text-rose-400">Rejected by {demo.decidedByName ?? 'an approver'}: {demo.rejectionReason}</p>
      )}
      {demo.reopenReason && isCorrection(demo) && <p className="text-xs text-purple-600 dark:text-purple-400">Reopened because: {demo.reopenReason}</p>}
      {blockedApprover && <p className="text-xs text-amber-600 dark:text-amber-400">You planned, sent or attend this demo, so someone else decides on it.</p>}
    </section>
  );
};

/**
 * One client demo, step by step: its plan, the approval of its quotation, the bills of the visit day by day, the
 * approval of its completion (which books the total spent) and its timeline. Demo managers act on it here; approvers
 * decide here (from the Approvals Hub); attending staff open it from My Demos and record their own bills.
 */
export const ClientDemoDetailPage: React.FC<{ mode: DemoMode }> = ({ mode }) => {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const { can } = useAccess();
  const { data: demo, isLoading, refresh, replace } = useDemo(mode, Number.isFinite(id) ? id : null);
  const actions = useClientDemoActions(mode, replace, refresh);
  const deleting = useApiAction(useCallback(() => navigate(CLIENT_DEMOS_PATH), [navigate]));
  const invoice = useInvoiceFile(mode);
  const [dialog, setDialog] = useState<Dialog>(null);
  const backPath = mode === 'manager' ? CLIENT_DEMOS_PATH : MY_DEMOS_PATH;

  if (!demo) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-sm text-gray-500 flex items-center gap-2">
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading the demo…</> : 'This client demo could not be loaded.'}
        <Link to={backPath} className="text-[#0071e3] font-semibold hover:underline ml-2">Back</Link>
      </div>
    );
  }

  const abilities = demoAbilities(demo, mode, can);
  const act = (action: DemoAction) => {
    if (action === 'submit') actions.submit(demo.id);
    else if (action === 'withdraw') actions.withdraw(demo.id);
    else if (action === 'edit') navigate(`${CLIENT_DEMOS_PATH}/${demo.id}/edit`);
    else setDialog({ kind: action });
  };

  return (
    <div className="space-y-5 p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={backPath} className="inline-flex items-center gap-1 text-xs text-[#0071e3] font-semibold hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> {mode === 'manager' ? 'Back to client demos' : 'Back to my demos'}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white mt-2 flex flex-wrap items-center gap-2">
            {demo.clientName}
            <span className="font-mono text-sm text-gray-400">{demo.reference}</span>
            <DemoStatusBadge status={demo.status} />
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{DEMO_TYPE_LABELS[demo.demoType]} · {demo.clientCategoryLabel} · {demo.city}</p>
        </div>
        <DemoActions demo={demo} abilities={abilities} busy={actions.isSubmitting} onAction={act} />
      </div>

      <DemoProgress demo={demo} mode={mode} blockedApprover={abilities.blockedApprover} />
      <DemoOverview demo={demo} />
      <DemoBills
        demo={demo}
        canAdd={abilities.addBills}
        downloadingId={invoice.busyId}
        onAdd={(kind, day) => setDialog({ kind: 'bill', expense: null, initialKind: kind, day })}
        onEdit={(expense) => setDialog({ kind: 'bill', expense, initialKind: expense.kind, day: expense.dayNumber })}
        onRemove={(expense) => setDialog({ kind: 'remove-bill', expense })}
        onAttach={(expense, file) => actions.attachInvoice(demo.id, expense.id, file)}
        onDownload={(expense) => invoice.download(demo.id, expense.id, expense.invoiceFileName ?? 'invoice')}
      />
      <DemoTimeline events={demo.events} />

      {dialog && <DemoDialog demo={demo} dialog={dialog} actions={actions} deleting={deleting} onClose={() => setDialog(null)} />}
    </div>
  );
};
