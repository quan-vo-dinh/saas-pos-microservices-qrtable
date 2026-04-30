export enum MetadataKey {
  PROCESSID = 'processId',
  STARTTIME = 'startTime',
  SECURED = 'secured',
  USER_DATA = 'userData',
  TENANT_ID = 'tenantId',
  SESSION_ID = 'sessionId',
  /** Customer order routes: require `x-session-id` (Order service session UUID); do not mint BFF `sid_` sessions. */
  SKIP_BFF_SESSION_GUARD = 'skipBffSessionGuard',
}
