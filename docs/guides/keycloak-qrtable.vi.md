# Hướng Dẫn Sử Dụng Keycloak Trong QRTable

> **Bản tiếng Việt** — bản tiếng Anh canonical (chuẩn): [keycloak-qrtable.md](keycloak-qrtable.md)
>
> **Vai trò:** Tài liệu hướng dẫn hỗ trợ, không phải nguồn chân lý kiến trúc tối cao (canonical source).
> Khi bạn cần xác định trạng thái kiến trúc hiện tại, hãy ưu tiên tham khảo `[../technical-architecture.md](../technical-architecture.md)`, `[../architecture/permission-matrix.md](../architecture/permission-matrix.md)`, `[../references/auth-system-reference.md](../references/auth-system-reference.md)`, và mã nguồn thực tế trên nhánh `main`.
>
> **Mục tiêu:** Giải thích Keycloak vừa đủ để bạn có thể đọc mã nguồn (code), gỡ lỗi (debug) luồng xác thực (authentication), và mở rộng hệ thống QRTable một cách chính xác. Tài liệu này cung cấp lý thuyết nền tảng cốt lõi, không đi sâu lan man vào giáo trình Keycloak tổng quát.
>
> **Trạng thái mã nguồn hiện tại (2026-05-14):** QRTable sử dụng Keycloak phiên bản `25.0.0` để xác thực nhóm người dùng nội bộ như `SUPER_ADMIN` (quản trị viên cấp cao), `Owner` (chủ nhà hàng), `MANAGER` (quản lý), `WAITER` (nhân viên phục vụ), `CHEF` (đầu bếp), `BARISTA` (nhân viên pha chế). Ứng dụng quản lý (Management App) đăng nhập qua NextAuth kết hợp với Keycloak provider (nhà cung cấp xác thực). Dịch vụ Authorizer (bộ phận thẩm định quyền) xác thực JWT (JSON Web Token - mã xác thực dạng chuỗi ký số) bằng JWKS (JSON Web Key Set - tập hợp khóa công khai) của Keycloak, sau đó nạp hồ sơ người dùng (profile) và danh sách quyền hạn (permissions) từ dịch vụ User-Access. Khách hàng quét mã QR trên ứng dụng Customer PWA (Progressive Web App dành cho khách) không đăng nhập qua Keycloak.

---

## Mục Lục

1. [Đọc Nhanh (Quick Read)](#1-đọc-nhanh-quick-read)
2. [Keycloak Đang Được Sử Dụng Ở Đâu](#2-keycloak-đang-được-sử-dụng-ở-đâu)
3. [Nguyên Tắc Lựa Chọn Keycloak](#3-nguyên-tắc-lựa-chọn-keycloak)
4. [Lý Thuyết Vừa Đủ (Just Enough Theory)](#4-lý-thuyết-vừa-đủ-just-enough-theory)
5. [Các Loại Xác Thực Và Luồng Cấp Quyền Trong Keycloak](#5-các-loại-xác-thực-và-luồng-cấp-quyền-trong-keycloak)
6. [Luồng Xác Thực Hiện Tại Trong Hệ Thống](#6-luồng-xác-thực-hiện-tại-trong-hệ-thống)
7. [Cấp Phát Người Dùng Và Khởi Tạo Nhà Hàng Mới (Tenant Onboarding)](#7-cấp-phát-người-dùng-và-khởi-tạo-nhà-hàng-mới-tenant-onboarding)
8. [Vai Trò, Quyền Hạn Và Cô Lập Dữ Liệu Nhà Hàng (Tenant Isolation)](#8-vai-trò-quyền-hạn-và-cô-lập-dữ-liệu-nhà-hàng-tenant-isolation)
9. [Những Thứ Keycloak Không Sở Hữu](#9-những-thứ-keycloak-không-sở-hữu)
10. [Hướng Dẫn Cấu Hình Và Vận Hành Keycloak](#10-hướng-dẫn-cấu-hình-và-vận-hành-keycloak)
11. [Cài Đặt Môi Trường Cục Bộ, Triển Khai Và Gỡ Lỗi](#11-cài-đặt-môi-trường-cục-bộ-triển-khai-và-gỡ-lỗi)
12. [Đọc Mã Nguồn Ở Đâu (Code Map)](#12-đọc-mã-nguồn-ở-đâu-code-map)
13. [Bảng Kiểm Tra (Checklist)](#13-bảng-kiểm-tra-checklist)

---

## 1. Đọc Nhanh (Quick Read)

Keycloak trong QRTable đóng vai trò là **Identity Provider (nhà cung cấp dịch vụ định danh)** cho nhóm người dùng nội bộ của nhà hàng và hệ thống quản trị. Keycloak trả lời các câu hỏi:

```txt
Người này là ai? (Who is this person?)
Token (mã xác thực) này có hợp lệ không? (Is this token valid?)
Người này có vai trò định danh nào trong realm (không gian định danh)? (What identified role does this person have in the realm?)
```

Keycloak **không** phải là nguồn chân lý (Source of Truth - nguồn dữ liệu gốc đáng tin cậy nhất) cho toàn bộ quyền hạn nghiệp vụ của QRTable. Sau khi token được xác nhận hợp lệ, QRTable vẫn cần dịch vụ User-Access (quản lý người dùng và quyền truy cập) để trả lời:

```txt
Người dùng này đã được cấp phát (provisioned) vào ứng dụng chưa?
Người dùng này thuộc về tenant (nhà hàng/đơn vị thuê) nào?
Người dùng này có những quyền hạn ứng dụng (application permissions) cụ thể nào?
Người dùng này có được phép gọi API hiện tại hay không?
```

Một câu ngắn gọn dễ nhớ:

```txt
Keycloak xác thực danh tính (authenticates identities).
User-Access định nghĩa hồ sơ (profiles), vai trò nội bộ (internal roles), và quyền hạn (permissions).
BFF Guards (các lớp bảo vệ tại Backend-For-Frontend) áp dụng kiểm tra tenant và quyền hạn trên từng yêu cầu (request).
```

### Luồng tổng quát (General Flow)

```txt
Management App (Ứng dụng quản trị)
-> Chuyển hướng người dùng sang giao diện đăng nhập Keycloak
-> Nhận access token (mã truy cập ngắn hạn dạng JWT)
-> Gọi BFF /authorizer/me kèm Bearer token trong HTTP header Authorization
-> BFF UserGuard gọi dịch vụ Authorizer (nếu kết quả xác thực token chưa có trong cache Redis)
-> Authorizer xác thực chữ ký JWT bằng JWKS (bộ khóa công khai) của Keycloak
-> Authorizer nạp profile (hồ sơ) + permissions (quyền) từ dịch vụ User-Access
-> BFF TenantGuard / PermissionGuard quyết định cho phép (allow) hoặc từ chối (deny) yêu cầu
```

### Bảng thuật ngữ tối thiểu (Minimum Terminology)

| Thuật ngữ                                                 | Ý nghĩa trong QRTable                                                                                                                      |
| :-------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Keycloak**                                              | Máy chủ định danh (Identity Server), quản lý đăng nhập, người dùng, vai trò định danh và phát hành token.                                  |
| **Realm** (không gian định danh)                          | Vùng cấu hình độc lập của Keycloak. QRTable sử dụng realm mang tên `qrtable`.                                                              |
| **Client** (ứng dụng đăng ký)                             | Các ứng dụng được Keycloak cấp token, ví dụ: Management App hoặc BFF client.                                                               |
| **User** (tài khoản người dùng)                           | Tài khoản đăng nhập trong Keycloak, thường tương ứng với nhân viên/quản trị viên/chủ nhà hàng (Owner).                                     |
| **Realm role** (vai trò cấp realm)                        | Vai trò ở cấp độ toàn realm, ví dụ: `Owner`, `MANAGER`, `WAITER`. QRTable dùng vai trò này để ánh xạ sang vai trò nội bộ.                  |
| **Role** (vai trò)                                        | Nhóm trách nhiệm lớn của người dùng, ví dụ: `Owner` (chủ nhà hàng), `CHEF` (đầu bếp).                                                      |
| **Permission** (quyền thao tác chi tiết)                  | Quyền hạn chi tiết trên API hoặc nghiệp vụ, ví dụ: `ORDER_CREATE` (tạo đơn), `MENU_UPDATE` (cập nhật thực đơn).                            |
| **Tenant** (nhà hàng / bên thuê dịch vụ)                  | Không gian dữ liệu riêng biệt của một nhà hàng trong hệ thống SaaS đa người thuê (multi-tenant).                                           |
| **Guard** (lớp chặn/bảo vệ yêu cầu)                       | Lớp trung gian kiểm tra yêu cầu HTTP trước khi đi vào controller, ví dụ: `UserGuard`, `TenantGuard`, `PermissionGuard`.                    |
| **Session** (phiên làm việc)                              | Trạng thái đăng nhập hoặc phiên đang hoạt động của người dùng/khách hàng.                                                                  |
| **Cache** (bộ nhớ đệm tạm thời)                           | Dữ liệu lưu tạm có thể hết hạn hoặc dựng lại được, thường nằm trong Redis.                                                                 |
| **Provision** (cấp phát hồ sơ/tài khoản)                  | Khởi tạo hoặc đồng bộ người dùng từ tầng định danh sang tầng hồ sơ ứng dụng (application profile).                                         |
| **Onboarding** (quy trình khởi tạo nhà hàng mới)          | Luồng khởi tạo ban đầu bao gồm tenant và tài khoản Owner để nhà hàng bắt đầu sử dụng hệ thống.                                             |
| **Frontend** (ứng dụng phía trình duyệt)                  | Giao diện chạy trên máy người dùng, ví dụ: Management App (Next.js) hoặc Customer PWA (React).                                             |
| **Backend** (dịch vụ phía máy chủ)                        | Các vi dịch vụ (microservices) xử lý nghiệp vụ, lưu trữ dữ liệu, xác thực và phân quyền.                                                   |
| **OpenID Connect / OIDC**                                 | Chuẩn đăng nhập mở rộng trên nền OAuth 2.0 mà Management App sử dụng để điều hướng sang Keycloak và nhận token.                            |
| **Access token** (mã truy cập)                            | Token ngắn hạn dạng JWT được gửi lên BFF qua header `Authorization: Bearer <token>`.                                                       |
| **Refresh token** (mã làm mới phiên)                      | Token dùng để xin cấp access token mới khi access token hiện tại sắp hoặc đã hết hạn.                                                      |
| **JWT / JSON Web Token**                                  | Định dạng token chứa payload (dữ liệu tải) và digital signature (chữ ký số). Authorizer phải xác thực chữ ký trước khi tin tưởng nội dung. |
| **JWKS / JSON Web Key Set** (bộ khóa công khai)           | Endpoint (điểm cuối API) của Keycloak chứa các public key (khóa công khai) để Authorizer kiểm tra chữ ký số của JWT.                       |
| **Protocol mapper** (bộ ánh xạ claim)                     | Cấu hình trong Keycloak để đưa thuộc tính người dùng/vai trò vào claim (trường thông tin) của token, ví dụ: `tenant_id`.                   |
| **Client credentials** (thông tin định danh client)       | Cơ chế dịch vụ backend dùng `client_id` và `client_secret` để lấy admin token (mã quản trị).                                               |
| **Service account** (tài khoản dịch vụ)                   | Tài khoản đại diện cho một client backend khi client đó cần gọi các Admin API của Keycloak.                                                |
| **Admin REST API** (API quản trị Keycloak)                | Tập hợp API của Keycloak để tạo người dùng, gán vai trò, khóa tài khoản. Authorizer gọi API này.                                           |
| **Required action** (hành động bắt buộc)                  | Yêu cầu người dùng phải thực hiện sau khi đăng nhập, ví dụ: `UPDATE_PASSWORD` (đổi mật khẩu lần đầu).                                      |
| **Scope** (phạm vi yêu cầu)                               | Danh sách quyền hạn/nhóm thông tin mà client yêu cầu khi đăng nhập OIDC.                                                                   |
| **Source of truth** (nguồn chân lý)                       | Nơi lưu trữ dữ liệu được coi là phiên bản chính xác và đáng tin cậy nhất khi xảy ra xung đột.                                              |
| **Security boundary** (ranh giới bảo mật)                 | Lớp kiểm tra an ninh không được phép bỏ qua nhằm bảo vệ dữ liệu và API.                                                                    |
| **Callback URL / Redirect URI** (địa chỉ chuyển hướng về) | Địa chỉ URL mà Keycloak chuyển hướng người dùng quay lại sau khi đăng nhập thành công.                                                     |

---

## 2. Keycloak Đang Được Sử Dụng Ở Đâu

| Thành phần              | Vai trò của Keycloak                                                                                                                                       |
| :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docker providers**    | Chạy Keycloak cục bộ tại `http://localhost:8180`, sử dụng Docker image `quay.io/keycloak/keycloak:25.0.0`.                                                 |
| **Realm `qrtable`**     | Không gian định danh độc lập dành riêng cho dự án QRTable.                                                                                                 |
| **Management App**      | Sử dụng NextAuth Keycloak provider để đăng nhập, làm mới token (refresh token) và nạp phiên làm việc (session).                                            |
| **Authorizer service**  | Xác thực JWT qua JWKS, gọi Keycloak Admin REST API để tạo người dùng, gán realm role và vô hiệu hóa (disable) người dùng.                                  |
| **BFF Guards**          | Không giao tiếp trực tiếp với Keycloak; `UserGuard` gọi sang dịch vụ Authorizer qua gRPC và lưu đệm (cache) kết quả xác thực trong Redis.                  |
| **User-Access service** | Lưu trữ hồ sơ ứng dụng (application profile), vai trò nội bộ và quyền hạn; đây là nguồn chân lý cho các quyền hạn ứng dụng.                                |
| **SaaS onboarding**     | Tạo tài khoản Owner trong Keycloak khi đăng ký nhà hàng mới, gán vai trò `Owner`, rollback bằng cách disable người dùng nếu các bước sau thất bại.         |
| **Keycloak Theme**      | Giao diện đăng nhập tùy biến tại `apps/keycloak-theme`, được gắn (mount) vào container Keycloak.                                                           |
| **Bootstrap scripts**   | Script `tools/keycloak-bootstrap.sh` tự động tạo realm, client, user attributes, protocol mappers, realm roles và người dùng mẫu cho môi trường local/dev. |

Keycloak **không** được sử dụng cho luồng khách hàng quét mã QR gọi món. Ứng dụng Customer PWA sử dụng phiên làm việc riêng (session/QR token) kèm guard riêng, bởi vì thực khách không cần và không nên có tài khoản nhân viên trong realm `qrtable`.

---

## 3. Nguyên Tắc Lựa Chọn Keycloak

Keycloak được lựa chọn khi bài toán là **Human Authentication (xác thực người dùng thực)**, quản lý quy trình đăng nhập, cấp phát token, quản lý vai trò định danh, hoặc vòng đời tài khoản (account lifecycle) trong hệ thống định danh.

Keycloak **không** được dùng như một cơ sở dữ liệu nghiệp vụ tổng quát. Nếu dữ liệu cần giao dịch nghiệp vụ (business transactions), kiểm toán (audits), truy vấn theo từng nhà hàng (tenant), hoặc là nguồn chân lý của miền nghiệp vụ QRTable, hãy để dịch vụ sở hữu miền nghiệp vụ đó quản lý trong PostgreSQL/MongoDB.

### Tại sao QRTable cần Keycloak?

Vấn đề gốc rễ của QRTable là Management App có nhiều nhóm người dùng nội bộ: Quản trị viên cấp cao (`SUPER_ADMIN`), Chủ nhà hàng (`Owner`), Quản lý (`MANAGER`), Nhân viên phục vụ (`WAITER`), Đầu bếp (`CHEF`), Nhân viên pha chế (`BARISTA`). Những đối tượng này cần đăng nhập an toàn, nhận token chuẩn hóa, có vòng đời tài khoản rõ ràng (có thể bị khóa, đặt lại mật khẩu, gán vai trò định danh) và tích hợp liền mạch với backend qua JWT. Nếu tự viết toàn bộ tầng xác thực từ đầu, dự án sẽ phải tự gánh vác rất nhiều thành phần nhạy cảm và phức tạp: lưu trữ mật khẩu, giải thuật băm (hash), quản lý refresh token, ký số token, cấu hình JWKS, chính sách mật khẩu, bảo mật phiên và công cụ quản trị người dùng.

Keycloak giải quyết bài toán ở **tầng định danh (identity layer)**:

```txt
Ai đang đăng nhập? (Who is logging in?)
Token này có hợp lệ không? (Is this token valid?)
Người dùng này mang vai trò định danh nào trong realm? (What identifying realm role does this user have?)
Người dùng này còn đang hoạt động (enabled) hay đã bị khóa? (Is this user still enabled?)
```

QRTable tách bạch **tầng phân quyền nghiệp vụ (business authorization layer)** sang dịch vụ User-Access:

```txt
Người dùng này thuộc nhà hàng (tenant) nào trong ứng dụng?
Người dùng này có những quyền hạn (permissions) QRTable cụ thể nào?
Yêu cầu gọi API hiện tại có được phép tiếp tục hay không?
```

Tại sao chọn Keycloak mà không phải phương án khác?

| Phương án                           | Lý do không chọn làm giải pháp chính                                                                                                                                                                                     |
| :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tự viết hệ thống Auth**           | Rủi ro bảo mật rất cao, tốn nhiều thời gian, dễ mắc lỗi trong cơ chế làm mới token, chính sách mật khẩu, quản lý khóa ký và vòng đời người dùng.                                                                         |
| **Chỉ dùng NextAuth**               | NextAuth quản lý phiên ở phía frontend rất tốt, nhưng không phải là một Identity Server hoàn chỉnh hỗ trợ quản lý realm, Admin API, JWKS, và quản trị vai trò tập trung.                                                 |
| **Chỉ dùng User-Access**            | User-Access sở hữu quyền hạn ứng dụng, nhưng không nên tự gánh vác các tiêu chuẩn OIDC, cấp/xác thực token và quản lý mật khẩu nhạy cảm.                                                                                 |
| **Firebase / Auth0 / SaaS Auth**    | Rất mạnh mẽ nhưng phụ thuộc vào nhà cung cấp đám mây (cloud vendor); Keycloak là mã nguồn mở, tự lưu trữ (self-hosted), hoàn toàn tương thích với môi trường local/dev/đồ án tốt nghiệp và cung cấp Admin API toàn diện. |
| **Dùng Keycloak cho khách quét QR** | Khách quét mã QR là phiên ẩn danh (anonymous session) gắn theo từng bàn, không cần tài khoản định danh trong realm nhân viên.                                                                                            |

Câu trả lời phỏng vấn mẫu chuẩn kỹ thuật:

> _"Dự án sử dụng Keycloak làm Identity Provider (nhà cung cấp định danh) cho khối nhân viên và quản trị viên nhằm tận dụng cơ chế đăng nhập chuẩn OIDC, cấp phát JWT, xác thực chữ ký qua JWKS, quản lý vai trò định danh, vòng đời tài khoản và Admin API phục vụ onboarding nhà hàng mới. Tuy nhiên, Keycloak không nắm giữ chi tiết các quyền hạn nghiệp vụ; sau khi token được xác nhận hợp lệ, Authorizer và User-Access sẽ nạp hồ sơ, thông tin tenant và danh sách application permissions cụ thể. Sự phân tách này giúp hệ thống không phải tự viết logic xác thực nhạy cảm từ đầu, trong khi quyền hạn nghiệp vụ vẫn hoàn toàn thuộc quyền kiểm soát của miền nghiệp vụ QRTable."_

Các câu hỏi thường gặp khi phỏng vấn:

| Câu hỏi phỏng vấn                                             | Trọng tâm câu trả lời trong QRTable                                                                                                                                                                        |
| :------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keycloak khác gì so với User-Access?**                      | Keycloak xác thực danh tính (Authentication - người dùng là ai); User-Access là nguồn chân lý cho hồ sơ và quyền hạn ứng dụng (Authorization - người dùng được làm gì).                                    |
| **Tại sao khách hàng quét QR không dùng Keycloak?**           | Khách hàng là luồng ẩn danh theo bàn/phiên ngắn hạn, không cần tài khoản nhân viên và không nên bắt buộc phải thực hiện quy trình đăng nhập nặng nề.                                                       |
| **JWT claim có đủ để phân quyền chi tiết không?**             | Không đủ. Claim chỉ giúp cung cấp ngữ cảnh định danh/tenant ban đầu; `PermissionGuard` vẫn phải dựa vào danh sách quyền hạn ứng dụng nạp từ User-Access.                                                   |
| **Nếu Keycloak bị sập (down), hệ thống bị ảnh hưởng ra sao?** | Các luồng đăng nhập mới, làm mới token và cấp phát người dùng sẽ bị gián đoạn; các yêu cầu gọi API với token còn hạn và đã được cache trong Redis vẫn có thể hoạt động bình thường trong phạm vi thiết kế. |
| **Tại sao cần Protocol Mapper?**                              | Để nhúng các thuộc tính quan trọng như `tenant_id` vào claim của token, giúp BFF/Authorizer nhanh chóng trích xuất ngữ cảnh nhà hàng mà không cần truy vấn phụ.                                            |

### 3.1 Khi nào NÊN dùng Keycloak

Sử dụng Keycloak khi cần:

- Đăng nhập cho nhân viên nhà hàng, chủ nhà hàng (Owner), quản lý, quản trị viên hoặc quản trị viên cấp cao (`SUPER_ADMIN`).
- Phát hành access token (dạng JWT) để frontend gửi lên BFF.
- Xác thực token theo chuẩn OIDC / JWKS thay vì tự viết giải thuật kiểm tra token thủ công.
- Quản lý mật khẩu, hành động bắt buộc (`required actions`), kích hoạt hoặc vô hiệu hóa tài khoản (`enabled/disabled`).
- Tạo người dùng từ backend thông qua Admin REST API trong quy trình khởi tạo nhà hàng (onboarding).
- Gán các nhóm vai trò định danh lớn, ví dụ: `Owner`, `MANAGER`, `WAITER`.
- Tích hợp giao diện đăng nhập tập trung, thống nhất cho Management App.

### 3.2 Khi nào KHÔNG NÊN dùng Keycloak

Không sử dụng Keycloak cho:

- Phiên làm việc của khách hàng quét mã QR (Customer Session). Đây là luồng ẩn danh theo bàn/mã QR.
- Các quyền thao tác nghiệp vụ chi tiết như `ORDER_CREATE`, `MENU_UPDATE`, `PLAN_MANAGE`. Các quyền này thuộc về User-Access và Permission Matrix (ma trận phân quyền).
- Trạng thái nhà hàng, gói dịch vụ thuê bao (`subscription`), hóa đơn, hạn ngạch (quota), cấu hình thanh toán.
- Luồng OAuth của cổng thanh toán bên ngoài, ví dụ: trạng thái OAuth của SePay.
- Dữ liệu đệm token (token cache), giỏ hàng tạm, trạng thái runtime của màn hình bếp (KDS) — các phần này thuộc về Redis.
- Sự kiện giao tiếp giữa các dịch vụ (inter-service events) — các phần này sử dụng TCP, gRPC hoặc Kafka tùy ngữ cảnh.

### 3.3 Câu hỏi quyết định nhanh (Decision Tree)

| Tình huống                                               | Lựa chọn phù hợp                                                         |
| :------------------------------------------------------- | :----------------------------------------------------------------------- |
| Đây có phải người dùng nội bộ cần đăng nhập không?       | **Keycloak**.                                                            |
| Đây có phải khách hàng quét mã QR không cần tài khoản?   | **Customer session / QR token**, không dùng Keycloak.                    |
| Cần biết token có hợp lệ không và người dùng là ai?      | **Authorizer** xác thực Keycloak JWT.                                    |
| Cần biết người dùng có những quyền hạn gì trong QRTable? | **User-Access** + **PermissionGuard**.                                   |
| Cần biết người dùng thuộc về nhà hàng (tenant) nào?      | **JWT claim / User profile** + **TenantGuard**.                          |
| Cần tạo tài khoản Owner khi khởi tạo nhà hàng mới?       | **SaaS service** gọi Authorizer, Authorizer gọi **Keycloak Admin API**.  |
| Cần khóa tài khoản Owner nếu bước onboarding sau bị lỗi? | **Authorizer** gọi **Keycloak Admin API** để vô hiệu hóa (disable) user. |
| Cần lưu trữ dữ liệu nghiệp vụ lâu dài và kiểm toán?      | **PostgreSQL** trong dịch vụ sở hữu miền nghiệp vụ.                      |

### 3.4 So sánh các tầng thành phần liên quan

| Thành phần            | Câu hỏi trả lời                                               | Cách QRTable sử dụng                                                            |
| :-------------------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------ |
| **Keycloak**          | _"Người này là ai, token có hợp lệ không?"_                   | Xử lý đăng nhập, cấp JWT, quản lý realm role, vòng đời tài khoản quản trị.      |
| **NextAuth**          | _"Frontend duy trì phiên đăng nhập như thế nào?"_             | Management App lưu token/session, tự động làm mới token và nạp profile.         |
| **Authorizer**        | _"Token của Keycloak có hợp lệ trong QRTable không?"_         | Xác thực JWT qua JWKS, nạp profile người dùng, trả quyền hạn về cho BFF.        |
| **User-Access**       | _"Người dùng này có profile, vai trò và quyền hạn gì?"_       | Nguồn chân lý (Source of Truth) cho thông tin người dùng và quyền hạn ứng dụng. |
| **BFF Guards**        | _"Yêu cầu này có được phép đi tiếp vào controller không?"_    | `UserGuard`, `TenantGuard`, `PermissionGuard` kiểm tra từng lớp.                |
| **Redis Token Cache** | _"Có thể tái sử dụng kết quả xác thực token gần nhất không?"_ | Lưu đệm kết quả của Authorizer trong 30 phút để giảm tải xác thực trùng lặp.    |

---

## 4. Lý Thuyết Vừa Đủ (Just Enough Theory)

### 4.1 Realm (Không gian định danh)

Realm là một không gian cấu hình độc lập hoàn toàn trong Keycloak. Mỗi realm sở hữu danh sách người dùng, vai trò, client, cấu hình đăng nhập và khóa ký token (token signing key) riêng biệt.

Trong QRTable, realm mặc định hiện tại là:

```txt
qrtable
```

Nếu sau này bạn tạo thêm các realm riêng cho từng môi trường (ví dụ: `qrtable-dev`, `qrtable-staging`, `qrtable-prod`), hãy đảm bảo frontend, Authorizer và Keycloak Admin API đều trỏ đúng địa chỉ phát hành (issuer) và tên realm tương ứng. Sai lệch tên realm sẽ dẫn đến việc xác thực token thất bại do issuer hoặc public key không khớp.

### 4.2 Client (Ứng dụng đăng ký)

Client là ứng dụng được khai báo và cấp phép trong Keycloak. Cấu hình client quyết định cách thức ứng dụng tương tác để xác thực và nhận token.

Trong QRTable hiện tại có các biến môi trường tương ứng:

```txt
KEYCLOAK_CLIENT_ID=qrtable-bff
AUTH_KEYCLOAK_ID=management-app
```

Ý nghĩa thực tế:

- `management-app`: Phục vụ luồng đăng nhập của người dùng trên trình duyệt qua NextAuth (Public/Confidential OIDC Client).
- `qrtable-bff` / Backend Client: Được dịch vụ Authorizer sử dụng khi cần trao đổi token hoặc gọi Keycloak Admin API bằng Client Secret (mật mã bảo mật của client).

> [!IMPORTANT]
> Client Secret chỉ được sử dụng an toàn ở tầng Backend. Tuyệt đối không để lộ Client Secret vào mã nguồn trình duyệt, bundle frontend hoặc tài liệu công khai.

### 4.3 OpenID Connect (OIDC)

OpenID Connect (chuẩn định danh mở rộng xây dựng trên giao thức OAuth 2.0) bổ sung lớp xác thực người dùng vào OAuth 2.0. Tóm tắt sự khác biệt:

```txt
OAuth 2.0 trả lời: Ứng dụng này có quyền truy cập vào tài nguyên nào? (Authorization)
OpenID Connect trả lời thêm: Ai là người thực tế đang đăng nhập? (Authentication)
```

Trong ứng dụng Management App:

```txt
Người dùng nhấn "Đăng nhập"
-> Management App chuyển hướng sang trang đăng nhập của Keycloak
-> Keycloak xác thực tài khoản và mật khẩu người dùng
-> Management App nhận access token / refresh token thông qua NextAuth
```

Sau khi nhận token, Management App không tự ý tin tưởng tuyệt đối mọi claim trong token mà sẽ gọi endpoint BFF `/authorizer/me` để hệ thống QRTable xác nhận rằng người dùng đã có hồ sơ (profile) và quyền hạn hợp lệ trong User-Access.

### 4.4 JWT và Chữ Ký Số (Digital Signature)

JWT (JSON Web Token) bao gồm 3 phần ngăn cách bởi dấu chấm:

```txt
header.payload.signature
(tiêu đề . dữ liệu tải . chữ ký số)
```

Phần payload có thể giải mã dễ dàng bằng Base64, nhưng **tuyệt đối không được tin tưởng** nếu chưa kiểm tra tính toàn vẹn của chữ ký số (signature). Authorizer thực hiện quy trình xác thực theo đúng thứ tự:

1. Giải mã header để lấy định danh khóa `kid` (Key ID).
2. Lấy public key (khóa công khai) tương ứng từ điểm cuối JWKS của Keycloak.
3. Xác thực chữ ký số bằng thuật toán RS256 (RSA Signature with SHA-256).
4. Kiểm tra payload xem có trường định danh người dùng `sub` (Subject ID) hay không.
5. Nạp hồ sơ người dùng từ dịch vụ User-Access.

Điều này vô cùng quan trọng vì client phía ngoài có thể tạo ra các token giả mạo. Chỉ những token có chữ ký số hợp lệ khớp với public key của realm mới được chấp nhận.

### 4.5 JWKS (JSON Web Key Set)

JWKS là danh sách các khóa công khai mà Keycloak công bố tại endpoint:

```txt
{KEYCLOAK_HOST}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs
```

Với môi trường local của QRTable:

```txt
http://localhost:8180/realms/qrtable/protocol/openid-connect/certs
```

Keycloak có khả năng tự động luân chuyển khóa ký (Key Rotation). Do đó, Authorizer không gán cứng (hard-code) public key trong mã nguồn, mà sẽ nạp động theo `kid` từ JWKS endpoint. Thư viện `jwks-rsa` được cấu hình kèm bộ nhớ đệm (cache) và giới hạn tốc độ gọi (rate limit) để giảm thiểu tải cho máy chủ.

### 4.6 Vai Trò Trong Keycloak và Quyền Hạn Trong QRTable

Vai trò cấp realm (Realm Role) trong Keycloak là các nhóm định danh người dùng ở mức vĩ mô:

```txt
SUPER_ADMIN (Quản trị viên cấp cao hệ thống SaaS)
OWNER (Chủ nhà hàng)
MANAGER (Quản lý nhà hàng)
WAITER (Nhân viên phục vụ)
CHEF (Đầu bếp)
BARISTA (Nhân viên pha chế)
```

Trong khi đó, quyền hạn (Permission) trong QRTable là các quyền thao tác chi tiết do User-Access quản lý, ví dụ:

```txt
ORDER_CREATE (Tạo đơn hàng mới)
MENU_UPDATE (Chỉnh sửa danh mục/món ăn)
PLAN_MANAGE (Quản lý gói dịch vụ SaaS)
PAYMENT_SETTINGS_UPDATE (Cấu hình thông tin thanh toán)
```

Nguyên tắc cốt lõi:

```txt
Vai trò trong Keycloak giúp QRTable nhận biết người dùng thuộc nhóm chức danh nào.
Vai trò và quyền hạn trong User-Access quyết định người dùng được thực hiện chính xác hành động nào.
```

Nếu một token có vai trò hợp lệ trong Keycloak nhưng User-Access chưa có hồ sơ tương ứng hoặc chưa có ánh xạ vai trò, yêu cầu gọi API vẫn sẽ bị từ chối với lỗi `user_not_provisioned`.

### 4.7 Claim và Protocol Mapper

Claim là một trường dữ liệu nằm trong payload của JWT. QRTable quan tâm đến các claim chính:

```json
{
  "sub": "keycloak-user-uuid",
  "email": "owner@example.com",
  "realm_access": {
    "roles": ["OWNER"]
  },
  "tenant_id": "tenant-uuid-123",
  "sub_role": "OWNER"
}
```

Protocol Mapper (bộ ánh xạ giao thức) giúp đưa các thuộc tính tùy chỉnh của người dùng (User Attributes) vào claim của token. Ví dụ: khi người dùng có thuộc tính `tenant_id`, mapper sẽ tự động đưa giá trị này vào access token để BFF/Authorizer đọc trực tiếp.

Trong mã nguồn hiện tại, Authorizer và các guards xử lý linh hoạt cả định dạng snake_case `tenant_id` lẫn camelCase `tenantId` để tránh lỗi tên trường khi truyền tải qua protobuf/gRPC.

### 4.8 Admin REST API

Admin REST API là tập hợp các điểm cuối quản trị của Keycloak. Authorizer sử dụng API này để:

- Lấy token quản trị thông qua luồng Client Credentials.
- Tạo tài khoản người dùng mới.
- Gán realm role cho người dùng.
- Cập nhật thông tin người dùng.
- Vô hiệu hóa (disable) tài khoản người dùng.
- Đọc thông tin chi tiết của người dùng theo ID.

Theo tài liệu chính thức của Keycloak, đường dẫn chuẩn của Admin REST API có định dạng:

```txt
/admin/realms/{realm}/...
```

QRTable **không** cho phép frontend gọi trực tiếp tới Admin REST API. Mọi thao tác quản trị Keycloak bắt buộc phải đi qua backend với Client Secret bảo mật và cơ chế hoàn tác (rollback) đầy đủ.

### 4.9 Required Action (Hành Động Bắt Buộc)

Required Action là hành động mà Keycloak bắt buộc người dùng phải hoàn thành ngay sau khi đăng nhập thành công. QRTable sử dụng hành động `UPDATE_PASSWORD` (bắt buộc đổi mật khẩu) trong luồng tạo tài khoản Owner mới:

```txt
Quy trình SaaS Onboarding tạo Owner mới
-> Người dùng Keycloak được tạo với mật khẩu tạm thời
  -> requiredActions: ["UPDATE_PASSWORD"]
-> Chủ nhà hàng (Owner) bắt buộc phải đổi mật khẩu ở lần đăng nhập đầu tiên
```

Cơ chế này bảo mật hơn nhiều so với việc để mật khẩu tạm thời tồn tại vĩnh viễn.

---

## 5. Các Loại Xác Thực Và Luồng Cấp Quyền Trong Keycloak

Keycloak hỗ trợ nhiều luồng xác thực (Authentication Flows) và luồng cấp token (OAuth 2.0 Grants). QRTable không sử dụng tất cả. Khi tìm hiểu, bạn cần phân biệt rõ luồng nào đang được sử dụng thực tế, luồng nào là lý thuyết, và luồng nào cần tránh.

### 5.1 Authorization Code / Standard Flow (Luồng Mã Xác Thực Chuẩn)

Authorization Code Flow (thường gọi là **Standard Flow** trên giao diện Keycloak) là luồng xác thực chính cho các ứng dụng web có tương tác qua trình duyệt.

Sơ đồ luồng trực quan:

```txt
Người dùng mở Management App
-> Ứng dụng chuyển hướng sang trang đăng nhập của Keycloak
-> Người dùng nhập tài khoản/mật khẩu trực tiếp trên giao diện Keycloak
-> Keycloak trả mã ủy quyền (authorization code) về Callback URL của ứng dụng
-> NextAuth phía server đổi code lấy access token và refresh token
```

QRTable sử dụng luồng này cho Management App qua NextAuth + Keycloak Provider. Đây là luồng an toàn nhất vì mật khẩu chỉ được nhập trên Keycloak, frontend hoàn toàn không xử lý hay lưu trữ mật khẩu của người dùng.

### 5.2 Refresh Token (Mã Làm Mới Phiên)

Refresh Token được dùng để xin cấp một Access Token mới khi Access Token hiện tại đã hoặc sắp hết hạn mà không bắt người dùng phải đăng nhập lại từ đầu. Management App yêu cầu scope `offline_access` để nhận Refresh Token.

Trong QRTable:

- NextAuth lưu giữ Refresh Token an toàn trong phiên làm việc (JWT Session) tại server runtime.
- Khi Access Token sắp hết hạn, Management App gửi yêu cầu đến token endpoint của Keycloak với `grant_type=refresh_token`.
- BFF vẫn phải xác thực lại Access Token mới qua Authorizer; Refresh Token không bao giờ được gửi trực tiếp lên các API nghiệp vụ của BFF.

### 5.3 Client Credentials / Service Account (Luồng Dành Cho Dịch Vụ Backend)

Client Credentials Grant là luồng xác thực giữa máy chủ với máy chủ (machine-to-machine / service-to-service), không đại diện cho người dùng cụ thể nào đang thao tác trên giao diện.

Sơ đồ luồng:

```txt
Authorizer sở hữu client_id + client_secret
-> Gửi yêu cầu đến token endpoint với grant_type=client_credentials
-> Nhận admin/service token
-> Gọi các điểm cuối của Keycloak Admin REST API
```

QRTable sử dụng cơ chế này để dịch vụ Authorizer gọi Admin REST API của Keycloak (tạo người dùng, gán role, khóa tài khoản). Trong file `tools/keycloak-bootstrap.sh`, client backend được kích hoạt `serviceAccountsEnabled: true` và service account được gán các quyền quản trị tối thiểu cần thiết như `manage-users`, `view-users`, `query-users`, và `view-realm`.

### 5.4 Direct Access Grants / Resource Owner Password Credentials Grant

Direct Access Grants cho phép client gửi trực tiếp username/password lên token endpoint để lấy token. Đây là luồng thuận tiện cho việc viết script tự động hóa, kiểm thử (testing), nhưng không nên dùng làm luồng chính cho giao diện người dùng hiện đại.

Trong mã nguồn hiện tại, Authorizer có hàm `exchangeUserToken()` sử dụng `grant_type=password`. Script bootstrap hoặc các luồng kiểm thử nội bộ có thể dựa vào hàm này, nhưng luồng đăng nhập chính của Management App vẫn bắt buộc phải đi qua Standard Flow.

### 5.5 Implicit Flow (Luồng Ẩn - Không Khuyến Nghị)

Implicit Flow trước đây từng được dùng cho các ứng dụng Single Page App (SPA), trong đó token được trả về trực tiếp trên URL sau khi chuyển hướng trình duyệt. Hiện nay, luồng này bị xem là kém an toàn vì token dễ bị lộ trong lịch sử trình duyệt hoặc nhật ký máy chủ (logs).

QRTable **không** sử dụng Implicit Flow. Toàn bộ đăng nhập web được xử lý an toàn qua NextAuth và Standard Flow.

### 5.6 Bảng Ánh Xạ Luồng Trong QRTable

| Nhu cầu thực tế                                       | Luồng phù hợp                         | Trạng thái triển khai trong QRTable               |
| :---------------------------------------------------- | :------------------------------------ | :------------------------------------------------ |
| **Nhân viên / Admin đăng nhập Management App**        | Standard Flow / Authorization Code    | Đang dùng thông qua NextAuth.                     |
| **Management App làm mới Access Token**               | Refresh Token                         | Đang dùng thông qua NextAuth callback.            |
| **Authorizer gọi Keycloak Admin REST API**            | Client Credentials / Service Account  | Đang dùng cho các thao tác quản trị Keycloak.     |
| **Script kiểm thử lấy token bằng tài khoản/mật khẩu** | Direct Access Grants / Password Grant | Có hỗ trợ trong Authorizer, sử dụng có kiểm soát. |
| **Ứng dụng SPA nhận token trực tiếp từ URL**          | Implicit Flow                         | Tuyệt đối không dùng, tránh sử dụng.              |
| **Khách hàng quét mã QR gọi món tại bàn**             | Không dùng Keycloak                   | Dùng phiên ẩn danh (Customer Session / QR Token). |

---

## 6. Luồng Xác Thực Hiện Tại Trong Hệ Thống

### 6.1 Đăng Nhập Management App

Management App sử dụng NextAuth với Keycloak Provider. Các biến môi trường cấu hình chính:

```txt
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=...
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable
MANAGEMENT_BFF_BASE_URL=http://localhost:3300/api/v1
```

Chi tiết luồng đăng nhập:

```txt
Người dùng truy cập trang /login
-> Management App gọi hàm signIn("keycloak")
-> Người dùng đăng nhập thành công trên giao diện Keycloak
-> NextAuth lưu trữ access token, refresh token, thời gian hết hạn (expiresAt)
-> Management App gọi API BFF /authorizer/me
-> Phiên làm việc (Session) được nạp đầy đủ thông tin: roles, permissions, tenantId, userId
```

### 6.2 BFF UserGuard (Lớp Bảo Vệ Người Dùng)

Khi một route trong BFF được đánh dấu decorator `@Authorization({ secured: true })`, `UserGuard` sẽ thực hiện:

1. Trích xuất Bearer token từ header `Authorization` của yêu cầu.
2. Tạo khóa đệm Redis theo định dạng: `user-token:{sha256(token)}`.
3. Nếu tìm thấy dữ liệu trong Redis Cache (Cache Hit) -> Gắn thông tin metadata của người dùng vào request và cho phép tiếp tục.
4. Nếu chưa có trong Cache (Cache Miss) -> Gọi sang dịch vụ Authorizer qua gRPC endpoint `verifyUserToken`.
5. Lưu kết quả xác thực vào Redis Cache với thời gian sống (TTL) khoảng 30 phút.

`UserGuard` không tự giải mã và kiểm tra JWT mà ủy thác hoàn toàn cho dịch vụ Authorizer để đảm bảo tính tập trung.

### 6.3 Authorizer Xác Thực Token

Dịch vụ Authorizer thực hiện chuỗi xử lý:

1. Giải mã tiêu đề (header) của JWT để lấy mã khóa `kid`.
2. Lấy signing key (khóa ký công khai) tương ứng từ JWKS endpoint của Keycloak.
3. Xác thực chữ ký số của JWT bằng thuật toán RS256.
4. Kiểm tra trường định danh người dùng `sub`.
5. Gọi sang dịch vụ User-Access để truy vấn hồ sơ người dùng theo Keycloak User ID.
6. Kiểm tra việc ánh xạ vai trò (role mapping) giữa realm role trong token và vai trò nội bộ của hệ thống.
7. Tập hợp danh sách các quyền hạn (permissions) chi tiết từ User-Access.
8. Đóng gói và trả dữ liệu metadata hoàn chỉnh về cho BFF.

Nếu hồ sơ chưa tồn tại, Authorizer có thể tự động cấp phát nếu cờ cấu hình `AUTH_AUTO_PROVISION_ON_FIRST_LOGIN=true`. Nếu không bật cờ này, hệ thống sẽ trả về lỗi `user_not_provisioned`.

### 6.4 TenantGuard (Lớp Cô Lập Dữ Liệu Nhà Hàng)

`TenantGuard` đảm bảo rằng một yêu cầu không được phép truy cập trái phép hoặc "nhảy sang" dữ liệu của nhà hàng khác. Guard xác định tenant từ:

- Claim `tenant_id` hoặc `tenantId` trong JWT.
- Header `x-tenant-id` hoặc tham số đường dẫn (route params) khớp với ngữ cảnh yêu cầu.
- Dữ liệu session trong Redis (đối với luồng khách hàng).

Vai trò `SUPER_ADMIN` có thể bỏ qua (bypass) kiểm tra tenant trong các route quản trị cấp hệ thống. Các vai trò thuộc nhà hàng (`Owner`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`) bắt buộc phải có tenant hợp lệ và giá trị tenant trong request phải hoàn toàn trùng khớp với thông tin trong token.

### 6.5 PermissionGuard (Lớp Kiểm Tra Quyền Hạn Chi Tiết)

`PermissionGuard` đọc yêu cầu về quyền hạn gắn trên từng route (thông qua decorator), sau đó đối chiếu với danh sách permissions có trong metadata của người dùng (do User-Access cung cấp, không phải từ Keycloak).

Ví dụ:

```txt
Route yêu cầu quyền: ORDER_UPDATE
-> JWT hợp lệ
-> Người dùng đã được cấp phát hồ sơ (provisioned)
-> TenantGuard kiểm tra khớp tenant hợp lệ
-> PermissionGuard kiểm tra thấy người dùng CÓ quyền ORDER_UPDATE
-> Cho phép yêu cầu tiếp tục đi vào Controller xử lý
```

Nếu thiếu quyền, hệ thống sẽ trả về mã lỗi 403 `permission_denied`.

### 6.6 WebSocket và Realtime

Đối với kết nối thời gian thực (WebSocket) phục vụ màn hình quản lý hoặc màn hình bếp (KDS), token vẫn phải được xác thực trước khi cho phép socket tham gia (join) vào room của tenant/role tương ứng:

```txt
Chỉ token hợp lệ là chưa đủ
-> Cần có hồ sơ người dùng từ User-Access
-> Cần xác định đúng tenant hợp lệ
-> Mới cho phép socket gia nhập room thời gian thực trong phạm vi cho phép
```

---

## 7. Cấp Phát Người Dùng Và Khởi Tạo Nhà Hàng Mới (Tenant Onboarding)

### 7.1 Tạo Người Dùng Nội Bộ Thông Thường

Dịch vụ User-Access quản lý luồng tạo người dùng ứng dụng:

```txt
Yêu cầu tạo nhân viên/quản trị viên mới
-> User-Access kiểm tra tính hợp lệ và sự tồn tại của email
-> User-Access gọi sang Authorizer qua TCP với command KEYCLOAK.CREATE_USER
-> Authorizer tạo tài khoản người dùng trên Keycloak
-> User-Access lưu hồ sơ người dùng vào cơ sở dữ liệu nội bộ
```

Lý do không tạo trực tiếp trên Keycloak:

- Keycloak chỉ quản lý định danh và realm role cấp cao.
- QRTable cần lưu trữ hồ sơ, quan hệ tenant, vai trò nội bộ và danh sách quyền hạn ứng dụng.
- Cần kiểm soát lỗi trùng lặp email, xử lý hoàn tác (rollback) và đồng bộ dữ liệu theo nghiệp vụ.

### 7.2 Quy Trình Onboarding Chủ Nhà Hàng (Phase 4B)

Trong Phase 4B, quy trình khởi tạo nhà hàng mới và tài khoản Owner diễn ra theo mô hình Saga phân tán:

```txt
Dịch vụ SaaS nhận yêu cầu onboarding
-> Tạo bản ghi tenant mới trong DB SaaS
-> Gọi sang Authorizer với command KEYCLOAK.CREATE_TENANT_OWNER
-> Authorizer tạo user trên Keycloak, gán realm role Owner
-> Gán thuộc tính tenant_id và tenant_slug vào user
-> Thiết lập mật khẩu tạm thời và gán required action UPDATE_PASSWORD
-> SaaS gọi User-Access để tạo/cập nhật hồ sơ Owner
-> Tạo gói dịch vụ (subscription), cấu hình thanh toán và phát sự kiện outbox tenant.created
```

Nếu bất kỳ bước nào phía sau việc tạo Keycloak Owner bị lỗi, dịch vụ SaaS sẽ gọi sang Authorizer lệnh `KEYCLOAK.DISABLE_USER` để vô hiệu hóa tài khoản Owner vừa tạo. Đây là **Compensating Action (hành động bù trừ / hoàn tác)** cần thiết, vì Keycloak và cơ sở dữ liệu của SaaS/User-Access không thể nằm chung trong một Database Transaction duy nhất.

### 7.3 Tại Sao Lại Hoàn Tác Bằng Cách Khóa (Disable) Thay Vì Xóa?

Trong kiến trúc vi dịch vụ (Microservices), việc khóa tài khoản (disable user) khi onboarding thất bại mang lại nhiều lợi ích:

- Ngăn chặn ngay lập tức việc người dùng đăng nhập bằng một tài khoản có hồ sơ ứng dụng dở dang.
- Lưu lại vết (audit trail) để lập trình viên có thể điều tra và gỡ lỗi khi có sự cố.
- Tránh việc xóa vật lý (hard delete) quá sớm khi cần đối soát dữ liệu trong quy trình onboarding.

### 7.4 Tự Động Cấp Phát Khi Đăng Nhập Lần Đầu (Auto-Provisioning)

Authorizer có cơ chế tự động cấp phát hồ sơ khi cờ cấu hình được bật:

```txt
AUTH_AUTO_PROVISION_ON_FIRST_LOGIN=true
```

Cơ chế này chỉ nên dùng khi nguồn dữ liệu claim và việc ánh xạ vai trò đã được định nghĩa rất rõ ràng. Nếu lạm dụng, nó có thể tạo ra các hồ sơ rác từ các token thiếu thông tin tenant/vai trò. Trong các luồng quan trọng như onboarding chủ nhà hàng, hệ thống luôn chủ động tạo hồ sơ qua dịch vụ nghiệp vụ thay vì phụ thuộc vào auto-provisioning.

---

## 8. Vai Trò, Quyền Hạn Và Cô Lập Dữ Liệu Nhà Hàng (Tenant Isolation)

### 8.1 Mô Hình Hai Lớp (Two-Layer Model)

QRTable áp dụng mô hình phân quyền hai lớp rõ rệt:

```txt
Tầng Định Danh (Identity Layer):
  Người dùng Keycloak, Realm Role, JWT Token, Tenant Claim

Tầng Hồ Sơ Ứng Dụng (Application Profile Layer):
  Người dùng User-Access, Quan hệ Tenant, Vai trò nội bộ, Danh sách Quyền hạn chi tiết (Permissions)
```

Một Keycloak token hợp lệ là **điều kiện cần**. Một hồ sơ User-Access hợp lệ với đầy đủ quyền hạn là **điều kiện đủ** để thực hiện các thao tác trong miền nghiệp vụ QRTable.

### 8.2 Bảng Vai Trò Cấp Realm (Realm Roles)

| Realm Role    | Ý nghĩa trong hệ thống                        |
| :------------ | :-------------------------------------------- |
| `SUPER_ADMIN` | Quản trị viên cấp cao nhất của nền tảng SaaS. |
| `OWNER`       | Chủ sở hữu của nhà hàng (tenant).             |
| `MANAGER`     | Quản lý vận hành nhà hàng.                    |
| `WAITER`      | Nhân viên phục vụ bàn.                        |
| `CHEF`        | Nhân viên bếp chính.                          |
| `BARISTA`     | Nhân viên pha chế đồ uống.                    |

### 8.3 Quyền Hạn Ứng Dụng (Application Permissions)

Quyền hạn là các quyền thao tác nghiệp vụ cụ thể. Tài liệu chuẩn (Canonical Source) của ma trận phân quyền nằm tại:

```txt
docs/architecture/permission-matrix.md
```

Mã nguồn và dữ liệu khởi tạo (seed) tương ứng:

```txt
libs/constants/src/lib/enum/role.enum.ts
apps/user-access/src/seeder/role.json
```

Khi thêm quyền mới, bạn không chỉ chỉnh sửa Keycloak mà phải cập nhật enum, file seed, ma trận phân quyền, cách dùng trong guard và viết test tương ứng.

### 8.4 Tenant Claim và Nguyên Tắc Cô Lập Dữ Liệu

Claim `tenant_id` trong JWT giúp BFF nhận biết danh tính hiện tại thuộc về nhà hàng nào:

- Nhân viên nhà hàng bắt buộc phải gắn liền với một tenant cụ thể.
- Yêu cầu gọi API có tenant không trùng khớp với tenant trong token sẽ bị từ chối ngay lập tức.
- Quản trị viên cấp cao `SUPER_ADMIN` có các luồng quản trị không bắt buộc gắn với tenant nhà hàng cụ thể nào.
- Tuyệt đối không tin tưởng giá trị `tenant_id` do client gửi lên nếu nó mâu thuẫn với claim trong token hoặc hồ sơ trong DB.

### 8.5 Định Tuyến Dựa Trên Vai Trò (Role-Based Routing) Ở Frontend

Management App có middleware điều hướng giao diện theo vai trò của người dùng:

```txt
Owner -> Điều hướng vào trang Dashboard quản trị tổng quan
CHEF -> Điều hướng vào màn hình Bếp (Kitchen Display)
WAITER -> Điều hướng vào giao diện phục vụ bàn
```

> [!NOTE]
> Đây chỉ là tầng tối ưu trải nghiệm người dùng (UX layer), không phải ranh giới an ninh cuối cùng (Security Boundary). Nếu middleware phía frontend bị vượt qua, lớp bảo vệ `PermissionGuard` tại BFF vẫn sẽ chặn đứng mọi yêu cầu không có đủ quyền hạn.

---

## 9. Những Thứ Keycloak Không Sở Hữu

Hãy ghi nhớ: Keycloak là nhà cung cấp định danh, không phải cơ sở dữ liệu nghiệp vụ của QRTable.

| Phạm vi dữ liệu                                        | Nguồn chân lý thực sự (True Source)                |
| :----------------------------------------------------- | :------------------------------------------------- |
| **Thực đơn, danh mục, món ăn**                         | Dịch vụ Catalog + PostgreSQL.                      |
| **Đơn hàng, hóa đơn, thanh toán**                      | Dịch vụ Order / Payment + PostgreSQL.              |
| **Vòng đời nhà hàng, gói thuê bao (subscription)**     | Dịch vụ SaaS + PostgreSQL.                         |
| **Cấu hình cổng thanh toán và trạng thái OAuth SePay** | Dịch vụ Payment + Redis / PostgreSQL.              |
| **Phiên làm việc của khách quét mã QR**                | BFF / Order Session + Redis.                       |
| **Chi tiết quyền hạn thao tác của nhân viên**          | Dịch vụ User-Access + Permission Matrix.           |
| **Trạng thái runtime của màn hình bếp (KDS)**          | Dịch vụ Kitchen + Redis (KDS Store).               |
| **Tín hiệu thời gian thực (Realtime hints)**           | BFF / Kitchen + WebSocket / Redis Pub/Sub / Kafka. |

---

## 10. Hướng Dẫn Cấu Hình Và Vận Hành Keycloak

Phần này hướng dẫn các bước thao tác trên Keycloak Admin Console, ý nghĩa của từng tham số và sự tương ứng với mã nguồn/script của dự án.

> [!TIP]
> Trong dự án QRTable, bạn nên ưu tiên sử dụng script `tools/keycloak-bootstrap.sh` để tạo cấu hình tự động và có thể tái lập (repeatable). Giao diện Admin Console chỉ nên dùng để kiểm tra, gỡ lỗi hoặc tìm hiểu cấu hình có sẵn.

### 10.1 Thứ Tự Thao Tác Khuyến Nghị

Khi cấu hình một môi trường Keycloak mới cho QRTable, hãy tuân theo thứ tự:

1. Tạo hoặc chọn realm `qrtable`.
2. Tạo các OIDC client: `qrtable-bff` và `management-app`.
3. Bật/tắt các luồng xác thực (flows) phù hợp cho từng client.
4. Tạo các vai trò cấp realm (realm roles): `SUPER_ADMIN`, `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`.
5. Khai báo thuộc tính người dùng (user attributes): `tenant_id` và `sub_role`.
6. Tạo các bộ ánh xạ (protocol mappers) để nhúng `tenant_id` và `sub_role` vào token.
7. Gán các quyền quản trị cho Service Account của backend client để gọi Admin REST API.
8. Tạo người dùng mẫu hoặc người dùng thật, thiết lập mật khẩu, gán realm role và thuộc tính tenant.
9. Đăng nhập thử trên Management App, gọi `/authorizer/me`, kiểm tra lại roles, permissions và tenant.

### 10.2 Cấu Hình Realm `qrtable`

Trên Admin Console:

```txt
Admin Console -> Realm Selector -> Create Realm -> Realm name: qrtable
```

Các tham số quan trọng:

| Tham số          | Ý nghĩa                         | Thiết lập trong QRTable local/dev                                                    |
| :--------------- | :------------------------------ | :----------------------------------------------------------------------------------- |
| **Realm name**   | Tên không gian định danh.       | `qrtable`                                                                            |
| **Enabled**      | Trạng thái hoạt động của realm. | `ON` (Bật).                                                                          |
| **SSL Required** | Chính sách bắt buộc HTTPS.      | Local có thể để `none`; production bắt buộc cấu hình đầy đủ qua HTTPS/Reverse Proxy. |
| **Login theme**  | Giao diện trang đăng nhập.      | `keycloak-theme` (nếu đã build/mount thư mục `apps/keycloak-theme`).                 |

### 10.3 Cấu Hình Client `management-app`

`management-app` là client phục vụ việc đăng nhập trên trình duyệt cho Management App.

| Tham số                   | Ý nghĩa                                                          | Giá trị trong QRTable                            |
| :------------------------ | :--------------------------------------------------------------- | :----------------------------------------------- |
| **Client authentication** | Bật: Confidential client (client có secret). Tắt: Public client. | `ON` (Sử dụng client secret qua NextAuth).       |
| **Standard flow**         | Bật Authorization Code Flow cho đăng nhập trình duyệt.           | `ON` (Bật).                                      |
| **Direct access grants**  | Cho phép cấp quyền qua tài khoản/mật khẩu trực tiếp.             | Không cần thiết cho giao diện chính.             |
| **Service accounts**      | Cho phép luồng Client Credentials.                               | `OFF` (Không cần cho Management App).            |
| **Valid redirect URIs**   | Danh sách URL Keycloak được phép chuyển hướng về sau đăng nhập.  | Môi trường Local: `http://localhost:3000/*`.     |
| **Web origins**           | Danh sách nguồn gốc hợp lệ theo chính sách CORS.                 | Môi trường Local: `http://localhost:3000`.       |
| **Client secret**         | Mã bảo mật dùng trong NextAuth phía server.                      | Điền vào biến môi trường `AUTH_KEYCLOAK_SECRET`. |

### 10.4 Cấu Hình Client `qrtable-bff`

`qrtable-bff` là client backend dùng để trao đổi token và gọi Keycloak Admin REST API.

| Tham số                   | Ý nghĩa                             | Giá trị trong QRTable                                          |
| :------------------------ | :---------------------------------- | :------------------------------------------------------------- |
| **Client authentication** | Cho phép sử dụng Client Secret.     | `ON` (Bật).                                                    |
| **Service accounts**      | Bật luồng Client Credentials Grant. | `ON` (Bật, để Authorizer lấy admin token).                     |
| **Direct access grants**  | Cho phép luồng Password Grant.      | Bật trong script bootstrap do có hàm `exchangeUserToken()`.    |
| **Standard flow**         | Bật luồng Authorization Code Flow.  | Bật để linh hoạt, nhưng giao diện chính dùng `management-app`. |
| **Client secret**         | Mã bí mật khi gọi token endpoint.   | Điền vào biến môi trường `KEYCLOAK_CLIENT_SECRET`.             |

### 10.5 Tạo Protocol Mappers Cho Thuộc Tính Người Dùng

Để nhúng thuộc tính `tenant_id` và `sub_role` vào JWT:

1. Trong client `management-app` và `qrtable-bff`, chuyển đến tab `Client scopes` -> Chọn scope tương ứng -> `Mappers` -> `Add mapper` -> `By configuration` -> `User Attribute`.
2. Điền thông tin:
   - **Name:** `tenant_id`
   - **User Attribute:** `tenant_id`
   - **Token Claim Name:** `tenant_id`
   - **Claim JSON Type:** `String`
   - **Add to access token:** `ON`
   - **Add to ID token / userinfo:** `ON` (nếu cần).
3. Lặp lại các bước trên cho thuộc tính `sub_role`.

### 10.6 Gán Quyền Service Account Cho Admin REST API

Để Authorizer có thể tạo hoặc khóa tài khoản qua Admin REST API:

1. Vào `Clients` -> Chọn `qrtable-bff` -> Tab `Service account roles`.
2. Nhấn `Assign role` -> Lọc theo client `realm-management`.
3. Chọn và gán các quyền:
   - `manage-users`: Tạo, cập nhật, khóa tài khoản và gán vai trò.
   - `view-users`: Đọc thông tin người dùng theo ID/email.
   - `query-users`: Tìm kiếm danh sách người dùng.
   - `view-realm`: Đọc danh sách vai trò cấp realm (cần thiết trước khi gán role).

---

## 11. Cài Đặt Môi Trường Cục Bộ, Triển Khai Và Gỡ Lỗi

### 11.1 Cấu Hình Local

Keycloak chạy trong môi trường local được khai báo tại `docker-compose.provider.yaml`:

```yaml
# Cổng truy cập: http://localhost:8180
# Tài khoản Admin mặc định: admin / admin
# Realm mặc định: qrtable
```

Biến môi trường phía Backend:

```txt
KEYCLOAK_HOST=http://localhost:8180
KEYCLOAK_REALM=qrtable
KEYCLOAK_CLIENT_ID=qrtable-bff
KEYCLOAK_CLIENT_SECRET=...
```

Biến môi trường phía Management App:

```txt
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=...
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable
```

### 11.2 Các Chế Độ Triển Khai Keycloak

| Chế độ                        | Khi nào sử dụng                  | Đặc điểm                                                                                                       |
| :---------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Development (`start-dev`)** | Môi trường Local / Dev / Demo.   | Khởi động nhanh, cho phép HTTP không mã hóa, chấp nhận mọi hostname, cấu hình bảo mật lỏng.                    |
| **Production (`start`)**      | Môi trường Staging / Production. | Mặc định bảo mật cao, bắt buộc hostname rõ ràng, bắt buộc HTTPS/TLS qua reverse proxy, cơ sở dữ liệu bền vững. |

### 11.3 Các Điểm Cuối (Endpoints) Hữu Ích

| Mục đích             | Endpoint URL                                                         |
| :------------------- | :------------------------------------------------------------------- |
| **Realm Issuer**     | `http://localhost:8180/realms/qrtable`                               |
| **JWKS Public Keys** | `http://localhost:8180/realms/qrtable/protocol/openid-connect/certs` |
| **Token Endpoint**   | `http://localhost:8180/realms/qrtable/protocol/openid-connect/token` |
| **Admin REST Base**  | `http://localhost:8180/admin/realms/qrtable`                         |

### 11.4 Các Lỗi Thường Gặp Và Cách Xử Lý

| Triệu chứng lỗi                 | Nguyên nhân và cách khắc phục                                                                                            |
| :------------------------------ | :----------------------------------------------------------------------------------------------------------------------- |
| **401 `invalid_token`**         | Token đã hết hạn, sai realm/issuer, sai chữ ký số, thiếu trường `kid`, hoặc dịch vụ không thể kết nối tới JWKS endpoint. |
| **401 `user_not_provisioned`**  | Token Keycloak hợp lệ nhưng dịch vụ User-Access chưa có bản ghi hồ sơ ứng dụng tương ứng.                                |
| **401 `role mapping mismatch`** | Vai trò trong Keycloak không thể ánh xạ sang vai trò nội bộ hợp lệ trong QRTable.                                        |
| **403 `permission_denied`**     | Người dùng hợp lệ nhưng thiếu quyền thao tác (permission) mà API yêu cầu.                                                |
| **Tenant mismatch**             | Thông tin tenant gửi trong request không trùng khớp với claim `tenant_id` trong token hoặc hồ sơ người dùng.             |
| **Lặp đăng nhập liên tục**      | Cấu hình sai Issuer, Client Secret, Callback URL hoặc luồng làm mới token của NextAuth gặp sự cố.                        |
| **Trùng email khi onboarding**  | Email của Owner đã tồn tại sẵn trong Keycloak hoặc User-Access từ trước.                                                 |

---

## 12. Đọc Mã Nguồn Ở Đâu (Code Map)

| Nội dung                             | Tệp tin / vị trí trong mã nguồn                                                |
| :----------------------------------- | :----------------------------------------------------------------------------- |
| Cấu hình Keycloak Backend            | `libs/configuration/src/lib/keycloak.config.ts`                                |
| Khai báo Docker Keycloak Local       | `docker-compose.provider.yaml`                                                 |
| Script Bootstrap Realm/Client/Mapper | `tools/keycloak-bootstrap.sh`                                                  |
| Dữ liệu người dùng mẫu local         | `tools/auth-bootstrap-users.json`                                              |
| NextAuth Keycloak Provider           | `apps/management-app/src/auth.ts`                                              |
| Trang đăng nhập Management App       | `apps/management-app/src/app/(auth)/login/page.tsx`                            |
| Điểm cuối Route NextAuth             | `apps/management-app/src/app/api/auth/[...nextauth]/route.ts`                  |
| Nạp phiên đăng nhập Frontend         | `apps/management-app/src/components/auth/auth-session-hydrator.tsx`            |
| Gọi API BFF `/authorizer/me`         | `apps/management-app/src/lib/auth/bff-server.ts`                               |
| Điều hướng Frontend theo vai trò     | `apps/management-app/src/lib/auth/role-routing.ts`                             |
| Authorizer xác thực JWT              | `apps/authorizer/src/app/authorizer/services/authorizer.service.ts`            |
| Authorizer gọi Keycloak HTTP/Token   | `apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts`           |
| Authorizer gọi Keycloak Admin API    | `apps/authorizer/src/app/keycloak/services/keycloak-admin.service.ts`          |
| TCP Controller của Authorizer        | `apps/authorizer/src/app/keycloak/controllers/keycloak.controller.ts`          |
| gRPC Controller xác thực Token       | `apps/authorizer/src/app/authorizer/controllers/authorizer-grpc.controller.ts` |
| BFF UserGuard                        | `libs/guards/src/lib/user.guard.ts`                                            |
| BFF TenantGuard                      | `libs/guards/src/lib/tenant.guard.ts`                                          |
| BFF PermissionGuard                  | `libs/guards/src/lib/permission.guard.ts`                                      |
| SaaS Onboarding Saga                 | `apps/saas/src/services/onboarding-saga.service.ts`                            |
| User-Access tạo User Profile         | `apps/user-access/src/app/modules/user/services/user.service.ts`               |
| Danh mục quyền (Permission Enum)     | `libs/constants/src/lib/enum/role.enum.ts`                                     |
| Dữ liệu khởi tạo vai trò (Role Seed) | `apps/user-access/src/seeder/role.json`                                        |

---

## 13. Bảng Kiểm Tra (Checklist)

### 13.1 Khi thêm một Route mới trong BFF cần bảo vệ

- [ ] Gắn decorator `@Authorization({ secured: true })` nếu route yêu cầu nhân viên/admin đăng nhập.
- [ ] Gắn metadata quyền hạn chi tiết nếu thao tác yêu cầu quyền cụ thể.
- [ ] Xác định rõ route có thuộc về một tenant cụ thể hay cho phép `SUPER_ADMIN` bypass.
- [ ] Kiểm thử đầy đủ các trường hợp: 401 invalid token, 401 user not provisioned, 403 missing permission và lỗi tenant mismatch.

### 13.2 Khi thêm một Vai Trò hoặc Quyền Hạn mới

- [ ] Cập nhật file enum `libs/constants/src/lib/enum/role.enum.ts`.
- [ ] Cập nhật file seed `apps/user-access/src/seeder/role.json`.
- [ ] Cập nhật tài liệu ma trận phân quyền `docs/architecture/permission-matrix.md`.
- [ ] Đảm bảo Keycloak Realm đã có Realm Role tương ứng nếu đây là vai trò định danh mới.
- [ ] Kiểm tra logic ánh xạ vai trò (role mapping) trong dịch vụ Authorizer.

### 13.3 Khi thêm một Claim mới vào Token

- [ ] Khai báo User Attribute và Protocol Mapper tương ứng trong Keycloak Realm.
- [ ] Cập nhật interface định nghĩa payload nếu backend cần đọc claim đó.
- [ ] Cập nhật logic chuyển đổi payload trong Authorizer nếu claim truyền qua gRPC/Protobuf.
- [ ] Cập nhật các Guard và Service đọc claim.

### 13.4 Khi tạo một luồng người dùng mới

- [ ] Tuyệt đối không để Frontend gọi trực tiếp vào Keycloak Admin REST API.
- [ ] Backend phải tạo user trên Keycloak và hồ sơ trên User-Access tuần tự kèm cơ chế hoàn tác.
- [ ] Có hành động bù trừ (Compensating Action) như khóa tài khoản (`disable user`) nếu bước sau thất bại.
- [ ] Nếu dùng mật khẩu tạm, bắt buộc bật hành động `UPDATE_PASSWORD`.
- [ ] Không ghi log (log) các thông tin nhạy cảm như Client Secret, Access Token, Refresh Token hoặc mật khẩu.

---

> **Lưu ý về nguồn tham khảo:** Tài liệu này được biên soạn dựa trên việc đối chiếu mã nguồn thực tế của QRTable trên nhánh `main` với tài liệu chính thức của Keycloak (thông qua Context7), đặc biệt là các phần về Admin REST API, OpenID Connect client, Service Account / Client Credentials, Realm Role, Protocol Mapper và quản lý người dùng. Khi có sự khác biệt giữa tài liệu này và mã nguồn đang chạy, hãy ưu tiên mã nguồn và các tài liệu kiến trúc canonical, sau đó cập nhật lại bản hướng dẫn này.
