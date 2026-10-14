import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { METHOD_NOT_ALLOWED_MESSAGE, getApiErrorCode, getApiErrorMessage, getApiErrorMessages, getApiFieldErrors, parseApiError } from './apiError';
import { getApiErrorKind, isRetryableErrorKind } from './apiErrorKind';

const axiosError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message), String(status), response.config, {}, response);
};

describe('API error helpers', () => {
  it('maps 405 METHOD_NOT_ALLOWED to a friendly, non-retryable error', () => {
    const err = axiosError(405, { message: "Request method 'GET' is not supported", errorCode: 'METHOD_NOT_ALLOWED' });
    expect(getApiErrorMessage(err)).toBe(METHOD_NOT_ALLOWED_MESSAGE);
    expect(getApiErrorCode(err)).toBe('METHOD_NOT_ALLOWED');
    expect(getApiErrorKind(err)).toBe('unsupported');
    expect(isRetryableErrorKind('unsupported')).toBe(false);
  });

  it.each([
    [400, 'validation'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [429, 'rateLimited'],
    [500, 'server'],
  ])('classifies %i as %s and keeps the server message', (status, kind) => {
    const err = axiosError(status, { message: 'Server says hi' });
    expect(getApiErrorKind(err)).toBe(kind);
    expect(getApiErrorMessage(err)).toBe('Server says hi');
  });
});


// The exact envelope every backend returns on failure.
const EMPLOYEE_400 = {
  success: false,
  message: 'One or more request fields are invalid.',
  errorCode: 'VALIDATION_FAILED',
  errors: [
    { field: 'middleName', message: 'Middle name can only contain letters, spaces, dots, apostrophes and hyphens' },
    {
      field: 'alternatePhone',
      message:
        'Alternate phone number must be a valid mobile number: 10 digits starting with 6-9 (optionally +91 or 0 in front), or +<country code><number>',
    },
  ],
  timestamp: '2026-10-13T04:29:10.374890Z',
  path: '/api/v1/admin/employees',
};

describe('central API error handling', () => {
  it('shows every field error (and not the summary) when errors[] is present', () => {
    const parsed = parseApiError(axiosError(400, EMPLOYEE_400));
    expect(parsed.message).toBe('One or more request fields are invalid.');
    expect(parsed.errorCode).toBe('VALIDATION_FAILED');
    expect(parsed.messages).toEqual([EMPLOYEE_400.errors[0].message, EMPLOYEE_400.errors[1].message]);
    expect(getApiFieldErrors(axiosError(400, EMPLOYEE_400))).toEqual({
      middleName: EMPLOYEE_400.errors[0].message,
      alternatePhone: EMPLOYEE_400.errors[1].message,
    });
  });

  it('shows only the message when there are no field errors', () => {
    expect(getApiErrorMessages(axiosError(409, { success: false, message: 'Order ORD-1 already has stock entry STK-9.', errors: [] }))).toEqual([
      'Order ORD-1 already has stock entry STK-9.',
    ]);
  });

  it('reads a `success: false` response body the same way as a thrown error', () => {
    expect(getApiErrorMessages(EMPLOYEE_400)).toHaveLength(2);
    expect(getApiErrorMessages({ success: false, message: 'Not allowed' })).toEqual(['Not allowed']);
  });

  it('supports the older `data: [messages]` form, drops blanks and duplicates, and falls back', () => {
    expect(getApiErrorMessages(axiosError(400, { message: 'Invalid', data: ['SKU is required', 'SKU is required', ' '] }))).toEqual(['SKU is required']);
    expect(getApiErrorMessages(axiosError(400, { message: 'Invalid', errors: [{ field: 'x', message: '' }] }))).toEqual(['Invalid']);
    expect(getApiErrorMessages(new Error('Network down'))).toEqual(['Network down']);
    expect(getApiErrorMessages(undefined, 'Fallback text')).toEqual(['Fallback text']);
  });

  it('joins field errors where only one line of text fits', () => {
    expect(getApiErrorMessage(axiosError(400, EMPLOYEE_400))).toBe(`${EMPLOYEE_400.errors[0].message} ${EMPLOYEE_400.errors[1].message}`);
  });
});
