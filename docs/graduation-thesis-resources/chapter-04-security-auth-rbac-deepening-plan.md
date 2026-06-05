# Kế hoạch làm sâu mục bảo mật, xác thực và phân quyền trong Chương 4

> Ngày lập: 2026-06-05.
> Phạm vi độc lập: làm rõ mục Chương 4 về kiến trúc bảo mật, xác thực, phân quyền, quyền theo gói và ranh giới tin cậy.
> Quan hệ với các plan trước: plan này bổ sung sau `chapter-04-kafka-redis-deepening-plan.md`; không thay thế các plan Chương 4 đã hoàn tất về kiến trúc tổng thể, schema, Kafka, Redis hoặc thanh toán.

## 0. Protocol bắt buộc khi thực thi plan

Lưu ý chung:

- Viết tài liệu bằng tiếng Việt học thuật, rõ ràng. Giữ tên công nghệ và thuật ngữ chuẩn ngành khi cần: `Keycloak`, `JWT`, `OIDC`, `RBAC`, `BFF`, `tenant isolation`, `permission`, `entitlement`, `webhook`, `OAuth state`, `request context`.
- Dùng CodeGraph trước khi chỉnh file để xác nhận trạng thái codebase hiện tại. Tối thiểu chạy `codegraph status .` và một truy vấn liên quan tới `Authorizer`, `User-Access`, `UserGuard`, `SessionGuard`, `TenantGuard`, `PermissionGuard`, `PlanFeatureGuard`, `Keycloak`, `RBAC`.
- Dùng source code để kiểm chứng claim, nhưng không viết Chương 4 như walkthrough code. Mục tiêu là mô tả kiến trúc, luồng tin cậy, cấu trúc ngữ cảnh và ranh giới kiểm soát.
- Có thể dùng web/browser để kiểm chứng nguồn chính thức hoặc metadata nếu phát sinh citation mới. Không thêm citation nếu nội dung chỉ dựa trên code/docs nội bộ.
- Dùng Context7/`ctx7` nếu cần tra tài liệu hiện tại của library, framework, SDK, API, CLI tool hoặc cloud service theo `AGENTS.md`.
- Không invent vai trò, permission, guard, endpoint, webhook route, token field, benchmark, penetration-test result hoặc production-grade security claim.
- Không thêm nguồn giả vào `references.bib`. Chỉ thêm nguồn thật, đủ chắc và được trích dẫn thật trong LaTeX.
- Cuối session thực thi phải build LaTeX và cập nhật `docs/graduation-thesis-resources/thesis-workflow-plan.md`.

Use relevant installed skills khi cần:

- `Zoom Out`: dùng để giữ mức trình bày ở tầng actor/domain/use case, không biến mục bảo mật thành phân tích method TypeScript.
- `Grill with Docs`: dùng để audit mâu thuẫn giữa source code, `docs/technical-architecture.md`, `docs/architecture/permission-matrix.md`, Chương 4 và Chương 6.
- `Writing Plans`: dùng khi cần tách tiếp plan thành task nhỏ hơn.
- `Doc Coauthoring`: chỉ dùng nếu cần refine wording/caption hoặc reader testing, không draft chương dài một mạch nếu chưa chốt cấu trúc.

## 1. Mục tiêu

Mục bảo mật hiện tại của Chương 4 đã đúng hướng khi tách hai luồng xác thực: nhân viên/chủ quán/quản trị dùng Keycloak/JWT/OIDC/RBAC, còn khách tại bàn dùng QR/phiên. Tuy nhiên, section hiện tại còn ngắn hơn mức chi tiết của các mục Kafka/Redis vừa được làm sâu.

Plan này nhằm làm cho người đọc hình dung được:

- QRTable có những actor nào đi qua mô hình xác thực nào.
- Hệ thống đặt ranh giới tin cậy ở đâu: phía client, BFF, dịch vụ xác thực, dịch vụ hồ sơ/quyền, dịch vụ miền nghiệp vụ, webhook từ nhà cung cấp ngoài.
- Một yêu cầu hợp lệ phải mang các lớp ngữ cảnh gì: danh tính, đơn vị thuê bao, phiên/bàn nếu là khách, quyền thao tác, quyền theo gói nếu là tính năng SaaS.
- RBAC và quyền theo gói khác nhau như thế nào.
- WebSocket và webhook được bảo vệ ở mức kiến trúc ra sao.
- Các claim bảo mật nào được phép viết mạnh, claim nào phải để Chương 6 đánh giá có giới hạn.

Mức chi tiết mong muốn tương tự Kafka/Redis ở chỗ có cấu trúc, bảng và luồng rõ ràng; nhưng khác ở chỗ không phân tích từng method hoặc từng đoạn logic TypeScript.

## 2. Nguyên tắc trình bày mức kiến trúc, không sa vào implementation workflow

Đây là nguyên tắc quan trọng nhất của plan.

### 2.1. Được viết

Được mô tả theo hướng:

- "Luồng nhân viên bắt đầu từ Management App, được xác thực qua Keycloak/JWT, BFF xác minh token qua Authorizer, lấy hồ sơ/quyền ứng dụng từ User-Access, sau đó gắn ngữ cảnh người gọi và đơn vị thuê bao vào request trước khi gọi dịch vụ sở hữu."
- "Luồng khách không dùng Keycloak; khách là tác nhân theo phiên, được giới hạn bởi QR/table token, `sessionId`, `tenantId`, trạng thái phiên và các hành động được phép trong phạm vi bàn."
- "RBAC trả lời câu hỏi người dùng có quyền thực hiện hành động hay không; quyền theo gói trả lời câu hỏi đơn vị thuê bao hiện tại có được dùng tính năng đó hay không."
- "Webhook SePay là ranh giới từ hệ thống ngoài vào BFF; BFF xác thực tuyến/header/reference prefix rồi chuyển sang Payment hoặc SaaS theo chủ sở hữu nghiệp vụ."
- "WebSocket chỉ phát gợi ý/làm mới tới room đã được join sau xác thực; phía client phải lấy lại snapshot từ API nếu cần trạng thái có thẩm quyền."

Được liệt kê cấu trúc ở mức khái niệm:

- Request context gồm actor type, identity source, `tenantId`, `sessionId` nếu có, role/permission summary, plan feature context nếu có.
- Staff auth context gồm token validity, user identity, tenant binding, role group, permission set.
- Customer session context gồm tenant, table, session, TTL/idle policy, ownership of current session.
- Webhook context gồm route tier, reference prefix, secret/header validation, target owner service, idempotency/audit posture.

### 2.2. Không được viết

Không viết theo kiểu:

- Phân tích từng hàm vòng đời của guard, từng nhánh điều kiện, từng cache key hash hoặc từng exception trong source code.
- Giải thích các khái niệm decorator, controller, provider hoặc module của NestJS như nội dung chính của khóa luận.
- Dẫn dắt bằng tên method TypeScript để kể lại logic, ví dụ "hàm X gọi hàm Y rồi set field Z".
- Chèn code snippet NestJS/TypeScript để chứng minh bảo mật.
- Biến Chương 4 thành tài liệu triển khai framework hoặc hướng dẫn lập trình guard.
- Liệt kê toàn bộ 67 permission trong chương chính.
- Viết khách hàng là người dùng Keycloak hoặc CUSTOMER là role RBAC trong `role.json`.
- Claim đã có penetration testing, formal security audit, secret rotation đầy đủ, mTLS nội bộ hoặc full-stack tenant isolation proof nếu chưa có bằng chứng.

### 2.3. Cách dùng source code đúng mức

Khi thực thi plan, source code được dùng như bằng chứng để kiểm tra:

- Guard chain có những lớp nào.
- Permission matrix có những role/permission nào.
- Authorizer/User-Access/Keycloak giữ trách nhiệm gì.
- Payment/SaaS webhook route và OAuth state được chia theo boundary nào.
- Chương 6 đang đánh giá claim bảo mật ở mức nào.

Sau khi kiểm chứng, chuyển thành văn phong kiến trúc. Ví dụ:

- Dựa vào `UserGuard`, `TenantGuard`, `PermissionGuard`, viết "BFF tách ba câu hỏi bảo mật: xác định người gọi, khóa đơn vị thuê bao và kiểm tra quyền thao tác".
- Dựa vào `PlanFeatureGuard`, viết "quyền theo gói là lớp entitlement tách khỏi RBAC".
- Dựa vào `SessionGuard`, viết "khách tại bàn được bảo vệ bằng phiên ngắn hạn và ngữ cảnh bàn/đơn vị thuê bao".

Không viết tên method, tên biến cục bộ hoặc thứ tự câu lệnh trong code nếu không phục vụ lập luận kiến trúc.

## 3. Nguồn sự thật và bằng chứng đã audit

### 3.1. CodeGraph snapshot

Phiên thảo luận ngày 2026-06-05 đã chạy:

```bash
codegraph status .
```

Kết quả:

- Files: 1.196.
- Nodes: 15.534.
- Edges: 30.489.
- Index up-to-date.

CodeGraph query liên quan tới bảo mật chỉ ra các điểm cần dùng làm evidence:

- `libs/guards/src/lib/user.guard.ts`
- `libs/guards/src/lib/session.guard.ts`
- `libs/guards/src/lib/tenant.guard.ts`
- `libs/guards/src/lib/permission.guard.ts`
- `libs/guards/src/lib/plan-feature.guard.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`
- `apps/authorizer/src/app/authorizer/*`
- `apps/user-access/src/*`
- `docs/architecture/permission-matrix.md`

### 3.2. Canonical docs cần đọc lại khi thực thi

- `AGENTS.md`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`
- `docs/graduation-thesis-resources/thesis-official-outline.md`
- `docs/graduation-thesis-resources/thesis-evidence-map.md`
- `docs/graduation-thesis-resources/thesis-artifact-backlog.md`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/README.md`
- `docs/DOC-CODE-ANCHORS.md`
- `docs/technical-architecture.md`
- `docs/business-logic.md`
- `docs/architecture/permission-matrix.md`
- `docs/phases/phase-1-catalog.md`
- `docs/phases/phase-3-payment.md`
- `docs/phases/phase-4b-saas-onboarding.md`
- `docs/phases/phase-4d-dashboard-reporting.md`
- `docs/guides/sepay-configuration-guide-phase3.md`

## 4. Phạm vi

### 4.1. Làm trong plan này khi thực thi

- Sửa Chương 4 LaTeX, tập trung vào section:
  - `Kiến trúc bảo mật, xác thực và phân quyền`
- Chia section này thành các subsection nhỏ để mạch lập luận rõ như các mục Kafka/Redis.
- Bổ sung bảng LaTeX để mô tả:
  - Actor và cơ chế xác thực.
  - Lớp kiểm soát tại BFF/request context.
  - RBAC, quyền theo gói và tenant isolation.
  - Webhook/OAuth state như external trust boundary nếu cần.
- Giữ hoặc chỉnh nhẹ hình `chapter4-security-auth-flow.pdf`; chỉ tạo hình mới nếu hình hiện tại không còn khớp cấu trúc mới.
- Cập nhật `thesis-artifact-backlog.md` nếu sửa source diagram hoặc thêm bảng/hình mới.
- Cập nhật `thesis-workflow-plan.md`.
- Build LaTeX và kiểm tra `.lof`/`.lot` nếu thêm hình/bảng.

### 4.2. Không làm trong plan này

- Không sửa business logic hoặc source code.
- Không viết walkthrough từng method TypeScript.
- Không thêm permission hoặc role mới.
- Không thay đổi permission matrix canonical.
- Không đổi guard behavior.
- Không đổi Keycloak/Authorizer/User-Access integration.
- Không thêm security citation nếu chưa kiểm chứng nguồn thật.
- Không thêm screenshot/demo evidence.
- Không refactor Chương 5/6 dài nếu không cần cross-reference ngắn.
- Không claim full security audit, pentest, mTLS, zero-trust service mesh, secret rotation tự động hoặc production hardening nếu chưa có bằng chứng.

## 5. Cấu trúc mục Chương 4 được đề xuất

Giữ section lớn:

```latex
\section{Kiến trúc bảo mật, xác thực và phân quyền}
```

Bên trong chia nhỏ:

```latex
\subsection{Ranh giới tin cậy và mô hình tác nhân}
\subsection{Hai luồng xác thực: nhân viên/quản trị và khách tại bàn}
\subsection{Request context và chuỗi kiểm soát tại BFF}
\subsection{RBAC, tenant isolation và quyền theo gói}
\subsection{WebSocket và webhook trong mô hình bảo mật}
\subsection{Giới hạn thiết kế và các claim không mở rộng}
```

Nếu section sau khi draft quá dài, có thể gộp `WebSocket` vào subsection request context và để webhook được cross-reference với mục SePay/VietQR. Tuy nhiên, không nên bỏ hoàn toàn webhook vì đây là ranh giới từ hệ thống ngoài vào BFF.

## 6. Nội dung chi tiết theo subsection

### 6.1. Ranh giới tin cậy và mô hình tác nhân

Mục tiêu:

- Mở bằng tư duy trust boundary: client không được tin tuyệt đối, BFF là điểm vào duy nhất, dịch vụ miền nghiệp vụ không nhận trực tiếp request từ client.
- Tách actor theo phạm vi:
  - Customer: tác nhân theo phiên QR, phạm vi bàn/phiên/đơn vị thuê bao.
  - Staff nhóm vận hành: Waiter, Chef, Barista.
  - Tenant management: Owner, Manager.
  - Platform administration: Super Admin.
  - External provider: SePay webhook/OAuth callback.
- Nêu rõ Keycloak là identity provider cho staff/owner/manager/super admin, không phải cho Customer.

Bảng đề xuất:

| Actor               | Entry point                         | Cơ chế xác thực                     | Phạm vi truy cập                                | Ghi chú kiến trúc                                                                         |
| ------------------- | ----------------------------------- | ----------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Customer            | Customer PWA qua BFF                | QR/session scoped                   | Bàn, phiên, đơn vị thuê bao hiện tại            | Không có role RBAC trong `role.json`.                                                     |
| Waiter/Chef/Barista | Management App qua BFF              | Keycloak/JWT/OIDC                   | Một đơn vị thuê bao                             | Quyền thao tác theo permission set.                                                       |
| Owner/Manager       | Management App qua BFF              | Keycloak/JWT/OIDC                   | Một đơn vị thuê bao, có quyền quản trị tùy role | Một số tính năng còn bị khóa bởi gói dịch vụ.                                             |
| Super Admin         | Management App admin qua BFF        | Keycloak/JWT/OIDC                   | Nền tảng, nhiều đơn vị thuê bao                 | Có quyền nền tảng; cross-tenant access phải được diễn đạt là quyền quản trị có kiểm soát. |
| SePay               | HTTP webhook/OAuth callback vào BFF | Secret/header/reference/OAuth state | Payment hoặc SaaS tùy tuyến/reference           | Không phải user; là external integration boundary.                                        |

### 6.2. Hai luồng xác thực: nhân viên/quản trị và khách tại bàn

Mục tiêu:

- Trình bày hai lane đã có trong Hình `chapter4-security-auth-flow`.
- Lane staff/admin:
  - Người dùng đăng nhập qua Keycloak.
  - BFF nhận token và xác minh qua Authorizer.
  - Authorizer/Keycloak xác nhận danh tính.
  - User-Access giữ hồ sơ ứng dụng, role và permission mapping.
  - BFF chỉ gọi dịch vụ miền sau khi request đã có ngữ cảnh hợp lệ.
- Lane customer:
  - Khách bắt đầu từ QR/table token.
  - BFF/Order/Catalog phối hợp để xác định bàn, phiên và đơn vị thuê bao.
  - Session không đồng nghĩa tài khoản người dùng.
  - Customer chỉ được thao tác trong phạm vi session/table hiện tại.

Cấu trúc ngữ cảnh nên mô tả:

| Loại context              | Thành phần khái niệm                                                         | Vai trò                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Staff auth context        | identity, token validity, role group, permission set, tenant binding         | Cho phép BFF xác định người gọi và quyền thao tác.                      |
| Customer session context  | `tenantId`, `tableId`, `sessionId`, trạng thái phiên, giới hạn hành vi       | Giới hạn khách trong phạm vi bàn/phiên thay vì dùng tài khoản Keycloak. |
| Platform admin context    | identity, platform role, selected tenant khi thao tác hỗ trợ/audit           | Phân biệt quyền nền tảng với quyền trong một nhà hàng.                  |
| External provider context | route tier, reference prefix, secret/header validation, target service owner | Bảo vệ luồng webhook/OAuth từ bên ngoài.                                |

Không cần viết token claim field chi tiết nếu code/docs không có canonical claim schema ổn định. Nếu cần nêu, chỉ nêu ở mức `tenant_id`/`tenantId`, role và permission summary.

### 6.3. Request context và chuỗi kiểm soát tại BFF

Mục tiêu:

- Chuyển từ tên guard sang câu hỏi kiến trúc:
  - Ai đang gọi?
  - Yêu cầu thuộc đơn vị thuê bao nào?
  - Tác nhân được phép làm hành động này không?
  - Đơn vị thuê bao có quyền dùng tính năng này theo gói không?
  - WebSocket room hoặc webhook route có khớp ngữ cảnh không?
- BFF là lớp gom cross-cutting security concern, nhưng không quyết định bất biến nghiệp vụ cốt lõi như trạng thái đơn, tồn kho, thanh toán, gói thuê bao.

Bảng đề xuất:

| Lớp kiểm soát                | Câu hỏi kiến trúc                                                | Áp dụng cho                              | Kết quả mong muốn                                           |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| Xác định actor               | Người gọi là staff/admin hay customer session?                   | HTTP/WebSocket từ client                 | Có identity/session context trước khi xử lý.                |
| Khóa đơn vị thuê bao         | Request đang thuộc `tenantId` nào?                               | Hầu hết API tenant-scoped                | Không để actor tenant A truy cập dữ liệu tenant B.          |
| Kiểm tra quyền thao tác      | Actor có permission cho hành động không?                         | API staff/owner/admin                    | Ngăn role không phù hợp thao tác menu/order/payment/report. |
| Kiểm tra quyền theo gói      | Tenant có tính năng trong subscription không?                    | Dashboard/reporting/feature-gated routes | Phân biệt RBAC với entitlement thương mại.                  |
| Kiểm tra session/bàn         | Session có khớp bàn/tenant/trạng thái không?                     | Customer PWA                             | Giữ khách trong phạm vi phiên hiện tại.                     |
| Định tuyến external callback | Webhook/OAuth callback có đúng tuyến, secret và reference không? | SePay webhook/OAuth                      | Chuyển đúng Payment hoặc SaaS, hỗ trợ xử lý lũy đẳng.       |

Trong prose, có thể gọi tên `UserGuard`, `SessionGuard`, `TenantGuard`, `PermissionGuard`, `PlanFeatureGuard` một lần để neo vào hệ thống, nhưng không phân tích nội bộ từng guard.

### 6.4. RBAC, tenant isolation và quyền theo gói

Mục tiêu:

- Tách ba khái niệm dễ bị trộn:
  - RBAC: role/permission của người dùng.
  - Tenant isolation: dữ liệu và hành động phải nằm trong đơn vị thuê bao hợp lệ.
  - Plan entitlement: tính năng có được mở theo gói thuê bao hay không.
- Dẫn chiếu permission matrix thay vì copy toàn bộ 67 permission.
- Chỉ đưa bảng tóm tắt nhóm quyền tiêu biểu:
  - `tenant.*`
  - `catalog.*`
  - `order.*`
  - `kitchen.*`
  - `payment.*`
  - `report.read_own`
  - `report.read_any`
  - `payment_settings.*`
  - `subscription.*`
  - `plan.*`
- Nhấn mạnh Customer không phải RBAC role.

Bảng đề xuất:

| Cơ chế              | Trả lời câu hỏi                                   | Ví dụ trong QRTable                                                                         | Không nên hiểu là                                                  |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| RBAC                | Người dùng có quyền làm hành động này không?      | Waiter được xác nhận đơn; Chef/Barista xem/cập nhật KDS; Owner quản lý menu/staff.          | Không tự quyết định tenant hoặc gói dịch vụ.                       |
| Tenant isolation    | Dữ liệu/hành động thuộc đơn vị thuê bao nào?      | API, DB query, Redis key, Kafka payload, WebSocket room đều gắn `tenantId`.                 | Không phải database riêng cho từng tenant trong thiết kế hiện tại. |
| Plan entitlement    | Tenant có được dùng tính năng này theo gói không? | Owner/Manager có `report.read_own` nhưng analytics widgets còn phụ thuộc `analytics_basic`. | Không phải role người dùng.                                        |
| Platform permission | Super Admin có quyền nền tảng nào?                | Onboard tenant, quản lý plan, xem analytics nền tảng.                                       | Không phải quyền tự do bỏ qua mọi kiểm soát/audit.                 |

### 6.5. WebSocket và webhook trong mô hình bảo mật

Mục tiêu:

- WebSocket:
  - Socket chỉ được join room sau khi có auth/session context phù hợp.
  - Room theo tenant/session/kds để tránh phát nhầm đối tượng.
  - WebSocket là hint/refetch, không phải nguồn quyền hoặc nguồn trạng thái có thẩm quyền.
- Webhook:
  - SePay là external provider boundary.
  - BFF phân biệt tuyến/tầng và reference prefix `QRTBL`/`QRSUB`.
  - Payment sở hữu bill payment settlement; SaaS sở hữu subscription invoice settlement.
  - Chương 4 trình bày thiết kế; Chương 6 mới đánh giá bằng chứng kiểm thử/provider thật.

Bảng đề xuất:

| Boundary               | Đầu vào                      | Kiểm soát chính                                    | Service owner sau khi hợp lệ             | Claim an toàn                             |
| ---------------------- | ---------------------------- | -------------------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| Staff WebSocket        | JWT/OIDC user                | Auth context, tenant room, role/permission khi cần | BFF realtime bridge                      | Gợi ý/làm mới UI, không thay thế API.     |
| Customer WebSocket     | Session/QR context           | Session/tenant room                                | BFF realtime bridge                      | Chỉ thông báo trong phạm vi phiên/bàn.    |
| KDS WebSocket          | Staff auth + station context | Tenant/station room                                | BFF realtime bridge + Kitchen data owner | KDS snapshot lấy lại qua API.             |
| SePay tenant webhook   | HTTP callback `QRTBL`        | Route/header/secret/reference/idempotency posture  | Payment                                  | Kiểm chứng provider thật để Chương 6.     |
| SePay platform webhook | HTTP callback `QRSUB`        | Route/header/secret/reference/idempotency posture  | SaaS                                     | Không trộn với bill payment của nhà hàng. |
| OAuth callback         | OAuth state ngắn hạn         | State TTL/one-time validation posture              | Payment                                  | Không lưu token dài hạn trong Redis.      |

### 6.6. Giới hạn thiết kế và các claim không mở rộng

Mục tiêu:

- Viết rõ các giới hạn để bảo vệ khóa luận khỏi overclaim:
  - Có thiết kế và bằng chứng cho guard chain/RBAC/permission seed/session/webhook contract.
  - Chưa kết luận toàn bộ API surface đã được chứng minh bằng tenant A/B full-stack test.
  - Chưa có formal penetration test.
  - Chưa claim production-grade secret rotation, mTLS, service mesh, WAF hoặc full audit trail.
  - SePay provider thật cần bằng chứng riêng nếu muốn claim vận hành thực tế.
- Cross-reference Chương 6:
  - Mục Chương 6 hiện đã có `Kiểm chứng phân quyền, cô lập đơn vị thuê bao và quyền theo gói`.
  - Sau khi Chương 4 làm sâu, Chương 6 chỉ cần đối chiếu mức kiểm chứng, không lặp thiết kế.

## 7. Bảng/hình cần bổ sung hoặc refactor

### 7.1. Bảng actor và cơ chế xác thực

Tạo bảng mới trong Chương 4 nếu section hiện tại thiếu cấu trúc. Cột đề xuất:

- Actor.
- Entry point.
- Cơ chế xác thực.
- Phạm vi truy cập.
- Ghi chú kiến trúc.

Bảng này nên xuất hiện trước hình `chapter4-security-auth-flow` để người đọc biết đọc hình theo actor nào.

### 7.2. Bảng request context và lớp kiểm soát

Tạo bảng mới sau hình auth flow. Cột đề xuất:

- Lớp kiểm soát.
- Câu hỏi kiến trúc.
- Áp dụng cho.
- Kết quả mong muốn.

Bảng này thay cho việc viết dài về từng guard. Có thể gọi tên các guard trong nội dung ô nhưng không phân tích method.

### 7.3. Bảng RBAC - tenant isolation - entitlement

Tạo bảng ngắn để tránh trộn lẫn ba khái niệm. Cột đề xuất:

- Cơ chế.
- Trả lời câu hỏi.
- Ví dụ trong QRTable.
- Không nên hiểu là.

Bảng này giúp nối Chương 4 với Chương 6 và phần dashboard/reporting.

### 7.4. Hình security/auth flow hiện có

File hiện có:

- Source: `docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter4-security-auth-flow.mmd`
- Figure: `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-security-auth-flow.pdf`

Ưu tiên giữ hình nếu vẫn đúng hai lane chính. Chỉ sửa hình nếu cần thêm các node khái niệm sau:

- Request context.
- Permission matrix.
- Plan entitlement.
- External webhook boundary.

Không nên tạo thêm quá nhiều hình cho security vì Chương 4 đã có nhiều artifact. Nếu cần chi tiết hơn, ưu tiên bảng trong chương chính và đưa permission matrix đầy đủ vào phụ lục.

## 8. Tác vụ thực thi chi tiết

### Task 1: Audit nhanh trước khi chỉnh

**Files đọc:**

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/architecture/permission-matrix.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/guides/sepay-configuration-guide-phase3.md`

**Commands:**

```bash
codegraph status .
codegraph query "Authorizer UserAccess Keycloak UserGuard SessionGuard TenantGuard PermissionGuard PlanFeatureGuard RBAC tenant isolation QR session webhook OAuth"
rg -n "Kiến trúc bảo mật|xác thực|phân quyền|RBAC|Keycloak|SessionGuard|TenantGuard|PermissionGuard|PlanFeatureGuard|webhook|OAuth" docs/graduation-thesis-resources/thesis-report/chapters docs/architecture docs/business-logic.md docs/technical-architecture.md
```

**Expected:**

- CodeGraph index up-to-date.
- Các guard và permission matrix còn tồn tại đúng tên.
- Chương 6 đã có section đánh giá tương ứng để cross-reference.

### Task 2: Refactor section Chương 4 thành subsection

**Modify:**

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

**Action:**

- Thay phần section ngắn hiện tại bằng cấu trúc subsection trong §5.
- Giữ Hình `chapter4-security-auth-flow.pdf`.
- Đặt bảng actor trước hoặc sau đoạn mở đầu.
- Đặt bảng request context sau hình.
- Đặt bảng RBAC/tenant/entitlement trước đoạn giới hạn claim.

**Writing constraints:**

- Không dùng code block TypeScript.
- Không phân tích method.
- Không viết quá 1-2 lần tên guard cụ thể; dùng câu hỏi kiến trúc là chính.
- Không copy toàn bộ permission matrix.
- Không thêm citation nếu chỉ dùng source nội bộ.

### Task 3: Viết bảng actor và cơ chế xác thực

**Modify:**

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

**Table label đề xuất:**

```latex
\label{tab:chapter4-auth-actor-model}
```

**Caption đề xuất:**

```latex
\caption{Mô hình tác nhân và cơ chế xác thực trong QRTable.}
```

**Rows bắt buộc:**

- Customer.
- Waiter/Chef/Barista.
- Owner/Manager.
- Super Admin.
- SePay webhook/OAuth callback.

**Reader outcome:**

- Người đọc thấy ngay Customer không dùng Keycloak.
- Người đọc thấy webhook/OAuth callback là external boundary, không phải user.

### Task 4: Viết bảng request context và lớp kiểm soát

**Modify:**

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

**Table label đề xuất:**

```latex
\label{tab:chapter4-security-control-layers}
```

**Caption đề xuất:**

```latex
\caption{Các lớp kiểm soát bảo mật tại BFF và ngữ cảnh yêu cầu.}
```

**Rows bắt buộc:**

- Xác định actor.
- Khóa đơn vị thuê bao.
- Kiểm tra quyền thao tác.
- Kiểm tra quyền theo gói.
- Kiểm tra phiên/bàn.
- Định tuyến external callback.

**Reader outcome:**

- Người đọc hiểu "guard chain" như một chuỗi câu hỏi bảo mật, không phải chi tiết framework.

### Task 5: Viết bảng RBAC, tenant isolation và entitlement

**Modify:**

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

**Table label đề xuất:**

```latex
\label{tab:chapter4-rbac-tenant-entitlement}
```

**Caption đề xuất:**

```latex
\caption{Phân biệt RBAC, cô lập đơn vị thuê bao và quyền theo gói dịch vụ.}
```

**Rows bắt buộc:**

- RBAC.
- Tenant isolation.
- Plan entitlement.
- Platform permission.

**Reader outcome:**

- Người đọc không nhầm `report.read_own` với `analytics_basic`.
- Người đọc không hiểu Super Admin bypass là bỏ toàn bộ kiểm soát.

### Task 6: Quyết định có sửa hình auth flow hay không

**Files kiểm tra:**

- `docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter4-security-auth-flow.mmd`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-security-auth-flow.pdf`

**Decision rule:**

- Nếu hình hiện tại đã tách Staff/Owner/Admin và Customer QR/session rõ ràng, giữ nguyên.
- Nếu prose mới thêm request context/PlanFeatureGuard/webhook boundary mà hình gây thiếu ý, sửa Mermaid source để thêm node khái niệm, render lại PDF/PNG.
- Nếu sửa hình, cập nhật `thesis-artifact-backlog.md`.

**Render command nếu sửa hình:**

```bash
cd docs/graduation-thesis-resources/thesis-report
./tools/render-chapter4-diagrams.sh
```

**Expected:**

- PDF/PNG figure mới không trắng.
- Label trong LaTeX vẫn là `fig:chapter4-security-auth-flow`.

### Task 7: Cross-reference Chương 5 và Chương 6 ở mức vừa đủ

**Modify conditionally:**

- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`

**Rule:**

- Chương 5 chỉ cần nhắc guard/request context trong các flow đã có nếu bị lệch sau khi Chương 4 mở rộng.
- Chương 6 chỉ cần cross-reference Bảng/Hình Chương 4 nếu bảng mới giúp đánh giá rõ hơn.
- Không viết thêm một section dài ở Chương 5/6 trong plan này.

**Expected:**

- Chương 4 là nơi trình bày thiết kế.
- Chương 5 là nơi nối với luồng triển khai đại diện.
- Chương 6 là nơi đánh giá mức bằng chứng và giới hạn.

### Task 8: Cập nhật tài liệu điều phối

**Modify:**

- `docs/graduation-thesis-resources/thesis-workflow-plan.md`

**Conditional modify:**

- `docs/graduation-thesis-resources/thesis-artifact-backlog.md` nếu thêm/sửa hình hoặc bảng cần tracking.
- `docs/graduation-thesis-resources/thesis-official-outline.md` chỉ nếu đổi tên section lớn hoặc thay đổi artifact plan chính thức.
- `docs/graduation-thesis-resources/thesis-evidence-map.md` chỉ nếu đưa ra claim/evidence category mới.

**Required content in workflow update:**

- Ghi đã có plan mới `chapter-04-security-auth-rbac-deepening-plan.md`.
- Ghi mục tiêu: làm sâu Chương 4 security/auth/RBAC ở mức kiến trúc, không method-level implementation.
- Ghi next concrete step: thực thi plan này hoặc quay về Chương 1/Abstract tùy ưu tiên người viết.

### Task 9: Verification

Run from repo root or thesis-report directory.

**Placeholder scan for this plan and Ch4 edits:**

```bash
python3 - <<'PY'
from pathlib import Path

patterns = [
    "TB" + "D",
    "TO" + "DO",
    "implement " + "later",
    "fill in " + "details",
    "Add " + "appropriate",
    "Write tests for " + "the above",
    "Similar to " + "Task",
]
paths = [
    Path("docs/graduation-thesis-resources/chapter-04-security-auth-rbac-deepening-plan.md"),
    Path("docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex"),
]
for path in paths:
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if any(pattern in line for pattern in patterns):
            print(f"{path}:{lineno}:{line}")
PY
```

Expected:

- No output.

**Forbidden implementation-walkthrough scan:**

```bash
rg -n "canActivat[e]|generateTokenCacheKe[y]|firstValueFro[m]|Reflecto[r]|ExecutionContex[t]|decorato[r]|controller metho[d]|provide[r]" docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex
```

Expected:

- No output in the final Chương 4 prose, unless a term appears in a technical appendix or a deliberate note that does not explain method logic.

**Forbidden overclaim scan:**

```bash
rg -n "penetration test|pentest|production-grade|zero trust|mTLS|service mesh|secret rotation|WAF|full security audit|fully verified|toàn bộ bề mặt API" docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex
```

Expected:

- Terms are absent, or appear only as explicit limitations / not-yet-claimed future hardening.

**Build command:**

```bash
python3 /Users/vodinhquan/.codex/plugins/cache/openai-bundled/latex/0.2.2/scripts/compile_latex.py /Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex --compiler texlive --engine xelatex --json
```

Expected:

- Build exit code 0.
- No new undefined references/citations.
- If new tables are inserted, `.lot` contains the new captions.
- If figure is re-rendered, `.lof` still contains security/auth figure and PDF preview is not blank.

## 9. Done criteria

- [ ] Section `Kiến trúc bảo mật, xác thực và phân quyền` được chia thành subsection logic.
- [ ] Nội dung viết ở mức kiến trúc/trust boundary, không walkthrough method TypeScript.
- [ ] Có bảng actor và cơ chế xác thực.
- [ ] Có bảng request context/lớp kiểm soát.
- [ ] Có bảng phân biệt RBAC, tenant isolation và plan entitlement.
- [ ] Hình security/auth flow hiện có vẫn đúng hoặc đã được cập nhật/render lại nếu cần.
- [ ] Customer được mô tả là tác nhân theo QR/session, không phải Keycloak user.
- [ ] SePay webhook/OAuth callback được mô tả là external trust boundary, không phải user flow.
- [ ] Không copy toàn bộ 67 permission vào chương chính.
- [ ] Chương 6 vẫn giữ vai trò đánh giá bằng chứng và giới hạn claim.
- [ ] `thesis-workflow-plan.md` ghi nhận plan và next step.
- [ ] LaTeX build pass sau edits.

## 10. Reviewer-style questions và câu trả lời khuyến nghị

| Câu hỏi phản biện                                        | Câu trả lời nên dùng                                                                                                                          | Cảnh báo khi viết                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Vì sao Customer không dùng Keycloak?                     | Vì khách tại bàn cần truy cập nhanh qua QR/session; bảo mật nằm ở QR/table token, session scope, tenant context và giới hạn hành vi.          | Không gọi Customer là RBAC role.                                       |
| Keycloak và User-Access khác nhau thế nào?               | Keycloak là nguồn định danh/đăng nhập; User-Access giữ hồ sơ ứng dụng, role và permission mapping của QRTable.                                | Không viết User-Access là identity provider chính.                     |
| BFF có đang chứa business logic không?                   | BFF gom cross-cutting concerns như xác thực, tenant context, permission, routing và realtime bridge; bất biến nghiệp vụ vẫn ở service sở hữu. | Không biến guard chain thành nơi quyết định trạng thái đơn/thanh toán. |
| RBAC và quyền theo gói khác nhau thế nào?                | RBAC kiểm tra user có quyền hành động; quyền theo gói kiểm tra tenant có được dùng tính năng.                                                 | Ví dụ `report.read_own` khác `analytics_basic`.                        |
| Super Admin có bỏ qua tenant isolation không?            | Super Admin có quyền nền tảng/cross-tenant có kiểm soát cho quản trị, hỗ trợ hoặc phân tích nền tảng; đây không phải bỏ mọi kiểm soát.        | Tránh viết "bypass toàn bộ bảo mật".                                   |
| WebSocket có cần auth không?                             | Có, WebSocket cần auth/session context trước khi join room; nhưng WebSocket chỉ là hint/refetch, không phải nguồn trạng thái có thẩm quyền.   | Không mô tả socket event như quyền nghiệp vụ.                          |
| Webhook có phải luồng người dùng không?                  | Không. Webhook là external provider callback, được xác thực/định tuyến ở BFF rồi chuyển tới Payment hoặc SaaS theo owner.                     | Không trộn `QRTBL` và `QRSUB`.                                         |
| Có chứng minh toàn bộ API chống cross-tenant chưa?       | Thiết kế và một phần kiểm thử có cơ sở tốt, nhưng Chương 6 vẫn phải ghi giới hạn nếu chưa có full-stack tenant A/B suite phủ rộng.            | Không overclaim.                                                       |
| Có nên đưa toàn bộ permission matrix vào Chương 4 không? | Không. Chương chính chỉ tóm tắt nhóm role/permission và dẫn chiếu matrix/phụ lục.                                                             | Tránh làm chương chính thành tài liệu vận hành RBAC.                   |

## 11. Final handoff format sau khi thực thi

Khi thực thi xong plan này, final response nên ngắn gọn và nêu:

- File LaTeX đã sửa.
- Bảng/hình mới hoặc hình đã giữ nguyên.
- Workflow/backlog đã cập nhật.
- Build command đã chạy và exit code.
- Warning còn lại nếu có.
- Quyết định scope quan trọng: đã giữ nội dung ở mức kiến trúc, không method-level implementation.
