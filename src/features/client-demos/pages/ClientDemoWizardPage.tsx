import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import type { DemoDetail } from '../types/clientDemo.types';
import { useDemo, useDemoStaffOptions } from '../hooks/useClientDemoData';
import { useDemoWizardSave } from '../hooks/useDemoWizardSave';
import { useActiveProductOptions } from '../../../hooks/useLookupOptions';
import { CLIENT_DEMOS_PATH, MAX_DAYS, dayDate, daysBetween, demoPath } from '../utils/clientDemo';
import {
  EMPTY_PLAN,
  OTHER_HOTEL,
  PLAN_STEPS,
  clientSource,
  moveBill,
  newBill,
  nextClient,
  nextKey,
  orderedBills,
  planFormOf,
  previousJourney,
  shiftBillDates,
  stayClients,
  stayVendor,
  toDemoPayload,
  validatePlanStep,
  withBill,
  type ClientForm,
  type PlanBill,
  type PlanErrors,
  type PlanForm,
  type PlanSlot,
} from '../utils/planForm';
import { WizardSteps } from '../components/wizard/WizardSteps';
import { ClientsStep } from '../components/wizard/ClientsStep';
import { VisitStep } from '../components/wizard/VisitStep';
import { QuotationStep } from '../components/wizard/QuotationStep';
import { ReviewStep } from '../components/wizard/ReviewStep';

/** The first step (from `from`, up to `to`) with problems, and its problems; null when they are all complete. */
const firstInvalid = (from: number, to: number, form: PlanForm, editing: DemoDetail | null) => {
  for (let index = from; index < to; index++) {
    const errors = validatePlanStep(index, form, editing);
    if (Object.keys(errors).length) return { index, errors };
  }
  return null;
};

// Errors whose key starts with `prefix` are cleared once their part of the form changes
const withoutErrors = (errors: PlanErrors, prefix: string): PlanErrors =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => !key.startsWith(prefix)));

/**
 * The wizard itself: four steps (clients, visit & staff, quotation, review), each checked before moving on. Saves the
 * demo with its day-by-day travel, stays and meals as a draft or straight to approval; for an existing demo, saves its
 * changed plan the same way.
 */
const DemoWizard: React.FC<{ editing: DemoDetail | null }> = ({ editing }) => {
  const navigate = useNavigate();
  const staffOptions = useDemoStaffOptions();
  const productOptions = useActiveProductOptions();
  const { save, isSaving } = useDemoWizardSave();
  const isNew = editing === null;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PlanForm>(() => (editing ? planFormOf(editing) : EMPTY_PLAN));
  const [errors, setErrors] = useState<PlanErrors>({});

  const knownStaff = useMemo(() => editing?.staff ?? [], [editing]);
  const staffById = useMemo(() => new Map([...knownStaff, ...(staffOptions.data ?? [])].map((member) => [member.employeeId, member])),
    [knownStaff, staffOptions.data]);
  const days = Math.min(MAX_DAYS, Math.max(1, Number(form.numberOfDays) || 1));
  const canSend = isNew || editing.status === 'DRAFT';

  const set = <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Dated stays and journeys move with the trip
      if (key === 'startDate' && prev.startDate && value) next.bills = shiftBillDates(prev.bills, daysBetween(prev.startDate, value as string));
      return next;
    });
    setErrors((prev) => ({ ...(key === 'products' ? withoutErrors(prev, 'product-') : prev), [key]: '' }));
  };
  const stepProps = { form, errors, set };

  // Forward only through complete steps; back any time
  const goTo = (target: number) => {
    const invalid = firstInvalid(step, target, form, editing);
    setErrors(invalid?.errors ?? {});
    setStep(invalid?.index ?? target);
  };

  const clientActions = {
    onAddClient: () => {
      // The new client starts when the day's last visit ends
      setForm((prev) => ({ ...prev, clients: [...prev.clients, nextClient(nextKey(prev), prev)] }));
      setErrors((prev) => ({ ...prev, clients: '' }));
    },
    onChangeClient: (key: number, patch: Partial<ClientForm>) => {
      setForm((prev) => ({ ...prev, clients: prev.clients.map((client) => (client.key === key ? { ...client, ...patch } : client)) }));
      // A changed time may end a clash with another client too
      setErrors((prev) => withoutErrors(Object.fromEntries(Object.entries(prev).filter(([field]) => !field.endsWith('-slot'))), `client-${key}-`));
    },
    onRemoveClient: (key: number) => {
      setForm((prev) => ({
        ...prev,
        clients: prev.clients.filter((client) => client.key !== key),
        // Stays at this client keep its details, typed in
        bills: prev.bills.map((bill) => (bill.source === clientSource(key) ? { ...bill, ...stayVendor(bill, prev.clients), source: OTHER_HOTEL } : bill)),
      }));
      setErrors((prev) => withoutErrors(prev, `client-${key}-`));
    },
  };

  const billActions = {
    onAddBill: (slot: PlanSlot, day: number) => setForm((prev) => {
      // A night is at the hotel client visited that day, if there is one
      const hotel = slot === 'STAY' ? stayClients(prev).find((client) => Number(client.dayNumber) === day) ?? stayClients(prev)[0] : undefined;
      // A journey departs on the date the one before it arrives, when that's later than its day (after an overnight one)
      const date = prev.startDate ? dayDate(prev.startDate, day) : '';
      const arrived = slot === 'TRAVEL' ? previousJourney(prev.bills, day)?.endDate ?? '' : '';
      const bill = newBill(nextKey(prev), slot, day, date && arrived > date ? arrived : date, hotel ? clientSource(hotel.key) : OTHER_HOTEL);
      return { ...prev, bills: withBill(prev.bills, hotel ? { ...bill, ...stayVendor(bill, prev.clients) } : bill) };
    }),
    // A day's journeys then run in their new order, each departing after the one above arrives
    onMoveBill: (day: number, from: number, to: number) => setForm((prev) => ({ ...prev, bills: moveBill(prev.bills, day, from, to) })),
    onChangeBill: (key: number, patch: Partial<PlanBill>) => {
      setForm((prev) => ({ ...prev, bills: prev.bills.map((bill) => (bill.key === key ? { ...bill, ...patch } : bill)) }));
      setErrors((prev) => ({ ...prev, [`bill-${key}`]: '' }));
    },
    onRemoveBill: (key: number) => {
      setForm((prev) => ({ ...prev, bills: prev.bills.filter((bill) => bill.key !== key) }));
      setErrors((prev) => ({ ...prev, [`bill-${key}`]: '' }));
    },
  };

  const submit = async (sendForApproval: boolean) => {
    if (isSaving) return;
    const invalid = firstInvalid(0, PLAN_STEPS.length, form, editing);
    if (invalid) {
      setErrors(invalid.errors);
      setStep(invalid.index);
      return;
    }
    // The invoices follow the planned bills in the order they are sent
    const files = orderedBills(form.bills).map((bill) => bill.file);
    const knownIds = new Set(editing?.expenses.map((expense) => expense.id) ?? []);
    const savedId = await save(editing?.id ?? null, toDemoPayload(form, editing), files, knownIds, sendForApproval && canSend);
    if (savedId !== null) navigate(demoPath(savedId));
  };

  const steps = [
    <ClientsStep key="clients" {...stepProps} {...clientActions} isNew={isNew} days={days} />,
    <VisitStep key="visit" {...stepProps} staffOptions={staffOptions.data ?? []} staffLoading={staffOptions.isLoading} knownStaff={knownStaff}
      productOptions={productOptions.options} productsLoading={productOptions.isLoading}
      unitWindow={{ startDate: form.startDate, days, demoId: editing?.id ?? null }} />,
    <QuotationStep key="quotation" {...stepProps} {...billActions} editing={editing} days={days} />,
    <ReviewStep key="review" {...stepProps} editing={editing} days={days} staffById={staffById} />,
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
          Plan the clients to visit, the products to show and the cost, day by day. Someone else approves the quotation before the trip; invoices are attached while it runs.
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
