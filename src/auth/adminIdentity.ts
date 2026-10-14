import type { UserRole } from '../config/permissions.config';

export interface AdminIdentity {
  /** Token subject (falls back to the stored username). */
  username: string | null;
  /** Every admin level the token carries — an admin may hold both. */
  roles: UserRole[];
}

const ADMIN_ROLES: UserRole[] = ['ADMIN_L1', 'ADMIN_L2'];

const decodePayload = (token: string | null): Record<string, unknown> | null => {
  try {
    const part = token?.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      Array.from(atob(base64), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    );
    const payload: unknown = JSON.parse(json);
    return typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** Role names from the usual claim shapes: ["ROLE_ADMIN_L1"], "ROLE_A ROLE_B", [{ authority: "ROLE_A" }]. */
const claimValues = (value: unknown): string[] => {
  if (typeof value === 'string') return value.split(/[\s,]+/);
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (typeof entry === 'string') return [entry];
      if (entry && typeof entry === 'object' && typeof (entry as { authority?: unknown }).authority === 'string') {
        return [(entry as { authority: string }).authority];
      }
      return [];
    });
  }
  return [];
};

/**
 * Who is signed in, for maker-checker rules. Roles are read from the JWT (roles / authorities / role / scope
 * claims, "ROLE_" prefix optional) plus the role from the login response. UX only — the backend decides.
 */
export const getAdminIdentity = (token: string | null, user: { username?: string; role?: string } | null): AdminIdentity => {
  const payload = decodePayload(token);
  const names = [
    ...['roles', 'authorities', 'role', 'scope', 'scp'].flatMap((claim) => claimValues(payload?.[claim])),
    user?.role ?? '',
  ];
  const roles = ADMIN_ROLES.filter((role) => names.some((name) => name.trim().replace(/^ROLE_/, '') === role));
  const subject = typeof payload?.sub === 'string' && payload.sub ? payload.sub : null;
  return { username: subject ?? user?.username ?? null, roles };
};
