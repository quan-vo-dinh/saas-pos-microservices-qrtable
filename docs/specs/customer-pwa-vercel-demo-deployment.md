# Customer PWA Vercel Demo Deployment

## Status

Approved for implementation on 2026-06-20.

## Goal

Deploy the existing Customer PWA as a Vite single-page application on Vercel in time for the QR ordering demo. Installable PWA capabilities are out of scope for this deployment.

## Deployment Architecture

- Source repository: `quan-vo-dinh/saas-pos-microservices-qrtable`
- Vercel scope: `bins-projects-c818da1e`
- Vercel project: `saas-pos-microservices-qrtable-customer-pwa`
- Project root: `apps/customer-pwa`
- Framework: Vite
- Install command: `cd ../.. && pnpm install --frozen-lockfile`
- Build command: `cd ../.. && pnpm exec nx build customer-pwa`
- Output directory: `dist`
- Production branch: `main`

The project root remains app-specific so Customer PWA can own its Vercel SPA rewrite without changing the Management App deployment. Vercel must include source files outside the root directory because Vite resolves shared libraries from the monorepo.

## Environment

Customer PWA receives this build-time public variable:

```dotenv
VITE_BFF_URL=https://engagement-mailed-absent-close.trycloudflare.com/api/v1
```

The demo BFF runs in development mode and currently permits the Vercel origin through its CORS configuration. The Cloudflare quick tunnel is temporary and must remain online throughout the demo.

After the Customer PWA production domain is assigned, set the Management App variable below to that origin and redeploy Management App:

```dotenv
NEXT_PUBLIC_CUSTOMER_PWA_URL=https://saas-pos-microservices-qrtable-customer-pwa.vercel.app
```

If Vercel assigns a different production alias, use the alias reported by the successful deployment instead.

No Keycloak client change is required because Customer PWA uses QR/session authentication rather than the Management App OIDC flow.

## Routing

Customer PWA uses `BrowserRouter`. Vercel must rewrite application paths to `/index.html` so direct visits to `/landing`, `/menu`, and order-tracking routes do not return 404.

## Verification

1. Confirm the Vercel production deployment succeeds.
2. Confirm `/` and `/landing` return the SPA.
3. Confirm built assets contain the expected BFF tunnel URL.
4. Confirm the BFF responds through `/api/v1` and accepts the Customer PWA origin.
5. Confirm Management App generates QR URLs with the Customer PWA production origin.
6. Exercise the QR validation and table-session join flow when demo tenant/table data is available.

## Rollback

- Promote the previous Vercel deployment if the Customer PWA deployment regresses.
- Restore the previous `NEXT_PUBLIC_CUSTOMER_PWA_URL` value and redeploy Management App if QR generation must be rolled back.
- Replace the quick tunnel URL and rebuild Customer PWA if Cloudflare assigns a new tunnel.
