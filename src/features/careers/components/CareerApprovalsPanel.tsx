import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, Loader2, Undo2 } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { Pager } from '../../../components/ui/Pager';
import { ReasonDialog } from '../../client-demos/components/ReasonDialog';
import { useApplications, useSignedInUsername } from '../hooks/useCareersData';
import { useApplicationActions } from '../hooks/useCareerActions';
import type { ApplicationFilters } from '../hooks/useCareersData';
import type { ApplicationRow } from '../types/careers.types';
import { canDecide, isOwnRequest } from '../utils/applicationAccess';
import { PENDING_KIND_LABELS, PENDING_STATUSES, applicationPath, formatDateTime } from '../utils/careers';
import { MatchBadge } from './Badges';
import { ActionButton, EmptyRow, RefreshButton } from './CareersUi';

const WAITING: ApplicationFilters = { statuses: PENDING_STATUSES, match: null, sort: 'OLDEST' };

type Decision = { kind: 'approve' | 'return'; row: ApplicationRow } | null;

/**
 * The Approvals Hub's Careers tab: shortlists and selections waiting for a Level 2 approver, oldest first
 * (GET /applications?status=SHORTLIST_PENDING,SELECTION_PENDING&sort=OLDEST). Loaded only while the tab is open
 * (`enabled`). After a decision only this list and the hub's summary are refreshed (`onChanged`).
 */
export const CareerApprovalsPanel: React.FC<{ enabled: boolean; onChanged: () => void }> = ({ enabled, onChanged }) => {
  const { can } = useAccess();
  const username = useSignedInUsername();
  const list = useApplications({ initial: WAITING, enabled, quiet: true });
  const [decision, setDecision] = useState<Decision>(null);
  const refreshList = list.refresh;
  const actions = useApplicationActions(
    useCallback(() => {
      refreshList();
      onChanged();
    }, [refreshList, onChanged])
  );
  const done = async (result: Promise<unknown>) => (await result) !== null;
  const emptyText = list.loadFailed ? 'The list could not be loaded.' : 'Nothing waiting.';

  return (
    <section aria-label="Careers decisions awaiting approval" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#0071e3]" /> Shortlists and selections awaiting approval
            {list.data && <span className="text-xs text-gray-400">({list.totalElements})</span>}
          </h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-1 max-w-2xl">
            Confirming emails the candidate. Return sends it back to the screener with your note. You can&apos;t confirm what you asked for yourself.
          </p>
        </div>
        <RefreshButton label="Refresh careers approvals" busy={list.isLoading} onClick={list.refresh} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left" aria-label="Careers decisions">
          <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="pb-2 pr-3 font-semibold">Candidate</th>
              <th className="pb-2 pr-3 font-semibold">Opening</th>
              <th className="pb-2 pr-3 font-semibold">Kind</th>
              <th className="pb-2 pr-3 font-semibold">Asked by</th>
              <th className="pb-2 pr-3 font-semibold">Note</th>
              <th className="pb-2 pr-3 font-semibold">Match</th>
              <th className="pb-2 font-semibold">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
            {list.rows.length === 0 && (
              <EmptyRow colSpan={7}>
                {list.isLoading ? <Loader2 className="w-5 h-5 animate-spin inline" aria-label="Loading" /> : emptyText}
              </EmptyRow>
            )}
            {list.rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-3">
                  <Link to={applicationPath(row.id)} className="font-semibold text-[#0071e3] hover:underline">{row.fullName}</Link>
                  <div className="font-mono text-gray-400">{row.referenceNumber}</div>
                </td>
                <td className="py-3 pr-3">
                  {row.opening.title}
                  <div className="font-mono text-gray-400">{row.opening.jobCode}</div>
                </td>
                <td className="py-3 pr-3">{row.pending ? PENDING_KIND_LABELS[row.pending.kind] : '—'}</td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  {row.pending?.requestedBy ?? '—'}
                  {row.pending && <div className="text-gray-400">{formatDateTime(row.pending.requestedAt)}</div>}
                </td>
                <td className="py-3 pr-3 max-w-xs break-words whitespace-pre-line">{row.pending?.note || '—'}</td>
                <td className="py-3 pr-3"><MatchBadge match={row.match} /></td>
                <td className="py-3">
                  {canDecide(row, can, username) ? (
                    <div className="flex flex-wrap gap-1.5">
                      <ActionButton small label="Approve" icon={<CheckCircle2 className="w-3.5 h-3.5" />} tone="approve" disabled={actions.isSubmitting}
                        onClick={() => setDecision({ kind: 'approve', row })} />
                      <ActionButton small label="Return" icon={<Undo2 className="w-3.5 h-3.5" />} tone="warning" disabled={actions.isSubmitting}
                        onClick={() => setDecision({ kind: 'return', row })} />
                    </div>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">{isOwnRequest(row, username) ? 'You asked for it: another approver decides' : '—'}</span>
                  )}
                  <Link to={applicationPath(row.id)} className="block mt-1 text-[#0071e3] hover:underline">Open application</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} totalPages={list.totalPages} disabled={list.isLoading} onPage={list.setPage} />

      {decision?.kind === 'approve' && (
        <ReasonDialog title={`Confirm the ${decision.row.pending ? PENDING_KIND_LABELS[decision.row.pending.kind].toLowerCase() : 'decision'} of ${decision.row.fullName}?`}
          subtitle="The candidate is emailed." label="Note (optional)" required={false} confirmLabel="Approve" tone="approve" isSubmitting={actions.isSubmitting}
          onClose={() => setDecision(null)} onConfirm={(note) => done(actions.approve(decision.row.id, note || null))} />
      )}
      {decision?.kind === 'return' && (
        <ReasonDialog title={`Return ${decision.row.fullName}?`} subtitle="It goes back to the screener with your note." label="Note" confirmLabel="Return" tone="warning"
          isSubmitting={actions.isSubmitting} onClose={() => setDecision(null)} onConfirm={(note) => done(actions.returnDecision(decision.row.id, note))} />
      )}
    </section>
  );
};
