import React, { useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Briefcase, Clock, IndianRupee, MapPin, Plus, Trash2, Users, X } from 'lucide-react';
import { ICON_DANGER } from '../../../components/ui/actionTones';
import { OPENING_LIMITS, addSkill, type OpeningForm } from '../utils/openingForm';
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, experienceText, formatDate, salaryText } from '../utils/careers';

const FieldError: React.FC<{ error?: string }> = ({ error }) =>
  error ? (
    <p className="text-[11px] text-red-500 flex items-center gap-1 px-1 font-medium">
      <AlertCircle className="w-3 h-3 shrink-0" /> {error}
    </p>
  ) : null;

const INPUT = 'flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-black/20 dark:border-white/20 bg-transparent focus:outline-none focus:border-[#0071e3]';

/**
 * A list of one-line entries (responsibilities, requirements…): type and press Enter or Add, reorder with the arrows,
 * remove with the bin. At most 25 entries of 300 characters.
 */
export const ListEditor: React.FC<{
  label: string;
  placeholder: string;
  items: string[];
  error?: string;
  onChange: (items: string[]) => void;
}> = ({ label, placeholder, items, error, onChange }) => {
  const [draft, setDraft] = useState('');
  const full = items.length >= OPENING_LIMITS.listItems;
  const add = () => {
    const text = draft.trim();
    if (!text || full) return;
    onChange([...items, text]);
    setDraft('');
  };
  const move = (index: number, by: number) => {
    const next = [...items];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-gray-600 dark:text-gray-300">
        {label} <span className="font-normal text-gray-400">({items.length}/{OPENING_LIMITS.listItems})</span>
      </legend>
      {items.length > 0 && (
        <ol className="space-y-1.5">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className="flex items-center gap-1.5">
              <input aria-label={`${label} ${index + 1}`} value={item} maxLength={OPENING_LIMITS.itemLength} className={INPUT}
                onChange={(e) => onChange(items.map((existing, i) => (i === index ? e.target.value : existing)))} />
              <button type="button" aria-label={`Move ${label} ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label={`Move ${label} ${index + 1} down`} disabled={index === items.length - 1} onClick={() => move(index, 1)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label={`Remove ${label} ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}
                className={`p-1.5 rounded-lg cursor-pointer ${ICON_DANGER}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-1.5">
        <input aria-label={`New ${label}`} value={draft} maxLength={OPENING_LIMITS.itemLength} placeholder={full ? 'The list is full' : placeholder}
          disabled={full} className={INPUT} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }} />
        <button type="button" onClick={add} disabled={full || !draft.trim()} aria-label={`Add ${label}`}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <FieldError error={error} />
    </fieldset>
  );
};

/** Skills as tags: type one and press Enter or comma. At most 30, of 40 characters. */
export const SkillTagInput: React.FC<{ skills: string[]; error?: string; onChange: (skills: string[]) => void }> = ({ skills, error, onChange }) => {
  const [draft, setDraft] = useState('');
  const full = skills.length >= OPENING_LIMITS.skills;
  const commit = () => {
    const next = addSkill(skills, draft);
    if (next !== skills) onChange(next);
    setDraft('');
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-gray-600 dark:text-gray-300">
        Skills <span className="font-normal text-gray-400">({skills.length}/{OPENING_LIMITS.skills}) · used by the résumé match</span>
      </legend>
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-black/20 dark:border-white/20">
        {skills.map((skill) => (
          <span key={skill} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 text-xs font-medium">
            {skill}
            <button type="button" aria-label={`Remove skill ${skill}`} onClick={() => onChange(skills.filter((s) => s !== skill))}
              className="p-0.5 rounded-full hover:bg-[#0071e3]/20 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input aria-label="Add a skill" value={draft} maxLength={OPENING_LIMITS.skillLength} disabled={full}
          placeholder={full ? 'At most 30 skills' : 'e.g. CNC, SolidWorks, GD&T — press Enter'}
          className="flex-1 min-w-[10rem] px-1 py-1 text-sm bg-transparent focus:outline-none"
          onChange={(e) => {
            if (!e.target.value.endsWith(',')) {
              setDraft(e.target.value);
              return;
            }
            const next = addSkill(skills, e.target.value.slice(0, -1));
            if (next !== skills) onChange(next);
            setDraft('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !draft && skills.length) onChange(skills.slice(0, -1));
          }}
          onBlur={() => draft.trim() && commit()} />
      </div>
      <FieldError error={error} />
    </fieldset>
  );
};

/** How the opening's card will look on the website's Careers tab, as it is typed. */
export const OpeningPreviewCard: React.FC<{ form: OpeningForm; jobCode: string | null }> = ({ form, jobCode }) => {
  const amount = (value: string) => (value.trim() && !Number.isNaN(Number(value)) ? Number(value) : null);
  const salary = form.salaryVisible ? salaryText(amount(form.salaryMin), amount(form.salaryMax), form.salaryPeriod) : null;
  const min = Number(form.experienceMinYears) || 0;
  const typedMax = Number(form.experienceMaxYears);
  const max = form.experienceMaxYears.trim() && !Number.isNaN(typedMax) ? typedMax : null;
  return (
    <aside aria-label="Preview on the website" className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Preview on the website</p>
      <article className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 space-y-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#0071e3] uppercase tracking-wide">{form.categoryName.trim() || 'Team'}</p>
            <h3 className="text-base font-bold text-black dark:text-white break-words">{form.title.trim() || 'Job title'}</h3>
            <p className="font-mono text-[10px] text-gray-400">{jobCode ?? 'Job ID assigned when saved'}</p>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-semibold">{EMPLOYMENT_TYPE_LABELS[form.employmentType]}</span>
        </div>
        <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
          <li className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {form.location.trim() || 'Location'} · {WORK_MODE_LABELS[form.workMode]}</li>
          <li className="flex items-center gap-1"><Clock className="w-3 h-3" /> {experienceText(min, max)}</li>
          <li className="flex items-center gap-1"><Users className="w-3 h-3" /> {form.positions || 1} {form.positions === '1' ? 'position' : 'positions'}</li>
          {salary && <li className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> {salary}</li>}
        </ul>
        <p className="text-xs text-gray-600 dark:text-gray-300 break-words">{form.summary.trim() || 'A one-line summary of the role appears here.'}</p>
        {form.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {form.skills.slice(0, 8).map((skill) => (
              <span key={skill} className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px]">{skill}</span>
            ))}
            {form.skills.length > 8 && <span className="text-[10px] text-gray-400">+{form.skills.length - 8} more</span>}
          </div>
        )}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-400">{form.applicationDeadline ? `Apply by ${formatDate(form.applicationDeadline)}` : 'No deadline'}</span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0071e3] text-white font-semibold"><Briefcase className="w-3 h-3" /> Apply</span>
        </div>
      </article>
      {!form.salaryVisible && <p className="text-[11px] text-gray-400">The salary stays hidden on the website.</p>}
    </aside>
  );
};
