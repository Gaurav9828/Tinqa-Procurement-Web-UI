import React, { useCallback, useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, Power, RotateCcw, X } from 'lucide-react';
import { dealerLoginApi } from '../api/dealerLoginApi';
import { DEALER_LOGIN_STATUS_LABEL, type DealerLogin } from '../types/dealerLogin.types';
import type { DealerResponse } from '../types/dealer.types';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useNotify } from '../../../hooks/useNotify';
import { useAuthStore } from '../../../store/useAuthStore';
import { CommonInput, CommonTextArea } from '../../../components/ui/FormInputs';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';

const STATUS_TONE: Record<DealerLogin['status'], string> = {
  APPROVAL_PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  DISABLED: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
};

// A starting suggestion only: the part of the dealer's email before the @, cleaned to what usernames allow
const suggestUsername = (dealer: DealerResponse) =>
  (dealer.email?.split('@')[0] ?? dealer.name).toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 50);

/**
 * The dealer's web login, inside the dealer's details. A Dealer Manager creates it with the default password; it
 * signs in once someone else approves it, then can be switched off or have its password reset.
 */
export const DealerLoginPanel: React.FC<{ dealer: DealerResponse }> = ({ dealer }) => {
  const { can } = useAccess();
  const currentUserId = useAuthStore((state) => state.user?.userId);
  const notify = useNotify();
  const [login, setLogin] = useState<DealerLogin | null | undefined>(undefined);
  const [username, setUsername] = useState(() => suggestUsername(dealer));
  const [email, setEmail] = useState(dealer.email ?? '');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  // Resetting signs the dealer out and puts the default password back: ask once more
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    if (!can('DEALER_VIEW')) return;
    try {
      const res = await dealerLoginApi.getLogin(dealer.id);
      if (res.success) setLogin(res.data ?? null);
      else notify.error(res, "The dealer's login could not be loaded.");
    } catch (err: unknown) {
      notify.error(err, "The dealer's login could not be loaded.");
    }
  }, [can, dealer.id, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const { isSubmitting, run } = useApiAction(load);
  const canManage = can('DEALER_LOGIN_MANAGE');
  // Maker-checker: the server refuses the creator's own decision, so don't offer it
  const canDecide = can('DEALER_LOGIN_APPROVE') && login?.status === 'APPROVAL_PENDING' && login.createdBy !== currentUserId;

  if (login === undefined) {
    return (
      <div className="py-4 flex justify-center text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  const showForm = canManage && (login === null || login.status === 'REJECTED');

  return (
    <section aria-label="Dealer login" className="pt-3 border-t border-black/5 dark:border-white/5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-400 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" /> Dealer login
        </span>
        {login && (
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_TONE[login.status]}`}>
            {DEALER_LOGIN_STATUS_LABEL[login.status]}
          </span>
        )}
      </div>

      {login === null && !canManage && <p className="text-gray-500">This dealer has no login.</p>}

      {login && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-400 block">Username</span>
            <span className="font-mono font-medium">{login.username}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Email</span>
            <span className="font-medium break-all">{login.email}</span>
          </div>
          <p className="col-span-2 text-gray-500">
            Created by {login.createdByUsername ?? 'unknown'} on {formatDateTime(login.createdAt)}
            {login.decidedByUsername && (
              <>
                {' '}
                · {login.status === 'REJECTED' ? 'rejected' : 'approved'} by {login.decidedByUsername}
              </>
            )}
          </p>
          {login.status === 'REJECTED' && login.rejectionReason && (
            <p className="col-span-2 text-rose-600 dark:text-rose-400">Reason: {login.rejectionReason}</p>
          )}
          {login.status === 'APPROVAL_PENDING' && !canDecide && (
            <p className="col-span-2 text-amber-700 dark:text-amber-400">
              Can't sign in until a Level 2 dealer manager other than its creator approves it.
            </p>
          )}
          {login.status === 'ACTIVE' && login.passwordChangePending && (
            <p className="col-span-2 text-gray-500">The dealer still has to replace the default password at first sign-in.</p>
          )}
          {!login.dealerActive && login.status === 'ACTIVE' && (
            <p className="col-span-2 text-amber-700 dark:text-amber-400">The dealer is inactive, so this login can't sign in.</p>
          )}
        </div>
      )}

      {canDecide && !rejecting && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => run(() => dealerLoginApi.decide(dealer.id, 'APPROVED'), { success: 'Dealer login approved.', failure: 'Could not approve the login.' })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.approve}`}
          >
            <Check className="w-3.5 h-3.5" /> Approve login
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setRejecting(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.danger}`}
          >
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      )}
      {canDecide && rejecting && (
        <div className="space-y-2">
          <CommonTextArea label="Reason for rejecting" aria-label="Reason for rejecting" required rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejecting(false)} className="px-3 py-1.5 rounded-xl font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !reason.trim()}
              onClick={async () => {
                const ok = await run(() => dealerLoginApi.decide(dealer.id, 'REJECTED', reason.trim()), {
                  success: 'Dealer login rejected.',
                  failure: 'Could not reject the login.',
                });
                if (ok) setRejecting(false);
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.danger}`}
            >
              Reject login
            </button>
          </div>
        </div>
      )}

      {canManage && login && (login.status === 'ACTIVE' || login.status === 'DISABLED') && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              run(() => dealerLoginApi.setEnabled(dealer.id, login.status !== 'ACTIVE'), {
                success: login.status === 'ACTIVE' ? 'Dealer login disabled.' : 'Dealer login enabled.',
                failure: 'Could not change the login.',
              })
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold cursor-pointer disabled:opacity-50 ${
              login.status === 'ACTIVE' ? CHOICE_TONE.warning.idle : CHOICE_TONE.approve.idle
            }`}
          >
            <Power className="w-3.5 h-3.5" /> {login.status === 'ACTIVE' ? 'Disable login' : 'Enable login'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              if (!confirmReset) {
                setConfirmReset(true);
                return;
              }
              await run(() => dealerLoginApi.resetPassword(dealer.id), {
                success: 'Password reset to the default.',
                failure: 'Could not reset the password.',
              });
              setConfirmReset(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold cursor-pointer disabled:opacity-50 ${
              confirmReset ? CHOICE_TONE.warning.active : CHOICE_TONE.warning.idle
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> {confirmReset ? 'Confirm: sign them out and reset' : 'Reset password'}
          </button>
        </div>
      )}

      {showForm && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => dealerLoginApi.createLogin(dealer.id, { username: username.trim(), email: email.trim() }), {
              success: 'Dealer login created. It can sign in once someone else approves it.',
              failure: 'Could not create the login.',
            });
          }}
        >
          <p className="text-gray-500">
            {login?.status === 'REJECTED' ? 'Correct the details and submit the login again.' : 'Give this dealer a login.'} They sign in with
            the default password and must change it at first sign-in. A second person approves the login first.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <CommonInput label="Username" aria-label="Username" required maxLength={50} value={username} onChange={(e) => setUsername(e.target.value)} />
            <CommonInput label="Login email" aria-label="Login email" type="email" required maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !username.trim() || !email.trim() || !dealer.isActive}
              className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.primary}`}
            >
              {login?.status === 'REJECTED' ? 'Submit again' : 'Create login'}
            </button>
          </div>
          {!dealer.isActive && <p className="text-amber-700 dark:text-amber-400">Activate the dealer before giving them a login.</p>}
        </form>
      )}
    </section>
  );
};
