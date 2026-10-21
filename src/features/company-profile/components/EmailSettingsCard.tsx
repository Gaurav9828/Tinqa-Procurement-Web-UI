import React, { useState } from 'react';
import { CheckCircle2, Loader2, Mail, Send, TriangleAlert } from 'lucide-react';
import { CommonCheckbox, CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useEmailSettings } from '../hooks/useEmailSettings';
import type { EmailSettings, EmailSettingsRequest, MailSecurity } from '../types/emailSettings.types';
import { formatServerTime } from '../utils/companyProfile.utils';

const SECURITY_OPTIONS: { label: string; value: MailSecurity }[] = [
  { label: 'STARTTLS (port 587)', value: 'STARTTLS' },
  { label: 'SSL / TLS (port 465)', value: 'SSL' },
  { label: 'None (private relay only)', value: 'NONE' },
];

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const toForm = (settings: EmailSettings): EmailSettingsRequest => ({
  enabled: settings.enabled,
  smtpHost: settings.smtpHost ?? '',
  smtpPort: settings.smtpPort,
  security: settings.security,
  username: settings.username ?? '',
  password: '',
  clearPassword: false,
  fromAddress: settings.fromAddress ?? '',
  fromName: settings.fromName ?? '',
  replyTo: settings.replyTo ?? '',
});

const validate = (form: EmailSettingsRequest): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (form.fromAddress.trim() && !EMAIL_PATTERN.test(form.fromAddress.trim())) errors.fromAddress = 'Enter a valid email address.';
  if (form.replyTo.trim() && !EMAIL_PATTERN.test(form.replyTo.trim())) errors.replyTo = 'Enter a valid email address.';
  if (form.smtpPort !== null && (form.smtpPort < 1 || form.smtpPort > 65535)) errors.smtpPort = 'Port must be 1-65535.';
  if (form.enabled) {
    if (!form.smtpHost.trim()) errors.smtpHost = 'Needed to send email.';
    if (form.smtpPort === null) errors.smtpPort = 'Needed to send email.';
    if (!form.fromAddress.trim()) errors.fromAddress = 'Needed to send email.';
  }
  return errors;
};

const EmailSettingsForm: React.FC<{
  settings: EmailSettings;
  isSaving: boolean;
  isTesting: boolean;
  onSave: (form: EmailSettingsRequest) => Promise<boolean>;
  onTest: (to: string) => Promise<boolean>;
}> = ({ settings, isSaving, isTesting, onSave, onTest }) => {
  const [form, setForm] = useState<EmailSettingsRequest>(() => toForm(settings));
  const [submitted, setSubmitted] = useState(false);
  const [testTo, setTestTo] = useState('');
  const errors = submitted ? validate(form) : {};
  const set = (field: keyof EmailSettingsRequest) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [field]: event.target.value });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(form)).length > 0) return;
    if (await onSave(form)) {
      setForm((current) => ({ ...current, password: '', clearPassword: false }));
      setSubmitted(false);
    }
  };

  return (
    <form onSubmit={save} noValidate aria-label="Email settings" className="space-y-4">
      <CommonCheckbox
        label="Send customer emails"
        checked={form.enabled}
        onChange={(enabled) => setForm({ ...form, enabled })}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CommonInput label="Mail server (SMTP host)" placeholder="smtp.gmail.com" value={form.smtpHost} onChange={set('smtpHost')} error={errors.smtpHost} maxLength={255} />
        <CommonInput
          label="Port"
          type="number"
          inputMode="numeric"
          value={form.smtpPort ?? ''}
          onChange={(event) => setForm({ ...form, smtpPort: event.target.value === '' ? null : Number(event.target.value) })}
          error={errors.smtpPort}
        />
        <CommonSelect label="Security" value={form.security} onChange={set('security')} options={SECURITY_OPTIONS} />
        <CommonInput label="Username" autoComplete="off" value={form.username} onChange={set('username')} maxLength={255} />
        <div className="md:col-span-2">
          <CommonInput
            label="Password or app password"
            type="password"
            autoComplete="new-password"
            placeholder={settings.passwordSet ? 'Saved — leave blank to keep it' : ''}
            value={form.password}
            onChange={set('password')}
            disabled={form.clearPassword}
            maxLength={255}
          />
          {settings.passwordSet && (
            <label className="mt-1 px-1 flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
              <input type="checkbox" checked={form.clearPassword} onChange={(event) => setForm({ ...form, clearPassword: event.target.checked, password: '' })} />
              Remove the saved password
            </label>
          )}
        </div>
        <CommonInput label="Send emails from" type="email" placeholder="orders@tinqa.com" value={form.fromAddress} onChange={set('fromAddress')} error={errors.fromAddress} maxLength={255} />
        <CommonInput label="Sender name" placeholder="TinQa" value={form.fromName} onChange={set('fromName')} maxLength={100} />
        <CommonInput label="Replies go to (optional)" type="email" value={form.replyTo} onChange={set('replyTo')} error={errors.replyTo} maxLength={255} />
      </div>
      <p className="px-1 text-[11px] text-gray-500 dark:text-neutral-400">
        Gmail / Google Workspace: smtp.gmail.com, 587, STARTTLS, with an app password. Microsoft 365: smtp.office365.com, 587.
        Zoho: smtp.zoho.in, 465, SSL. The sender should be the mailbox you sign in with, or one it may send as. The password is
        stored encrypted and never shown again.
      </p>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="flex gap-2 md:items-end flex-1 md:max-w-md">
          <div className="flex-1">
            <CommonInput label="Send a test to" type="email" value={testTo} onChange={(event) => setTestTo(event.target.value)} maxLength={255} />
          </div>
          <button
            type="button"
            disabled={isTesting || !EMAIL_PATTERN.test(testTo.trim())}
            onClick={() => void onTest(testTo)}
            className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.primary}`}
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send test
          </button>
        </div>
        <button type="submit" disabled={isSaving} className={`inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.approve}`}>
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save email settings
        </button>
      </div>
      <p className="px-1 text-[11px] text-gray-500">The test uses the saved settings: save first.</p>
    </form>
  );
};

/**
 * Company profile › Email: the mail server and address customer emails are sent from (store sale receipts and login
 * details today; more emails later). Applies at once, without approval; Level 2 Super Admins only.
 */
export const EmailSettingsCard: React.FC = () => {
  const email = useEmailSettings();
  if (!email.allowed) return null;
  const settings = email.settings;

  return (
    <div role="region" aria-label="Email" className="apple-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#0071e3]" /> Email
          </h2>
          <p className="text-gray-500">
            The mail server and address customer emails come from. Changes apply at once. Emails use the live profile's brand
            name, logo, website and support details.
          </p>
        </div>
        {settings && (
          <span
            data-testid="email-status"
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${
              settings.ready
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            {settings.ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <TriangleAlert className="w-3.5 h-3.5" />}
            {settings.ready ? 'Sending' : 'Not sending'}
          </span>
        )}
      </div>

      {settings && (settings.pendingEmails > 0 || settings.failedEmails > 0) && (
        <p role="note" className={`p-2.5 rounded-xl ${settings.failedEmails > 0 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>
          {settings.pendingEmails} email{settings.pendingEmails === 1 ? '' : 's'} waiting to be sent
          {settings.failedEmails > 0 ? `, ${settings.failedEmails} failed after every retry` : ''}.
          {!settings.ready && ' They go out once email is switched on.'}
        </p>
      )}

      {!settings ? (
        email.isLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <p className="text-gray-500">Email settings could not be loaded.</p>
      ) : (
        <>
          <EmailSettingsForm
            key={settings.updatedAt ?? 'new'}
            settings={settings}
            isSaving={email.isSaving}
            isTesting={email.isTesting}
            onSave={email.update}
            onTest={email.sendTest}
          />
          {settings.updatedBy && <p className="text-gray-400">Last changed by {settings.updatedBy} on {formatServerTime(settings.updatedAt)}</p>}
        </>
      )}
    </div>
  );
};
