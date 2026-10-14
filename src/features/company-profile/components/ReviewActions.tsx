import React, { useState } from 'react';
import { CheckCircle2, Info, Undo2, XCircle } from 'lucide-react';
import type { CompanyProfileVersion } from '../types/companyProfile.types';
import type { CompanyProfileAccess } from '../hooks/useCompanyProfileAccess';
import { useCompanyProfileActions } from '../hooks/useCompanyProfileActions';
import { ConfirmDialog, RejectDialog } from './Dialogs';
import { BUTTON } from '../utils/companyProfileUi';

interface Props {
  version: CompanyProfileVersion;
  access: CompanyProfileAccess;
  /** After a successful action, with the updated version. */
  onDone: (updated: CompanyProfileVersion, action: 'approve' | 'reject' | 'withdraw') => void;
  /** After a 409 (the version moved on). */
  onStale: () => void;
}

/**
 * Checker: Approve / Reject (never on a change they made). Maker: withdraw what they submitted.
 * Renders nothing when the current admin can't act on this version.
 */
export const ReviewActions: React.FC<Props> = ({ version, access, onDone, onStale }) => {
  const actions = useCompanyProfileActions({ onStale });
  const [dialog, setDialog] = useState<'approve' | 'reject' | 'withdraw' | null>(null);
  const [rejectError, setRejectError] = useState<string>();

  const canReview = access.canReview(version);
  const canWithdraw = access.canWithdraw(version);
  const ownChange = access.isOwnPendingChange(version);
  if (!canReview && !canWithdraw && !ownChange) return null;

  const finish = (action: 'approve' | 'reject' | 'withdraw', result: { ok: boolean; version?: CompanyProfileVersion; code?: string | null }) => {
    if (result.ok && result.version) {
      setDialog(null);
      onDone(result.version, action);
    } else if (result.code && result.code !== 'VALIDATION_FAILED') {
      setDialog(null); // permission / state errors: the alert explains; the page refreshes on 409
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canReview && (
        <>
          <button type="button" onClick={() => setDialog('approve')} disabled={!!actions.busy} className={BUTTON.approve}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </button>
          <button
            type="button"
            onClick={() => {
              setRejectError(undefined);
              setDialog('reject');
            }}
            disabled={!!actions.busy}
            className={BUTTON.danger}
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
        </>
      )}
      {ownChange && !canReview && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500" data-testid="own-change-note">
          <Info className="w-3.5 h-3.5" /> You can't approve a change you made.
        </p>
      )}
      {canWithdraw && (
        <button type="button" onClick={() => setDialog('withdraw')} disabled={!!actions.busy} className={BUTTON.secondary}>
          <Undo2 className="w-3.5 h-3.5" /> Withdraw request
        </button>
      )}

      {dialog === 'approve' && (
        <ConfirmDialog
          title="Approve this change?"
          body="This will replace the live company profile on the storefront. Shoppers see it within about 5 minutes."
          confirmLabel="Approve"
          tone="approve"
          busy={actions.busy === 'approve'}
          onClose={() => setDialog(null)}
          onConfirm={async () => finish('approve', await actions.approve(version.id))}
        />
      )}
      {dialog === 'reject' && (
        <RejectDialog
          busy={actions.busy === 'reject'}
          serverError={rejectError}
          onClose={() => setDialog(null)}
          onReject={async (comment) => {
            const result = await actions.reject(version.id, comment);
            setRejectError(result.fieldErrors?.comment);
            finish('reject', result);
          }}
        />
      )}
      {dialog === 'withdraw' && (
        <ConfirmDialog
          title="Withdraw this request?"
          body="The change is withdrawn for good: it can't be edited, submitted or approved afterwards. You can start a new draft at any time."
          confirmLabel="Withdraw request"
          tone="danger"
          busy={actions.busy === 'withdraw'}
          onClose={() => setDialog(null)}
          onConfirm={async () => finish('withdraw', await actions.withdraw(version.id))}
        />
      )}
    </div>
  );
};
