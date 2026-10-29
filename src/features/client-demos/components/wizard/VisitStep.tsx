import React from 'react';
import { CommonTextArea } from '../../../../components/ui/FormInputs';
import { CHOICE_TONE } from '../../../../components/ui/actionTones';
import type { ProductResponse } from '../../../products-management/types/product.types';
import type { DemoType, StaffMember } from '../../types/clientDemo.types';
import { DEMO_TYPE_LABELS } from '../../utils/clientDemo';
import { ProductPicker, type UnitWindow } from '../ProductPicker';
import { StaffPicker } from '../StaffPicker';
import type { PlanStepProps } from './planStepProps';

const TYPE_HINTS: Record<DemoType, string> = {
  APPOINTMENT: 'A demo the client booked',
  PROMOTION: 'Promoting products at their place',
};

/** Step 2: appointment or promotion, the agenda, the products shown (each unit by barcode) and the attending staff. */
export const VisitStep: React.FC<PlanStepProps & {
  staffOptions: StaffMember[];
  staffLoading: boolean;
  knownStaff: StaffMember[];
  productOptions: ProductResponse[];
  productsLoading: boolean;
  unitWindow: UnitWindow;
}> = ({ staffOptions, staffLoading, knownStaff, productOptions, productsLoading, unitWindow, ...props }) => {
  const { form, errors, set } = props;
  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Type <span className="text-rose-500">*</span></p>
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-2 max-w-md">
          {(Object.keys(DEMO_TYPE_LABELS) as DemoType[]).map((type) => (
            <button key={type} type="button" role="radio" aria-checked={form.demoType === type} onClick={() => set('demoType', type)}
              className={`px-3 py-2.5 rounded-xl border font-semibold cursor-pointer ${form.demoType === type ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
              {DEMO_TYPE_LABELS[type]}
              <span className="block text-[10px] font-normal opacity-80">{TYPE_HINTS[type]}</span>
            </button>
          ))}
        </div>
        {errors.demoType && <p className="text-rose-500">{errors.demoType}</p>}
      </div>
      <CommonTextArea label="Purpose / agenda" value={form.purpose} maxLength={1000} rows={2}
        placeholder="What will be shown or discussed" onChange={(e) => set('purpose', e.target.value)} />
      <ProductPicker options={productOptions} isLoading={productsLoading} selected={form.products} errors={errors}
        unitWindow={unitWindow} onChange={(products) => set('products', products)} />
      <StaffPicker options={staffOptions} isLoading={staffLoading} known={knownStaff}
        selected={form.staffEmployeeIds} error={errors.staffEmployeeIds} onChange={(ids) => set('staffEmployeeIds', ids)} />
    </>
  );
};
