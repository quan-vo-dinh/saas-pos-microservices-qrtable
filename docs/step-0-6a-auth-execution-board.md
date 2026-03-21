# Step 0.6A Auth - Execution Board

## 1) Mục tiêu thực thi

Hoàn thiện auth ở mức production-like theo 3 pha:

1. Chuẩn hóa contract và config (tenant, claims, role map, keycloak bootstrap).
2. Hoàn thiện guard/permission/provisioning.
3. Hoàn thiện test matrix + tài liệu vận hành.

Mục tiêu cuối:

- Không còn 500 trong auth chain.
- 401/403 trả đúng taxonomy.
- Tenant resolution là 1 policy duy nhất, áp dụng đồng bộ.
- Role mapping và provisioning nhất quán giữa Keycloak và DB nội bộ.

## 2) Timeline đề xuất

- Sprint length: 10 ngày làm việc.
- Team tối thiểu:
  - BE-1 (Auth/Guards/Policy)
  - BE-2 (Provisioning/Keycloak/User-access)
  - QA (Test matrix/automation)
  - DevOps (env checklist/bootstrap reliability)

### Mốc chính

- D1-D3: Phase 1
- D4-D7: Phase 2
- D8-D10: Phase 3

## 3) Workboard chi tiết theo task

## Phase 1 - Contract + Config Hardening

### T1.1 - Chốt Auth Contract v1 + Error Taxonomy

- Owner: BE-1
- Estimate: 0.5 ngày
- Depends on: none
- Output:
  - Tài liệu contract request/response auth.
  - Taxonomy lỗi chuẩn:
    - `401 invalid_token`
    - `401 user_not_provisioned`
    - `403 permission_denied`
- Pass criteria:
  - Có tài liệu duy nhất làm source of truth.
  - Được BE + FE + QA sign-off.
- Verify commands:
  - N/A (doc task)

### T1.2 - Chốt Tenant Resolution Policy v1

- Owner: BE-1
- Estimate: 0.5 ngày
- Depends on: T1.1
- Output:
  - Policy ưu tiên nguồn tenant duy nhất (header/subdomain/JWT/session).
  - Danh sách route ngoại lệ rõ ràng.
- Pass criteria:
  - Không còn policy mâu thuẫn giữa middleware/guard/docs.
- Verify commands:
  - N/A (doc task)

### T1.3 - Chuẩn hóa JWT claim contract + endpoint profile

- Owner: BE-1
- Estimate: 1 ngày
- Depends on: T1.1
- Output:
  - Claim bắt buộc: `sub`, `tenant_id`, `realm_access.roles`.
  - Endpoint profile thống nhất cho frontend (`/auth/me` hoặc tương đương).
- Pass criteria:
  - Frontend không cần tự decode tùy tiện để lấy quyền cốt lõi.
- Verify commands:
  - `pnpm nx build bff`

### T1.4 - Nâng cấp Keycloak bootstrap idempotent

- Owner: BE-2 + DevOps
- Estimate: 1 ngày
- Depends on: T1.2
- Output:
  - Script bootstrap kiểm tra/tạo:
    - realm
    - client
    - realm roles
    - protocol mappers (`tenant_id`)
    - service-account role mapping tối thiểu đủ dùng
  - Chạy lặp lại không phá trạng thái.
- Pass criteria:
  - Chạy script 3 lần liên tiếp cho cùng kết quả.
- Verify commands:
  - `bash tools/keycloak-bootstrap.sh`
  - `bash tools/keycloak-bootstrap.sh`
  - `bash tools/keycloak-bootstrap.sh`

### T1.5 - Checklist cấu hình môi trường dev/staging

- Owner: DevOps
- Estimate: 0.5 ngày
- Depends on: T1.4
- Output:
  - Checklist config bắt buộc theo môi trường.
  - Danh sách biến env và giá trị policy timeout/token.
- Pass criteria:
  - Team mới setup máy có thể self-serve theo checklist.
- Verify commands:
  - `docker compose -f docker-compose.provider.yaml ps`

### T1.6 - Chốt Role-Permission Matrix chính thức

- Owner: BE-1 + Product + QA
- Estimate: 0.5 ngày
- Depends on: T1.1
- Output:
  - Matrix cho:
    - OWNER
    - MANAGER
    - WAITER
    - CHEF
    - BARISTA
    - SUPER_ADMIN
- Pass criteria:
  - Mọi secured endpoint map được vào matrix.
- Verify commands:
  - N/A (doc + review task)

## Phase 2 - Guards, Authorization, Provisioning

### T2.1 - Refactor guard chain theo contract

- Owner: BE-1
- Estimate: 1 ngày
- Depends on: T1.1, T1.2
- Output:
  - Guard chain nhất quán, thứ tự rõ ràng.
  - Chuẩn hóa throw lỗi theo taxonomy.
- Pass criteria:
  - Không còn lỗi 500 từ guard chain.
- Verify commands:
  - `pnpm nx build bff`

### T2.2 - Tenant propagation end-to-end

- Owner: BE-1
- Estimate: 1 ngày
- Depends on: T2.1
- Output:
  - Tenant context truyền đầy đủ:
    - middleware -> guards -> BFF controller -> TCP request -> service
- Pass criteria:
  - Không endpoint nào xử lý business khi thiếu tenant context (trừ route ngoại lệ đã định nghĩa).
- Verify commands:
  - `pnpm nx build bff`
  - `pnpm nx build catalog`
  - `pnpm nx build saas`

### T2.3 - Chốt provisioning strategy và implement

- Owner: BE-2
- Estimate: 1.5 ngày
- Depends on: T1.3, T1.6
- Output:
  - Strategy chính thức (khuyến nghị):
    - pre-provision là mặc định
    - first-login upsert là fallback có kiểm soát
  - Xử lý đầy đủ case:
    - valid token + missing profile
    - role claim có nhưng profile mapping thiếu
- Pass criteria:
  - Trả đúng `401 user_not_provisioned` cho case thiếu profile.
- Verify commands:
  - `pnpm nx build user-access`
  - `pnpm nx build authorizer`
  - `pnpm nx build bff`

### T2.4 - Đồng bộ role mapping Keycloak <-> internal roles

- Owner: BE-2
- Estimate: 1 ngày
- Depends on: T1.6, T2.3
- Output:
  - Bảng mapping chính thức và validator/checker mismatch.
- Pass criteria:
  - Không còn mismatch im lặng giữa token role và DB role.
- Verify commands:
  - `pnpm nx build authorizer`
  - `pnpm nx build user-access`

### T2.5 - Chuẩn hóa permission constants/domain permissions

- Owner: BE-1
- Estimate: 1 ngày
- Depends on: T1.6
- Output:
  - Dọn permission theo domain QRTable (loại bỏ dấu vết template cũ không còn phù hợp).
- Pass criteria:
  - Endpoints secured đều trỏ vào permission key đúng domain.
- Verify commands:
  - `pnpm nx build bff`
  - `pnpm nx build user-access`

### T2.6 - API-level authorization enforcement cho endpoint trọng yếu

- Owner: BE-1
- Estimate: 1 ngày
- Depends on: T2.5
- Output:
  - Secured decorator + permission guard được áp dụng đầy đủ cho endpoint trọng yếu.
- Pass criteria:
  - Route-level UI policy và API-level policy không mâu thuẫn.
- Verify commands:
  - `pnpm nx build bff`

## Phase 3 - Test Matrix + Runbook + Final Verify

### T3.1 - Viết smoke/integration matrix cho auth

- Owner: QA + BE-1
- Estimate: 1.5 ngày
- Depends on: T2.6
- Output:
  - Bộ test tối thiểu cho các case:
    - valid token + đúng tenant + đúng permission -> pass
    - valid token + sai tenant -> reject đúng mã
    - valid token + missing profile -> reject rõ nghĩa
    - expired/invalid signature -> reject đúng chuẩn
- Pass criteria:
  - Test pass ổn định 3 lần chạy liên tục.
- Verify commands:
  - `pnpm nx run-many -t test -p bff,authorizer,user-access`

### T3.2 - Viết runbook debug nhanh 401/403

- Owner: QA + BE-2
- Estimate: 0.5 ngày
- Depends on: T3.1
- Output:
  - Runbook theo decision tree:
    - token issue
    - tenant issue
    - provisioning issue
    - permission issue
- Pass criteria:
  - On-call có thể khoanh vùng lỗi trong <= 10 phút.
- Verify commands:
  - N/A (doc task)

### T3.3 - Final checklist chốt Step 0.6A

- Owner: Tech Lead
- Estimate: 0.5 ngày
- Depends on: T3.1, T3.2
- Output:
  - Checklist chốt release Step 0.6A.
- Pass criteria:
  - 100% item pass hoặc có waiver được duyệt.
- Verify commands:
  - `pnpm nx build authorizer`
  - `pnpm nx build user-access`
  - `pnpm nx build bff`
  - `pnpm nx build catalog`
  - `pnpm nx build saas`

## 4) RACI gợi ý

- BE-1: tenant policy, guard chain, permission enforcement.
- BE-2: keycloak bootstrap, provisioning, role mapping sync.
- QA: matrix test, regression suite, runbook verification.
- DevOps: docker/provider health, env consistency, script reliability.
- Tech Lead: phê duyệt contract, matrix, DoD.

## 5) Risk Register + Rollback

### R1 - Thay đổi tenant policy làm gãy route cũ

- Mức độ: High
- Giảm thiểu:
  - Feature flag cho policy mới.
  - Log-only mode trước khi enforce cứng.
- Rollback:
  - Tắt feature flag, quay về policy cũ.

### R2 - Permission migration gây deny nhầm

- Mức độ: High
- Giảm thiểu:
  - Chạy dual-check (old/new permission) trong 1 nhịp ngắn.
- Rollback:
  - Re-enable mapping cũ qua config toggle.

### R3 - Keycloak bootstrap drift giữa dev/staging

- Mức độ: Medium
- Giảm thiểu:
  - Script idempotent + verify endpoint sau bootstrap.
- Rollback:
  - Import lại realm export chuẩn đã version control.

### R4 - Provisioning race condition

- Mức độ: Medium
- Giảm thiểu:
  - Upsert có idempotency key theo userId/sub.
- Rollback:
  - Disable first-login upsert fallback, chỉ cho phép pre-provision tạm thời.

## 6) Final Go/No-Go Checklist (Step 0.6A)

- [x] Tenant resolution policy duy nhất đã được ban hành.
- [x] JWT claim contract + profile endpoint đã ổn định.
- [x] Keycloak bootstrap chạy lặp lại không hỏng.
- [x] Role-permission matrix đã áp dụng ở API-level guard.
- [x] Provisioning xử lý đầy đủ case thiếu profile/mismatch mapping.
- [x] Mọi endpoint secured trả 401/403 đúng chuẩn, không 500 auth-chain.
- [x] Smoke/integration matrix pass đầy đủ actor cốt lõi.
- [x] Runbook debug 401/403 hoàn tất và đã dry-run.
- [ ] Dev/staging checklist đã được kiểm chứng bởi ít nhất 1 máy sạch.

## 7) Lệnh verify tổng hợp cuối sprint

```bash
pnpm nx run-many -t build -p authorizer,user-access,bff,catalog,saas
pnpm nx run-many -t test -p authorizer,user-access,bff
docker compose -f docker-compose.provider.yaml ps
bash tools/keycloak-bootstrap.sh
```

Nếu tất cả pass theo checklist trên, Step 0.6A có thể đóng với trạng thái Done.

## 8) Status cập nhật (2026-03-21)

### Mục đã hoàn thành

1. T1.1, T1.3: taxonomy lỗi + auth profile endpoint đã triển khai.
2. T1.4: keycloak bootstrap idempotent đã verify 3 lần liên tiếp.
3. T2.1, T2.2: guard chain và tenant propagation đã triển khai xuyên BFF -> TCP service.
4. T2.3: provisioning strategy đã có pre-provision mặc định + first-login upsert fallback (feature flag).
5. T2.4: role mapping validator đã chặn mismatch im lặng.
6. T2.5, T2.6: permission constants và enforcement endpoint trọng yếu đã áp dụng.
7. T3.1: auth smoke/unit matrix đã có test chạy trong CI target.
8. T3.2: runbook debug 401/403 đã hoàn tất.

### Bằng chứng verify gần nhất

1. Build pass:

- `pnpm nx run-many -t build -p authorizer,user-access,bff,catalog,saas --configuration=ci --outputStyle=static --skipNxCache`

2. Test pass:

- `pnpm nx run-many -t test -p bff,authorizer,user-access --configuration=ci --outputStyle=static --skipNxCache`
- Tổng: 12 tests pass ở bff, 2 tests pass ở authorizer, 3 tests pass ở user-access.

3. Provider health pass:

- `docker compose -f docker-compose.provider.yaml ps`
- keycloak/mongodb/postgres/redis đều healthy.

4. Keycloak bootstrap idempotent pass:

- `bash tools/keycloak-bootstrap.sh && bash tools/keycloak-bootstrap.sh && bash tools/keycloak-bootstrap.sh`

### Mục còn mở

1. Checklist máy sạch dev/staging cần thêm một vòng xác nhận độc lập bởi máy chưa có cache local.
