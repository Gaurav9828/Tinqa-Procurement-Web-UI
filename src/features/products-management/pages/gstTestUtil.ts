import { openFormTab } from './barcodeTestUtil';
import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

/** Fills the product form's required GST fields (18 %, HSN 9405). */
export const fillGst = async (user: ReturnType<typeof userEvent.setup>) => {
  await openFormTab(user, 'Price & GST');
  await user.selectOptions(screen.getByLabelText('GST rate *'), '18');
  await user.type(screen.getByLabelText('HSN / SAC code *'), '9405');
};
