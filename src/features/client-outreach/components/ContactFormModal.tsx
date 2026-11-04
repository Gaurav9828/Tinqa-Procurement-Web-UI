import React, { useState } from 'react';
import { FileText, ImageIcon, Loader2, PhoneCall, Trash2, Upload, X } from 'lucide-react';
import { CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { ICON_DANGER, SOLID_TONE } from '../../../components/ui/actionTones';
import { useNotify } from '../../../hooks/useNotify';
import { useContactSave, useProofRemoval } from '../hooks/useOutreachActions';
import type { OutreachContact } from '../types/outreach.types';
import {
  CHANNEL_LABELS,
  INTEREST_LABELS,
  NEXT_ACTION_LABELS,
  PROOF_ACCEPT,
  PROOF_MAX_COUNT,
  RATING_LABELS,
  RESPONSE_MAX,
  SUMMARY_MAX,
  checkProofFiles,
  contactPayload,
  contactToForm,
  fileSize,
  isImageProof,
  newContactForm,
  options,
  validateContact,
  type ContactForm,
} from '../utils/outreach';

interface Props {
  businessId: number;
  businessName: string;
  /** Your own contact being edited; null logs a new one. */
  contact: OutreachContact | null;
  onClose: () => void;
  /** After a save or a removed proof: reload the business and its history. */
  onSaved: () => void;
}

/**
 * Log a call, email, WhatsApp message or visit with a business (OUTREACH_LOG), or edit your own. Proofs (images or
 * PDFs, ≤ 5 MB, ≤ 5 per contact) are optional and uploaded once the contact is saved.
 */
export const ContactFormModal: React.FC<Props> = ({ businessId, businessName, contact, onClose, onSaved }) => {
  const notify = useNotify();
  const { isSubmitting, save } = useContactSave();
  const proofRemoval = useProofRemoval(onSaved);
  const [form, setForm] = useState<ContactForm>(() => (contact ? contactToForm(contact) : newContactForm()));
  const [files, setFiles] = useState<File[]>([]);
  const [existing, setExisting] = useState(contact?.proofs ?? []);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateContact(form);
  const err = (field: keyof ContactForm) => (showErrors ? errors[field] : undefined);
  const set = (field: keyof ContactForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { accepted, problems } = checkProofFiles(Array.from(event.target.files ?? []), existing.length + files.length);
    problems.forEach((problem) => notify.error(problem));
    setFiles((prev) => [...prev, ...accepted]);
    event.target.value = '';
  };

  const removeExisting = async (proofId: number, fileName: string) => {
    if (!contact) return;
    if (await proofRemoval.remove(contact.id, proofId, fileName)) setExisting((prev) => prev.filter((proof) => proof.id !== proofId));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    if (await save(businessId, contact?.id ?? null, contactPayload(form), files)) {
      onSaved();
      onClose();
    }
  };

  const followUpNeeded = form.nextAction !== 'NONE';
  const proofCount = existing.length + files.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form role="dialog" aria-modal="true" aria-label={contact ? 'Edit contact' : 'Log contact'} onSubmit={submit} noValidate
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#0071e3]">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-black dark:text-white">{contact ? 'Edit contact' : 'Log contact'}</h3>
              <p className="text-xs text-gray-500">{businessName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CommonSelect label="Channel" required value={form.channel} onChange={set('channel')} options={options(CHANNEL_LABELS)} error={err('channel')} />
          <CommonInput label="Contacted at" type="datetime-local" required value={form.contactedAt} onChange={set('contactedAt')} error={err('contactedAt')} />
          <CommonInput label="Spoke with" maxLength={150} value={form.contactPerson} onChange={set('contactPerson')} />
          <CommonInput label="Their phone" type="tel" maxLength={20} value={form.contactPhone} onChange={set('contactPhone')} />
        </div>
        <CommonTextArea label="What was discussed" required rows={3} maxLength={SUMMARY_MAX} value={form.summary} onChange={set('summary')} error={err('summary')} />
        <CommonTextArea label="Their response" rows={2} maxLength={RESPONSE_MAX} value={form.response} onChange={set('response')} error={err('response')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CommonSelect label="How it went" required placeholder="Select a rating" value={form.rating} onChange={set('rating')}
            options={options(RATING_LABELS)} error={err('rating')} />
          <CommonSelect label="Interest" required placeholder="Select interest" value={form.interest} onChange={set('interest')}
            options={options(INTEREST_LABELS)} error={err('interest')} />
          <CommonSelect label="Next action" required value={form.nextAction} onChange={set('nextAction')} options={options(NEXT_ACTION_LABELS)} />
          {followUpNeeded && (
            <CommonInput label="Follow up on" type="datetime-local" required value={form.followUpAt} min={form.contactedAt || undefined}
              onChange={set('followUpAt')} error={err('followUpAt')} />
          )}
        </div>
        {followUpNeeded && (
          <p className="text-[11px] text-gray-500 dark:text-neutral-400">You get a reminder at 9:00 on the follow-up day.</p>
        )}

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-gray-600 dark:text-neutral-300">Proof (optional)</legend>
          <p className="text-[11px] text-gray-500 dark:text-neutral-400">
            Screenshots or photos (PNG, JPEG, WebP) or PDFs, up to 5 MB each and {PROOF_MAX_COUNT} per contact.
          </p>
          <ul className="space-y-1.5">
            {existing.map((proof) => (
              <li key={proof.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.04]">
                <span className="flex items-center gap-1.5 truncate">
                  {isImageProof(proof.contentType) ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  {proof.fileName} <span className="text-gray-400">· {fileSize(proof.size)}</span>
                </span>
                <button type="button" disabled={proofRemoval.isSubmitting} onClick={() => removeExisting(proof.id, proof.fileName)}
                  aria-label={`Remove ${proof.fileName}`} className={`p-1 rounded-lg cursor-pointer disabled:opacity-50 ${ICON_DANGER}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-blue-500/5">
                <span className="flex items-center gap-1.5 truncate">
                  <Upload className="w-3.5 h-3.5 text-[#0071e3]" /> {file.name} <span className="text-gray-400">· {fileSize(file.size)} · uploads on save</span>
                </span>
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`}
                  className={`p-1 rounded-lg cursor-pointer ${ICON_DANGER}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
          {proofCount < PROOF_MAX_COUNT && (
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0071e3]/40 bg-[#0071e3]/10 text-[#0071e3] text-xs font-semibold cursor-pointer hover:bg-[#0071e3]/20">
              <Upload className="w-3.5 h-3.5" /> Add proof
              <input type="file" accept={PROOF_ACCEPT} multiple className="sr-only" aria-label="Add proof" onChange={pick} />
            </label>
          )}
        </fieldset>

        <div className="flex justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer ${SOLID_TONE.primary}`}>
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {contact ? 'Save contact' : 'Log contact'}
          </button>
        </div>
      </form>
    </div>
  );
};
