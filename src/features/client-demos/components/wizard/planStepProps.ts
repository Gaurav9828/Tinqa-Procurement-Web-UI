import type { ClientForm, PlanBill, PlanErrors, PlanForm, PlanSlot } from '../../utils/planForm';

/** What every wizard step gets: the form, its errors, and a setter that also clears the field's error. */
export interface PlanStepProps {
  form: PlanForm;
  errors: PlanErrors;
  set: <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => void;
}

/** Changes to the clients visited. */
export interface ClientActions {
  onAddClient: () => void;
  onChangeClient: (key: number, patch: Partial<ClientForm>) => void;
  onRemoveClient: (key: number) => void;
}

/** Changes to the day-by-day journeys, stays and meals. */
export interface BillActions {
  onAddBill: (slot: PlanSlot, day: number) => void;
  /** Moves a day's bill from one place on the day (0 the first) to another. */
  onMoveBill: (day: number, from: number, to: number) => void;
  onChangeBill: (key: number, patch: Partial<PlanBill>) => void;
  onRemoveBill: (key: number) => void;
}
