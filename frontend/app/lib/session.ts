import type { AuthResponse } from "./api";
import { ROLES, type Account, type Role } from "../data/roles";

const SESSION_KEY = "ottera_auth_session";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  account: Account;
  email: string;
  username: string;
  zipCode: string;
  roles: string[];
};

const mapRole = (primaryRole: string): Role => {
  if (primaryRole === "admin") return ROLES.ADMIN;
  if (primaryRole === "volunteer") return ROLES.VOLUNTEER;
  if (primaryRole === "nonprofit_employee") return ROLES.DISTRIBUTOR;
  return ROLES.USER;
};

export const toStoredSession = (auth: AuthResponse): StoredSession => ({
  accessToken: auth.access_token,
  refreshToken: auth.refresh_token,
  email: auth.email,
  username: auth.username,
  zipCode: (auth.zip_code || "").trim(),
  roles: auth.roles || [],
  account: {
    id: auth.user_id,
    name: auth.first_name,
    role: mapRole(auth.primary_role),
    notifications: 0,
  },
});

export const saveSession = (session: StoredSession) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const loadSession = (): StoredSession | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
};
