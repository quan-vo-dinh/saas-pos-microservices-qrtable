const RUN_FRONTEND_UTILS_INTEGRATION = process.env['RUN_FRONTEND_UTILS_INTEGRATION'] === '1';

export const describeFrontendUtilsIntegration = RUN_FRONTEND_UTILS_INTEGRATION ? describe : describe.skip;

export function frontendUtilsIntegrationReadiness(): { ok: boolean; reason: string } {
  if (RUN_FRONTEND_UTILS_INTEGRATION) {
    return { ok: true, reason: 'frontend-utils integration tests enabled' };
  }

  return {
    ok: false,
    reason: 'set RUN_FRONTEND_UTILS_INTEGRATION=1 with BFF_URL and KEYCLOAK_URL to opt in',
  };
}
