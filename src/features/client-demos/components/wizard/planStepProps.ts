import type { PlanErrors, PlanForm } from '../../utils/planForm';

/** What every wizard step gets: the form, its errors, and a setter that also clears the field's error. */
export interface PlanStepProps {
  form: PlanForm;
  errors: PlanErrors;
  set: <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => void;
}
