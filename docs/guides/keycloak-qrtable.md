# Keycloak Instructions In QRTable

> **Role:** Supporting guide, not canonical source.
> When you need the current architectural state, prioritize `[../technical-architecture.md](../technical-architecture.md)`, `[../architecture/permission-matrix.md](../architecture/permission-matrix.md)`, `[../references/auth-system-reference.md](../references/auth-system-reference.md)`, and code above `main`.
>
> **Goal:** Explain Keycloak just enough to read code, debug authentication, and properly scale the QRTable. This document has background theory, but does not go far into a general Keycloak curriculum.
>
> **Current code status (2026-05-14):** QRTable uses Keycloak `25.0.0` to authenticate internal users such as `SUPER_ADMIN`, `Owner`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`. Management App logs in via NextAuth + Keycloak provider. The Authorizer service verifies the JWT using Keycloak's JWKS, then fetches the application profile and permissions from User-Access. Customer PWA/QR scanning client not logged in with Keycloak.

---

## Table of Contents

1. [Quick read](#1-quick read)
2. [Where is Keycloak being used](#2-where-keycloak-is-being-used)
3. [Principles of choosing Keycloak](#3-principles-of-choosing-keycloak)
4. [Just Enough Theory](#4-just-enough-theory)
5. [Keycloak authentication and flow types](#5-keycloak-authentication-and-flow-types)
6. [Current authentication flow](#6-current-authentication-flow)
7. [Allocation of users and onboarding tenants](#7-allocation-users-and-onboarding-tenants)
8. [Role, permission and tenant isolation](#8-role-permission-and-tenant-isolation)
9. [What does Keycloak not own](#9-keycloak-does-not-own-what)
10. [Instructions for configuring and operating Keycloak](#10-instructions-for-configuring-and-operating-keycloak)
11. [Set up local, deploy and debug](#11-set-up-local-deploy-and-debug)
12. [Where to read the code](#12-where-to-read-the-code)
13. [Checklist](#13-checklist)

---

## 1. Read quickly

Keycloak in QRTable is the **identity provider** for the restaurant's internal user group and administration system. Keycloak answers the questions:

```txt
Who is this person?
Is this token valid?
What identified role does this person have in the realm?
```

Keycloak is **not** the source of truth for all QRTable business authority. After the token is valid, QRTable still needs the User-Access service to respond:

```txt
Has this user been provisioned into the application?
Which tenant does the user belong to?
What application permissions does the user have?
Is the user allowed to call the current API?
```

An easy sentence to remember:

```txt
Keycloak authenticates identities.
User-Access defines profiles, internal roles, and permissions.
BFF Guards apply tenant and permissions on each request.
```

### General flow

```txt
Management App
-> switch users to Keycloak login
-> receives access token (JWT)
-> call BFF /authorizer/me with Bearer token
-> BFF UserGuard calls Authorizer if the token is not cached yet
-> Authorizer verify JWT using Keycloak's JWKS
-> Authorizer loads profile + permission from User-Access
-> BFF TenantGuard / PermissionGuard decides to allow or deny the request
```

### Minimum term

| Terminology                                                  | Meaning in QRTable                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Keycloak                                                     | Identity server (name server), manages logins, users, identity roles and tokens.                                               |
| Realm (identity space)                                       | Keycloak's own configuration area. QRTable uses realm `qrtable`.                                                               |
| Client (registration application)                            | Applications are given tokens by Keycloak, for example Management App or BFF client.                                           |
| User (account identifier) ​​                                 | Login account in Keycloak, usually corresponding to staff/admin/Owner.                                                         |
| Realm role (realm level role)                                | Roles are at the realm level, for example `Owner`, `MANAGER`, `WAITER`. QRTable uses this role to map to an internal role.     |
| Role (role)                                                  | Large group of user responsibilities, for example `Owner`, `CHEF`.                                                             |
| Permission (permission to operate)                           | API/business granular permissions, e.g. `ORDER_CREATE`.                                                                        |
| tenant (rental unit / restaurant)                            | Data space of a restaurant in a SaaS system.                                                                                   |
| Guard (request blocking class)                               | The class checks the request before putting it into the controller, for example `UserGuard`, `TenantGuard`, `PermissionGuard`. |
| Session (session)                                            | The logged in state or active session state of the user/guest.                                                                 |
| Cache (caching memory)                                       | Flashbacks can expire or be rebuilt, usually residing in Redis.                                                                |
| Provision (allocation of records/accounts)                   | Create or synchronize users from the identity layer to the application profile.                                                |
| Onboarding (initialization process)                          | Initial tenant/user initialization flow for a restaurant to start using the system.                                            |
| Frontend (browser side application)                          | The interface that runs for the user, for example Management App.                                                              |
| Backend (server-side service)                                | Services handle logic, data, authentication, and authorization.                                                                |
| OpenID Connect / OIDC (extended login standard on OAuth 2.0) | Login standard that Management App uses to redirect to Keycloak and receive tokens.                                            |
| Access token (access token)                                  | The short-term JWT is sent to the BFF in the `Authorization: Bearer ...` header.                                               |
| Refresh token (refresh token)                                | Token is used to apply for a new access token when the access token is about to expire.                                        |
| JWT / JSON Web Token (signed JSON token)                     | Token format with payload and digital signature. The Authorizer must verify the JWT before trusting the content.               |
| JWKS / JSON Web Key Set (public key set)                     | Keycloak's endpoint contains the public key for the Authorizer to check the JWT signature.                                     |
| Protocol mapper (claim mapper)                               | Configure Keycloak to include user attribute/role in token claim, for example `tenant_id`.                                     |
| Client credentials (client identification information)       | The mechanism for the service to get the admin token is `client_id` and `client_secret`.                                       |
| service account (service account)                            | The account represents a backend client when that client calls the administrative API.                                         |
| Admin REST API (Admin API)                                   | Keycloak's API to create users, assign roles, and disable users. Authorizer is calling this API.                               |
| Required action                                              | Ask the user to do something after login, for example `UPDATE_PASSWORD`.                                                       |
| Scope (scope of request permission)                          | List of permissions/groups of information that the client requests when logging in to OIDC.                                    |
| Source of truth (source of truth)                            | Where data is considered the most correct version when there are conflicts.                                                    |
| Security boundary (security boundary)                        | The auditing layer should not be overlooked when protecting data/APIs.                                                         |
| Callback URL (return URL)                                    | The Keycloak URL redirects the user back after logging in.                                                                     |

---

## 2. Where is Keycloak being used?

| Ingredients         | Keycloak's role                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker providers    | Run Keycloak locally at `http://localhost:8180`, image `quay.io/keycloak/keycloak:25.0.0`.                                                         |
| Realm `qrtable`     | Identifier space for the QRTable project.                                                                                                          |
| Management App      | Use NextAuth Keycloak provider to login, refresh token and load session.                                                                           |
| Authorizer service  | verify JWT using JWKS, call Keycloak Admin REST API to create users, assign roles and disable users.                                               |
| BFF Guards          | Do not talk directly to Keycloak; UserGuard calls Authorizer and caches token verification results in Redis.                                       |
| User-Access service | Save application profiles, internal roles and permissions; This is the source of application permissions.                                          |
| SaaS onboarding     | Create an Owner in Keycloak when creating a new tenant, assign the role `Owner`, rollback by disabling the user if the next step fails.            |
| Keycloak Theme      | Custom theme in `apps/keycloak-theme`, mounted into Keycloak container.                                                                            |
| Bootstrap scripts   | `tools/keycloak-bootstrap.sh` creates realm/client, user attributes, protocol mappers, realm roles and sample users for the local/dev environment. |

Keycloak is not used for QR scanning customer flows. Customer PWA uses its own session/QR token and guard, because the customer does not need a staff account in the `qrtable` realm.

---

## 3. Keycloak selection principles

Keycloak should be chosen when the problem is **human authentication (human user authentication)**, managing logins, tokens, identity roles, or account lifecycle in the identity system.

Keycloak should not be used as a general business database. If the data needs business transactions, audits, queries by tenant, or is the source of truth of the QRTable domain, let the service that owns that domain manage it.

### Why does QRTable need Keycloak?

The root problem of QRTable is that Management App has many internal user groups: super admin, Owner, manager, waiter, chef, barista. These people need to log in securely, receive standard tokens, have an account lifecycle, can be disabled, reset passwords, assign identifying roles and integrate with the backend via JWT. If you write all the authentication yourself from scratch, the project will have to handle many sensitive parts yourself: saving passwords, hashes, refresh tokens, token signing, JWKS, password policy, session security, user lifecycle and admin tooling.

Keycloak resolves the identity class:

```txt
Who is logging in?
Is this token valid?
What identifying realm role does this user have?
Is this user still enabled?
```

QRTable still separates the business permission layer into User-Access:

```txt
Which tenant does this user belong to in the application?
Which QRTable permission does the user have?
Is the current request allowed to continue?
```

Why Keycloak, not other options?

| Options                            | Why is it not the main choice for this problem                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Write your own auth                | High security risk, time consuming, easy to make mistakes in token refresh, password policy, signing key, user lifecycle.               |
| Only use NextAuth                  | NextAuth manages the frontend session well, but is not a full identity server for realm, Admin API, JWKS, roles.                        |
| Use User-Access                    | only User-Access owns application permissions, but should not issue/verify the OIDC token and password management standards themselves. |
| Firebase/Auth0/SaaS identity       | Can be powerful, but depends on vendor/cloud; Keycloak is open-source, self-hosted, compatible with local/dev/thesis and Admin API.     |
| Customer QR session using Keycloak | Customers scanning QR is an anonymous session by table, no need for an identification account in realm staff.                           |

A good interview answer:

> The project uses Keycloak as an identity provider for staff/admin because it needs standard OIDC login, JWT, JWKS verification, identity role, user lifecycle and Admin API for onboarding tenants. But Keycloak does not own detailed business permissions; After the token is valid, Authorizer/User-Access will load the profile, tenant and application permissions. This separation helps not to write sensitive auth yourself, while still keeping business authorization in the domain of QRTable.

Interviewers often ask:

| Question                                             | Questions to answer in QRTable                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| How is Keycloak different from User-Access?          | Keycloak authenticates identities; User-Access is the source of truth for application profile/permission.         |
| Why don't QR customers use Keycloak?                 | Customer is an anonymous table/session flow, does not need a staff account and should not be a heavy login.       |
| Is JWT claim enough to decentralize authority?       | Are not. Claim helps identify/tenant context; PermissionGuard still relies on application permissions.            |
| If Keycloak is down, what will happen to the system? | Login/refresh/user provisioning is affected; Requests with valid tokens/cache may still run within design limits. |
| Why do we need protocol mapper?                      | Put a claim like `tenant_id` in the token so that BFF/Authorizer can deduce the tenant context when needed.       |

### 3.1 When to use Keycloak

Use Keycloak when needed:

- Log in as restaurant staff, Owner, manager, admin or super admin.
- Issue an access token (JWT) for the frontend to call BFF.
- verify tokens according to OIDC/JWKS standards instead of writing your own token mechanism.
- Password management, required action, enabled/disabled user.
- Create users from the backend via Admin REST API in the onboarding flow.
- Assign generic role identifiers, for example `Owner`, `MANAGER`, `WAITER`.
- Integrate centralized login interface for Management App.

### 3.2 When you should not use Keycloak

Do not use Keycloak for:

- Customer session scans QR. This is an anonymous stream based on desk/QR code, not staff login.
- Detailed business rights such as `ORDER_CREATE`, `MENU_UPDATE`, `PLAN_MANAGE`. These permissions belong to User-Access and permission matrix.
- tenant status, service package (subscription), invoice, quota, payment settings.
- Payment provider's OAuth, for example SePay OAuth state.
- Cache tokens, carts, KDS runtime or temporary states; These parts use Redis.
- Inter-service event; These sections use TCP/gRPC/Kafka in context.

### 3.3 Quick decision question

| Question                                                | Suitable choice                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| Is this an internal user that needs to log in?          | Keycloak.                                                           |
| Is this a QR scanning customer without an account?      | Customer session/QR token, do not use Keycloak.                     |
| Need to know if the token is valid and who is the user? | Authorizer verify Keycloak JWT.                                     |
| Need to know what permissions a user has in QRTable?    | User-Access + PermissionGuard.                                      |
| Need to know which tenant the user belongs to?          | JWT claim/user profile + TenantGuard.                               |
| Need to create an Owner when onboarding a new tenant?   | SaaS service calls Authorizer, Authorizer calls Keycloak Admin API. |
| Need to disable Owner if onboarding fails?              | Authorizer calls Keycloak Admin API disable user.                   |
| Need to save long-term business data?                   | PostgreSQL in the service owns the domain.                          |

### 3.4 Compare related classes

| Class             | Answer questions                                    | How is QRTable being used                                              |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Keycloak          | "Who is this person, is the token valid?"           | Login, JWT, realm role, admin user lifecycle.                          |
| NextAuth          | "How does Frontend keep session login?"             | Management App saves token/session, refresh token and hydrate profile. |
| Authorizer        | "Are Keycloak tokens valid in QRTable?"             | verify JWT, load user profile, return permissions to BFF.              |
| User-Access       | "What profile/role/permission does this user have?" | Source of truth for application users and permissions.                 |
| BFF Guards        | "Is this request allowed to continue?"              | UserGuard, TenantGuard, PermissionGuard.                               |
| Redis token cache | "Can recent token verification results be reused?"  | Cache Authorizer results to reduce repeated verification.              |

---

## 4. Sufficient theory

### 4.1 Realm

Realm is an independent configuration space in Keycloak. Each realm has its own user, role, client, login configuration, and token signing key.

In QRTable, the current realm is:

```txt
qrtable
```

If you later create additional realms for each environment, for example `qrtable-dev`, `qrtable-staging`, `qrtable-prod`, make sure the frontend, Authorizer and Keycloak Admin API all point to the correct issuer/realm. Wrong realm often results in failed token verification because the issuer or key does not match.

### 4.2 Client

Client is the application registered with Keycloak. The client decides how the application logs in and receives tokens.

In the QRTable there are now relevant environment variables:

```txt
KEYCLOAK_CLIENT_ID=qrtable-bff
AUTH_KEYCLOAK_ID=management-app
```

Actual meaning:

- `management-app` serves the frontend login flow via NextAuth.
- `qrtable-bff` / client backend is used by the Authorizer when needing to exchange tokens or call Keycloak with the client secret.

The client secret is only used on the backend. Do not include client secrets in browsers, frontend bundles, or public documents.

### 4.3 OpenID Connect

OpenID Connect (an extended login standard on OAuth 2.0) adds a user identification layer to OAuth 2.0. In short:

```txt
OAuth 2.0 answers: what access does an application have?
OpenID Connect further answers: who is the person logging in?
```

In Management App:

```txt
User clicks log in
-> Management App redirects to Keycloak login page
-> Keycloak authenticates users
-> Management App receives access token / refresh token qua NextAuth
```

After that, Management App does not have absolute confidence in all claims in the token. It calls BFF `/authorizer/me` to let QRTable confirm that the user has a profile and permission in User-Access.

### 4.4 JWT and digital signatures

JWT consists of three parts:

```txt
header.payload.signature
```

The payload can be read using base64 decode, but **cannot be trusted** without verifying the signature. Authorizer does the correct order:

1. Decode header to get `kid` (key id).
2. Get the public key from Keycloak's JWKS endpoint.
3. verify signature with RS256.
4. Check the payload has `sub`.
5. Load profile from User-Access.

This is important because the frontend or client can send fake tokens. Only tokens with a valid signature according to realm's public key can be trusted.

### 4.5 JWKS

JWKS is Keycloak's public key list:

```txt
{KEYCLOAK_HOST}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs
```

With local QRTable:

```txt
http://localhost:8180/realms/qrtable/protocol/openid-connect/certs
```

Keycloak can rotate the key (rotate the signing key). So Authorizer does not hard-code the public key in the code, but gets the key according to `kid` from JWKS. The `jwks-rsa` library is configured with cache and rate limit to reduce load.

### 4.6 Role in Keycloak and permission in QRTable

Keycloak realm role is a major identifier role:

```txt
SUPER_ADMIN
OWNER
MANAGER
WAITER
CHEF
BARISTA
```

Permissions in QRTable are more detailed and belong to User-Access, for example:

```txt
ORDER_CREATE
MENU_UPDATE
PLAN_MANAGE
PAYMENT_SETTINGS_UPDATE
```

Principle:

```txt
The Keycloak role helps QRTable know which group a user belongs to.
User-Access role/permission determines what action the user can do.
```

If the token has the Keycloak role but the User-Access does not have the corresponding profile/role mapping, the request will still be rejected.

### 4.7 Claim and protocol mapper

Claim is a field in the JWT payload. QRTable is interested in claims such as:

```json
{
  "sub": "keycloak-user-id",
  "email": "owner@example.com",
  "realm_access": {
    "roles": ["OWNER"]
  },
  "tenant_id": "tenant-id",
  "sub_role": "OWNER"
}
```

Protocol mapper (claim mapper) helps put user attributes into claim tokens. For example, a user has the attribute `tenant_id`, the mapper can put this value into the access token so that BFF/Authorizer can read it.

In the current code, Authorizer and guards handle both `tenant_id` and camelCase `tenantId` to avoid field name errors when passing through the proto-loader.

### 4.8 Admin REST API

Admin REST API is Keycloak's admin API. Authorizer uses this API to:

- Get admin token using client credentials.
- Create users.
- Assign realm role to user.
- Update users.
- Disable users.
- Read user information by id.

According to the official Keycloak documentation, the Admin REST API is under the path pattern:

```txt
/admin/realms/{realm}/...
```

QRTable does not let the frontend call the Admin REST API directly. All Keycloak administration operations must go through a backend with appropriate client secret and rollback.

### 4.9 Required action

Required action is an action Keycloak forces users to perform after logging in. QRTable uses `UPDATE_PASSWORD` in the new Owner creation flow:

```txt
SaaS onboarding creates Owner
-> Keycloak user has a temporary password
  -> requiredActions: ["UPDATE_PASSWORD"]
-> Owner must change password after first login
```

This is a better way than letting the temporary password last as long as the main password.

---

## 5. Keycloak authentication types and flows

Keycloak supports many types of authentication (authentication flow) and token issuance (grant/flow). QRTable is not used at all. When reading Keycloak documentation, it is important to distinguish which flows are theoretical, which flows are being implemented, and which flows should be avoided.

### 5.1 Authorization Code / Standard Flow

Authorization Code Flow, often called **Standard Flow** in Keycloak UI, is the main flow for web applications with login via browser.

Easy-to-understand flow:

```txt
User opens Management App
-> Management App switched to Keycloak
-> User enters password on Keycloak
-> Keycloak returns the code to the callback URL
-> NextAuth exchange code for access token / refresh token
```

QRTable uses this flow for Management App via NextAuth + Keycloak provider. This is a flow that should be prioritized for staff/admin login because the password is only entered in Keycloak, the frontend does not process the password itself.

### 5.2 Refresh Token

Refresh token is used to apply for a new access token when the access token expires or is about to expire. Management App is asking for scope `offline_access` to get a refresh token.

In QRTable:

- NextAuth keeps the refresh token in NextAuth's server/runtime JWT session.
- When the access token is about to expire, Management App calls Keycloak's token endpoint with `grant_type=refresh_token`.
- BFF still has to verify the new access token via Authorizer; The refresh token is not sent directly to the business API BFF.

### 5.3 Client Credentials / Service Account

Client Credentials Grant is a flow for the backend/service to authenticate itself with Keycloak, not representing a user clicking the interface.

Easy-to-understand flow:

```txt
Authorizer has client_id + client_secret
-> call token endpoint with grant_type=client_credentials
-> receive admin/service token
-> call Keycloak Admin REST API
```

QRTable uses this mechanism for the Authorizer to call the Keycloak Admin REST API, for example creating a user, assigning a realm role, disabling the user. In `tools/keycloak-bootstrap.sh`, the client backend is enabled `serviceAccountsEnabled: true` and the service account is assigned necessary administrative roles such as `manage-users`, `view-users`, `query-users`, and `view-realm`.

### 5.4 Direct Access Grants / Password Grant

Direct Access Grants allow clients to send username/password directly to the token endpoint to obtain tokens. This is a convenient flow for scripting, testing, or legacy endpoints, but should not be the main flow for modern user interfaces.

In the current code, Authorizer has function `exchangeUserToken()` which uses `grant_type=password`. So bootstrap/local or some internal flow can rely on it, but the main Management App login should still go through Standard Flow.

Principles in QRTable:

- Use Standard Flow for real users to log in via UI.
- Only enable Direct Access Grants when there is a clear use case.
- Do not let the frontend automatically collect the password and then call the password grant if you can use Keycloak's login redirect.

### 5.5 Implicit Flow

Implicit Flow was used for old SPA, where tokens were paid directly via browser redirect. In the current context, this flow should be avoided because the token is more easily exposed in the browser/history/log and is no longer a good choice for modern web applications.

QRTable does not need Implicit Flow. Management App uses NextAuth and Standard Flow.

### 5.6 Device Authorization and other flows

Keycloak also supports flows such as Device Authorization (login for devices with limited input capabilities), Identity Brokering (login via Google/GitHub/other IdP), or custom flows.

QRTable does not currently implement these flows. If needed later, consider them as separate scopes:

- POS/kiosk devices are not convenient to enter passwords: consider Device Authorization.
- Sign in with your restaurant's Google Workspace: consider Identity Brokering.
- MFA/OTP for admin: configure authentication flow in Keycloak, but still keep BFF PermissionGuard as API protection layer.

### 5.7 Mapping flow with QRTable

| Demand                                      | Proper flow                           | Status in QRTable                               |
| ------------------------------------------- | ------------------------------------- | ----------------------------------------------- |
| Staff/admin log in to Management App        | Standard Flow / Authorization Code    | Using NextAuth.                                 |
| Management App refreshes access token       | Refresh Tokens                        | Using NextAuth callback.                        |
| Authorizer calls Admin REST API             | Client Credentials / service Account  | Currently used for Keycloak admin ops.          |
| Script/test gets token by username/password | Direct Access Grants / Password Grant | There is support in Authorizer, controlled use. |
| SPA receives tokens directly from redirect  | Implicit Flow                         | Do not use, should avoid.                       |
| Customer scans QR to order                  | Do not use Keycloak                   | Use customer session/QR token.                  |

---

## 6. Current authentication flow

### 6.1 Management App login

Management App uses NextAuth with Keycloak provider. Main configuration variables:

```txt
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=...
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable
MANAGEMENT_BFF_BASE_URL=http://localhost:3300/api/v1
```

Login flow:

```txt
User opens /login
-> Management App calls signIn("keycloak")
-> Keycloak login successfully
-> NextAuth stores access token, refresh token, expiresAt
-> Management App calls BFF /authorizer/me
-> Session is hydrated with roles, permissions, tenantId, userId
```

Management App requires basic OIDC scopes and `offline_access` to get refresh token. Refresh token only serves the frontend session; it does not replace permission checks in BFF.

NextAuth is responsible for keeping the frontend session and refreshing the token. It does not replace authorization in BFF. All important APIs still have to pass through BFF guards.

### 6.2 BFF UserGuard

When a route has `@Authorization({ secured: true })`, UserGuard will:

1. Read bearer token from request.
2. Create Redis key cache `user-token:{sha256(token)}`.
3. If there is a cache, attach user metadata to the request.
4. If there is no cache, call Authorizer gRPC `verifyUserToken`.
5. Cache verification results in Redis for about 30 minutes.

UserGuard does not verify JWT itself. This keeps the verification logic centralized in the Authorizer service.

### 6.3 Authorizer verify token

Authorizer Service:

1. Decode JWT header to get `kid`.
2. Get the signing key from JWKS.
3. verify JWT using RS256.
4. Check `sub`.
5. Call User-Access to find the user profile by Keycloak user id.
6. Check the role mapping between the realm role in the token and the internal role.
7. Collect permissions from User-Access.
8. Returns metadata for BFF.

If the profile does not exist, Authorizer can auto provision if env `AUTH_AUTO_PROVISION_ON_FIRST_LOGIN=true`. Otherwise, the expected error is `user_not_provisioned`.

### 6.4 TenantGuard

TenantGuard ensures requests do not "jump tenants" incorrectly. Guard reads tenant from:

- JWT claim `tenant_id` / `tenantId`.
- Header/request context matches the route.
- Session cache in some customer/session threads.

`SUPER_ADMIN` can bypass tenant requests in appropriate administrative routes. Restaurant roles such as `Owner`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA` must have a valid tenant and must not be mismatched with the tenant request.

### 6.5 PermissionGuard

PermissionGuard reads the permission route request, then compares it to the permission list in the user's metadata. This list comes from User-Access, not directly from Keycloak.

For example:

```txt
Route needs ORDER_UPDATE
-> Valid JWT
-> user has provisioned
-> TenantGuard is valid
-> PermissionGuard sees the user has ORDER_UPDATE
-> request continues
```

If permission is missing, the correct result is 403 `permission_denied`, not a Keycloak error.

### 6.6 WebSocket and realtime

With realtime for Management/KDS, the token still needs to be verified before the socket is attached to the room tenant/role. Same principle as HTTP:

```txt
A valid token is not enough
-> need user profile
-> need valid tenant
-> just join room realtime in correct range
```

WebSocket is just a runtime signal push channel. It should not bypass Authorizer/User-Access if that thread needs staff identity.

---

## 7. Allocating users and onboarding tenants

### 7.1 Create regular internal users

User-Access service has an application user creation flow:

```txt
Request creates staff/admin
-> User-Access check email
-> User-Access calls Authorizer TCP KEYCLOAK.CREATE_USER
-> Authorizer creates a Keycloak user
-> User-Access creates internal profile
```

Reasons not to just create in Keycloak:

- Keycloak only knows identity and realm role.
- QRTable needs profile, tenant relations, internal roles and permissions.
- QRTable needs to control duplicate email errors, rollback and mapping by domain.

### 7.2 Onboarding tenant Owner in Phase 4B

Phase 4B adds new tenant onboarding flow:

```txt
SaaS service receives an onboarding request
-> create tenant
-> calls Authorizer KEYCLOAK.CREATE_TENANT_OWNER
-> Authorizer creates a Keycloak user Owner
-> assigns realm role Owner
-> adds attributes tenant_id / tenant_slug
-> set temporary password and required action UPDATE_PASSWORD if available
-> SaaS calls User-Access upsert Owner profile
-> creates subscription/payment settings/tenant.created outbox
```

If the step after creating the Keycloak Owner fails, SaaS calls Authorizer `KEYCLOAK.DISABLE_USER` to disable the newly created user. This is a compensating action, because Keycloak and the SaaS/User-Access database are not in the same transaction.

### 7.3 Why rollback with disable

In a microservice system, there is no single SQL transaction surrounding Keycloak, SaaS DB, and User-Access DB. If Keycloak successfully creates an Owner but User-Access fails, that user can log in but does not have an application profile.

Disable user helps:

- Half-hearted account blocking.
- Keep traces for debugging.
- Avoid physically deleting users too early when you need to audit the onboarding flow.

### 7.4 Auto provision when logging in for the first time

Authorizer has an auto provision mechanism if:

```txt
AUTH_AUTO_PROVISION_ON_FIRST_LOGIN=true
```

This mechanism should only be used when the claim source and role mapping are clear. If not careful, it can create profiles from tokens that lack tenant/role information. In important flows such as onboarding owners, they should proactively create profiles via services instead of waiting for auto provisioning.

---

## 8. Role, permission and tenant isolation

### 8.1 Two-layer model

QRTable uses a two-layer model:

```txt
identity class:
  Keycloak user, realm role, JWT, tenant claim

Application profile layer:
  User-Access user, tenant relation, internal role, permissions
```

A valid Keycloak token is a necessary condition. A valid User-Access profile is a sufficient condition to request to domain QRTable.

### 8.2 Realm role

Realm roles in Keycloak classify users according to major roles:

| Realm roles   | Meaning                                    |
| ------------- | ------------------------------------------ |
| `SUPER_ADMIN` | Platform-level System Administration/SaaS. |
| `Owner`       | tenant/restaurant Owner.                   |
| `MANAGER`     | Restaurant management.                     |
| `WAITER`      | service staff.                             |
| `CHEF`        | Kitchen staff.                             |
| `BARISTA`     | Bar/beverage staff.                        |

The role in the token helps the Authorizer compare role mapping. However, the specific permission must still be obtained from User-Access.

### 8.3 Application Permission

Permission is the detailed manipulation permission of the QRTable. Canonical permission matrix is currently located at:

```txt
docs/architecture/permission-matrix.md
```

And the related code/seed is located at:

```txt
libs/constants/src/lib/enum/role.enum.ts
apps/user-access/src/seeder/role.json
```

When adding new permissions, don't just edit Keycloak. Need to update enum, seed, permission matrix, guard usage and related testing.

### 8.4 Tenant claim

tenant claim helps BFF know which tenant the current identity belongs to. QRTable is using `tenant_id` and has `tenantId` alias handling in its internal metadata.

Principle:

- Restaurant staff must be attached to the tenant.
- The request has a tenant that cannot match the user's tenant.
- `SUPER_ADMIN` has admin flows that may not require a specific restaurant tenant.
- Do not trust the tenant id sent by the frontend if it conflicts with claim/profile.

### 8.5 Role-based routing on Management App

Management App has a role-based route middleware to navigate the UX:

```txt
Owner into dashboard Owner
CHEF enters the kitchen
WAITER enters the service area
```

This is just the user experience layer. It is not the ultimate security mechanism. If the frontend route middleware is bypassed, BFF PermissionGuard must still block requests with insufficient permissions.

---

## 9. Keycloak does not own anything

Keycloak should be considered an identity provider, not a QRTable business service.

| Scope                                  | True source                                                |
| -------------------------------------- | ---------------------------------------------------------- |
| Menus, catalogs, products              | Catalog/Product service + PostgreSQL.                      |
| Order, bill, payment                   | Order/Payment service + PostgreSQL.                        |
| tenant lifecycle, subscription, plan   | SaaS services.                                             |
| Payment settings and SePay OAuth state | Payment service + contextual Redis/PostgreSQL.             |
| Customer QR session                    | BFF/Order session + Redis.                                 |
| Staff permissions details              | User-Access + permission matrix.                           |
| KDS runtime state                      | Kitchen + Redis/PostgreSQL by state type.                  |
| Realtime hints                         | BFF/Kitchen + WebSocket/Redis/Kafka depending on the flow. |

If a request sounds like "can this person log in", think Keycloak. If it sounds like "what data will the QRTable operation change", think of the service that owns the domain.

---

## 10. Instructions for configuring and operating Keycloak

This section answers the question: if you open Keycloak Admin Console, what configuration is needed, what is the meaning of each parameter, and how does that configuration map to the QRTable script/code.

In QRTable, script `tools/keycloak-bootstrap.sh` should be preferred to create repeatable configuration. Admin Console is suitable for testing, debugging, or understanding existing configuration.

### 10.1 Recommended order of operations

When configuring a new Keycloak environment for QRTable, go in this order:

1. Create or select realm `qrtable`.
2. Create OIDC clients `qrtable-bff` and `management-app`.
3. Turn on/off appropriate flow for each client.
4. Create realm roles `SUPER_ADMIN`, `Owner`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`.
5. Create user attributes `tenant_id` and `sub_role`.
6. Create protocol mappers to include `tenant_id` and `sub_role` in the token.
7. Assign service account roles to the backend client to call the Admin REST API.
8. Create a sample user or real user, set a password, assign realm role and tenant attributes.
9. Try logging in to Management App, call `/authorizer/me`, check roles/permissions/tenant.

### 10.2 Realm `qrtable`

Realm is the outer layer. In Admin Console:

```txt
Admin Console
  -> Realm selector
  -> Create realm
  -> Realm name: qrtable
```

Important parameters:

| Parameters   | Meaning                 | QRTable local/dev                                                             |
| ------------ | ----------------------- | ----------------------------------------------------------------------------- |
| Realm name   | Identifier space name.  | `qrtable`                                                                     |
| Enabled      | Does Realm work?        | Turn on.                                                                      |
| SSL Required | Mandatory HTTPS policy. | Local can be `none`; production must go through HTTPS/reverse proxy properly. |
| Login themes | Keycloak login theme.   | `keycloak-theme` if built/mounted `apps/keycloak-theme`.                      |

You should not change the realm name arbitrarily after configuring the app, because `AUTH_KEYCLOAK_ISSUER`, `KEYCLOAK_REALM`, JWKS endpoint and token issuer all depend on realm.

### 10.3 Client `management-app`

`management-app` is a client serving login via browser for Management App.

In Admin Console:

```txt
Clients
  -> Create client
  -> Client type: OpenID Connect
  -> Client ID: management-app
```

Parameters you should understand:

| Parameters            | Meaning                                                                    | QRTable                                                                  |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Client authentication | On means confidential client (client has secret). Off means public client. | Using secrets via NextAuth, should be enabled.                           |
| Standard flow         | Turn on Authorization Code Flow for browser login.                         | Turn on.                                                                 |
| Direct access grants  | Allow password grants.                                                     | No need for main login; Only enable if there is a clear use case/script. |
| service accounts      | Allow client credentials.                                                  | Not required for Management App.                                         |
| Valid redirect URIs   | Keycloak URLs are allowed to redirect after login.                         | Local: `http://localhost:3000/*`.                                        |
| Web origins           | Origin frontend is allowed according to CORS/OIDC browser flow.            | Local: `http://localhost:3000`.                                          |
| Client secret         | The client secret is used on the server-side NextAuth.                     | Put in `AUTH_KEYCLOAK_SECRET`, do not output to browser.                 |

Management App needs env:

```txt
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=...
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable
```

### 10.4 Client `qrtable-bff`

The name `qrtable-bff` in the code is currently the backend/confidential client that the Authorizer uses to exchange tokens and call the Keycloak Admin REST API.

Main parameters:

| Parameters            | Meaning                                          | QRTable                                                                                              |
| --------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Client authentication | Allows use of client secrets.                    | Turn on.                                                                                             |
| service accounts      | Allow client credentials grant.                  | Turn on, let Authorizer get admin/service token.                                                     |
| Direct access grants  | Allow password grants.                           | Enabled in bootstrap because the code has `exchangeUserToken()`.                                     |
| Standard flow         | Enable authorization code flow.                  | Enabled in bootstrap to keep the client flexible, but the main frontend login uses `management-app`. |
| Client secret         | Secret backend used when calling token endpoint. | Put in `KEYCLOAK_CLIENT_SECRET`.                                                                     |

Corresponding backend env:

```txt
KEYCLOAK_HOST=http://localhost:8180
KEYCLOAK_REALM=qrtable
KEYCLOAK_CLIENT_ID=qrtable-bff
KEYCLOAK_CLIENT_SECRET=...
```

### 10.5 Realm roles

In Admin Console:

```txt
Realm roles
  -> Create role
  -> SUPER_ADMIN / OWNER / MANAGER / WAITER / CHEF / BARISTA
```

These roles are high-level identification roles. Don't stuff QRTable permission details into the Keycloak role if that permission already belongs to User-Access.

When creating users:

```txt
Users
-> select user
  -> Role mapping
  -> Assign realm role
```

After login, the role appears in the token in `realm_access.roles`, then the Authorizer compares it with the internal role.

### 10.6 User attributes and protocol mappers

QRTable needs to claim `tenant_id` and `sub_role` in the token. There are two steps:

1. Create user attributes.
2. Create protocol mappers to include those attributes in the access token.

In the Admin Console, for users:

```txt
Users
-> select user
  -> Attributes
  -> tenant_id = <tenant-id>
  -> sub_role = OWNER / MANAGER / ...
```

In client `management-app` and `qrtable-bff`, create mapper:

```txt
Client
  -> Client scopes / Mappers / Protocol mappers
  -> User Attribute
  -> user.attribute: tenant_id
  -> claim.name: tenant_id
  -> Add to access token: ON
-> Add to ID token / userinfo: ON if frontend/backend needs to read
```

Repeat for `sub_role`. If the mapper is missing, the user can still log in but the BFF/Authorizer may not see the tenant claim, leading to tenant or profile mapping errors.

### 10.7 service account roles for Admin REST API

For Authorizer to create/disable users via Admin REST API, the backend client's service account must have user admin rights.

In Admin Console:

```txt
Clients
  -> qrtable-bff
  -> Service account roles
  -> Assign role
  -> Filter by clients
  -> realm-management
  -> manage-users, view-users, query-users, view-realm
```

Meaning:

| Role           | What to use                                           |
| -------------- | ----------------------------------------------------- |
| `manage-users` | Create, update, disable users, assign realm roles.    |
| `view-users`   | Read user by id/email.                                |
| `query-users`  | Search for users when needing to check existence.     |
| `view-realm`   | Read realm roles (required before assigning `OWNER`). |

Do not assign broader administrative rights if not needed. The more rights a service account has, the greater the risk of revealing client secrets.

### 10.8 Create manual users for testing

When you need to create user tests using Admin Console:

1. Go to `Users -> Add user`.
2. Fill in `username`, `email`, `firstName`, `lastName`.
3. Turn on `Email verified` if you want to skip local email verification.
4. Add attributes `tenant_id` and `sub_role`.
5. Go to `Credentials`, set password.
6. Remove temporary if you are a permanent dev user; Turn on temporary if you want the user to change their password for the first time.
7. Go to `Role mapping`, assign the appropriate realm role.
8. Make sure User-Access also has the corresponding profile, otherwise the valid token will still be `user_not_provisioned`.

The last point is very important: creating a user in Keycloak is not enough. QRTable needs a User-Access profile to get permissions.

### 10.9 Check token and claim

After logging in, you can check the access token in this order:

1. Does the token have the correct issuer: `http://localhost:8180/realms/qrtable`.
2. Is the token `realm_access.roles`?
3. Does the token have `tenant_id` and `sub_role`?
4. Is the header `kid`?
5. Does the JWKS endpoint have a corresponding public key?
6. Does calling BFF `/authorizer/me` return roles, permissions, tenantId?

Do not use visual decoding of payloads as security evidence. The payload is only trustworthy after the Authorizer verifies the JWT signature using JWKS.

---

## 11. Local setup, deployment and debugging

### 11.1 Local configuration

Keycloak local is declared in `docker-compose.provider.yaml`:

```txt
Image: quay.io/keycloak/keycloak:25.0.0
Port: 8180:8080
Admin user: admin
Admin password: admin
Realm: qrtable
```

Backend environment variables:

```txt
KEYCLOAK_HOST=http://localhost:8180
KEYCLOAK_REALM=qrtable
KEYCLOAK_CLIENT_ID=qrtable-bff
KEYCLOAK_CLIENT_SECRET=...
```

Management App environment variables:

```txt
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=...
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable
```

Script `tools/keycloak-bootstrap.sh` is used for local/dev environment to:

- Create or update realm `qrtable`.
- Create OIDC clients `qrtable-bff` and `management-app`.
- Create user profile attributes `tenant_id` and `sub_role`.
- Create protocol mappers to include `tenant_id` and `sub_role` in JWT.
- Create realm roles `SUPER_ADMIN`, `Owner`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`.
- Seed user sample from `tools/auth-bootstrap-users.json`.

### 11.2 Explanation of configuration parameters

Parameters in `docker-compose.provider.yaml` and related env:

| Parameters                                   | Meaning                                                                | QRTable local/dev                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `quay.io/keycloak/keycloak:25.0.0`           | Image Keycloak is running.                                             | Immobilization to avoid behavioral deviations between environments.               |
| `8180:8080`                                  | Map host port `8180` to container port `8080`.                         | Access Keycloak via `http://localhost:8180`.                                      |
| `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | Keycloak's original admin account.                                     | `admin/admin` is for local/dev only.                                              |
| `KC_HEALTH_ENABLED=true`                     | Enable Keycloak's internal health endpoint.                            | Used for Docker healthcheck.                                                      |
| `KC_PROXY_HEADERS=xforwarded`                | Proxy header information like `X-Forwarded-Host`, `X-Forwarded-Proto`. | Useful when going through ngrok/Cloudflare Tunnel/reverse proxy.                  |
| `KC_HOSTNAME_STRICT=false`                   | Do not force the hostname to match.                                    | Convenient for local/tunnel; production should configure the hostname explicitly. |
| `command: start-dev`                         | Run development mode.                                                  | Suitable for local, not production configuration.                                 |
| Volume `/opt/keycloak/data`                  | Save Keycloak data locally.                                            | Keep realm/client/user after restarting the container.                            |
| Volume `/opt/keycloak/providers`             | Mount provider/theme JAR.                                              | Use custom Keycloak theme from `apps/keycloak-theme`.                             |

App env variables:

| Variable                             | Who uses           | Meaning                                                                                       |
| ------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------- |
| `KEYCLOAK_HOST`                      | Authorizer/backend | Base Keycloak URL, for example `http://localhost:8180`.                                       |
| `KEYCLOAK_REALM`                     | Authorizer/backend | Realm needs to verify token and call Admin API.                                               |
| `KEYCLOAK_CLIENT_ID`                 | Authorizer/backend | Client backend uses client secret/service account.                                            |
| `KEYCLOAK_CLIENT_SECRET`             | Authorizer/backend | Secret of the backend client.                                                                 |
| `AUTH_KEYCLOAK_ID`                   | Management App     | Client ID used for NextAuth provider.                                                         |
| `AUTH_KEYCLOAK_SECRET`               | Management App     | Client secret of `management-app`.                                                            |
| `AUTH_KEYCLOAK_ISSUER`               | Management App     | Issuer OIDC, must be `{KEYCLOAK_HOST}/realms/{realm}`.                                        |
| `AUTH_AUTO_PROVISION_ON_FIRST_LOGIN` | Authorizer         | Allows creating a User-Access profile when the token is valid but the profile does not exist. |

### 11.3 Keycloak deployment types

Keycloak has two main running types that need to be distinguished:

| Running style                  | When to use         | Features                                                                                       |
| ------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------- |
| Development mode (`start-dev`) | Local/dev/demo.     | Easy to start, accepts HTTP, flexible hostname, no default security configuration.             |
| Production mode (`start`)      | Staging/production. | Secure by default, needs clear hostname, correct HTTPS/TLS or reverse proxy, durable database. |

According to current Keycloak documentation, production mode requires more serious configuration of hostname and TLS. Implementation thinking example:

```txt
Internet
  -> HTTPS reverse proxy / load balancer
  -> Keycloak production mode
-> Keycloak private database
```

With production/staging, do not put the entire local composition up and run it publicly. Minimum required:

- Use `start`, not `start-dev`.
- Use a sustainable database for Keycloak, not dependent on temporary local volumes.
- Stable hostname/issuer configuration, for example `https://auth.qrtable.vn`.
- Enable HTTPS or set behind a reverse proxy that handles TLS properly.
- Configure proxy headers correctly if TLS terminates at the proxy.
- Do not use `admin/admin`.
- Manage client secrets using a secure secret manager/env.
- Separate realm/client by environment if necessary, do not mix dev and production users.

### 11.4 Realm/client model by environment

There are two popular ways:

| How                                                                                       | Advantages                                         | Disadvantages                             | Suggestions for QRTable            |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| One Keycloak instance, multiple realms (`qrtable-dev`, `qrtable-staging`, `qrtable-prod`) | Easy to separate data, clear issue.                | An instance is still a common dependency. | Good for small demo/staging.       |
| Each environment has its own Keycloak instance                                            | Sin isolation, production is less affected by dev. | More expensive to operate.                | Should be used in real production. |

Most importantly, the issuer must be stable. If `AUTH_KEYCLOAK_ISSUER` is `https://auth.example.com/realms/qrtable`, the token issued must also have that issuer; Authorizer/NextAuth should not point to another URL and hope the token still matches.

### 11.5 Useful Endpoints

| Purpose         | Endpoints                                                            |
| --------------- | -------------------------------------------------------------------- |
| Realm issuer    | `http://localhost:8180/realms/qrtable`                               |
| JWKS            | `http://localhost:8180/realms/qrtable/protocol/openid-connect/certs` |
| Token endpoint  | `http://localhost:8180/realms/qrtable/protocol/openid-connect/token` |
| Admin REST base | `http://localhost:8180/admin/realms/qrtable`                         |

### 11.6 Common errors

| Signs                               | How to understand                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 401 `invalid_token`                 | Expired token, wrong realm/issuer, wrong signature, missing `kid`, or JWKS cannot get the key.                   |
| 401 `user_not_provisioned`          | Keycloak user is valid but User-Access does not have an application profile.                                     |
| 401 role mapping mismatch           | Keycloak roles cannot be mapped to QRTable's internal roles.                                                     |
| 403 `permission_denied`             | The user is valid but lacks the required route permission.                                                       |
| tenant mismatch                     | tenant in request does not match tenant claim/profile.                                                           |
| Login repeats continuously          | NextAuth/Keycloak issuer, client secret, callback URL or refresh token have problems.                            |
| Duplicate emails when onboarding    | Keycloak or User-Access already has a user with that email.                                                      |
| New Owner logged in but was blocked | The Owner may have been created in Keycloak but the User-Access/subscription/onboarding profile is not complete. |

### 11.7 How to read class errors correctly

When encountering auth errors, the class should be separated:

```txt
1. Is Keycloak login successful?
2. Is the access token the correct issuer/realm/client?
3. Is Authorizer verify JWT successful?
4. Does User-Access have sub-profiles?
5. Does the Role mapping match?
6. Does TenantGuard find a valid tenant?
7. Does PermissionGuard find permission necessary?
```

This separation helps avoid all 401/403 errors being attributed to Keycloak.

---

## 12. Where to read the code

| Content                             | File/operation should read                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| Keycloak backend configuration      | `libs/configuration/src/lib/keycloak.config.ts`                                |
| Docker Keycloak local               | `docker-compose.provider.yaml`                                                 |
| Bootstrap realm/client/mapper/users | `tools/keycloak-bootstrap.sh`                                                  |
| List of sample users local/dev      | `tools/auth-bootstrap-users.json`                                              |
| NextAuth Keycloak provider          | `apps/management-app/src/auth.ts`                                              |
| Management App login page           | `apps/management-app/src/app/(auth)/login/page.tsx`                            |
| Route NextAuth                      | `apps/management-app/src/app/api/auth/[...nextauth]/route.ts`                  |
| Hydrate session frontend            | `apps/management-app/src/components/auth/auth-session-hydrator.tsx`            |
| Call BFF `/authorizer/me`           | `apps/management-app/src/lib/auth/bff-server.ts`                               |
| Role-based routing frontend         | `apps/management-app/src/lib/auth/role-routing.ts`                             |
| Authorizer verify JWT               | `apps/authorizer/src/app/authorizer/services/authorizer.service.ts`            |
| Call Keycloak token/admin API       | `apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts`           |
| Create Owner/disable user           | `apps/authorizer/src/app/keycloak/services/keycloak-admin.service.ts`          |
| TCP handler Keycloak                | `apps/authorizer/src/app/keycloak/controllers/keycloak.controller.ts`          |
| gRPC verify token                   | `apps/authorizer/src/app/authorizer/controllers/authorizer-grpc.controller.ts` |
| BFF UserGuard                       | `libs/guards/src/lib/user.guard.ts`                                            |
| BFF TenantGuard                     | `libs/guards/src/lib/tenant.guard.ts`                                          |
| BFF PermissionGuard                 | `libs/guards/src/lib/permission.guard.ts`                                      |
| SaaS onboarding Owner               | `apps/saas/src/services/onboarding-saga.service.ts`                            |
| User profile/profile upsert         | `apps/user-access/src/app/modules/user/services/user.service.ts`               |
| tenant Owner profile                | `apps/user-access/src/app/modules/user/services/tenant-user.service.ts`        |
| Permission enum                     | `libs/constants/src/lib/enum/role.enum.ts`                                     |
| Role seeds                          | `apps/user-access/src/seeder/role.json`                                        |

---

## 13. Checklist

### 13.1 When adding a BFF route that needs protection

- Route has `@Authorization({ secured: true })` if staff/admin login is needed.
- Route has permission metadata if the operation requires specific permissions.
- Determined whether the route needs a tenant or allows `SUPER_ADMIN` bypass.
- Frontend route middleware if you need UX navigation, but don't consider it a security boundary.
- Test for errors 401 invalid token, 401 user not provisioned, 403 missing permission and tenant mismatch if the route has a tenant.

### 13.2 When adding roles or permissions

- Update `libs/constants/src/lib/enum/role.enum.ts`.
- Update `apps/user-access/src/seeder/role.json`.
- Update `docs/architecture/permission-matrix.md`.
- Make sure Keycloak realm has the corresponding realm role if this is a new identified role.
- Check Authorizer role mapping.
- Check Management App route mapping if the role affects navigation.

### 13.3 When adding a new Keycloak claim

- Add user attribute/protocol mapper in Keycloak realm.
- Update the payload interface if the backend needs to read claims.
- Update Authorizer transform payload if claim goes through gRPC/proto.
- Update guard/service to read claims.
- Clearly write whether the claim is identity claim or application/domain state.
- Update relevant documents if claim affects tenant/permission.

### 13.4 When adding a new user creation flow

- Do not let the frontend call the Keycloak Admin REST API.
- The backend must create the Keycloak user and User-Access profile in order with rollback.
- If the following step fails, there is compensating action such as disable user.
- If using temporary password, enable required action `UPDATE_PASSWORD`.
- Check for duplicate emails in both Keycloak and User-Access.
- Do not log client secret, access token, refresh token or password.

### 13.5 When debugging production/staging

- Check if `AUTH_KEYCLOAK_ISSUER` and `KEYCLOAK_HOST/REALM` point to the correct environment.
- Check Keycloak's HTTPS/hostname/proxy headers.
- Check Management App callback URL in Keycloak client.
- Check JWKS endpoint is accessible from Authorizer.
- Check Redis token cache if the user has just changed role/permission but the request still uses the old metadata.
- Check User-Access profile before thinking Keycloak is wrong.

---

## Note the reference source

This document was written by comparing the QRTable code on `main` with the official Keycloak documentation via Context7, especially the sections on Admin REST API, OpenID Connect client, service account/client credentials, realm role, protocol mapper and user management. When differences arise between this document and existing code, prioritize the code + canonical architecture docs, then update this guide.
