# Permission Matrix — QRTable

> **Status:** Active after Phase 4B · static-verified against `PERMISSION` enum and `role.json` on 2026-05-13
> **Version:** 2.0
> **Single source of truth:** RBAC documentation is derived from `libs/constants/src/lib/enum/role.enum.ts` and `apps/user-access/src/seeder/role.json`.

## 1. Purpose And Principles

This file is the canonical reference for QRTable role-permission mapping. When permissions change:

1. Update `PERMISSION` enum.
2. Update `apps/user-access/src/seeder/role.json`.
3. Update this matrix.
4. Re-seed MongoDB.
5. Verify with the role/unit/integration checks in §8.

Design principles:

- Roles are global templates; tenant-specific role customization is future work.
- Permissions use `domain.action_snake_case`.
- CUSTOMER has no `role.json` entry and is controlled by session-scoped customer guards.
- SUPER_ADMIN receives every permission in the enum and bypasses tenant scoping for platform administration.
- `SAAS_*` permissions are legacy aliases kept for backward compatibility; Phase 4B uses `TENANT_*`, `SUBSCRIPTION_*`, `PLAN_*`, and `PAYMENT_SETTINGS_*`.

## 2. Glossary

| Term          | Definition                                                   |
| ------------- | ------------------------------------------------------------ |
| Role          | User role stored in Keycloak and MongoDB `role` collection.  |
| Permission    | Capability string stored in `role.permissions[]`.            |
| Domain        | Feature area prefix such as `tenant`, `catalog`, or `order`. |
| JWT role      | Role claim in Keycloak access token.                         |
| DB permission | MongoDB permission source consumed by permission guards.     |
| CUSTOMER      | Session actor from QR flow, not an RBAC role.                |

## 3. Roles Catalog

| Role        | Scope                 | Description                                                                                    | Tenant binding                        |
| ----------- | --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| SUPER_ADMIN | Cross-tenant platform | Platform administrator for tenants, plans, subscriptions, and global RBAC                      | Platform claim; bypasses TenantGuard  |
| OWNER       | Single tenant         | Restaurant owner with full operational, staff, billing, and own-tenant settings permissions    | Bound to `tenant_id` claim            |
| MANAGER     | Single tenant         | Operational manager; similar to OWNER but no user delete, checkout, or payment-settings update | Bound to `tenant_id` claim            |
| WAITER      | Single tenant         | Floor service role for order confirmation, cash payment, table status, and service requests    | Bound to `tenant_id` claim            |
| CHEF        | Single tenant         | Kitchen staff for KDS food tickets                                                             | Bound to `tenant_id` claim            |
| BARISTA     | Single tenant         | Bar staff for KDS drink tickets                                                                | Bound to `tenant_id` claim            |
| CUSTOMER    | Session scoped        | Anonymous diner using QR session APIs                                                          | Tenant from signed QR/session context |

## 4. Permission Catalog (66 Values)

| #   | Enum                            | Value                           | Notes                                    |
| --- | ------------------------------- | ------------------------------- | ---------------------------------------- |
| 1   | `SAAS_CREATE`                   | `saas.create`                   | Legacy SaaS alias; SUPER_ADMIN only.     |
| 2   | `SAAS_GET_BY_ID`                | `saas.get_by_id`                | Legacy SaaS alias; SUPER_ADMIN only.     |
| 3   | `SAAS_GET_LIST`                 | `saas.get_list`                 | Legacy SaaS alias; SUPER_ADMIN only.     |
| 4   | `SAAS_UPDATE`                   | `saas.update`                   | Legacy SaaS alias; SUPER_ADMIN only.     |
| 5   | `SAAS_DELETE`                   | `saas.delete`                   | Legacy SaaS alias; SUPER_ADMIN only.     |
| 6   | `TENANT_ONBOARD`                | `tenant.onboard`                | Onboard a tenant.                        |
| 7   | `TENANT_LIST_ALL`               | `tenant.list_all`               | List tenants platform-wide.              |
| 8   | `TENANT_READ_ANY`               | `tenant.read_any`               | Read any tenant platform-wide.           |
| 9   | `TENANT_READ_OWN`               | `tenant.read_own`               | Read own tenant.                         |
| 10  | `TENANT_UPDATE`                 | `tenant.update`                 | Update tenant.                           |
| 11  | `TENANT_SUSPEND`                | `tenant.suspend`                | Suspend tenant.                          |
| 12  | `TENANT_ACTIVATE`               | `tenant.activate`               | Reactivate tenant.                       |
| 13  | `TENANT_CLOSE`                  | `tenant.close`                  | Close tenant.                            |
| 14  | `SUBSCRIPTION_ASSIGN`           | `subscription.assign`           | Assign subscription platform-wide.       |
| 15  | `SUBSCRIPTION_LIST_ANY`         | `subscription.list_any`         | List subscriptions platform-wide.        |
| 16  | `SUBSCRIPTION_LIST_HISTORY_ANY` | `subscription.list_history_any` | List subscription history platform-wide. |
| 17  | `SUBSCRIPTION_READ_OWN`         | `subscription.read_own`         | Read own tenant subscription.            |
| 18  | `SUBSCRIPTION_CHECKOUT`         | `subscription.checkout`         | Start own-tenant checkout.               |
| 19  | `PLAN_CREATE`                   | `plan.create`                   | Create SaaS plan.                        |
| 20  | `PLAN_READ`                     | `plan.read`                     | Read SaaS plans.                         |
| 21  | `PLAN_UPDATE`                   | `plan.update`                   | Update SaaS plan.                        |
| 22  | `PLAN_DELETE`                   | `plan.delete`                   | Delete SaaS plan.                        |
| 23  | `PAYMENT_SETTINGS_READ_OWN`     | `payment_settings.read_own`     | Read own tenant payment settings.        |
| 24  | `PAYMENT_SETTINGS_UPDATE_OWN`   | `payment_settings.update_own`   | Update own tenant payment settings.      |
| 25  | `CATALOG_CREATE`                | `catalog.create`                | Create catalog entity.                   |
| 26  | `CATALOG_GET_BY_ID`             | `catalog.get_by_id`             | Read catalog entity.                     |
| 27  | `CATALOG_GET_LIST`              | `catalog.get_list`              | List catalog entities.                   |
| 28  | `CATALOG_UPDATE`                | `catalog.update`                | Update catalog entity.                   |
| 29  | `CATALOG_DELETE`                | `catalog.delete`                | Delete catalog entity.                   |
| 30  | `USER_CREATE`                   | `user.create`                   | Create staff user.                       |
| 31  | `USER_GET_BY_ID`                | `user.get_by_id`                | Read staff user.                         |
| 32  | `USER_GET_ALL`                  | `user.get_all`                  | List staff users.                        |
| 33  | `USER_UPDATE`                   | `user.update`                   | Update staff user.                       |
| 34  | `USER_DELETE`                   | `user.delete`                   | Delete staff user.                       |
| 35  | `ROLE_CREATE`                   | `role.create`                   | Create role.                             |
| 36  | `ROLE_GET_BY_ID`                | `role.get_by_id`                | Read role.                               |
| 37  | `ROLE_GET_ALL`                  | `role.get_all`                  | List roles.                              |
| 38  | `ROLE_UPDATE`                   | `role.update`                   | Update role.                             |
| 39  | `ROLE_DELETE`                   | `role.delete`                   | Delete role.                             |
| 40  | `PRODUCT_CREATE`                | `product.create`                | Legacy template permission.              |
| 41  | `PRODUCT_GET_BY_ID`             | `product.get_by_id`             | Legacy template permission.              |
| 42  | `PRODUCT_GET_ALL`               | `product.get_all`               | Legacy template permission.              |
| 43  | `PRODUCT_UPDATE`                | `product.update`                | Legacy template permission.              |
| 44  | `PRODUCT_DELETE`                | `product.delete`                | Legacy template permission.              |
| 45  | `ORDER_CREATE`                  | `order.create`                  | Create order.                            |
| 46  | `ORDER_CONFIRM`                 | `order.confirm`                 | Confirm pending order.                   |
| 47  | `ORDER_CANCEL_PENDING`          | `order.cancel_pending`          | Reject/cancel pending order.             |
| 48  | `ORDER_CANCEL_PROCESSING`       | `order.cancel_processing`       | Cancel confirmed or processing order.    |
| 49  | `ORDER_GET_LIST`                | `order.get_list`                | List orders.                             |
| 50  | `ORDER_GET_BY_ID`               | `order.get_by_id`               | Read order detail.                       |
| 51  | `KITCHEN_GET_QUEUE`             | `kitchen.get_queue`             | Read KDS queue.                          |
| 52  | `KITCHEN_UPDATE_TICKET`         | `kitchen.update_ticket`         | Update KDS ticket status.                |
| 53  | `KITCHEN_RECALL`                | `kitchen.recall`                | Recall completed KDS ticket.             |
| 54  | `KITCHEN_SET_PRIORITY`          | `kitchen.set_priority`          | Set or clear KDS ticket priority.        |
| 55  | `PAYMENT_CREATE`                | `payment.create`                | Create payment.                          |
| 56  | `PAYMENT_CONFIRM_CASH`          | `payment.confirm_cash`          | Confirm cash payment.                    |
| 57  | `PAYMENT_REFUND`                | `payment.refund`                | Refund payment.                          |
| 58  | `PAYMENT_GET_HISTORY`           | `payment.get_history`           | Read payment history.                    |
| 59  | `TABLE_CREATE`                  | `table.create`                  | Create table.                            |
| 60  | `TABLE_UPDATE`                  | `table.update`                  | Update table.                            |
| 61  | `TABLE_DELETE`                  | `table.delete`                  | Delete table.                            |
| 62  | `TABLE_TRANSFER`                | `table.transfer`                | Transfer session/order between tables.   |
| 63  | `TABLE_UPDATE_STATUS`           | `table.update_status`           | Update table status.                     |
| 64  | `SERVICE_REQUEST_CREATE`        | `service_request.create`        | Create service request.                  |
| 65  | `SERVICE_REQUEST_ACKNOWLEDGE`   | `service_request.acknowledge`   | Acknowledge service request.             |
| 66  | `SERVICE_REQUEST_RESOLVE`       | `service_request.resolve`       | Resolve service request.                 |

## 5. Removed Or Legacy Items

| Item                                                           | Current status                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `INVOICE_*` permissions                                        | Not present in current `PERMISSION` enum or `role.json`; bills/payment history use payment/order permissions.             |
| Legacy template roles such as `administrator` and `accountant` | Not active RBAC roles.                                                                                                    |
| `SAAS_*` permissions                                           | Still present in code for SUPER*ADMIN backward compatibility; use Phase 4B `TENANT*\*` permissions for new SaaS behavior. |
| `PRODUCT_*` permissions                                        | Still present for SUPER_ADMIN backward compatibility with template code.                                                  |

## 6. Canonical Permission Matrix (6 Roles × 66 Permissions)

Legend: `✅` = granted; blank = not granted.

| #         | Permission                      | SUPER_ADMIN | OWNER  | MANAGER | WAITER | CHEF  | BARISTA |
| --------- | ------------------------------- | :---------: | :----: | :-----: | :----: | :---: | :-----: |
| 1         | `saas.create`                   |     ✅      |        |         |        |       |         |
| 2         | `saas.get_by_id`                |     ✅      |        |         |        |       |         |
| 3         | `saas.get_list`                 |     ✅      |        |         |        |       |         |
| 4         | `saas.update`                   |     ✅      |        |         |        |       |         |
| 5         | `saas.delete`                   |     ✅      |        |         |        |       |         |
| 6         | `tenant.onboard`                |     ✅      |        |         |        |       |         |
| 7         | `tenant.list_all`               |     ✅      |        |         |        |       |         |
| 8         | `tenant.read_any`               |     ✅      |        |         |        |       |         |
| 9         | `tenant.read_own`               |     ✅      |   ✅   |   ✅    |        |       |         |
| 10        | `tenant.update`                 |     ✅      |        |         |        |       |         |
| 11        | `tenant.suspend`                |     ✅      |        |         |        |       |         |
| 12        | `tenant.activate`               |     ✅      |        |         |        |       |         |
| 13        | `tenant.close`                  |     ✅      |        |         |        |       |         |
| 14        | `subscription.assign`           |     ✅      |        |         |        |       |         |
| 15        | `subscription.list_any`         |     ✅      |        |         |        |       |         |
| 16        | `subscription.list_history_any` |     ✅      |        |         |        |       |         |
| 17        | `subscription.read_own`         |     ✅      |   ✅   |   ✅    |        |       |         |
| 18        | `subscription.checkout`         |     ✅      |   ✅   |         |        |       |         |
| 19        | `plan.create`                   |     ✅      |        |         |        |       |         |
| 20        | `plan.read`                     |     ✅      |   ✅   |   ✅    |   ✅   |  ✅   |   ✅    |
| 21        | `plan.update`                   |     ✅      |        |         |        |       |         |
| 22        | `plan.delete`                   |     ✅      |        |         |        |       |         |
| 23        | `payment_settings.read_own`     |     ✅      |   ✅   |   ✅    |        |       |         |
| 24        | `payment_settings.update_own`   |     ✅      |   ✅   |         |        |       |         |
| 25        | `catalog.create`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 26        | `catalog.get_by_id`             |     ✅      |   ✅   |   ✅    |   ✅   |  ✅   |   ✅    |
| 27        | `catalog.get_list`              |     ✅      |   ✅   |   ✅    |   ✅   |  ✅   |   ✅    |
| 28        | `catalog.update`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 29        | `catalog.delete`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 30        | `user.create`                   |     ✅      |   ✅   |   ✅    |        |       |         |
| 31        | `user.get_by_id`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 32        | `user.get_all`                  |     ✅      |   ✅   |   ✅    |        |       |         |
| 33        | `user.update`                   |     ✅      |   ✅   |   ✅    |        |       |         |
| 34        | `user.delete`                   |     ✅      |   ✅   |         |        |       |         |
| 35        | `role.create`                   |     ✅      |        |         |        |       |         |
| 36        | `role.get_by_id`                |     ✅      |        |         |        |       |         |
| 37        | `role.get_all`                  |     ✅      |        |         |        |       |         |
| 38        | `role.update`                   |     ✅      |        |         |        |       |         |
| 39        | `role.delete`                   |     ✅      |        |         |        |       |         |
| 40        | `product.create`                |     ✅      |        |         |        |       |         |
| 41        | `product.get_by_id`             |     ✅      |        |         |        |       |         |
| 42        | `product.get_all`               |     ✅      |        |         |        |       |         |
| 43        | `product.update`                |     ✅      |        |         |        |       |         |
| 44        | `product.delete`                |     ✅      |        |         |        |       |         |
| 45        | `order.create`                  |     ✅      |   ✅   |   ✅    |        |       |         |
| 46        | `order.confirm`                 |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 47        | `order.cancel_pending`          |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 48        | `order.cancel_processing`       |     ✅      |   ✅   |   ✅    |        |       |         |
| 49        | `order.get_list`                |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 50        | `order.get_by_id`               |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 51        | `kitchen.get_queue`             |     ✅      |   ✅   |   ✅    |        |  ✅   |   ✅    |
| 52        | `kitchen.update_ticket`         |     ✅      |   ✅   |   ✅    |        |  ✅   |   ✅    |
| 53        | `kitchen.recall`                |     ✅      |   ✅   |   ✅    |        |  ✅   |   ✅    |
| 54        | `kitchen.set_priority`          |     ✅      |   ✅   |   ✅    |        |       |         |
| 55        | `payment.create`                |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 56        | `payment.confirm_cash`          |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 57        | `payment.refund`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 58        | `payment.get_history`           |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 59        | `table.create`                  |     ✅      |   ✅   |   ✅    |        |       |         |
| 60        | `table.update`                  |     ✅      |   ✅   |   ✅    |        |       |         |
| 61        | `table.delete`                  |     ✅      |   ✅   |   ✅    |        |       |         |
| 62        | `table.transfer`                |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 63        | `table.update_status`           |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 64        | `service_request.create`        |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 65        | `service_request.acknowledge`   |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 66        | `service_request.resolve`       |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| **Total** |                                 |   **66**    | **38** | **35**  | **15** | **6** |  **6**  |

## 7. Assignment Notes

- SUPER_ADMIN has every enum permission: 66/66.
- OWNER has full tenant operations plus own-tenant SaaS self-service: `tenant.read_own`, `subscription.read_own`, `subscription.checkout`, `plan.read`, and own payment-settings read/update.
- MANAGER has operational permissions plus own-tenant SaaS visibility: `tenant.read_own`, `subscription.read_own`, `plan.read`, and `payment_settings.read_own`.
- WAITER has catalog read, plan read, order confirm/cancel pending/read, payment create/cash/history, table transfer/status, and service-request handling.
- CHEF and BARISTA have catalog read, plan read, and KDS queue/update/recall. They do not have `kitchen.set_priority`.
- `order.cancel_pending` is granted to OWNER, MANAGER, and WAITER; `order.cancel_processing` is restricted to OWNER and MANAGER.

## 8. CUSTOMER Actor

CUSTOMER has no DB role. Customer actions are guarded by session/ownership checks, not by `role.permissions[]`.

| Action                   | Typical endpoint pattern                 | Guard source                                   |
| ------------------------ | ---------------------------------------- | ---------------------------------------------- |
| Submit order             | `POST /api/v1/customer/orders`           | Session guard and tenant/session ownership     |
| Cancel own pending order | `DELETE /api/v1/customer/orders/:id`     | Session guard, order ownership, pending status |
| Submit service request   | `POST /api/v1/customer/service-requests` | Session guard and tenant/session ownership     |
| View own order status    | `GET /api/v1/customer/orders/:id`        | Session guard and order ownership              |
| Add/update cart          | `POST/PATCH /api/v1/customer/cart`       | Session guard and Redis session/cart ownership |

## 9. Operational Procedures

### 9.1 Add Or Change A Permission

1. Update `libs/constants/src/lib/enum/role.enum.ts`.
2. Update `apps/user-access/src/seeder/role.json`.
3. Update this document's catalog, matrix, totals, and assignment notes.
4. Update tests that encode the expected role matrix.
5. Re-seed MongoDB.
6. Re-login or clear cached authorizer responses before manual verification.

### 9.2 Re-seed MongoDB

```bash
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder prune
```

### 9.3 Verification

| Layer                      | What                                                      | Command                                  |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| PermissionGuard unit tests | Guard mechanics and permission behavior                   | `npx nx test bff`                        |
| Role seed validation       | `role.json` schema and expected matrix                    | `npx nx test user-access`                |
| Integration verification   | Keycloak login → BFF `/authorizer/me` → permissions array | `bash tools/verify-permission-matrix.sh` |

`tools/verify-permission-matrix.sh` is an integration smoke test. It requires BFF/Authorizer and seeded MongoDB to be running, and it checks representative permissions rather than parsing this markdown file.

> **2026-05-13 verification note:** Static code/seed verification confirms 66 enum permissions and role seed counts `SUPER_ADMIN=66`, `OWNER=38`, `MANAGER=35`, `WAITER=15`, `CHEF=6`, `BARISTA=6`. The integration smoke script still depends on live seeded credentials; in the current local environment, OWNER/WAITER/CHEF/BARISTA passed, while SUPER_ADMIN and MANAGER login returned 401 and require seed/credential refresh before the smoke is fully green.

## 10. Frontend Navigation Vs API Enforcement

| Layer               | Responsibility                                                                      | Source of truth                                         |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| BFF / microservices | Enforce `UserGuard` → `TenantGuard` → `PermissionGuard` on protected API endpoints. | `role.json`, controller `@Permissions`, and this matrix |
| `management-app`    | Hide or redirect role-inappropriate navigation as UX only.                          | Role-routing and sidebar configuration in the frontend  |

Frontend navigation does not replace backend authorization. A hidden menu is only convenience; an API call outside the role's permissions must still return 403.
