const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type AuthPayload = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  birthday?: string;
  zip_code?: string;
  phone?: string;
  roles?: string[];
};

export type AuthResponse = {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  zip_code?: string | null;
  roles: string[];
  primary_role: string;
  access_token: string;
  refresh_token: string;
};

export async function registerUser(payload: AuthPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Registration failed");
  return data;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Login failed");
  return data;
}
