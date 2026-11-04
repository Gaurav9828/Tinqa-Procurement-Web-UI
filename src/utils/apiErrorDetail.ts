import axios from 'axios';
import { getApiErrorCode } from './apiError';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The failure's body: a thrown axios error's response data, or a `success: false` envelope. */
const bodyOf = (err: unknown): Record<string, unknown> | null => {
  if (axios.isAxiosError(err)) return isRecord(err.response?.data) ? err.response.data : null;
  return isRecord(err) ? err : null;
};

/** The machine-readable error code: the envelope's `errorCode`, or `code` (docs/outreach-meetings-roles.md). */
export const errorCodeOf = (err: unknown): string | null => {
  const code = getApiErrorCode(err) ?? bodyOf(err)?.code;
  return typeof code === 'string' && code ? code : null;
};

/** A detail field sent with an error, looked up in the envelope's `data` first, then on the body itself. */
export const errorDetailOf = (err: unknown, field: string): unknown => {
  const body = bodyOf(err);
  if (!body) return undefined;
  const data = body.data;
  if (isRecord(data) && field in data) return data[field];
  return body[field];
};
