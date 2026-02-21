export const ROLES = {
  ADMIN: "Admin",
  USER: "User",
  VOLUNTEER: "Volunteer",
  DISTRIBUTOR: "Distributor",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export type Account = {
  id: string;
  name: string;
  role: Role;
  notifications: number;
};

export const MOCK_ACCOUNTS: Account[] = [
  { id: "a1", name: "Alex Admin", role: ROLES.ADMIN, notifications: 8 },
  { id: "u1", name: "Uma User", role: ROLES.USER, notifications: 3 },
  { id: "v1", name: "Vic Volunteer", role: ROLES.VOLUNTEER, notifications: 5 },
  { id: "d1", name: "Dana Distributor", role: ROLES.DISTRIBUTOR, notifications: 2 },
];
