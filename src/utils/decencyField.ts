import { DECENCY_ERROR, OFFENSIVE_LANGUAGE } from './decency';

/**
 * Field errors to show after a failed save. The server answers 400 OFFENSIVE_LANGUAGE, normally with the field in
 * `errors[]`; when it names no field, the courtesy message goes under `field` (the box the user wrote in).
 */
export const withOffensiveFieldError = (
  fieldErrors: Record<string, string>,
  errorCode: string | null | undefined,
  field: string
): Record<string, string> =>
  errorCode === OFFENSIVE_LANGUAGE && !Object.keys(fieldErrors).length ? { [field]: DECENCY_ERROR } : fieldErrors;
