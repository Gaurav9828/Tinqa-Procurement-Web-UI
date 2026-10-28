import React from 'react';
import { CheckCircle2, Pencil, RotateCcw, Send, Trash2, Undo2, XCircle } from 'lucide-react';
import { SOLID_TONE, type ActionTone } from '../../../components/ui/actionTones';
import type { DemoDetail } from '../types/clientDemo.types';
import type { DemoAbilities } from '../utils/demoAccess';
import { waitingFor } from '../utils/demoAccess';
import { formatDay } from '../utils/clientDemo';

export type DemoAction = 'submit' | 'complete' | 'approve' | 'reject' | 'edit' | 'withdraw' | 'reopen' | 'cancel' | 'delete';

const ActionButton: React.FC<{ label: string; icon: React.ReactNode; tone: ActionTone; disabled?: boolean; title?: string; onClick: () => void }> = ({
  label,
  icon,
  tone,
  disabled,
  title,
  onClick,
}) => (
  <button type="button" onClick={onClick} disabled={disabled} title={title}
    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE[tone]}`}>
    {icon} {label}
  </button>
);

/** The buttons for what can be done on the demo now, coloured by what they do. */
export const DemoActions: React.FC<{ demo: DemoDetail; abilities: DemoAbilities; busy: boolean; onAction: (action: DemoAction) => void }> = ({
  demo,
  abilities,
  busy,
  onAction,
}) => {
  const icon = 'w-3.5 h-3.5';
  const hasBills = demo.total > 0;
  return (
    <div className="flex flex-wrap gap-2">
      {abilities.submitQuotation && (
        <ActionButton label="Send quotation for approval" icon={<Send className={icon} />} tone="approve" disabled={busy} onClick={() => onAction('submit')} />
      )}
      {abilities.complete && (
        <ActionButton label={demo.status === 'REOPENED' ? 'Send correction for approval' : 'Send for completion'} icon={<CheckCircle2 className={icon} />}
          tone="approve" disabled={busy || abilities.notStartedYet} onClick={() => onAction('complete')}
          title={abilities.notStartedYet ? `The visit starts on ${formatDay(demo.startDate)}.` : undefined} />
      )}
      {abilities.decide && (
        <>
          <ActionButton label={`Approve ${waitingFor(demo)}`} icon={<CheckCircle2 className={icon} />} tone="approve" disabled={busy} onClick={() => onAction('approve')} />
          <ActionButton label="Reject" icon={<XCircle className={icon} />} tone="danger" disabled={busy} onClick={() => onAction('reject')} />
        </>
      )}
      {abilities.manages && <ActionButton label="Change plan" icon={<Pencil className={icon} />} tone="primary" disabled={busy} onClick={() => onAction('edit')} />}
      {abilities.withdraw && <ActionButton label="Withdraw" icon={<Undo2 className={icon} />} tone="warning" disabled={busy} onClick={() => onAction('withdraw')} />}
      {abilities.reopen && (
        <ActionButton label="Reopen for correction" icon={<RotateCcw className={icon} />} tone="warning" disabled={busy} onClick={() => onAction('reopen')} />
      )}
      {abilities.cancel && (
        <ActionButton label="Cancel demo" icon={<XCircle className={icon} />} tone="danger" disabled={busy || hasBills} onClick={() => onAction('cancel')}
          title={hasBills ? 'It has bills: send it for completion instead.' : undefined} />
      )}
      {abilities.deleteDraft && (
        <ActionButton label="Delete draft" icon={<Trash2 className={icon} />} tone="danger" disabled={busy} onClick={() => onAction('delete')} />
      )}
    </div>
  );
};
