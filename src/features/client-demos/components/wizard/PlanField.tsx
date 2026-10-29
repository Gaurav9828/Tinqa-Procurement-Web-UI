import React from 'react';
import { CommonInput } from '../../../../components/ui/FormInputs';
import type { PlanForm } from '../../utils/planForm';
import type { PlanStepProps } from './planStepProps';

type InputProps = Omit<React.ComponentProps<typeof CommonInput>, 'label' | 'value' | 'onChange' | 'error' | 'name' | 'form'>;

/** The plan's fields that hold text. */
type TextField = { [K in keyof PlanForm]: PlanForm[K] extends string ? K : never }[keyof PlanForm];

/** A text input bound to one field of the plan. */
export const PlanField: React.FC<{ plan: PlanStepProps; name: TextField; label: string } & InputProps> = ({
  plan,
  name,
  label,
  ...input
}) => (
  <CommonInput label={label} value={plan.form[name]} error={plan.errors[name]} onChange={(e) => plan.set(name, e.target.value as PlanForm[typeof name])} {...input} />
);
