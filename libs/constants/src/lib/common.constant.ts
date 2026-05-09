export enum MetadataKey {
  PROCESSID = 'processId',
  STARTTIME = 'startTime',
  SECURED = 'secured',
  USER_DATA = 'userData',
  TENANT_ID = 'tenantId',
  SESSION_ID = 'sessionId',
  /** Customer order routes: require `x-session-id` (Order service session UUID); do not mint BFF `sid_` sessions. */
  SKIP_BFF_SESSION_GUARD = 'skipBffSessionGuard',
  /**
   * Pre-join routes (e.g. POST /customer/sessions/join): pass SessionGuard without minting a BFF `sid_*` session and
   * without requiring `x-session-id`. The Order table session UUID is created by Order Service and returned in the response body.
   */
  SKIP_BFF_SESSION_MINT = 'skipBffSessionMint',
  /** External callbacks can opt out of the internal HTTP response wrapper when their provider requires an exact body. */
  SKIP_RESPONSE_WRAPPER = 'skipResponseWrapper',
}
