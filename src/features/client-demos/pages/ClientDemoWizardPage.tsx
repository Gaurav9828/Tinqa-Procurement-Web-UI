import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import type { DemoDetail } from '../types/clientDemo.types';
import { useDemo, useDemoStaffOptions } from '../hooks/useClientDemoData';
import { useDemoWizardSave } from '../hooks/useDemoWizardSave';
import { CLIENT_DEMOS_PATH, MAX_DAYS, demoPath } from '../utils/clientDemo';
import {
  EMPTY_PLAN,
  PLAN_STEPS,
  newStay,
  planFormOf,
  toDemoPayload,
  toStayBill,
  validatePlanStep,
  type PlanErrors,
  type PlanForm,
  type StayForm,
} from '../utils/planForm';
import { WizardSteps } from '../components/wizard/WizardSteps';
import { ClientStep } from '../components/wizard/ClientStep';
import { VisitStep } from '../components/wizard/VisitStep';
import { QuotationStep } from '../components/wizard/QuotationStep';
import { ReviewStep } from '../components/wizard/ReviewStep';

/** The first step (from `from`, up to `to`) with problems, and its problems; null when they are all complete. */
const firstInvalid = (from: number, to: number, form: PlanForm, stays: StayForm[], editing: DemoDetail | null) => {
  for (let index = from; index < to; index++) {
    const errors = validatePlanStep(index, form, stays, editing);
    if (Object.keys(errors).length) return { index, errors };
  }
  return null;
};

/**
 * The wizard itself: four steps (client, visit & staff, quotation, review), each checked before moving on. Saves a
 * new demo with its planned stays as a draft or straight to approval; for an existing demo, saves its changed plan.
 */
const DemoWizard: React.FC<{ editing: DemoDetail | null }> = ({ editing }) => {
  const navigate = useNavigate();
  const staffOptions = useDemoStaffOptions();
  const { save, isSaving } = useDemoWizardSave();
  const isNew = editing === null;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PlanForm>(() => (editing ? planFormOf(editing) : EMPTY_PLAN));
  const [stays, setStays] = useState<StayForm[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [errors, setErrors] = useState<PlanErrors>({});

  const knownStaff = useMemo(() => editing?.staff ?? [], [editing]);
  const staffById = useMemo(() => new Map([...knownStaff, ...(staffOptions.data ?? [])].map((member) => [member.employeeId, member])),
    [knownStaff, staffOptions.data]);
  const days = Math.min(MAX_DAYS, Math.max(1, Number(form.numberOfDays) || 1));
  const canSend = isNew || editing.status === 'DRAFT';

  const set = <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };
  const stepProps = { form, errors, set };

  // Forward only through complete steps; back any time
  const goTo = (target: number) => {
    const invalid = firstInvalid(step, target, form, stays, editing);
    setErrors(invalid?.errors ?? {});
    setStep(invalid?.index ?? target);
  };

  const addStay = () => {
    const used = new Set(stays.map((stay) => Number(stay.dayNumber)));
    const free = Array.from({ length: days }, (_, index) => index + 1).find((day) => !used.has(day)) ?? 1;
    setStays((prev) => [...prev, newStay(nextKey, free)]);
    setNextKey((key) => key + 1);
  };
  const changeStay = (key: number, patch: Partial<StayForm>) => {
    setStays((prev) => prev.map((stay) => (stay.key === key ? { ...stay, ...patch } : stay)));
    setErrors((prev) => ({ ...prev, [`stay-${key}`]: '' }));
  };

  const submit = async (sendForApproval: boolean) => {
    if (isSaving) return;
    const invalid = firstInvalid(0, PLAN_STEPS.length, form, stays, editing);
    if (invalid) {
      setErrors(invalid.errors);
      setStep(invalid.index);
      return;
    }
    const savedId = await save(editing?.id ?? null, toDemoPayload(form, editing), isNew ? stays.map(toStayBill) : [], sendForApproval && canSend);
    if (savedId !== null) navigate(demoPath(savedId));
  };

  const steps = [
    <ClientStep key="client" {...stepProps} />,
    <VisitStep key="visit" {...stepProps} isNew={isNew} staffOptions={staffOptions.data ?? []} staffLoading={staffOptions.isLoading} knownStaff={knownStaff} />,
    <QuotationStep key="quotation" {...stepProps} editing={editing} isNew={isNew} days={days} stays={stays} onAddStay={addStay}
      onChangeStay={changeStay} onRemoveStay={(key) => setStays((prev) => prev.filter((stay) => stay.key !== key))} />,
    <ReviewStep key="review" {...stepProps} editing={editing} isNew={isNew} days={days} stays={stays} staffById={staffById} />,
  ];

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div>
        <Link to={editing ? demoPath(editing.id) : CLIENT_DEMOS_PATH} className="inline-flex items-center gap-1 text-xs text-[#0071e3] font-semibold hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> {editing ? `Back to ${editing.reference}` : 'Back to client demos'}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white mt-2">
          {editing ? `Change ${editing.reference}` : 'Schedule a client demo or meeting'}
        </h1>
        <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
          Plan the visit and its cost. Someone else approves the quotation before the visit; bills are recorded while it runs.
        </p>
      </div>

      <WizardSteps step={step} onGo={goTo} />
      <section className="apple-card p-6 space-y-5 text-xs">{steps[step]}</section>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => goTo(Math.max(0, step - 1))} disabled={step === 0 || isSaving}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer disabled:opacity-40">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {step < PLAN_STEPS.length - 1 ? (
          <button type="button" onClick={() => goTo(step + 1)} className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer ${SOLID_TONE.primary}`}>
            Next: {PLAN_STEPS[step + 1].label} <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => submit(false)} disabled={isSaving}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 ${canSend ? SOLID_TONE.primary : SOLID_TONE.approve}`}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isNew ? 'Save as draft' : 'Save changes'}
            </button>
            {canSend && (
              <button type="button" onClick={() => submit(true)} disabled={isSaving}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE.approve}`}>
                <Send className="w-4 h-4" /> Save & send for approval
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Schedules a client demo or meeting step by step (/client-demos/new), or changes the plan of one (/client-demos/:id/edit:
 * the wizard opens once the demo is loaded, filled in with it).
 */
export const ClientDemoWizardPage: React.FC = () => {
  const { id: idParam } = useParams();
  const editId = idParam ? Number(idParam) : null;
  const existing = useDemo('manager', editId);

  if (editId === null) return <DemoWizard editing={null} />;
  if (!existing.data) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-sm text-gray-500 flex items-center gap-2">
        {existing.isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading the demo…</> : 'The demo could not be loaded.'}
      </div>
    );
  }
  return <DemoWizard key={existing.data.id} editing={existing.data} />;
};
