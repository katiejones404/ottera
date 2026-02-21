export const ROLES = {
  ADMIN: "Admin",
  USER: "User",
  VOLUNTEER: "Volunteer",
  DISTRIBUTOR: "Distributor"
};

export const MOCK_ACCOUNTS = [
  { id: "a1", name: "Alex Admin", role: ROLES.ADMIN, notifications: 8 },
  { id: "u1", name: "Uma User", role: ROLES.USER, notifications: 3 },
  { id: "v1", name: "Vic Volunteer", role: ROLES.VOLUNTEER, notifications: 5 },
  { id: "d1", name: "Dana Distributor", role: ROLES.DISTRIBUTOR, notifications: 2 }
];
