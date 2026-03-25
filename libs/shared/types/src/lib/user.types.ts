/** Authenticated user profile returned by the BFF /authorizer/me endpoint. */
export type UserProfile = {
  userId: string;
  email?: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
};

/** Client-side session shape used in frontend stores. */
export type UserSession = {
  user: UserProfile;
  accessToken: string;
  expiresAt: number;
};
