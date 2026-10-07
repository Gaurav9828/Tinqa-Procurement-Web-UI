import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { METHOD_NOT_ALLOWED_MESSAGE, getApiErrorCode, getApiErrorMessage } from './apiError';
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
