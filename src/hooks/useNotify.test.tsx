import React from 'react';
import { describe, it, expect } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer, { MAX_VISIBLE_ALERTS } from '../store/alertSlice';
import { GlobalAlertContainer } from '../components/ui/GlobalAlertContainer';
import { useNotify, type Notify } from './useNotify';

const axiosError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message), String(status), response.config, {}, response);
};

let notify: Notify;
const Capture: React.FC<{ onReady: (n: Notify) => void }> = ({ onReady }) => {
  onReady(useNotify());
  return null;
};
const setup = () => {
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <Capture onReady={(n) => (notify = n)} />
      <GlobalAlertContainer />
    </Provider>
  );
};
const alerts = () => within(screen.getByRole('list', { name: 'Notifications' })).getAllByRole('listitem');

describe('notify.error + alert stack', () => {
  it('shows each field error in its own alert section, in server order', () => {
    setup();
    act(() =>
      notify.error(
        axiosError(400, {
          success: false,
          message: 'One or more request fields are invalid.',
          errorCode: 'VALIDATION_FAILED',
          errors: [
            { field: 'middleName', message: 'Middle name can only contain letters, spaces, dots, apostrophes and hyphens' },
            { field: 'alternatePhone', message: 'Alternate phone number must be a valid mobile number' },
          ],
        })
      )
    );
    expect(alerts()).toHaveLength(2);
    expect(alerts()[0]).toHaveTextContent('Middle name can only contain letters');
    expect(alerts()[1]).toHaveTextContent('Alternate phone number must be a valid mobile number');
    expect(screen.queryByText('One or more request fields are invalid.')).not.toBeInTheDocument();
  });

  it('shows the message when there are no field errors', () => {
    setup();
    act(() => notify.error(axiosError(404, { success: false, message: 'Employee not found', errors: [] })));
    expect(alerts()).toHaveLength(1);
    expect(alerts()[0]).toHaveTextContent('Employee not found');
  });

  it('each alert closes on its own', async () => {
    setup();
    act(() => notify.error({ success: false, message: 'x', errors: [{ field: 'a', message: 'First problem' }, { field: 'b', message: 'Second problem' }] }));
    await userEvent.setup().click(within(alerts()[0]).getByRole('button', { name: 'Dismiss alert' }));
    expect(alerts()).toHaveLength(1);
    expect(alerts()[0]).toHaveTextContent('Second problem');
  });

  it('keeps newer alerts and caps how many are shown', () => {
    setup();
    act(() => notify.error({ success: false, message: 'old', errors: [] }));
    act(() => notify.success('Saved.'));
    expect(alerts()[0]).toHaveTextContent('Saved.'); // newest on top
    act(() => notify.error({ success: false, message: '', errors: Array.from({ length: 10 }, (_, i) => ({ field: `f${i}`, message: `Problem ${i}` })) }));
    expect(alerts()).toHaveLength(MAX_VISIBLE_ALERTS);
  });
});
