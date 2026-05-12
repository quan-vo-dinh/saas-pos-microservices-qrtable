export const phase4bPermissions = {
  tenantListAll: 'tenant.list_all',
  tenantReadAny: 'tenant.read_any',
  tenantOnboard: 'tenant.onboard',
  tenantSuspend: 'tenant.suspend',
  tenantActivate: 'tenant.activate',
  tenantClose: 'tenant.close',
  planRead: 'plan.read',
  planCreate: 'plan.create',
  planUpdate: 'plan.update',
  planDelete: 'plan.delete',
  subscriptionReadOwn: 'subscription.read_own',
  subscriptionCheckout: 'subscription.checkout',
  subscriptionListAny: 'subscription.list_any',
  subscriptionAssign: 'subscription.assign',
  paymentSettingsReadOwn: 'payment_settings.read_own',
  paymentSettingsUpdateOwn: 'payment_settings.update_own',
} as const;

export function hasPermission(permissions: string[] | undefined, permission: string): boolean {
  return Boolean(permissions?.includes(permission));
}

export function hasEveryPermission(permissions: string[] | undefined, required: readonly string[]): boolean {
  if (!required.length) {
    return true;
  }
  return required.every((p) => hasPermission(permissions, p));
}
