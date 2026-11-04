import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { CommonCheckbox, CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useApiAction } from '../../../hooks/useApiAction';
import { useCareerCategories, useOpening } from '../hooks/useCareersData';
import { useOpeningActions } from '../hooks/useCareerActions';
import type { AdminOpening, EmploymentType, SalaryPeriod, WorkMode } from '../types/careers.types';
import { CAREERS_PATH, EMPLOYMENT_TYPE_LABELS, SALARY_PERIOD_LABELS, WORK_MODE_LABELS, openingPath, todayIso } from '../utils/careers';
import {
  OPENING_LIMITS,
  OPENING_LISTS,
  emptyOpeningForm,
  openingToForm,
  toOpeningRequest,
  validateOpening,
  type OpeningErrors,
  type OpeningForm,
} from '../utils/openingForm';
import { ListEditor, OpeningPreviewCard, SkillTagInput } from '../components/OpeningFormParts';

const options = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="apple-card p-5 space-y-4">
    <h2 className="text-sm font-semibold">{title}</h2>
    {children}
  </section>
);

/** The form itself, for a new opening (`opening` null) or an existing one. */
const OpeningFormView: React.FC<{ opening: AdminOpening | null }> = ({ opening }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState<OpeningForm>(() => (opening ? openingToForm(opening) : emptyOpeningForm()));
  const [errors, setErrors] = useState<OpeningErrors>({});
  const { categories } = useCareerCategories();
  const actions = useOpeningActions(useCallback((saved: AdminOpening) => navigate(openingPath(saved.id)), [navigate]));
  const { reject } = useApiAction();

  const set = <K extends keyof OpeningForm>(field: K, value: OpeningForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
  const text = (field: keyof OpeningForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(field, e.target.value as never);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateOpening(form, { today: todayIso() });
    setErrors(found);
    if (Object.keys(found).length) {
      reject('Some fields need attention: see the messages under them.');
      return;
    }
    await actions.save(opening?.id ?? null, toOpeningRequest(form, opening?.version));
  };

  const backTo = opening ? openingPath(opening.id) : CAREERS_PATH;

  return (
    <form onSubmit={submit} noValidate className="space-y-5 p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={backTo} className="inline-flex items-center gap-1 text-xs text-[#0071e3] font-semibold hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> {opening ? 'Back to the opening' : 'Back to openings'}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white mt-2">{opening ? `Edit ${opening.title}` : 'New opening'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Job ID: <span className="font-mono">{opening?.jobCode ?? 'assigned automatically when saved'}</span>
            {opening ? '' : ' · saved as a draft; publish it from the opening when it is ready.'}
          </p>
        </div>
        <button type="submit" disabled={actions.isSubmitting}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE.approve}`}>
          {actions.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {opening ? 'Save changes' : 'Save draft'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-5 items-start">
        <div className="space-y-5">
          <Section title="The role">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CommonInput label="Title" required value={form.title} maxLength={OPENING_LIMITS.title} error={errors.title} onChange={text('title')}
                placeholder="e.g. CNC Machine Operator" />
              <div>
                <CommonInput label="Team (category)" required list="career-categories" value={form.categoryName} maxLength={OPENING_LIMITS.categoryName}
                  error={errors.categoryName} onChange={text('categoryName')} placeholder="Pick one or type a new team" />
                <datalist id="career-categories">
                  {categories.map((category) => <option key={category.id} value={category.name} />)}
                </datalist>
              </div>
              <CommonInput label="Location" required value={form.location} maxLength={OPENING_LIMITS.location} error={errors.location} onChange={text('location')}
                placeholder="e.g. Jaipur, Rajasthan" />
              <div className="grid grid-cols-2 gap-3">
                <CommonSelect label="Work mode" required value={form.workMode} options={options(WORK_MODE_LABELS)} onChange={(e) => set('workMode', e.target.value as WorkMode)} />
                <CommonSelect label="Employment type" required value={form.employmentType} options={options(EMPLOYMENT_TYPE_LABELS)}
                  onChange={(e) => set('employmentType', e.target.value as EmploymentType)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CommonInput label="Experience from (yrs)" required inputMode="decimal" value={form.experienceMinYears} error={errors.experienceMinYears}
                  onChange={text('experienceMinYears')} />
                <CommonInput label="Experience to (yrs)" inputMode="decimal" value={form.experienceMaxYears} error={errors.experienceMaxYears}
                  onChange={text('experienceMaxYears')} placeholder="No upper limit" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CommonInput label="Positions" required inputMode="numeric" value={form.positions} error={errors.positions} onChange={text('positions')} />
                <CommonInput label="Apply by" type="date" value={form.applicationDeadline} error={errors.applicationDeadline} onChange={text('applicationDeadline')} />
              </div>
            </div>
          </Section>

          <Section title="Salary">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CommonInput label="From (₹)" inputMode="numeric" value={form.salaryMin} error={errors.salaryMin} onChange={text('salaryMin')} placeholder="e.g. 300000" />
              <CommonInput label="Up to (₹)" inputMode="numeric" value={form.salaryMax} error={errors.salaryMax} onChange={text('salaryMax')} placeholder="e.g. 450000" />
              <CommonSelect label="Period" value={form.salaryPeriod} options={options(SALARY_PERIOD_LABELS)} onChange={(e) => set('salaryPeriod', e.target.value as SalaryPeriod)} />
            </div>
            <CommonCheckbox label="Show the salary on the website" checked={form.salaryVisible} onChange={(checked) => set('salaryVisible', checked)} />
          </Section>

          <Section title="Description">
            <CommonTextArea label="Summary" required rows={2} value={form.summary} maxLength={OPENING_LIMITS.summary} error={errors.summary} onChange={text('summary')}
              placeholder="One or two lines shown on the card" />
            <CommonTextArea label="Full description" required rows={8} value={form.description} maxLength={OPENING_LIMITS.description}
              error={errors.description} onChange={text('description')} />
            <CommonInput label="Education" value={form.education} maxLength={OPENING_LIMITS.education} error={errors.education} onChange={text('education')}
              placeholder="e.g. ITI or Diploma in Mechanical Engineering" />
            <SkillTagInput skills={form.skills} error={errors.skills} onChange={(skills) => set('skills', skills)} />
          </Section>

          <Section title="Lists">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {OPENING_LISTS.map(({ key, label, placeholder }) => (
                <ListEditor key={key} label={label} placeholder={placeholder} items={form[key]} error={errors[key]} onChange={(items) => set(key, items)} />
              ))}
            </div>
          </Section>
        </div>
        <div className="lg:sticky lg:top-6">
          <OpeningPreviewCard form={form} jobCode={opening?.jobCode ?? null} />
        </div>
      </div>
    </form>
  );
};

/** /careers/openings/new and /careers/openings/:id/edit (CAREER_OPENING_MANAGE). */
export const OpeningEditorPage: React.FC = () => {
  const { id: idParam } = useParams();
  const id = idParam ? Number(idParam) : null;
  const valid = id === null || Number.isFinite(id);
  const { data: opening, isLoading } = useOpening(valid ? id : null);

  if (id !== null && !opening) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-sm text-gray-500 flex items-center gap-2">
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading the opening…</> : 'This opening could not be loaded.'}
        <Link to={CAREERS_PATH} className="text-[#0071e3] font-semibold hover:underline ml-2">Back</Link>
      </div>
    );
  }
  return <OpeningFormView key={opening?.id ?? 'new'} opening={opening} />;
};
