# Tài Liệu Giải Thích Tích Hợp Keycloak + Keycloakify + Frontend

> Phạm vi tài liệu: giải thích chi tiết hệ thống hiện tại trong codebase QRTable, các cấu hình bắt buộc ở Keycloak, cách Management App tích hợp với Keycloak qua Auth.js, cách Keycloakify đang được setup để custom giao diện đăng nhập, và flow end-to-end từ lúc người dùng bấm đăng nhập đến lúc middleware phân quyền theo role.

> Tài liệu đối chiếu:
>
> - `docs/business-logic.md`
> - `docs/implementation-plan-review.md`
> - `docs/technical-architecture.md`
> - `docs/step-0-6b-authentication-authorization-chi-tiet.md`

---

## 1. Mục tiêu của kiến trúc auth hiện tại

Trong QRTable, auth không chỉ là “đăng nhập được”. Nó đang phục vụ đồng thời 4 yêu cầu kiến trúc:

1. `Keycloak` chịu trách nhiệm identity chuẩn OIDC/OAuth2: login, logout, realm roles, token, refresh token.
2. `Management App` dùng `Auth.js / NextAuth v5` để tích hợp OIDC với Next.js App Router và giữ session phía frontend.
3. `Authorizer service + user-access` chịu trách nhiệm “nội địa hóa” identity của Keycloak thành user profile nội bộ, permissions nội bộ, tenant context và role mapping hợp lệ.
4. `Keycloakify` chịu trách nhiệm custom UI đăng nhập của Keycloak để giữ trải nghiệm thống nhất với QRTable.

Nói ngắn gọn:

- `Keycloak` là identity provider.
- `Auth.js` là lớp tích hợp frontend với OIDC.
- `Authorizer` là lớp xác minh và hợp thức hóa token cho backend nghiệp vụ.
- `Keycloakify` là lớp giao diện cho trang login của Keycloak.

Điều này khớp với định hướng trong `technical-architecture.md`:

- Internal actors dùng `JWT (Keycloak)`.
- Management App dùng `role-based routing`.
- `tenant_id` phải đi xuyên từ identity layer xuống business layer.

---

## 2. Bức tranh tổng thể trong codebase hiện tại

### 2.1 Các thành phần thực tế đang có

#### A. Keycloak container

Trong `docker-compose.provider.yaml`, service `keycloak` đang:

- dùng image `quay.io/keycloak/keycloak:25.0.0`
- chạy `start-dev`
- expose cổng `8180:8080`
- mount dữ liệu vào `./docker/docker_data/keycloak_data`
- mount theme build output từ `./apps/keycloak-theme/dist_keycloak` vào `/opt/keycloak/providers`

Điểm quan trọng:

- Đây không phải cách mount theme kiểu cũ vào thư mục `themes/`.
- Với `Keycloakify`, output hiện tại là artifact để Keycloak load như provider package, nên mount vào `providers` là hợp lý.

#### B. Management App

Trong `apps/management-app/src/auth.ts`, app đang dùng:

- `next-auth` v5 beta
- `next-auth/providers/keycloak`
- issuer lấy từ `AUTH_KEYCLOAK_ISSUER`
- client lấy từ `AUTH_KEYCLOAK_ID`
- secret lấy từ `AUTH_KEYCLOAK_SECRET`
- scope yêu cầu là `openid profile email offline_access`

Điều đó có nghĩa:

- frontend đang dùng `Authorization Code Flow` qua Auth.js
- app muốn có `refresh_token`, nên mới yêu cầu `offline_access`

#### C. Keycloakify theme app

Trong `apps/keycloak-theme`:

- `vite.config.ts` có `keycloakify({ accountThemeImplementation: 'none' })`
- `package.json` có script `build-keycloak-theme`
- `src/login/pages/Login.tsx` là trang login custom
- `src/login/Template.tsx` là layout wrapper
- `src/login/KcPage.tsx` route page theo `pageId`
- `src/login/theme.css` là nơi định nghĩa token giao diện

#### D. Backend auth verification

Phía backend đang có 2 lớp:

1. `apps/authorizer`
   - verify JWT bằng JWKS của Keycloak
   - auto provision user nội bộ nếu bật cờ `AUTH_AUTO_PROVISION_ON_FIRST_LOGIN`
   - validate role mapping giữa realm role từ Keycloak và role nội bộ trong DB

2. `libs/guards`
   - `UserGuard`
   - `SessionGuard`
   - `TenantGuard`
   - `PermissionGuard`

Đây là guard chain đã được tài liệu hóa trong `step-0-6b-authentication-authorization-chi-tiet.md`.

---

## 3. Vì sao frontend không dùng trực tiếp Keycloak JS adapter?

Trong `implementation_plan.md`, Step 1.25 từng ghi “dùng NextAuth.js hoặc Keycloak JS Adapter”.

Code hiện tại đã chốt theo hướng `Auth.js / NextAuth`, và đây là lựa chọn hợp lý hơn với Next.js App Router vì:

1. Dễ tích hợp với `middleware.ts` để chặn route server-side.
2. Dễ giữ session ở phía Next.js thay vì tự quản token hoàn toàn trong browser.
3. Dễ viết `jwt callback` và `session callback` để enrich session với roles, permissions, tenantId.
4. Dễ refresh access token ở server-side bằng refresh token.

Nói cách khác:

- Nếu dùng `keycloak-js`, frontend sẽ nghiêng về SPA token management.
- Nếu dùng `Auth.js`, frontend nghiêng về server-aware authentication, phù hợp hơn với app Next.js có middleware, server actions, route handlers.

Trong repo của bạn, kiến trúc thực tế đã là:

`Management App -> Auth.js -> Keycloak`

không phải:

`Management App -> keycloak-js trực tiếp`

---

## 4. Những gì cần cấu hình trong Keycloak

Đây là phần quan trọng nhất nếu muốn hiểu “thực sự phải setup gì”.

### 4.1 Realm

Bạn cần một realm riêng cho hệ thống, hiện tại là:

- Realm name: `qrtable`

Realm là ranh giới identity của toàn bộ hệ thống. Tất cả user nội bộ, roles, clients, protocol mappers, theme login đều nằm trong realm này.

Theo code hiện tại:

- `KEYCLOAK_REALM=qrtable`
- `AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable`

Nếu realm khác tên, Auth.js sẽ fail vì issuer không khớp.

### 4.2 Realm roles

Hiện bootstrap script đang tạo các realm role:

- `SUPER_ADMIN`
- `OWNER`
- `MANAGER`
- `WAITER`
- `CHEF`
- `BARISTA`

Các role này được dùng ở 3 nơi:

1. Keycloak token claim `realm_access.roles`
2. `management-app/src/lib/auth/role-routing.ts` để route người dùng
3. `authorizer.service.ts` để validate role mapping với internal roles

Vì vậy, nếu role trong Keycloak và role trong DB không giao nhau, backend sẽ trả lỗi `ROLE_MAPPING_MISMATCH` và frontend có thể bị bật ra khỏi các route bảo vệ.

### 4.3 Client cho backend service account

Bootstrap script `tools/keycloak-bootstrap.sh` đang tạo client:

- `qrtable-bff`

Client này là `confidential`, bật:

- `serviceAccountsEnabled=true`
- `directAccessGrantsEnabled=true`
- `standardFlowEnabled=true`

Vai trò của client này trong code hiện tại:

1. `authorizer/keycloak-http.service.ts` dùng `client_credentials` để gọi Admin REST API tạo user Keycloak.
2. `authorizer/keycloak-http.service.ts` còn đang hỗ trợ `password grant` qua `exchangeUserToken()`.
3. Bootstrap script gán realm-management roles cho service account:
   - `manage-users`
   - `view-users`
   - `query-users`

Điểm cần hiểu:

- Đây là client phục vụ backend và admin automation.
- Đây không phải client mà Management App dùng để login OIDC.

### 4.4 Client cho Management App

Đây là phần quan trọng nhất nhưng hiện chưa được bootstrap script tạo tự động.

Trong `apps/management-app/.env.example`, app đang kỳ vọng:

- `AUTH_KEYCLOAK_ID=management-app`
- `AUTH_KEYCLOAK_SECRET=...`
- `AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable`

Tức là bạn bắt buộc phải có thêm một client OIDC cho web app:

- Client ID: `management-app`
- Client type: `OpenID Connect`
- Client authentication: bật, vì app đang dùng `clientSecret`
- Standard flow: bật
- Direct access grants: không bắt buộc cho frontend flow này
- Service accounts: không cần cho frontend client

#### Login settings đề xuất cho local dev

- Valid redirect URIs:
  - `http://localhost:3000/api/auth/callback/keycloak`
  - `http://localhost:3000/*`
- Valid post logout redirect URIs:
  - `http://localhost:3000/*`
- Web origins:
  - `http://localhost:3000`

Nếu bạn đổi cổng hoặc domain production, phải cập nhật các giá trị này tương ứng.

### 4.5 Protocol mapper cho custom claims

Theo tài liệu auth của dự án và bootstrap script, Keycloak cần protocol mapper để đưa attribute người dùng thành JWT claim.

Hiện script đang tạo ít nhất 2 mapper:

1. `tenant_id-claim`
   - user attribute: `tenant_id`
   - claim name: `tenant_id`

2. `sub_role-claim`
   - user attribute: `sub_role`
   - claim name: `sub_role`

Vai trò của `tenant_id` claim là cực kỳ quan trọng vì:

- `TenantGuard` lấy `tenant_id` từ JWT
- `Auth.js` đọc `claims.tenant_id`
- frontend gọi BFF có thể gửi thêm `x-tenant-id`, nhưng backend vẫn đối chiếu với claim tenant

Nếu mapper này thiếu, bạn sẽ gặp một trong các lỗi:

- không resolve được tenant trong frontend session
- `Tenant is required`
- `Tenant mismatch with user identity`

### 4.6 User attributes

Realm roles chỉ giải quyết phần “user là ai theo vai trò”.
Multi-tenant còn cần “user thuộc tenant nào”.

Vì vậy user Keycloak nên có các attributes như:

- `tenant_id`
- `sub_role`

Ví dụ:

```text
tenant_id = tenant-a
sub_role = shift-manager
```

Sau đó mapper sẽ đẩy các giá trị này vào token.

### 4.7 Login theme

Sau khi build theme bằng Keycloakify và deploy vào container, bạn cần gán theme login cho realm:

- Realm Settings -> Themes -> Login Theme = `keycloak-theme`

Nếu không gán bước này, Keycloak vẫn dùng giao diện mặc định dù jar theme đã có mặt trong container.

### 4.8 Offline access và refresh token

Management App đang yêu cầu scope:

```ts
scope: 'openid profile email offline_access';
```

Mục tiêu là lấy được `refresh_token` để `auth.ts` có thể refresh access token khi gần hết hạn.

Điểm cần lưu ý:

- Client phải hỗ trợ standard OIDC flow bình thường.
- User/session policy trong realm phải cho phép phát refresh token.
- Nếu môi trường hoặc client policy chặn `offline_access`, callback refresh ở frontend sẽ fail.

---

## 5. Flow đăng nhập hiện tại của Management App

Đây là luồng thực tế đang chạy theo code.

### 5.1 Bước 1: User vào route bảo vệ

Ví dụ user vào:

- `/dashboard`
- `/pos`
- `/kds/kitchen`
- `/admin`

`apps/management-app/src/middleware.ts` chạy trước.

Logic chính:

1. nếu route là `/`:
   - chưa có role -> redirect `/login`
   - có role -> redirect đến home route theo role
2. nếu route là auth path:
   - chưa login -> cho vào
   - đã có role -> đẩy về home route
3. nếu route là protected path:
   - chưa có session `request.auth` -> redirect `/login?next=...`
   - có session nhưng không đúng role -> redirect về route home hợp lệ

### 5.2 Bước 2: Trang `/login` chỉ là launcher

File `apps/management-app/src/app/(auth)/login/page.tsx` không tự render form đăng nhập username/password.

Nó chỉ render nút:

```ts
await signIn('keycloak', { redirectTo: callbackUrl });
```

Tức là `/login` của app chỉ đóng vai trò:

- điểm vào thân thiện cho người dùng
- tính toán `callbackUrl`
- gọi Auth.js để redirect sang Keycloak

Form nhập credentials thật sự nằm ở Keycloak, và do Keycloakify custom.

### 5.3 Bước 3: Auth.js redirect sang Keycloak

Trong `apps/management-app/src/auth.ts`, provider được khai báo như sau:

```ts
Keycloak({
  clientId: process.env.AUTH_KEYCLOAK_ID,
  clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
  issuer: process.env.AUTH_KEYCLOAK_ISSUER,
  authorization: {
    params: {
      scope: 'openid profile email offline_access',
    },
  },
});
```

Khi đó Auth.js dùng discovery từ issuer và tự điều hướng user tới Keycloak authorization endpoint.

### 5.4 Bước 4: Keycloak hiển thị login UI đã custom bằng Keycloakify

Nếu realm đang gán Login Theme = `keycloak-theme`, user sẽ thấy UI trong `apps/keycloak-theme/src/login/pages/Login.tsx` thay vì giao diện mặc định.

Điều này có nghĩa:

- frontend business app và login page của Keycloak là 2 project tách biệt
- nhưng nhìn như cùng một hệ thiết kế nếu bạn đồng bộ token giao diện

### 5.5 Bước 5: Keycloak trả authorization code cho Auth.js

Sau khi user đăng nhập thành công:

1. Keycloak redirect về callback của Auth.js
2. Auth.js đổi authorization code lấy:
   - `access_token`
   - `refresh_token`
   - `expires_at`

### 5.6 Bước 6: `jwt` callback enrich token từ claims và backend profile

Đây là điểm rất quan trọng trong repo của bạn.

Trong `auth.ts`, khi có `account.access_token`, app làm 2 việc:

1. `decodeJwtClaims(account.access_token)` để đọc nhanh các claim như:
   - `email`
   - `name`
   - `preferred_username`
   - `tenant_id`
   - `realm_access.roles`

2. gọi `fetchAuthorizerMe(account.access_token, claims.tenant_id)`

Tức là frontend không chỉ tin token từ Keycloak, mà còn đi hỏi backend profile nội bộ.

Lý do là vì token Keycloak chưa chứa toàn bộ business context nội bộ như:

- internal `permissions`
- internal `userId`
- internal role/profile sau khi sync với `user-access`

Đây là thiết kế đúng với tài liệu `step-0-6b`:

- JWT hợp lệ mới chỉ là điều kiện cần
- user còn phải tồn tại hoặc auto-provision được ở hệ nội bộ
- role trong Keycloak còn phải cắt nhau với role nội bộ

### 5.7 Bước 7: Session của Auth.js được enrich

Sau khi `jwt` callback chạy xong, `session` callback sẽ đưa dữ liệu vào `session.user`:

- `id`
- `name`
- `email`
- `roles`
- `tenantId`
- `permissions`
- `accessToken`

Sau đó middleware và các component client-side sử dụng dữ liệu này.

### 5.8 Bước 8: Client hydrator lấy profile từ API nội bộ

`apps/management-app/src/components/auth/auth-session-hydrator.tsx` tiếp tục gọi:

- `GET /api/internal/me`

Route này lại lấy session từ Auth.js rồi gọi `fetchAuthorizerMe()` thêm một lần nữa.

Mục tiêu:

- hydrate Zustand auth store
- đồng bộ profile business context về client state
- fallback sang claims trong session nếu `/api/internal/me` bị `401`, tránh login loop

### 5.9 Bước 9: Middleware phân quyền theo role

`role-routing.ts` ánh xạ role sang route:

- `SUPER_ADMIN -> /admin`
- `OWNER, MANAGER -> /dashboard`
- `WAITER -> /pos`
- `CHEF -> /kds/kitchen`
- `BARISTA -> /kds/bar`

Vì vậy login xong, user không chỉ “đăng nhập thành công” mà còn bị điều hướng vào đúng workspace theo role.

---

## 6. Vì sao frontend còn phải gọi BFF/Authorizer sau khi đã login Keycloak?

Đây là chỗ dễ nhầm nhất.

Nếu nhìn bề ngoài, có thể nghĩ:

- đã có token Keycloak rồi thì cứ decode token là xong

Nhưng hệ thống của bạn không thiết kế như vậy. Nó có thêm lớp business authorization nội bộ.

### 6.1 Những gì Keycloak cung cấp

Keycloak cung cấp tốt:

- danh tính user
- realm roles
- token ký RS256
- refresh token
- custom claims qua protocol mapper

### 6.2 Những gì Keycloak không nên là nguồn sự thật duy nhất

Keycloak không phải nơi lý tưởng để chứa hoàn toàn business authorization vì:

- permissions nghiệp vụ nằm trong DB nội bộ
- role mapping cần đối chiếu với `user-access`
- user có thể tồn tại trong Keycloak nhưng chưa được provision trong hệ thống

### 6.3 Vai trò của Authorizer

`AuthorizerService.verifyUserToken()` làm các bước:

1. decode header để lấy `kid`
2. lấy public key từ JWKS endpoint
3. verify JWT signature RS256
4. lấy `sub`
5. tìm user nội bộ theo `sub`
6. nếu thiếu user và bật `AUTH_AUTO_PROVISION_ON_FIRST_LOGIN`, auto provision từ token
7. đọc `payload.realm_access.roles`
8. validate intersection giữa roles của Keycloak và roles trong DB nội bộ
9. collect permissions nội bộ

Chính vì vậy frontend gọi `/authorizer/me` là hợp lý. Nó đang hỏi:

- token này có được hệ thống nghiệp vụ chấp nhận không?
- user nội bộ là ai?
- tenant và permissions cuối cùng là gì?

---

## 7. Cách setup Keycloakify trong repo hiện tại

### 7.1 Mô hình hiện tại

Project `apps/keycloak-theme` là một app React/Vite độc lập, chỉ phục vụ việc build Keycloak theme.

Đây không phải một phần của Management App.

Nó có vòng đời riêng:

1. viết React UI cho các page của Keycloak
2. build bằng Vite
3. `keycloakify build` đóng gói artifact cho Keycloak
4. mount artifact vào container Keycloak
5. chọn theme trong Realm Settings

### 7.2 File cấu hình quan trọng

#### `apps/keycloak-theme/package.json`

Các script chính:

- `dev`: chạy Vite dev
- `build`: build app React
- `build-keycloak-theme`: build app rồi build artifact Keycloak
- `storybook`: test UI theme riêng biệt

#### `apps/keycloak-theme/vite.config.ts`

```ts
keycloakify({
  accountThemeImplementation: 'none',
});
```

Ý nghĩa:

- chỉ custom login theme
- chưa custom account console theme

#### `apps/keycloak-theme/src/main.tsx`

Entrypoint đọc `window.kcContext` do Keycloak inject.

Nếu không có `kcContext`, app render `No Keycloak Context`.

Điều này cho thấy theme app không tự hoạt động như business app bình thường, mà phụ thuộc vào runtime context của Keycloak.

#### `apps/keycloak-theme/src/kc.gen.tsx`

File auto-generated, khai báo:

- theme name: `keycloak-theme`
- page router
- type `KcContext`

Không nên sửa tay file này.

### 7.3 Cấu trúc custom page

#### `KcPage.tsx`

Đây là router theo `pageId`.

Hiện tại:

- `login.ftl` -> render component custom `Login`
- các page khác -> dùng `DefaultPage` của Keycloakify

Điều này là cách làm đúng để custom dần dần:

- custom trang quan trọng nhất trước là login
- các trang còn lại vẫn hoạt động nhờ default implementation

#### `Template.tsx`

Đây là wrapper layout cho các page Keycloak. Nó đang thêm:

- nền auth riêng
- brand panel QRTable
- title/subtitle theo từng page

Nếu muốn tất cả trang như reset password, register, verify email có cùng khung giao diện, đây là nơi sửa đúng.

#### `Login.tsx`

Đây là trang custom chính của bạn. Hiện nó đã có:

- hero image
- branding QRTable
- username/password fields
- remember me
- forgot password
- social buttons mock + social providers động từ Keycloak
- thông báo lỗi thành công theo `message.type`

Điểm cần hiểu:

- form submit không gọi API riêng của bạn
- form submit về `url.loginAction` của Keycloak
- tức UI là custom, nhưng auth engine vẫn là Keycloak gốc

#### `theme.css`

Đây là lớp theme token và reset CSS:

- khai báo màu semantic
- bo góc
- font
- ẩn chrome mặc định của Keycloak

Đây là nơi phù hợp để điều chỉnh màu nền, border, radius, typography base.

---

## 8. Cách custom UI với Keycloakify trong repo này

### 8.1 Custom visual tokens

Muốn đổi look-and-feel tổng thể, sửa ở:

- `apps/keycloak-theme/src/login/theme.css`

Bạn nên đổi ở đây các nhóm:

- `--color-background`
- `--color-foreground`
- `--color-primary`
- `--color-muted`
- `--radius-*`

Đây là lớp “design tokens” của theme.

### 8.2 Custom layout chung

Muốn đổi bố cục chung nhiều trang, sửa ở:

- `apps/keycloak-theme/src/login/Template.tsx`

Ví dụ:

- thêm brand story
- đổi side panel
- thêm legal footer
- đổi title/subtitle theo pageId

### 8.3 Custom trang login

Muốn sửa form login, sửa ở:

- `apps/keycloak-theme/src/login/pages/Login.tsx`

Ví dụ:

- đổi hero image
- đổi content marketing
- đổi thứ tự field
- thêm password reveal
- thêm CTA phụ

Lưu ý quan trọng:

- giữ `form action={url.loginAction}`
- giữ các field name chuẩn mà Keycloak cần như `username`, `password`, `rememberMe`
- không tự bẻ flow submit sang API khác

### 8.4 Custom thêm trang khác

Nếu muốn custom thêm:

- register
- reset password
- verify email

thì làm theo pattern:

1. tạo component page riêng
2. thêm `case` vào `KcPage.tsx`
3. dùng `kcContext.pageId` tương ứng

Nếu không custom, `DefaultPage` vẫn xử lý giúp bạn.

### 8.5 i18n

File `apps/keycloak-theme/src/login/i18n.ts` đang dùng `i18nBuilder` của Keycloakify.

Khi cần Việt hóa sâu hơn, bạn mở rộng tại đây thay vì hardcode text rải rác.

### 8.6 Test local

Có 3 cách test hữu ích:

1. `storybook`
   - test UI tách biệt
2. mock `window.kcContext` trong `src/main.tsx`
   - nhanh để debug page cụ thể
3. build theme rồi mount vào Keycloak container
   - test flow thật

---

## 9. Cách build và deploy Keycloakify theme hiện tại

### 9.1 Build

Chạy trong `apps/keycloak-theme`:

```bash
npm run build-keycloak-theme
```

Script này làm 2 việc:

1. `npm run build`
2. `keycloakify build`

Output sẽ nằm trong thư mục `dist_keycloak`.

### 9.2 Deploy vào Keycloak container

Hiện `docker-compose.provider.yaml` mount:

```yaml
- ./apps/keycloak-theme/dist_keycloak:/opt/keycloak/providers
```

Điều đó có nghĩa:

- chỉ cần build lại theme
- restart container Keycloak
- Keycloak sẽ nạp artifact mới

Trong môi trường local hiện tại, chu trình đơn giản là:

1. sửa UI theme
2. build theme
3. restart `keycloak`
4. kiểm tra realm đang chọn đúng login theme

### 9.3 Bước thường bị quên

Rất nhiều trường hợp theme đã build đúng nhưng vẫn không thấy đổi giao diện vì quên một trong các bước sau:

1. chưa chọn `Login Theme = keycloak-theme` trong Realm Settings
2. chưa restart container sau khi build mới
3. đang nhìn nhầm realm khác
4. frontend đang gọi issuer khác với realm đang xem

---

## 10. Setup chuẩn đề xuất cho dự án này

Đây là quy trình setup nên dùng để tránh nhầm giữa backend client và frontend client.

### 10.1 Bước 1: chạy hạ tầng

```bash
docker compose -f docker-compose.provider.yaml up -d
```

Đảm bảo Keycloak chạy ở:

- `http://localhost:8180`

### 10.2 Bước 2: bootstrap realm backend

Chạy:

```bash
./tools/keycloak-bootstrap.sh
```

Script này hiện đang làm tốt các việc backend-oriented:

- tạo realm `qrtable`
- tạo client `qrtable-bff`
- cấp role service account realm-management
- tạo realm roles
- tạo protocol mapper `tenant_id`, `sub_role`
- tạo user test và gán attributes/roles

### 10.3 Bước 3: tạo frontend client `management-app`

Việc này hiện chưa được script tự làm. Bạn cần tạo thủ công trong admin console hoặc mở rộng script.

Thiết lập đề xuất:

- Client ID: `management-app`
- Client type: `OpenID Connect`
- Client authentication: `On`
- Authorization: `Off`
- Standard flow: `On`
- Direct access grants: `Off`
- Service accounts roles: `Off`

Login settings local:

- Valid redirect URIs:
  - `http://localhost:3000/api/auth/callback/keycloak`
  - `http://localhost:3000/*`
- Valid post logout redirect URIs:
  - `http://localhost:3000/*`
- Web origins:
  - `http://localhost:3000`

Sau đó copy client secret và đưa vào:

- `apps/management-app/.env.local` hoặc file env cục bộ tương đương

### 10.4 Bước 4: build Keycloakify theme

```bash
cd apps/keycloak-theme
npm install
npm run build-keycloak-theme
```

### 10.5 Bước 5: gán login theme cho realm

Trong Keycloak admin console:

- chọn realm `qrtable`
- vào `Realm Settings -> Themes`
- chọn `Login Theme = keycloak-theme`

### 10.6 Bước 6: cấu hình env cho Management App

Ví dụ:

```env
AUTH_SECRET=replace_with_strong_random_secret
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=replace_with_keycloak_client_secret
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable
MANAGEMENT_BFF_BASE_URL=http://localhost:3300/api/v1
NEXT_PUBLIC_BFF_BASE_URL=http://localhost:3300/api/v1
```

### 10.7 Bước 7: chạy Management App

Khi user vào `/dashboard`:

1. middleware phát hiện chưa auth
2. redirect `/login?next=/dashboard`
3. người dùng bấm `Continue with Keycloak`
4. Auth.js redirect sang Keycloak
5. Keycloak hiển thị UI custom bằng Keycloakify
6. login thành công -> callback về Auth.js
7. Auth.js lấy token, enrich session qua `/authorizer/me`
8. middleware route theo role

---

## 11. Sequence flow end-to-end

```text
User Browser
  -> Management App /dashboard
  -> middleware.ts sees no session
  -> redirect /login?next=/dashboard

User Browser
  -> /login
  -> signIn('keycloak')
  -> Auth.js redirects to Keycloak authorization endpoint

Keycloak
  -> render login page using Keycloakify theme
  -> user submits credentials
  -> Keycloak authenticates user
  -> returns authorization code to Auth.js callback

Auth.js
  -> exchanges code for access_token + refresh_token
  -> decodes claims: realm_access.roles, tenant_id
  -> calls BFF /authorizer/me with bearer token

BFF / Authorizer
  -> verify JWT via JWKS
  -> load or auto-provision internal user
  -> validate role mapping
  -> collect permissions
  -> return normalized user profile

Auth.js
  -> stores enriched session

middleware.ts
  -> parse roles
  -> redirect to /dashboard or /pos or /kds or /admin
```

---

## 12. Những điểm cần chú ý trong repo hiện tại

### 12.1 Bootstrap script chưa tạo client cho frontend

Đây là gap thực tế lớn nhất.

`tools/keycloak-bootstrap.sh` đang tạo `qrtable-bff`, nhưng `management-app` lại kỳ vọng client riêng tên `management-app`.

Hệ quả:

- backend setup xong chưa đủ để frontend login thành công
- nếu chỉ chạy bootstrap script mà không tạo frontend client, Auth.js sẽ fail ở bước redirect/callback/token exchange

### 12.2 `.env` trong app đang chứa secret thật

Trong workspace hiện có file `apps/management-app/.env` chứa `AUTH_KEYCLOAK_SECRET` cụ thể.

Về nguyên tắc vận hành:

- chỉ nên commit `.env.example`
- secret thật nên nằm ở `.env.local`, secret store hoặc biến môi trường runtime

### 12.3 `direct access grant` đang tồn tại cho backend pattern cũ

`authorizer/keycloak-http.service.ts` còn hỗ trợ `grant_type=password`.

Điều này phù hợp cho một số luồng service-side hoặc test, nhưng không phải flow chính của Management App.

Flow chính của frontend hiện tại là:

- OIDC Standard Flow qua Auth.js

### 12.4 UI Keycloak hiện chưa thực sự dùng component shadcn của Management App

Kế hoạch Step 1.25 mô tả “Keycloakify + React + Tailwind + Shadcn UI”.

Thực tế code hiện tại của `apps/keycloak-theme` đang dùng:

- React
- Tailwind CSS
- custom markup

chứ chưa import thẳng shared shadcn components từ Management App.

Điều này không sai. Nó chỉ có nghĩa rằng hiện tại bạn đang:

- đồng bộ thẩm mỹ theo hướng giống shadcn
- chứ chưa tái sử dụng trực tiếp design-system component giữa 2 app

### 12.5 Mount path `providers` là đúng với kiểu build hiện tại

Trong `implementation_plan.md` có câu “deploy vào thư mục themes/”.

Nhưng với code hiện tại, `docker-compose.provider.yaml` mount vào `/opt/keycloak/providers`.

Với Keycloakify theo kiểu build artifact cho Keycloak hiện đại, đây là cách triển khai phù hợp hơn tài liệu kế hoạch gốc.

---

## 13. Câu trả lời ngắn cho các câu hỏi cốt lõi

### 13.1 Cần cấu hình gì trong Keycloak?

Tối thiểu cần đủ 6 nhóm:

1. Realm `qrtable`
2. Realm roles: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`
3. Backend client `qrtable-bff` cho service account/Admin API
4. Frontend client `management-app` cho OIDC login của NextAuth/Auth.js
5. Protocol mappers cho `tenant_id`, `sub_role`
6. Login theme `keycloak-theme`

### 13.2 Setup Keycloakify như thế nào?

Trong repo của bạn, setup đã theo cấu trúc chuẩn:

1. app React/Vite độc lập ở `apps/keycloak-theme`
2. thêm `keycloakify/vite-plugin` trong `vite.config.ts`
3. viết page ở `src/login/*`
4. build bằng `npm run build-keycloak-theme`
5. mount output vào container Keycloak
6. chọn theme ở Realm Settings

### 13.3 Tích hợp với frontend như thế nào?

Frontend business app không import Keycloakify.

Tích hợp thực tế là:

- Management App dùng `Auth.js + Keycloak provider`
- Keycloak khi được redirect tới sẽ render UI bằng Keycloakify theme

Nói cách khác:

- `Auth.js` tích hợp logic auth
- `Keycloakify` tích hợp trải nghiệm UI của Keycloak

### 13.4 Custom UI như thế nào?

Sửa theo tầng:

1. token/màu/nền/base style -> `theme.css`
2. layout chung -> `Template.tsx`
3. từng page -> `pages/Login.tsx` và các page custom khác
4. i18n -> `i18n.ts`

---

## 14. Đề xuất cải thiện tiếp theo

Để hệ thống này “tròn” hơn, nên làm thêm 4 việc:

1. Mở rộng `tools/keycloak-bootstrap.sh` để tự tạo luôn client `management-app`.
2. Chuẩn hóa tài liệu nội bộ: tách rõ client backend và client frontend để tránh nhầm.
3. Chuyển secret thật ra khỏi `apps/management-app/.env`.
4. Nếu muốn đồng bộ UI sâu hơn, cân nhắc tái sử dụng token thiết kế hoặc component patterns từ design system chung thay vì chỉ custom Tailwind riêng trong Keycloakify app.

---

## 15. Kết luận

Kiến trúc hiện tại của bạn là một kiến trúc auth nhiều lớp, không phải tích hợp Keycloak tối giản.

Nó đang hoạt động theo triết lý:

- `Keycloak` xác thực danh tính
- `Auth.js` quản lý phiên đăng nhập cho Next.js
- `Authorizer + user-access` xác minh user nội bộ và permissions nghiệp vụ
- `Keycloakify` đồng bộ giao diện đăng nhập với trải nghiệm của QRTable

Vì vậy, để hệ thống chạy đúng, bạn không chỉ cần “bật Keycloak lên”, mà phải đồng thời cấu hình đúng:

- realm
- roles
- clients
- protocol mappers
- user attributes
- login theme
- env của frontend

Nếu một mắt xích sai, triệu chứng thường xuất hiện ở các dạng:

- login được nhưng không vào đúng route
- có token nhưng backend trả `USER_NOT_PROVISIONED`
- có session nhưng tenant mismatch
- theme build rồi nhưng Keycloak vẫn hiện UI mặc định

Tài liệu này nên được xem là bản giải thích thực thi của Step 1.25, bám theo đúng hiện trạng code hiện tại thay vì chỉ theo kế hoạch mức cao.
