/** Hydrated tenant subscription context for BFF plan feature guards. */
export type TenantSubscriptionContext = {
  status: string;
  planCode: string | null;
  features: string[];
};
