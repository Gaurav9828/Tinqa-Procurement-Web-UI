import React, { useState } from 'react';
import { Eye, EyeOff, Globe, Loader2, Lock } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useCareersSettings } from '../hooks/useCareersSettings';
import { formatDateTime } from '../utils/careers';

/**
 * "Careers tab on the website": on or off, who changed it last, and (for a Super Admin) the switch. Hiding asks for
 * confirmation; staff keep working on openings and applicants while it is hidden.
 */
export const CareersSiteSwitch: React.FC = () => {
  const { settings, isLoading, canToggle, isSaving, setEnabled } = useCareersSettings();
  const [confirmHide, setConfirmHide] = useState(false);

  if (isLoading && !settings) {
    return (
      <section aria-label="Careers tab on the website" className="apple-card p-4 text-xs text-gray-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking the Careers tab…
      </section>
    );
  }
  if (!settings) return null;

  const { enabled } = settings;
  return (
    <section aria-label="Careers tab on the website" className="apple-card p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center ${enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
          {enabled ? <Globe className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </span>
        <div>
          <p className="font-semibold text-black dark:text-white">
            Careers tab on the website: <span className={enabled ? 'text-emerald-600' : 'text-amber-600'}>{enabled ? 'Shown' : 'Hidden'}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 max-w-2xl">
            {enabled
              ? 'Visitors see the Careers tab, the open roles and can apply.'
              : 'The Careers tab and every role page are hidden from the website, and nobody can apply. You can still work on openings and applicants here.'}
            {settings.updatedBy && settings.updatedAt && ` Last changed by ${settings.updatedBy} on ${formatDateTime(settings.updatedAt)}.`}
          </p>
          {!canToggle && (
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Only a Super Admin (Level 2) can hide or show the Careers tab.
            </p>
          )}
        </div>
      </div>
      {canToggle && (
        <button
          type="button"
          disabled={isSaving}
          onClick={() => (enabled ? setConfirmHide(true) : void setEnabled(true))}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 ${enabled ? SOLID_TONE.warning : SOLID_TONE.approve}`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {enabled ? 'Hide Careers tab' : 'Show Careers tab again'}
        </button>
      )}
      <ConfirmationModal
        isOpen={confirmHide}
        actionType="CONFIRM"
        tone="warning"
        title="Hide the Careers tab?"
        description="The Careers tab and every role page disappear from the website, and nobody can apply until a Super Admin shows it again. Openings and applicants stay as they are."
        confirmLabel="Hide Careers tab"
        isSubmitting={isSaving}
        onClose={() => setConfirmHide(false)}
        onConfirm={async () => {
          if (await setEnabled(false)) setConfirmHide(false);
        }}
      />
    </section>
  );
};
