import React, { useState } from 'react';
import { BadgeCheck, Loader2, MailCheck, Send } from 'lucide-react';
import { SOLID_TONE } from '../ui/actionTones';
import type { EmailVerificationState } from '../../hooks/useEmailVerification';
import { EMAIL_CODE_LENGTH } from '../../types/emailVerification.types';

interface Props {
  verification: EmailVerificationState;
  /** The address is complete and valid, so a code can be sent. */
  canSend: boolean;
  /** Who reads the code out, e.g. "the customer" or "the employee". */
  whose: string;
}

/**
 * Sits under an email field: send a 5-digit code to the address, type the code the person reads out, and show the
 * address as verified. The form must not be submitted until `verification.token` is set.
 */
export const EmailVerificationPanel: React.FC<Props> = ({ verification, canSend, whose }) => {
  const [code, setCode] = useState('');
  const { stage, resendIn, isSending, isConfirming } = verification;

  if (stage === 'verified') {
    return (
      <p role="status" className="flex items-center gap-1.5 px-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <BadgeCheck className="w-4 h-4" /> Email verified
      </p>
    );
  }

  const sendLabel = stage === 'sent' ? (resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code') : 'Send code';

  return (
    <div className="space-y-2 rounded-xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-3" aria-label="Email verification">
      <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-neutral-300">
        <MailCheck className="w-4 h-4 text-[#0071e3] shrink-0" />
        {stage === 'sent'
          ? `We emailed a ${EMAIL_CODE_LENGTH}-digit code. Ask ${whose} for it; it can take up to a minute to arrive.`
          : `Verify this email before registering: we send ${whose} a ${EMAIL_CODE_LENGTH}-digit code.`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {stage === 'sent' && (
          <>
            <input
              aria-label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={EMAIL_CODE_LENGTH}
              placeholder={'0'.repeat(EMAIL_CODE_LENGTH)}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              className="w-28 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
            <button
              type="button"
              disabled={isConfirming || code.length !== EMAIL_CODE_LENGTH}
              onClick={async () => {
                if (await verification.confirmCode(code)) setCode('');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE.approve}`}
            >
              {isConfirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />} Verify
            </button>
          </>
        )}
        <button
          type="button"
          disabled={!canSend || isSending || resendIn > 0}
          onClick={() => void verification.sendCode()}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE.primary}`}
        >
          {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {sendLabel}
        </button>
      </div>
    </div>
  );
};
