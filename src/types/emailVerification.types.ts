// Email verification before an account is created (Procurement BE: new employees; Ecommerce BE: store customers).
// Both backends answer with the same shapes.
import type { ApiResponse } from './common.types';

/** A 5-digit code is on its way to `email`. */
export interface EmailCodeSent {
  email: string;
  codeValidMinutes: number;
  /** A new code can be asked for after this many seconds. */
  resendAfterSeconds: number;
}

/** The address is proved: send `verificationToken` with the registration. */
export interface EmailVerified {
  email: string;
  verificationToken: string;
  expiresAt: string;
}

/** Where a form sends and checks codes (one implementation per backend). */
export interface EmailVerificationApi {
  sendCode: (email: string, name?: string) => Promise<ApiResponse<EmailCodeSent>>;
  confirmCode: (email: string, code: string) => Promise<ApiResponse<EmailVerified>>;
}

export const EMAIL_CODE_LENGTH = 5;
