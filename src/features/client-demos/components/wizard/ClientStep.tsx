import React from 'react';
import { CHOICE_TONE } from '../../../../components/ui/actionTones';
import type { ClientCategory } from '../../types/clientDemo.types';
import { CLIENT_CATEGORY_LABELS } from '../../utils/clientDemo';
import { PlanField } from './PlanField';
import type { PlanStepProps } from './planStepProps';

/** Step 1: who the client is, how to reach them and where they are. */
export const ClientStep: React.FC<PlanStepProps> = (props) => {
  const { form, errors, set } = props;
  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Kind of client <span className="text-rose-500">*</span></p>
        <div role="radiogroup" aria-label="Kind of client" className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(CLIENT_CATEGORY_LABELS) as ClientCategory[]).map((category) => (
            <button key={category} type="button" role="radio" aria-checked={form.clientCategory === category} onClick={() => set('clientCategory', category)}
              className={`px-3 py-2.5 rounded-xl border font-semibold cursor-pointer ${form.clientCategory === category ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
              {CLIENT_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
        {errors.clientCategory && <p className="text-rose-500">{errors.clientCategory}</p>}
      </div>
      {form.clientCategory === 'OTHER' && (
        <PlanField plan={props} name="clientCategoryOther" label="What kind of place" required maxLength={100} placeholder="e.g. School, Gym, Showroom" />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlanField plan={props} name="clientName" label="Client name" required maxLength={150} placeholder="e.g. Hotel Sunrise" />
        <PlanField plan={props} name="contactPerson" label="Contact person" maxLength={100} />
        <PlanField plan={props} name="contactPhone" label="Contact phone" required type="tel" maxLength={16} placeholder="+919876543210" />
        <PlanField plan={props} name="contactEmail" label="Contact email" type="email" maxLength={255} />
        <div className="sm:col-span-2"><PlanField plan={props} name="addressLine" label="Address" required maxLength={300} /></div>
        <PlanField plan={props} name="city" label="City" required maxLength={100} />
        <PlanField plan={props} name="state" label="State" maxLength={100} />
        <PlanField plan={props} name="pincode" label="PIN code" inputMode="numeric" maxLength={6} />
        <PlanField plan={props} name="mapLink" label="Location (Google Maps link)" type="url" maxLength={500} placeholder="https://maps.app.goo.gl/…" />
      </div>
    </>
  );
};
