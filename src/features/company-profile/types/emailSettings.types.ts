// Mirrors the Ecommerce BE email settings DTOs (com.tinqa.ecommerce.dto.settings.*).

export type MailSecurity = 'STARTTLS' | 'SSL' | 'NONE';

/** EmailSettingsDTO — the SMTP password is never sent back, only whether one is saved. */
export interface EmailSettings {
  enabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  security: MailSecurity;
  username: string | null;
  passwordSet: boolean;
  fromAddress: string | null;
  fromName: string | null;
  replyTo: string | null;
  /** Enabled with a server and a sender: customer emails go out. */
  ready: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
  pendingEmails: number;
  failedEmails: number;
}

/** EmailSettingsRequestDTO — a blank password keeps the saved one. */
export interface EmailSettingsRequest {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number | null;
  security: MailSecurity;
  username: string;
  password: string;
  clearPassword: boolean;
  fromAddress: string;
  fromName: string;
  replyTo: string;
}
