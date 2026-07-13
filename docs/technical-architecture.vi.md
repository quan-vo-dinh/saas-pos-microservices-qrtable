# KIẾN TRÚC KỸ THUẬT HỆ THỐNG QRTABLE

> **Đề tài (tiếng Việt):** Nghiên cứu và xây dựng nền tảng SaaS POS tích hợp gọi món qua mã QR dựa trên kiến trúc Microservices
>
> **Đề tài (tiếng Anh):** Design and Implementation of a SaaS-Based POS Platform with Integrated QR Code Ordering Using a Microservices Architecture
>
> **Phiên bản:** 1.1 | **Cập nhật ngày:** 12-06-2026

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tong-quan-he-thong)
2. [Các nguyên tắc kiến trúc](#2-cac-nguyen-tac-kien-truc)
3. [Kiến trúc tổng thể](#3-kien-truc-tong-the)
4. [Tech Stack (Ngăn xếp công nghệ)](#4-tech-stack-ngan-xep-cong-nghe)
5. [Chiến lược Multi-tenancy](#5-chien-luoc-multi-tenancy)
6. [Phân rã các Microservices](#6-phan-ra-cac-microservices)
7. [Giao tiếp Inter-service](#7-giao-tiep-inter-service)
8. [Xác thực & Phân quyền (Authentication & Authorization)](#8-xac-thuc--phan-quyen)
9. [Thời gian thực & WebSocket (Real-time & WebSocket)](#9-thoi-gian-thuc--websocket)
10. [Tích hợp thanh toán (Payment Integration)](#10-tich-hop-thanh-toan)
11. [Chiến lược Caching](#11-chien-luoc-caching)
12. [Xử lý giao dịch phân tán (Distributed Transaction Processing)](#12-xu-ly-giao-dich-phan-tan)
13. [Khả năng quan sát & Giám sát (Observability & Monitoring)](#13-kha-nang-quan-sat--giam-sat)
14. [Chiến lược triển khai (Deployment Strategy)](#14-chien-luoc-trien-khai)
15. [Các thách thức kỹ thuật](#15-cac-thach-thuc-ky-thuat)
16. [Chiến lược Offline & Đồng bộ dữ liệu](#16-chien-luoc-offline--dong-bo-du-lieu)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mô tả

QRTable là một nền tảng SaaS (Software as a Service) phục vụ cho ngành F&B, cho phép nhiều nhà hàng (Tenants) hoạt động chung trên một cơ sở hạ tầng phần mềm duy nhất. Hệ thống số hóa toàn bộ quy trình đặt món ăn tại bàn thông qua mã QR — từ quét mã QR, duyệt thực đơn, đặt món, theo dõi tiến độ bếp chế biến, đến thanh toán hóa đơn — tất cả đều diễn ra theo thời gian thực (real-time).

### 1.2 Phạm vi kỹ thuật

| Khía cạnh               | Quyết định thiết kế                                                           |
| :---------------------- | :---------------------------------------------------------------------------- |
| **Kiến trúc hệ thống**  | Event-Driven Microservices                                                    |
| **Mô hình SaaS**        | Multi-tenant, Database-per-service kết hợp Discriminator Column (`tenant_id`) |
| **Giao thức kết nối**   | TCP (sync), gRPC (auth), Kafka (async), WebSocket (push)                      |
| **Tổ chức mã nguồn**    | Nx Monorepo                                                                   |
| **Triển khai hệ thống** | Docker + Docker Compose                                                       |
| **Môi trường vận hành** | VPS tự lưu trữ / Cloud VM                                                     |

### 1.3 Các tác nhân hệ thống (Actors)

| Tác nhân                  | Phạm vi                         | Phương thức xác thực      | Giao diện tương tác chính                     |
| :------------------------ | :------------------------------ | :------------------------ | :-------------------------------------------- |
| **Super Admin**           | Toàn hệ thống (Cross-tenant)    | JWT (Keycloak)            | Giao diện quản trị nền tảng (Admin Dashboard) |
| **Restaurant Owner**      | Các tenant sở hữu               | JWT (Keycloak)            | Ứng dụng quản lý (Management App)             |
| **Staff** (Phục vụ/Bếp)   | Trong tenant được phân công     | JWT (Keycloak)            | Giao diện bán hàng (POS) / Màn hình bếp (KDS) |
| **Customer** (Khách hàng) | Trong session hoạt động tại bàn | Anonymous Session (Redis) | Ứng dụng PWA quét qua QR                      |

---

## 2. CÁC NGUYÊN TẮC KIẾN TRÚC

| #   | Nguyên tắc                                  | Cách thức áp dụng                                                                                                                             |
| :-- | :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Database per service**                    | Mỗi microservice sở hữu schema/bảng dữ liệu riêng của nó, tuyệt đối không được trực tiếp truy cập vào cơ sở dữ liệu của dịch vụ khác.         |
| 2   | **Tenant Isolation mặc định**               | Mọi entity đều chứa cột `tenant_id`; middleware tự động thêm điều kiện lọc vào tất cả các câu truy vấn.                                       |
| 3   | **Event-Driven Decoupling**                 | Giao tiếp bất đồng bộ qua các sự kiện Kafka; các dịch vụ không gọi trực tiếp lẫn nhau khi xử lý tác vụ phụ (side-effects).                    |
| 4   | **API Gateway là Single Entry**             | BFF service đóng vai trò là cổng vào duy nhất từ phía client, xử lý xác thực, định tuyến và giới hạn tần suất (rate-limit).                   |
| 5   | **Ưu tiên Cache dữ liệu nóng**              | Thực đơn, trạng thái bàn và token người dùng được lưu trữ tạm trong Redis để giảm tải tối đa cho cơ sở dữ liệu chính.                         |
| 6   | **Cơ chế Fail-Safe & Idempotency**          | Mọi hoạt động ghi dữ liệu quan trọng đều đi kèm một idempotency key; áp dụng quy trình Saga bù đắp (compensation) cho các giao dịch phân tán. |
| 7   | **Giám sát toàn diện (Observe Everything)** | Tập trung hóa hệ thống log (Loki), thu thập metric (Prometheus) và phân tích luồng vết phân tán tracing (Tempo).                              |
| 8   | **Giờ chuẩn máy chủ (UTC)**                 | Mọi mốc thời gian (timestamp) đều lấy theo giờ chuẩn UTC của server (`Date.now()`); tuyệt đối KHÔNG sử dụng thời gian gửi lên từ phía client. |
| 9   | **Làm tròn tiền tệ VND**                    | Tất cả các khoản tiền VND đều được làm tròn lên tới hàng nghìn đồng: `Math.ceil(amount / 1000) * 1000`.                                       |
| 10  | **Vòng đời Session khách**                  | Tuổi thọ tối đa của session khách = 2 giờ, thời gian tự động đóng khi không hoạt động (idle timeout) = 30 phút.                               |

---

## 3. KIẾN TRÚC TỔNG THỂ

### 3.1 Sơ đồ kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│                                                                         │
│   📱 Customer PWA    💻 Staff POS/KDS    🖥️ Owner Dashboard    🛡️ Admin │
│        (QR Scan)       (Tablet/PC)         (Web App)          Portal   │
└────────────┬───────────────┬──────────────────┬──────────────┬──────────┘
             │               │                  │              │
             ▼               ▼                  ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     🚪 BFF SERVICE (API Gateway)                        │
│                        Port 3000 — HTTP REST                            │
│                                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ Swagger  │  │ Rate Limiter │  │ Guard Chain│  │ WebSocket Gateway│  │
│  │ Docs     │  │ (Throttler)  │  │ Auth+Tenant│  │ (Socket.io)      │  │
│  │ └────────┘  └──────────────┘  └────────────┘  └──────────────────┘  │
└────────┬───────────────┬──────────────┬──────────────────┬──────────────┘
         │ TCP           │ gRPC         │ TCP              │ TCP
         ▼               ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (Microservices)                  │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ 🔐 Author- │  │ 📋 Catalog │  │ 🍽️ Order   │  │ 🏪 SaaS Mgmt     │  │
│  │ izer Svc   │  │ Service    │  │ Service    │  │ Service          │  │
│  │ (gRPC)     │  │ (TCP)      │  │ (TCP)      │  │ (TCP)            │  │
│  │ └──────────┘  └────────────┘  └────────────┘  └──────────────────┘  │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                        │
│  │ 💳 Payment │  │ 👨‍🍳 Kitchen │  │ 👥 User-   │                        │
│  │ Service    │  │ (KDS) Svc  │  │ Access Svc │                        │
│  │ (TCP)      │  │ (TCP)      │  │ (TCP+Mongo)│                        │
│  │ └──────────┘  └────────────┘  └────────────┘                        │
│                                                                         │
└────────┬───────────────┬──────────────┬──────────────────┬──────────────┘
         │               │              │                  │
         ▼               ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                               │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ 🐘 Postgres│  │ 🔴 Redis   │  │ 📨 Kafka   │  │ 🔑 Keycloak      │  │
│  │ :5432      │  │ :6379      │  │ :9092      │  │ :8180            │  │
│  │ └──────────┘  └────────────┘  └────────────┘  └──────────────────┘  │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ 📊 Grafana │  │ 📋 Loki    │  │ 📡 Promtail│  │ ☁️ Cloudinary     │  │
│  │ :3001      │  │ :3100      │  │ (Agent)    │  │ (File Storage)   │  │
│  │ └──────────┘  └────────────┘  └────────────┘  └──────────────────┘  │
│                                                                         │
│  ┌────────────┐  ┌────────────┐                                         │
│  │ 📈 Promethe│  │ 🔍 Tempo   │                                         │
│  │ us :9090   │  │ :3200      │                                         │
│  │ └──────────┘  └────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Luồng truyền dẫn dữ liệu chính

```
[Khách quét mã QR tại bàn]
    │
    ▼
BFF → xác thực token (HMAC) → trích xuất tenant_id + table_id
    │
    ├──→ Catalog Service (TCP): lấy thực đơn theo tenant
    │       └── Check Redis cache: nếu HIT → trả về cache; nếu MISS → truy vấn PostgreSQL → ghi cache → trả về
    │
    ├──→ Order Service (TCP): gửi đơn đặt món
    │       ├── Kiểm tra tồn kho từ snapshot (gửi đơn chưa trực tiếp trừ kho; tạo bản ghi đơn ở dạng `PENDING`)
    │       ├── Lưu trữ thông tin đơn (+ tạo hóa đơn khi gọi món lần đầu trong session) vào PostgreSQL Order DB
    │       └── Trả về kết quả phản hồi → BFF
    │           └── Luồng BFF Direct: đẩy sự kiện WebSocket → thông báo đến thiết bị POS của nhân viên (Mô hình AP1)
    │
    └──→ Nhân viên duyệt đơn (Điều phối qua TCP của Order Service)
            ├── Gọi Catalog Service (TCP): thực hiện trừ kho giao dịch (Catalog sở hữu bảng `menu_items`)
            ├── Commit Order DB + lưu bản ghi outbox tối giản → xuất bản sự kiện Kafka: `order.confirmed` (chứa dữ liệu mở rộng - Đặc tả Step 2.4)
            └── Kitchen Service (Kafka Consumer nhận tin):
                    ├── Định tuyến phiếu chế biến theo cấu hình khu vực bếp (`MenuItem.station`): Bếp (KITCHEN) hoặc Quầy nước (BAR)
                    ├── Đưa vào hàng đợi Redis Sorted Set (xử lý FIFO)
                    └── Phát tín hiệu cập nhật KDS cục bộ sau khi ghi Redis → thông báo qua WebSocket của BFF → cập nhật các màn hình chế biến
    │
    └──→ Payment Service (TCP): xử lý thanh toán (Tiền mặt hoặc Chuyển khoản VietQR)
            ├── Thực hiện trong cùng một transaction DB: lưu lịch sử thanh toán + ghi nhận outbox `payment.completed` (Payment DB)
            ├── Sau khi commit thành công: gọi trực tiếp TCP Order `BILL_MARK_PAID` (luồng xử lý nhanh, có tính chất idempotent); sự kiện Kafka phát đi từ outbox đóng vai trò tự khôi phục dữ liệu hoặc đồng bộ chéo
            └── Cơ chế Phase 3: Phía thiết bị POS/Khách thực hiện kéo dữ liệu theo chu kỳ **polling/refetch**; việc đẩy thông tin trực tiếp từ WebSocket qua cầu kết nối Kafka→BFF sẽ được nâng cấp ở giai đoạn tiếp theo (Quyết định thiết kế D5)
```

---

## 4. TECH STACK (NGĂN XẾP CÔNG NGHỆ)

### 4.1 Bảng quyết định công nghệ

| Phân tầng               | Công nghệ lựa chọn                     | Vai trò chính                                                                        | Lý do lựa chọn                                                                                                                    |
| :---------------------- | :------------------------------------- | :----------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**           | NestJS + TypeScript                    | Khung phát triển ứng dụng Backend cho toàn bộ microservices                          | Tiêu chuẩn doanh nghiệp, hỗ trợ Dependency Injection (DI) tốt, tích hợp sẵn các giao thức TCP/gRPC/Kafka/WS.                      |
| **Monorepo**            | Nx                                     | Tổ chức mã nguồn, chia sẻ thư viện dùng chung (shared libs), thiết lập task pipeline | Phân tích đồ thị phụ thuộc dự án (dependency graph), hỗ trợ affected builds để build các ứng dụng có thay đổi, sinh code tự động. |
| **Database chính**      | PostgreSQL + TypeORM                   | Lưu trữ dữ liệu nghiệp vụ chính                                                      | Đảm bảo tính nhất quán dữ liệu ACID, hỗ trợ cơ chế khóa bi quan (Pessimistic Locking), phù hợp cho mô hình quan hệ F&B.           |
| **Database phụ**        | MongoDB + Mongoose                     | Lưu trữ audit log, phân tích dữ liệu, cấu hình linh hoạt                             | Không phụ thuộc schema cố định, tối ưu cho ghi log sự kiện và dữ liệu dạng thời gian (time-series).                               |
| **Bộ nhớ đệm**          | Redis                                  | Caching token, quản lý session giỏ hàng, cache thực đơn, rate limiter                | Tốc độ xử lý dưới một phần nghìn giây (sub-millisecond), hỗ trợ cấu trúc dữ liệu Sorted Set cho hàng đợi FIFO, cơ chế Pub/Sub.    |
| **Broker tin nhắn**     | Apache Kafka                           | Hệ thống truyền tin sự kiện, điều phối bất đồng bộ                                   | Hiệu suất cao, quản lý nhóm nhận tin (consumer groups) tốt, đảm bảo phân phối tin ít nhất một lần (at-least-once).                |
| **Định danh**           | Keycloak                               | Quản lý người dùng tập trung, hỗ trợ OAuth 2.0/OIDC, SSO                             | Hệ thống bảo mật doanh nghiệp (Enterprise IAM), quản lý phân vùng theo realm/client, hỗ trợ các hình thức đăng nhập mở rộng.      |
| **Thanh toán**          | SePay (VietQR)                         | Xử lý thanh toán chuyển khoản ngân hàng tự động tại Việt Nam                         | Hỗ trợ nhúng mã QR động inline trên giao diện, cơ chế webhook kiểm tra HMAC và cơ chế định tuyến khóa bí mật theo tenant.         |
| **Thời gian thực**      | Socket.io (NestJS GW)                  | Kết nối WebSocket hai chiều                                                          | Hỗ trợ phân phòng (room-based), tự động kết nối lại khi mất mạng, có cơ chế dự phòng kết nối.                                     |
| **Lưu trữ file**        | Cloudinary                             | Lưu trữ hình ảnh thực đơn, lưu file QR code                                          | Tích hợp mạng phân phối nội dung (CDN), hỗ trợ tối ưu ảnh tự động, có gói miễn phí phù hợp cho thử nghiệm.                        |
| **Giám sát log**        | Grafana + Loki + Promtail              | Thu thập và quản lý log tập trung                                                    | Bộ công cụ PLG Stack gọn nhẹ, ngôn ngữ truy vấn LogQL dễ dùng, tự động thu thập log từ môi trường Docker.                         |
| **Metric hệ thống**     | Prometheus                             | Thu thập chỉ số tài nguyên và ứng dụng                                               | Cơ chế thu thập chủ động (pull-based), ngôn ngữ PromQL, tích hợp mượt mà với Grafana.                                             |
| **Distributed Tracing** | Grafana Tempo + OTel                   | Theo dõi luồng vết giao dịch phân tán                                                | Tuân thủ tiêu chuẩn OpenTelemetry, truyền dẫn ngữ cảnh request (propagation context) chéo hệ thống.                               |
| **Container**           | Docker + Docker Compose                | Đóng gói ứng dụng và điều phối chạy thử                                              | Đảm bảo môi trường chạy đồng nhất ở các máy phát triển, cô lập tài nguyên cho từng dịch vụ.                                       |
| **Chất lượng code**     | ESLint + Prettier + Husky + Commitlint | Kiểm tra chất lượng viết code, tự động format, ràng buộc commit                      | Giữ cấu trúc viết mã đồng đều trong nhóm, ngăn chặn code lỗi trước khi đẩy lên Git repository.                                    |

### 4.2 Cấu trúc tổ chức Nx Monorepo

```
qrtable/
├── apps/
│   ├── # ── Các Backend Services ──────────────────
│   ├── authorizer/             # Xác thực token Keycloak/JWT (gRPC + admin ops)
│   ├── bff/                    # API Gateway (HTTP REST + WebSocket Gateway)
│   ├── catalog/                # Quản lý danh mục món ăn & bàn (TCP)
│   ├── kitchen/                # Quản lý hàng đợi chế biến KDS (TCP + Kafka Consumer)
│   ├── order/                  # Xử lý đơn đặt món và session bàn (TCP)
│   ├── payment/                # Xử lý hóa đơn, SePay Webhook và kết nối ngân hàng (TCP)
│   ├── saas/                   # Quản lý thông tin đăng ký gói dịch vụ và tenant (TCP)
│   ├── user-access/            # Quản lý tài khoản, phân quyền nhân sự (TCP + MongoDB)
│   ├── # ── Các ứng dụng Frontend ──────────────────
│   ├── customer-pwa/           # 📱 Ứng dụng đặt món cho khách hàng (React + Vite PWA)
│   ├── keycloak-theme/         # Cấu hình giao diện trang đăng nhập Keycloak
│   └── management-app/         # 💻 Ứng dụng quản trị POS/KDS/Dashboard (Next.js)
├── libs/
│   ├── # ── Thư viện Backend Shared (Cấu trúc phẳng) ───────
│   ├── configuration/          # Đọc biến môi trường và validate cấu hình hệ thống
│   ├── constants/              # Khai báo các enum chung, hằng số, topic Kafka
│   ├── schemas/                # Khai báo entity TypeORM, schema Mongoose dùng chung
│   ├── dtos/                   # Lớp DTO validate dữ liệu đầu vào của các service
│   ├── guards/                 # Bộ lọc phân quyền chung: UserGuard, TenantGuard, SessionGuard
│   ├── interceptors/           # Bộ chuyển đổi dữ liệu Exception, Logging, TCP Logging
│   ├── middlewares/            # Ghi log request, tự động gán thông tin Tenant
│   ├── providers/              # Kết nối tập trung TCP, gRPC, Mongo, Postgres, Redis
│   ├── queue/                  # Cấu hình chung cho Kafka Producer và Consumer
│   ├── common/                 # Các hàm tiện ích, decorator bổ trợ hệ thống backend
│   ├── # ── Thư viện chia sẻ đa nền tảng (Shared FE & BE) ─────────
│   ├── shared/types/           # Khai báo kiểu dữ liệu chung (contract API)
│   ├── shared/utils/           # Các hàm định dạng hiển thị, xử lý toán học dùng chung
│   ├── # ── Thư viện Frontend Shared ─────────
│   ├── frontend/ui/            # Thư viện component UI cơ bản (dựa trên Shadcn UI)
│   └── frontend/hooks/         # Thư viện hooks React Query, hook kết nối WebSocket
├── docker/
│   ├── docker-compose.infra.yaml     # File chạy hạ tầng cơ bản (DB, Keycloak, Broker)
│   ├── docker-compose.app.yaml       # File chạy các service ứng dụng chính
│   ├── grafana/                      # Cấu hình màn hình giám sát và nguồn dữ liệu
│   ├── loki-config.yaml
│   └── promtail-config.yaml
├── nx.json
├── tsconfig.base.json
└── package.json
```

#### 4.2.1 Hiện trạng thư viện `libs/shared/types` (Cập nhật đồng bộ dữ liệu - 04-2026)

Mô tả cấu trúc ở mục §4.2 thể hiện mục tiêu "sử dụng chung kiểu dữ liệu hợp đồng giữa Frontend & Backend". **Trong mã nguồn hiện tại**, thư viện `libs/shared/types` (`@einvoice/types`) chủ yếu được import bởi các ứng dụng **customer-pwa**, **management-app**, **libs/shared/mock-data** và **libs/shared/constants**; các NestJS service trong monorepo vẫn sử dụng các cấu trúc nội bộ hoặc **`@common/*`** (các interface, entity, DTO nội bộ) phục vụ trực tiếp cho tầng kết nối HTTP/TCP. Bước chuẩn hóa tiếp theo ( OpenAPI Client sinh mã tự động, kiểm tra kiểu dữ liệu DTO từ BFF...) sẽ được lập kế hoạch riêng khi thắt chặt hợp đồng giao tiếp giữa Frontend và Backend.

### 4.3 Cấu trúc ứng dụng Frontend

**Chiến lược 2 ứng dụng:** Thay vì phân rã thành 4 ứng dụng riêng lẻ gây phân mảnh, hệ thống Frontend được tinh gọn thành **2 ứng dụng chạy độc lập** trong Nx Monorepo — giúp giảm thiểu dung lượng code phát triển, tái sử dụng tối đa thư viện UI dùng chung, trong khi vẫn phân tách rõ ràng luồng đặt món ẩn danh của Khách hàng với luồng vận hành bảo mật của Nhân viên/Quản trị viên.

| Thành phần                    | Công nghệ lựa chọn                       | Lý do sử dụng                                                                                                                                     |
| :---------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **App 1: Customer PWA**       | React + Vite, TypeScript, Service Worker | Tải trang cực nhanh, hỗ trợ chạy offline-first, thiết kế mobile-first tối ưu, build nhẹ, không cần cơ chế render phía server (SSR).               |
| **App 2: Management App**     | Next.js (App Router) + React 19          | Quản lý route truy cập theo vai trò người dùng, tích hợp middleware bảo mật, hỗ trợ kết hợp SSR/CSR linh hoạt cho các báo cáo đồ sộ.              |
| **Quản lý dữ liệu & Cache**   | React Query + Zustand                    | Quản lý đồng bộ trạng thái server mượt mà, lưu trữ dữ liệu client nhẹ nhàng, hỗ trợ cơ chế lưu cache và tự động kéo dữ liệu (refetch) thông minh. |
| **Thời gian thực**            | Socket.io Client                         | Tự động kết nối lại khi rớt mạng, phân bổ nhận tin theo phòng (bàn ăn/nhà hàng).                                                                  |
| **Form & Xác thực nhập liệu** | React Hook Form + Zod                    | Xử lý nhập liệu hiệu năng cao, validate dữ liệu đầu vào theo schema định sẵn, tăng trải nghiệm người dùng.                                        |
| **Hệ thống giao diện (UI)**   | Tailwind CSS + Shadcn UI + Lucide React  | Xây dựng giao diện nhanh chóng, dễ mở rộng component, đồng bộ các icon trực quan.                                                                 |
| **Biểu đồ hiển thị**          | Shadcn/ui Charts + Recharts              | Trực quan hóa số liệu doanh thu, theo dõi SLA chế biến, đo lường năng suất đơn hàng với các mẫu biểu đồ thống nhất.                               |

### 4.4 Kiến trúc ứng dụng Frontend (2-App Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND APPLICATION LAYER                    │
│                                                                 │
│  ┌──────────────────────┐   ┌──────────────────────────────┐    │
│  │  📱 Customer PWA     │   │  💻 Management App           │    │
│  │  (React + Vite)      │   │  (Next.js App Router)        │    │
│  │                      │   │                              │    │
│  │  Auth: Session-based │   │  Auth: JWT (Keycloak)        │    │
│  │  (Anonymous/Guest)   │   │  Điều hướng theo vai trò:    │    │
│  │                      │   │  ├── /pos/*    → Phục vụ     │    │
│  │  Các tính năng:      │   │  ├── /kds/*    → Đầu bếp/Bar │    │
│  │  ├── Quét QR vào bàn │   │  ├── /dashboard/* → Chủ quán │    │
│  │  ├── Xem thực đơn    │   │  └── /admin/*  → Hệ thống    │    │
│  │  ├── Đặt món ăn      │   │                              │    │
│  │  ├── Theo dõi đơn    │   │  Tính năng dùng chung:       │    │
│  │  └── Yêu cầu hóa đơn │   │  ├── WebSocket thời gian thực│    │
│  │                      │   │  ├── Route lọc phân quyền    │    │
│  │  Offline: SW + IDB   │   │  └── Lấy ngữ cảnh Tenant     │    │
│  └──────────────────────┘   └──────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  📦 Thư viện dùng chung (Nx libs)                        │    │
│  │  ├── frontend/ui/     → Các Component giao diện (Shadcn) │    │
│  │  ├── shared/utils/    → Xử lý định dạng hiển thị         │    │
│  │  ├── shared/types/    → Kiểu dữ liệu contract API        │    │
│  │  └── frontend/hooks/  → Hook dùng chung React Query, WS  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Data Layer: React Query (REST) + Socket.io (Real-time)   │    │
│  │  Cache Layer: IndexedDB (Hàng đợi offline) + SW cache     │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Các nguyên tắc kiến trúc Frontend:**

- **Tách biệt 2 nhóm ứng dụng**: Tách riêng biệt ứng dụng Khách đặt món (ẩn danh, chạy dạng PWA gọn nhẹ) và ứng dụng vận hành của nhà hàng (bắt buộc xác thực tài khoản).
- **Phân hướng theo vai trò người dùng (không chia nhỏ ứng dụng)**: Sử dụng Next.js Middleware kết hợp kiểm tra quyền từ Keycloak để định hướng giao diện hiển thị — chạy chung một ứng dụng duy nhất nhưng hiển thị các thanh menu và trang chức năng khác nhau tùy theo tài khoản.
- **Tầng kiểm tra phân quyền cục bộ (Tạm thời ở Phase 2.x):** Ứng dụng phía giao diện (`management-app`) điều hướng theo cấu trúc **vai trò → thư mục route / thanh menu hiển thị** để thuận tiện cho UX; tuy nhiên hệ thống API phía BFF vẫn thực thi việc kiểm tra **quyền cụ thể trên từng API** làm nguồn chuẩn. Chi tiết tại [permission matrix](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/architecture/permission-matrix.md) §9.
- **BFF là cổng API duy nhất**: Mọi kết nối từ ứng dụng Frontend lên Backend đều phải đi qua BFF service, tuyệt đối không gọi trực tiếp xuống các service nghiệp vụ bên dưới.
- **Ưu tiên tương tác thời gian thực**: Thiết bị của nhân viên phục vụ và bếp ưu tiên nhận cập nhật tức thời qua WebSocket; ứng dụng đặt món của khách hàng ưu tiên gọi REST API kết hợp cơ chế lưu cache dữ liệu.
- **Hỗ trợ chạy Offline (Customer PWA)**: Lưu trữ bộ nhớ đệm thực đơn trên thiết bị và duy trì hàng đợi gửi đơn khi mất mạng.
- **Xác định thông tin nhà hàng qua Subdomain**: Trích xuất slug nhà hàng từ tên miền truy cập (ví dụ: `quan-a.qrtable.io`) để xác định `tenant_id` tương ứng trước khi tải trang.
- **Tái sử dụng code qua thư viện Nx**: Các component UI, hook React Query và kiểu dữ liệu TypeScript được đóng gói chung để chia sẻ chéo cho cả hai ứng dụng Frontend.

#### 4.4.1 Chuẩn hóa hiển thị nhãn ngôn ngữ (wire enum → UI copy)

Hệ thống Backend và các dữ liệu JSON trả về luôn duy trì giá trị cấu trúc bằng **tiếng Anh viết hoa viết liền** (`OrderStatus.PENDING`, `TenantStatus.SUSPENDED`, `SubscriptionInvoiceStatus.PAID`). Khi hiển thị trên ứng dụng của người dùng, hệ thống sẽ tự động ánh xạ sang tiếng Việt hoặc ngôn ngữ phù hợp qua một quy trình thống nhất:

| Phân tầng xử lý               | Thư viện / Đường dẫn                                                                                                 | Vai trò                                                                             |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| Định nghĩa Enum chuẩn         | `libs/constants` (ví dụ: `saas.constants.ts`), `@einvoice/types`                                                     | Giá trị trạng thái hợp lệ trên Database và các API giao tiếp                        |
| Liên kết dữ liệu SaaS (FE)    | `@einvoice/shared-constants` → `saas-wire-types.ts`                                                                  | Đồng bộ kiểu dữ liệu cho Frontend; tránh sai lệch kiểu dữ liệu khi Backend nâng cấp |
| Hàm ánh xạ nhãn hiển thị      | `@einvoice/shared-constants` → `vi-domain-labels.ts` (`orderStatusVi`, `subscriptionStatusVi`, `billingPeriodVi`, …) | Hàm ánh xạ nhãn hiển thị tiếng Việt dùng chung; không phụ thuộc thư viện React      |
| Định dạng hiển thị địa phương | `@einvoice/frontend-utils` (`formatCurrency`), các hàm `formatters.ts`                                               | Định dạng hiển thị số tiền mặt, ngày giờ theo thói quen của người Việt              |
| Component hiển thị (Badges)   | Các component cụ thể của ứng dụng (Ví dụ: `management-app/.../features/saas/components/badges/`)                     | Tạo giao diện Badge hiển thị trực quan; thực hiện gọi hàm `*Vi()` để lấy nhãn       |

**Quy tắc bắt buộc:** Tuyệt đối không hiển thị các chuỗi enum thô hoặc mã tính năng gói dịch vụ dạng tiếng Anh thô lên màn hình người dùng. Mọi danh sách tính năng phải đi qua hàm `planFeatureVi()`, các nhãn trạng thái phải gọi hàm trợ giúp `*Vi()` tương ứng, và các giá trị lỗi chưa rõ phải đi qua hàm dự phòng `displayDomainLabel()` để tránh hiển thị chữ hoa gạch dưới thô cứng (`UPPER_SNAKE`). Không viết lại các hàm ánh xạ nhãn này rải rác bên trong các màn hình riêng lẻ. Không gom chung thư viện constants thuần túy vào các file chứa component React. Xem thêm hướng dẫn tại [frontend-domain-display.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/guides/frontend-domain-display.md).

### 4.5 Chi tiết thông số các ứng dụng Frontend

#### App 1: Customer PWA

- **Tác nhân tương tác:** Khách đặt món ăn tại bàn (ẩn danh).
- **Đường dẫn truy cập:** Quét mã QR tại bàn → `https://{slug}.qrtable.io?table={id}&token={hmac}`.
- **Xác thực tài khoản:** Xác thực dựa trên mã Session lưu ở Redis — không yêu cầu khách đăng nhập tài khoản.
- **Công nghệ chính:** React + Vite + TypeScript + Service Worker.
- **Tính năng cốt lõi:** Duyệt thực đơn, giỏ hàng dùng chung tại bàn, gửi đơn đặt món, theo dõi trạng thái chế biến món ăn, gửi yêu cầu thanh toán; khi nhà hàng bị tạm khóa (`SUSPENDED`), chỉ cho phép khách xem thực đơn và thanh toán hóa đơn cũ.
- **Tính năng ngoại tuyến (Offline):** Lưu thực đơn vào cache của Service Worker, lưu đơn hàng chờ gửi vào hàng đợi IndexedDB, tự động kích hoạt gửi lại khi thiết bị kết nối mạng thành công.
- **Thời gian thực:** Kết nối Socket.io → gán vào phòng `session:{sid}:customer` (nhận cập nhật trạng thái đơn hàng, thông báo cập nhật món mới).

#### App 2: Management App (Ứng dụng quản trị & vận hành)

- **Tác nhân tương tác:** Nhân viên phục vụ, Nhân viên bếp/bar, Quản lý cửa hàng, Chủ nhà hàng, Super Admin.
- **Đường dẫn truy cập:** `https://app.qrtable.io/login` → Chuyển hướng xác thực qua Keycloak.
- **Xác thực tài khoản:** Đọc token JWT từ Keycloak — Middleware kiểm tra vai trò người dùng để tự động điều hướng về màn hình chức năng phù hợp sau khi đăng nhập.
- **Công nghệ chính:** Next.js (App Router) + React 19 + TypeScript.
- **Thời gian thực:** Kết nối Socket.io → nhận tin theo các phòng vai trò (`tenant:{tid}:staff`, `tenant:{tid}:kds:*`, `tenant:{tid}:management`).

**Ánh xạ Vai trò → Route truy cập (Next.js Middleware):**

```typescript
// middleware.ts — Điều hướng màn hình sau khi đăng nhập thành công
const ROLE_ROUTES = {
  SUPER_ADMIN: '/admin', // Giao diện quản trị toàn nền tảng
  OWNER: '/dashboard', // Màn hình quản lý của Chủ nhà hàng
  MANAGER: '/dashboard', // Màn hình điều hành của Quản lý ca (phân quyền hạn chế hơn Owner)
  WAITER: '/pos', // Màn hình POS của nhân viên phục vụ — confirm đơn, thu tiền
  CHEF: '/kds/kitchen', // Màn hình hàng đợi chế biến của Bếp
  BARISTA: '/kds/bar', // Màn hình hàng đợi chế biến của Quầy nước
};
```

### 4.6 Sơ đồ tổ chức các màn hình chức năng (Management App)

**Phân hệ `/dashboard/*` — Chủ nhà hàng / Quản lý:**

```
Dashboard
├── / (Báo cáo doanh thu và vận hành nhận biết gói dịch vụ: thông số giới hạn, trạng thái khóa, theo ngày/tuần/tháng)
├── /menu (Quản lý thực đơn: Danh mục món, Món ăn, Trạng thái tồn kho)
├── /tables (Quản lý Bàn & Khu vực bếp, Xuất file mã QR in ấn)
├── /staff (Quản lý phân quyền & Tài khoản nhân viên)
├── /orders (Lịch sử giao dịch hóa đơn — Chế độ chỉ đọc)
├── /subscription (Theo dõi gói dịch vụ đang dùng & Gia hạn dịch vụ)
├── /billing/[invoiceId] (Xem hóa đơn subscription thanh toán cho hệ thống bằng VietQR + cập nhật trạng thái hóa đơn)
├── /payment-settings (Cấu hình thanh toán nhà hàng & Kết nối cổng SePay OAuth)
└── /settings (Cài đặt thông tin cửa hàng, thay đổi chế độ vận hành)
```

**Phân hệ `/admin/*` — Quản trị viên hệ thống (Super Admin):**

```
Platform Ops
├── / (Màn hình tổng quan toàn nền tảng)
├── /tenants (Danh bạ nhà hàng: Duyệt mới, tìm kiếm, tạm khóa, đóng cửa, thay đổi gói dịch vụ)
├── /plans (Quản lý các thông số cấu hình Gói dịch vụ hệ thống)
├── /billing (Đối soát các giao dịch subscription thanh toán từ các nhà hàng)
├── /analytics (Xem biểu đồ tăng trưởng doanh thu subscription toàn hệ thống + xem báo cáo chi tiết của từng tenant)
├── /health (Kiểm tra tình trạng vận hành các service, độ trễ Kafka, tỷ lệ lỗi dịch vụ)
└── /support (Công cụ kỹ thuật: Giả lập quyền truy cập nhà hàng để xử lý sự cố, xem audit logs hệ thống)
```

**Phân hệ `/pos/*` — Nhân viên phục vụ (Waiter):**

```
POS
├── / (Danh sách đơn đặt món đang chờ: Duyệt đơn, hủy đơn)
├── /tables (Sơ đồ trạng thái bàn ăn: Trạng thái trống/có khách, thời gian ngồi bàn, chuyển bàn)
├── /bills (Quản lý hóa đơn: xem hóa đơn chờ thanh toán, xác nhận tiền mặt, hiển thị QR VietQR cho khách quét)
├── /service-requests (Danh sách yêu cầu hỗ trợ từ khách hàng)
└── /payment (Màn hình cũ → Chuyển hướng tự động về trang /pos/bills)
```

**Phân hệ `/kds/*` — Nhân viên chế biến (Chef/Barista):**

```
KDS
├── /kitchen (Hàng đợi món ăn chế biến bếp: FIFO + thứ tự ưu tiên + SLA trễ)
├── /bar (Hàng đợi đồ uống pha chế)
├── /priority (Quản lý các bàn được gắn cờ ưu tiên làm trước)
└── /recall (Lịch sử thu hồi thẻ món ăn vừa bấm hoàn tất)
└── SLA Timer (Component đếm ngược thời gian chế biến quá hạn)
```

---

## 5. CHIẾN LƯỢC MULTI-TENANCY

### 5.1 Mô hình: Database-per-service kết hợp Discriminator Column (`tenant_id`)

Hệ thống kết hợp **2 mô hình bổ trợ lẫn nhau**:

1. **Database-per-service** (Mô hình Microservices chuẩn): Mỗi microservice sở hữu cơ sở dữ liệu riêng biệt của nó, không dịch vụ nào được tự ý kết nối đọc ghi trực tiếp vào cơ sở dữ liệu của dịch vụ khác. Việc lấy dữ liệu chéo bắt buộc phải thực hiện qua giao thức gọi tin TCP hoặc lắng nghe sự kiện bất đồng bộ qua Kafka.

2. **Shared Database per tenant — Discriminator Column** (Mô hình cô lập Multi-tenancy tối ưu tài nguyên): Trong cơ sở dữ liệu của mỗi microservice, dữ liệu của tất cả các nhà hàng (tenants) đều nằm chung trong các bảng vật lý. Sự cô lập dữ liệu được thực thi thông qua việc đánh dấu cột phân biệt `tenant_id` trên tất cả các bảng dữ liệu có liên quan đến nhà hàng.

```
PostgreSQL Instance (1 máy chủ chạy chung, cổng 5432)
│
├── DB "qrtable_saas"                   ← SaaS Management Service
│   ├── tenants (KHÔNG có cột tenant_id — bảng danh bạ gốc)
│   ├── pricing_plans (KHÔNG có cột tenant_id — bảng cấu hình gói của hệ thống)
│   ├── subscriptions                    (CÓ cột tenant_id)
│   ├── subscription_invoices             (CÓ cột tenant_id — Giao dịch của tenant trả cho hệ thống)
│   └── outbox_events                     (Lưu trữ sự kiện phát đi: tenant.created, cập nhật subscription)
│
├── DB "qrtable_catalog"                ← Catalog Service
│   ├── categories                       (CÓ cột tenant_id)
│   ├── menu_items                       (CÓ cột tenant_id)
│   ├── areas                            (CÓ cột tenant_id)
│   └── tables                           (CÓ cột tenant_id)
│
├── DB "qrtable_order"                  ← Order Service
│   ├── orders                           (CÓ cột tenant_id)
│   ├── order_items                      (CÓ cột tenant_id)
│   ├── bills                            (CÓ cột tenant_id)
│   └── service_requests                 (CÓ cột tenant_id)
│
├── DB "qrtable_payment"                ← Payment Service
│   ├── payments                         (CÓ cột tenant_id)
│   ├── audit_payments                    (Nhật ký kiểm toán giao dịch thanh toán)
│   ├── outbox_events                     (Lưu trữ sự kiện: payment.completed)
│   └── tenant_payment_settings           (CÓ cột tenant_id — cấu hình ngân hàng & token SePay của quán)
│
MongoDB Instance (1 máy chủ chạy chung, cổng 27017)
└── DB "qrtable_auth"                   ← User-Access Service
    ├── users                            (CÓ trường tenant_id)
    └── roles (KHÔNG có trường tenant_id — vai trò hệ thống dùng chung)

Các dịch vụ loại bỏ khỏi phạm vi chạy thực tế:
└── Dịch vụ thông báo Notification service / cơ sở dữ liệu qrtable_notification không nằm trong kiến trúc vận hành hiện tại.
```

_Lưu ý:_ Kitchen service **không có cơ sở dữ liệu riêng biệt** — dịch vụ này chỉ sử dụng Redis làm bộ nhớ quản lý hàng đợi chế biến KDS (Sorted Set).

**Hiện trạng triển khai (06-06-2026):** Cách phân bổ database-per-service này đã được áp dụng trong cấu hình chạy cục bộ và các bộ lệnh migration. Các schema PostgreSQL được quản lý riêng bởi DataSource của từng service đặt tại thư mục `apps/*/src/database/`, và User-Access thực hiện trỏ MongoDB về DB `qrtable_auth`. Cơ chế dự phòng gộp chung DB cũ `TYPEORM_DATABASE` / `MONGO_DB_NAME` đã bị vô hiệu hóa; việc rollback sử dụng chung DB yêu cầu phải bật cờ cấu hình `DATABASE_SHARED_FALLBACK_ENABLED=true` một cách chủ động.

**Ví dụ minh họa cấu trúc cô lập dữ liệu trong một bảng (của qrtable_catalog):**

```
┌─────────────────────────────────────────────────────┐
│  DB: qrtable_catalog                                │
│                                                     │
│  Bảng: categories                                   │
│  ┌──────────┬───────────┬──────────────────┐        │
│  │ tenant_id│ id        │ name             │        │
│  ├──────────┼───────────┼──────────────────┤        │
│  │ t-001    │ cat-101   │ Phở & Hủ Tiếu    │        │
│  │ t-001    │ cat-102   │ Nước Giải Khát   │        │
│  │ t-002    │ cat-201   │ Pizza            │        │
│  │ t-002    │ cat-202   │ Pasta            │        │
│  └──────────┴───────────┴──────────────────┘        │
│                                                     │
│  INDEX: (tenant_id, created_at)                     │
│  UNIQUE: (tenant_id, name)                          │
└─────────────────────────────────────────────────────┘
```

**Lý do chọn mô hình kết hợp:**

- **Database-per-service:** Đảm bảo tiêu chuẩn microservice → các dịch vụ hoạt động hoàn toàn độc lập, dễ dàng thay đổi cấu trúc bảng hoặc nâng cấp riêng biệt mà không ảnh hưởng hệ thống chung.
- **Discriminator Column (tenant_id):** Tiết kiệm tài nguyên máy chủ tối đa (chạy chung 1 PostgreSQL instance), quản lý tập lệnh migration đơn giản, phù hợp cho giai đoạn phát triển đồ án tốt nghiệp.
- **Điểm đánh đổi:** Không có sự cô lập vật lý ở tầng lưu trữ giữa các nhà hàng (chấp nhận được trong phạm vi đồ án). Khi cần nâng cấp bảo mật doanh nghiệp cao hơn → có thể chuyển đổi cấu trúc sang mô hình mỗi tenant một Schema riêng (Schema-per-tenant) hoặc mỗi tenant một database riêng (Database-per-tenant).

### 5.2 Các quy định bắt buộc về cô lập dữ liệu

```yaml
Tầng Cơ sở dữ liệu (Database Level):
  - Mỗi service bắt buộc kết nối vào database riêng biệt đã được phân bổ:
    - CATALOG_TYPEORM_DATABASE=qrtable_catalog
    - ORDER_TYPEORM_DATABASE=qrtable_order
    - PAYMENT_TYPEORM_DATABASE=qrtable_payment
    - SAAS_TYPEORM_DATABASE=qrtable_saas
    - USER_ACCESS_MONGO_DB_NAME=qrtable_auth
  - Chu kỳ cập nhật cấu hình DB sử dụng cơ chế TypeORM Migration riêng biệt cho từng service; tuyệt đối đặt cấu hình TYPEORM_SYNCHRONIZE=false.
  - Mọi bảng dữ liệu liên quan đến nhà hàng bắt buộc phải có cột: tenant_id UUID NOT NULL.
    - Cấu hình chỉ mục kết hợp: (tenant_id, id), (tenant_id, created_at).
    - Các ràng buộc duy nhất (Unique Constraints) phải đi kèm trường tenant_id: UNIQUE(tenant_id, table_name).
    - Sử dụng TypeORM Entity Subscriber: tự động chèn trường tenant_id khi thực hiện lệnh INSERT dữ liệu.
    - Sử dụng cơ chế lọc toàn cục (Global Query Filter): tự động bổ sung điều kiện lọc WHERE tenant_id = :tid vào tất cả các câu lệnh SELECT.
  - Việc truy vấn dữ liệu chéo dịch vụ: BẮT BUỘC thực hiện qua giao thức kết nối TCP hoặc lắng nghe sự kiện Kafka, không được kết nối đọc DB trực tiếp.

Tầng Bộ nhớ đệm (Redis Cache):
  - Định dạng key lưu trữ bắt buộc chứa tiền tố tenant_id: {entity}:{tenant_id}:{resource_id}
  - Ví dụ: menu:t-001:categories, session:t-001:s-abc123
  - Cấu hình thời gian hết hạn (TTL) riêng biệt tùy thuộc vào tính chất loại dữ liệu.

Tầng Sự kiện (Kafka Events):
  - Nội dung gói tin sự kiện gửi đi bắt buộc phải đính kèm trường dữ liệu tenant_id.
  - Các đầu nhận tin (Consumer) thực hiện lọc dữ liệu xử lý theo tenant_id tương ứng.
  - Tên Topic Kafka: Đặt theo cấp độ nghiệp vụ chung (ví dụ: order.created), không đặt tên topic riêng theo từng tenant.

Tầng Kết nối thời gian thực (WebSocket):
  - Phân phòng nhận tin theo cấu trúc: tenant:{id}:{role_group}
  - Ví dụ: tenant:t-001:staff, tenant:t-001:kds:kitchen
  - Xác thực quyền sở hữu của tenant khi thực hiện kết nối WebSocket trước khi đưa vào phòng.

Tầng Lưu trữ File:
  - Đường dẫn lưu trữ cấu trúc: qrtable/{tenant_id}/{folder}/{filename}
  - Thực hiện kiểm tra quyền sở hữu của tenant đối với file trước khi cấp URL truy cập (presigned URL).
```

### 5.3 Luồng phân tích và xác định Tenant (Tenant Resolution Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                      TENANT RESOLUTION                          │
│ ├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Nhân viên / Chủ quán / Quản lý ca]                            │
│  Header gửi lên: Authorization: Bearer <JWT>                    │
│  → UserGuard: xác thực JWT (Keycloak + kiểm tra cache Redis)    │
│  → TenantGuard: trích xuất tenant_id từ custom claims của JWT   │
│  → Gắn thông tin tenant_id vào ngữ cảnh RequestContext          │
│  → Các câu truy vấn Repository tự động áp dụng WHERE tenant_id  │
│                                                                 │
│  [Khách hàng vãng lai đặt món]                                  │
│  Cookie gửi kèm: session_id=xxx                                 │
│  Đường dẫn URL: https://{slug}.qrtable.io?table={id}&token=hmac │
│  → SessionGuard: xác thực tính hợp lệ của session_id trên Redis │
│  → Kiểm tra token HMAC → xác định tenant_id từ bảng cấu hình bàn│
│  → Gắn thông tin tenant_id vào ngữ cảnh RequestContext          │
│  → Các câu truy vấn Repository tự động áp dụng WHERE tenant_id  │
│                                                                 │
│  [Quản trị viên Super Admin]                                    │
│  Header gửi lên: Authorization: Bearer <JWT>                    │
│  → UserGuard: xác thực JWT, kiểm tra quyền vai trò SUPER_ADMIN  │
│  → Không thực hiện gắn tenant_id cố định (để xem chéo hệ thống) │
│  → Có thể truyền ?tenant_id=xxx ở query param khi dùng debug    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. PHÂN RÃ CÁC MICROSERVICES

### 6.1 Danh mục các Microservices

| #   | Tên dịch vụ             | Giao thức kết nối chính | Cơ sở dữ liệu           | Chức năng chính                                                                                                                       |
| :-- | :---------------------- | :---------------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **BFF Service**         | HTTP + WS               | Không có (Stateless)    | API Gateway, quản lý kết nối WebSocket Gateway, thực thi chuỗi Guard bảo mật, cung cấp tài liệu Swagger.                              |
| 2   | **Authorizer Service**  | gRPC + TCP              | Không có (Gọi Keycloak) | Xác thực mã token JWT, phân tích thông tin tài khoản, gọi các API admin quản trị tài khoản Keycloak.                                  |
| 3   | **SaaS Mgmt Service**   | TCP                     | PG: `qrtable_saas`      | Quản lý vòng đời tenant, danh mục Gói dịch vụ, quản lý trạng thái subscription, lập hóa đơn subscription cho quán, lưu suspend cache. |
| 4   | **Catalog Service**     | TCP                     | PG: `qrtable_catalog`   | Quản lý thực đơn (danh mục món & món ăn), cấu hình sơ đồ Bàn & Khu vực, mã hóa xác thực bàn QR.                                       |
| 5   | **Order Service**       | TCP                     | PG: `qrtable_order`     | Quản lý trạng thái đơn hàng, giỏ hàng dùng chung, hóa đơn thanh toán; không tự ý ghi giảm kho — gọi Catalog qua TCP khi xác nhận đơn. |
| 6   | **Kitchen Service**     | TCP + Kafka             | Chỉ dùng Redis          | Điều phối phiếu chế biến KDS, sắp xếp hàng đợi chế biến FIFO/ưu tiên, cảnh báo SLA trễ; không gộp món.                                |
| 7   | **Payment Service**     | TCP + Webhook           | PG: `qrtable_payment`   | Xử lý thanh toán hóa đơn khách, cấu hình thông tin ngân hàng của tenant, xử lý cổng SePay OAuth, thực hiện đối soát.                  |
| 8   | **User-Access Service** | TCP                     | Mongo: `qrtable_auth`   | Quản lý thông tin hồ sơ nhân sự, phân vai trò tài khoản, đếm số lượng nhân viên thực tế của quán.                                     |
| 9   | **Customer PWA**        | HTTP + WS               | Không có                | Giao diện đặt món cho khách hàng; xử lý hiển thị banner tạm khóa và khóa đặt món khi tenant ở trạng thái `SUSPENDED`.                 |
| 10  | **Management App**      | HTTP + WS               | Không có                | Giao diện vận hành POS/KDS/Dashboard/Admin, đăng ký gói cước, kết nối ngân hàng, giao diện báo cáo doanh thu theo gói.                |
| 11  | **Keycloak Theme**      | Static assets           | Không có                | Chứa các file giao diện tùy chỉnh cho trang đăng nhập Keycloak.                                                                       |

### 6.2 Chi tiết thiết kế các phân vùng nghiệp vụ (Domain Details)

#### 6.2.1 BFF Service (API Gateway)

- **Nhiệm vụ:**
  - Cổng vào duy nhất tiếp nhận mọi yêu cầu từ phía các ứng dụng client (REST API + WebSocket).
  - Thực thi chuỗi bộ lọc bảo mật: UserGuard → SessionGuard → TenantGuard → CustomerTenantLifecycleGuard → PermissionGuard.
  - Các API báo cáo phân tích nâng cao sẽ được gán thêm bộ lọc kiểm tra gói dịch vụ: TenantSubscriptionContextGuard → PlanFeatureGuard.
  - Cung cấp tài liệu tra cứu API Swagger định dạng chuẩn.
  - Giới hạn tần suất gửi yêu cầu (Rate limiting) bằng NestJS Throttler kết hợp Redis.
  - Sử dụng Exception Interceptor để chuẩn hóa cấu trúc lỗi trả về cho client.
  - Sử dụng Logger Middleware để tạo Process ID (mã theo dõi luồng request xuyên suốt các microservice).
  - WebSocket Gateway: làm cầu nối truyền dẫn sự kiện Kafka hoặc thực hiện luồng phát WebSocket BFF Direct trực tiếp sau khi ghi nhận kết quả gọi TCP.
  - Cấu hình dung lượng body parser tối đa 20MB phục vụ tải ảnh món ăn lên hệ thống.
  - Multer middleware: tiếp nhận file ảnh tải lên bộ nhớ tạm, truyền stream trực tiếp lên Cloudinary (không lưu file ra ổ cứng máy chủ).
    - Link tải ảnh: POST `/api/v1/admin/menu-items/:id/image` (định dạng multipart/form-data).
  - Áp dụng mô hình phát WebSocket trực tiếp sau khi hoàn tất lệnh ghi (BFF Direct Side-Effects - AP1) để tối ưu thời gian phản hồi cho các giao dịch phía client (xem thêm §7.3).
- **Liên kết dịch vụ:**
  - Gọi → Authorizer Service (gRPC): xác thực token.
  - Gọi → Catalog/Order/Payment/SaaS Service (TCP): thực hiện các giao dịch nghiệp vụ.
  - Gọi → SaaS Service (TCP): kiểm tra trạng thái gói cước hiện tại phục vụ phân quyền truy cập các API báo cáo phân tích.
  - Kết nối → Redis: lưu cache thông tin token đã xác thực, đếm lượt truy cập rate limit.
  - Kết nối → Kafka: lắng nghe các sự kiện hệ thống cần đẩy thông báo rộng rãi (`kitchen.sla_warning`, `payment.completed`); luồng theo dõi đơn hàng phục vụ khách hàng sử dụng cơ chế BFF Direct sau khi có phản hồi từ Order TCP, và BFF tuyệt đối không được tự ý phát trạng thái hàng đợi KDS trực tiếp từ sự kiện `order.confirmed`.
  - Kết nối → Cloudinary: đẩy stream dữ liệu ảnh tải lên.
- **Không có cơ sở dữ liệu riêng** — BFF hoàn toàn stateless, chỉ làm trung gian điều phối và định tuyến tin.

#### 6.2.2 Authorizer Service

- **Nhiệm vụ:**
  - Cung cấp cổng gRPC phục vụ cho việc kiểm tra quyền của BFF Guard.
  - Thực hiện kiểm tra chữ ký token JWT với địa chỉ công bố JWKS của Keycloak.
  - Giải mã và trả về thông tin tài khoản: `{ sub, email, roles, tenant_id, sub_role }`.
  - Gọi Keycloak Admin API để thực hiện các thao tác quản trị người dùng: tạo tài khoản nhân viên mới, xóa tài khoản, phân vai trò.
- **Liên kết dịch vụ:**
  - Tiếp nhận ← BFF Service (gRPC client).
  - Gọi → Keycloak (gRPC / HTTP): lấy danh sách JWKS, gọi các API Admin quản trị.
  - Kết nối → Redis (tùy chọn): lưu bộ nhớ tạm public key của JWKS để tăng tốc độ kiểm tra.
- **Cấu hình Keycloak:**
  - 1 phân vùng duy nhất (Realm): "qrtable".
  - Các cổng client đăng ký: `bff-client`, `admin-client`.
  - Các vai trò mặc định (Roles): `SUPER_ADMIN`, `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`.
  - Cấu hình đính kèm thông tin bổ sung custom claims trong JWT: `tenant_id`, `sub_role` (thông qua Protocol Mapper).

#### 6.2.3 SaaS Management Service

- **Nhiệm vụ:**
  - Nguồn dữ liệu gốc quản lý vòng đời của các nhà hàng (tenant): duyệt hoạt động, cập nhật thông tin, tạm ngưng, kích hoạt lại, đóng cửa.
  - Quản lý trạng thái vận hành của tenant: sử dụng trường `status` (`ACTIVE` / `SUSPENDED` / `CLOSED`) để điều phối hành vi hệ thống; trường tương thích ngược `isActive` được tính toán tự động dựa theo biểu thức `status === ACTIVE`.
  - Quản lý danh mục các Gói dịch vụ (Pricing Plans): các gói mẫu hệ thống `FREE`/`BASIC`/`PREMIUM` và các tính năng quản trị CRUD của gói.
  - Quản lý vòng đời Subscription: gán gói cho quán, xử lý hóa đơn thanh toán gia hạn, kích hoạt gói, hủy gói, tự động hết hạn, xem lịch sử mua gói.
  - Lập hóa đơn subscription cho nhà hàng (`subscription_invoices`): lập hóa đơn VietQR của platform cho các giao dịch gia hạn gói của tenant, lắng nghe SePay Webhook để kích hoạt gói tự động hoặc hỗ trợ admin xác nhận thủ công.
  - Hỗ trợ phân quyền tính năng theo gói: cung cấp các mã tính năng chuẩn hóa (plan feature codes), lưu cache subscription hiện tại, trả dữ liệu kiểm tra hạn ngạch sử dụng và cung cấp API check chéo giới hạn cho các service khác.
  - Dashboard báo cáo subscription: gọi TCP lấy các bộ đếm thực tế của quán từ Catalog (số bàn), User-Access (số nhân viên) và Order (số đơn hàng trong ngày); bộ đếm đơn hàng trong ngày sử dụng múi giờ `Asia/Ho_Chi_Minh`.
  - Chuẩn hóa tên miền (Slug/Subdomain): tự động tạo slug từ tên quán, kiểm tra tính duy nhất trên hệ thống và chặn danh sách từ khóa hệ thống dùng riêng trong cấu hình dùng chung của SaaS.
  - Quy trình Onboarding mini-saga: điều phối luồng tạo tenant đi kèm tạo tài khoản Owner qua Authorizer/User-Access và chèn mặc định cấu hình thanh toán Payment; có cơ chế rollback dọn dẹp tài khoản Keycloak mồ côi nếu các bước sau bị lỗi.
  - Đồng bộ trạng thái tạm ngưng lên Redis: ghi nhận/xóa cờ tạm khóa của quán tại key `tenant:{tenantId}:suspended` trên Redis để BFF Guard kiểm tra nhanh ở tầng ngoài.
  - Lưu cache thông tin gói: lưu key `subscription:{tenantId}` với thời gian hết hạn TTL 5 phút.
  - Tiến trình kiểm tra hết hạn (Cron job): chạy hàng ngày vào lúc `02:00 Asia/Ho_Chi_Minh`; cho phép ân hạn thêm 24 giờ trước khi tự động chuyển trạng thái tenant sang tạm dừng hoạt động (`SUSPENDED`).
  - Múi giờ giới hạn đơn hàng: bộ đếm giới hạn đơn hàng hàng ngày `max_orders_per_day` tự động reset theo múi giờ `Asia/Ho_Chi_Minh`.
  - Thiết lập mặc định khi chuyển đổi hệ thống cũ: gán mặc định gói `FREE` không hết hạn cho các tenant cũ, chuyển đổi `isActive=false` sang trạng thái `SUSPENDED`, gán mặc định đơn vị tiền tệ `VND` và ngôn ngữ `vi-VN`.
  - Hệ thống outbox của SaaS: lưu và xuất bản sự kiện nghiệp vụ sau khi database đã commit thành công.
- **Các thực thể dữ liệu (PostgreSQL):**
  - `tenants`: id, slug, name, type, address, status, owner_id, default_currency (mặc định: VND), default_locale (mặc định: vi-VN), operating_modes[] (enum: INSTANT_ORDER | DIGITAL_MENU), created_at.
  - `pricing_plans`: id, code, name, price_vnd, max_tables, max_staff, max_orders_per_day, features (danh sách mã tính năng), is_active.
  - `subscriptions`: id, tenant_id, pricing_plan_id, plan_code_snapshot, price_vnd_snapshot, starts_at, expires_at, status, source, source_invoice_id.
  - `subscription_invoices`: id, tenant_id, pricing_plan_id, billing_reference (`QRSUB*`), amount_vnd, status, qr_url, qr_expires_at, paid/manual confirmation fields.
  - `outbox_events`: id, tenant_id, topic, event_type, aggregate_id, payload, status, attempts.
- **Sự kiện phát ra (Kafka):**
  - `tenant.created` → kích hoạt luồng thiết lập dữ liệu mặc định ban đầu cho nhà hàng.
  - Các sự kiện `subscription.activated` hoặc các sự kiện liên quan đến hóa đơn subscription sẽ sử dụng hệ thống SaaS outbox để phát đi; các thông báo đẩy tạm thời lên giao diện khi quán bị khóa vẫn sử dụng cơ chế BFF/WebSocket trực tiếp, không đưa vào luồng sự kiện Kafka.

#### 6.2.3A Các mô hình đọc dữ liệu (Read Models) báo cáo trên Dashboard

Hệ thống báo cáo của Phase 4D sử dụng mô hình đọc dữ liệu trực tiếp từ dịch vụ sở hữu dữ liệu gốc (source-owner read models) thay vì xây dựng một dịch vụ phân tích dữ liệu riêng biệt.

| Màn hình hiển thị       | Đường dẫn API trên BFF                                                   | Quyền phân bổ     | Điều kiện Gói dịch vụ    | Service xử lý chính   |
| :---------------------- | :----------------------------------------------------------------------- | :---------------- | :----------------------- | :-------------------- |
| Doanh thu của tenant    | `GET /dashboard/reports/revenue`                                         | `report.read_own` | Gói có `analytics_basic` | Payment               |
| Đơn hàng của tenant     | `GET /dashboard/reports/orders`                                          | `report.read_own` | Gói có `analytics_basic` | Order                 |
| Số liệu bàn ăn/thực đơn | `GET /dashboard/reports/tables`                                          | `report.read_own` | Gói có `analytics_basic` | Catalog               |
| Số liệu toàn hệ thống   | `GET /admin/analytics/platform`                                          | `report.read_any` | Không giới hạn           | SaaS                  |
| Xem chi tiết một tenant | `GET /admin/analytics/tenants/:tenantId/reports/{revenue,orders,tables}` | `report.read_any` | Không giới hạn           | Payment/Order/Catalog |

Quy tắc thực thi báo cáo:

- Controller trên BFF chịu trách nhiệm validate định dạng tham số truy vấn, kiểm tra điều kiện bảo mật đầu vào, tự động gắn ngữ cảnh tenant/user và chuyển tiếp dữ liệu TCP đã định nghĩa kiểu cụ thể xuống các service tương ứng.
- BFF tuyệt đối không tự kết nối database và không thực hiện gộp (join) dữ liệu báo cáo chéo dịch vụ.
- Payment service sở hữu số liệu doanh thu từ hóa đơn đã thanh toán thành công, phân tích theo phương thức thanh toán và danh sách hóa đơn thanh toán gần đây.
- Order service sở hữu số liệu trạng thái đơn hàng/hóa đơn, giá trị đơn hàng trung bình và phân tích thống kê các món ăn gọi nhiều nhất.
- Catalog service sở hữu số liệu thời gian sử dụng bàn ăn và tổng hợp số lượng danh mục thực đơn của quán.
- SaaS service sở hữu số liệu doanh thu gói dịch vụ toàn nền tảng, thống kê số lượng nhà hàng theo trạng thái hoạt động, phân bổ các gói cước và trạng thái hóa đơn subscription.
- Các route báo cáo của nhà hàng sẽ chạy qua `TenantSubscriptionContextGuard` để kiểm tra thông tin subscription hiện tại qua lệnh TCP `SUBSCRIPTION.GET_CURRENT`, sau đó chạy qua `PlanFeatureGuard` để kiểm tra xem gói dịch vụ đang dùng có chứa mã tính năng nâng cao `PLAN_FEATURE_CODES.ANALYTICS_BASIC` hay không.
- Ứng dụng quản trị (Management App) lấy thông tin phân quyền sử dụng dashboard `/dashboard/subscription`; đối với các gói bị khóa tính năng, màn hình tự động ẩn các request gọi API báo cáo và hiển thị giao diện đề xuất nâng cấp gói cước.
- Các API báo cáo toàn nền tảng và xem chi tiết báo cáo của tenant do Super Admin gọi sẽ không bị chặn bởi gói dịch vụ của tenant đó.

#### 6.2.4 Catalog Service

- **Nhiệm vụ:**
  - Quản lý thực đơn: các tác vụ CRUD cho Danh mục (Category) và Món ăn (MenuItem).
  - Tải hình ảnh món ăn: tích hợp Cloudinary SDK để tải ảnh trực tiếp.
    - Thư mục lưu trữ: `qrtable/{tenant_id}/menu/{uuid}.{ext}`.
    - Quy chuẩn validate: dung lượng file tối đa 5MB, hỗ trợ định dạng ảnh `image/jpeg`, `image/png`, `image/webp`.
    - Tự động tối ưu ảnh: định dạng tự động, chất lượng tự động, giới hạn chiều rộng ảnh tối đa 800px.
  - Quản lý cấu hình sơ đồ: các tác vụ CRUD cho Khu vực (Area) và Bàn ăn (Table).
  - Mã hóa xác thực mã QR bàn ăn: sinh token xác thực HMAC và kiểm tra tính hợp lệ của token khi khách quét mã QR để vào bàn.
  - Quản lý hạn ngạch tồn kho món ăn: Catalog sở hữu thông tin số lượng tồn kho của từng món ăn và bảng ghi nhận các yêu cầu giữ kho dự phòng (`stock_reservations`) của các đơn hàng.
  - Cung cấp cổng giao dịch TCP cho luồng xác nhận đơn hàng của Order service: thực hiện giữ kho, trừ kho thực tế hoặc giải phóng kho khi đơn hàng bị hủy dựa trên khóa idempotency key và số phiên bản của giao dịch giữ kho.
- **Các thực thể dữ liệu (PostgreSQL):**
  - `categories`: id, tenant_id, name, description, display_order, is_active, created_at.
  - `menu_items`: id, tenant_id, category_id, name, description, price, image_url, status (enum: AVAILABLE | OUT_OF_STOCK), display_order, created_at.
  - `areas`: id, tenant_id, name, description, display_order, created_at.
  - `tables`: id, tenant_id, area_id, name, capacity, status (enum: AVAILABLE | OCCUPIED | BILLING | CLEANING), session_id, token (HMAC token), created_at.
  - `stock_reservations`: id, tenant_id, order_id, version, key, status (RESERVED | COMMITTED | RELEASED), payload_hash, quantity_snapshot, created_at.
- **Lắng nghe sự kiện (Kafka Consumer):**
  - `tenant.created` → Tự động khởi tạo dữ liệu mẫu mặc định cho quán mới (Tạo sẵn 1 Khu vực mặc định "Tầng trệt" và 3 Bàn ăn mẫu để quán thử nghiệm nhanh).

#### 6.2.5 Order Service

- **Nhiệm vụ:**
  - Quản lý vòng đời đơn hàng: thực thi State Machine của đơn hàng (Draft → Pending → Processing → Ready → Served → Completed / Canceled).
  - Quản lý Session gọi món tại bàn ăn: quản lý thông tin khách vào bàn, thời gian ngồi bàn, và tự động thu hồi session trống.
  - Giỏ hàng dùng chung (Shared Cart): lưu trữ giỏ hàng tạm thời của bàn trên Redis, xử lý cập nhật thêm bớt món đồng thời từ nhiều thiết bị tại một bàn.
  - Quản lý Hóa đơn của khách (`bills`): tự động lập hóa đơn gộp tất cả các đơn đặt món thành công của bàn khi khách yêu cầu thanh toán, tính toán số tiền raw_total và số tiền rounded_total theo quy tắc làm tròn VND.
  - Điều phối luồng duyệt đơn đặt món (Order Confirmation Saga): lớp `OrderConfirmSagaService` thực hiện khóa trạng thái đơn hàng, gọi Catalog TCP trừ kho và phát sự kiện outbox gửi lên bếp.
  - Cung cấp API TCP hỗ trợ thanh toán hóa đơn: cho phép Payment service gọi để xác nhận hóa đơn đã thanh toán thành công, tự động cập nhật trạng thái đơn hàng sang `Completed` và chuyển trạng thái bàn ăn sang `Cleaning`.
  - Lưu trữ lịch sử: Đóng gói và lưu trữ dữ liệu session cũ khi hoàn tất thanh toán hóa đơn.
- **Các thực thể dữ liệu (PostgreSQL):**
  - `orders`: id, tenant_id, table_id, session_id, status (PENDING | PROCESSING | READY | SERVED | COMPLETED | CANCELED), total_amount, idempotency_key, cancel_reason, canceled_by, canceled_at, created_at.
  - `order_items`: id, tenant_id, order_id, menu_item_id, name, price, quantity, notes, status, created_at.
  - `bills`: id, tenant_id, table_id, session_id, billing_reference (`QRTBL*`), status (OPEN | PENDING | PAID | CANCELED), raw_total, rounded_total, rounding_delta, created_at.
  - `service_requests`: id, tenant_id, table_id, type (enum: CALL_STAFF | CHECKOUT), status (PENDING | RESOLVED), created_at.
  - `outbox_events`: lưu trữ sự kiện nghiệp vụ của đơn hàng để phát đi bất đồng bộ (`order.confirmed`, `order.status_changed`).
- **Lắng nghe sự kiện (Kafka Consumer):**
  - `payment.completed` → Tự động cập nhật hóa đơn sang trạng thái đã thanh toán (`PAID`), chuyển toàn bộ đơn hàng sang `Completed` và gọi Catalog TCP cập nhật trạng thái bàn sang `Cleaning`.

#### 6.2.6 Kitchen Service (KDS)

- **Nhiệm vụ:**
  - Lắng nghe sự kiện Kafka `order.confirmed` để nhận đơn đặt món đã được duyệt.
  - Định tuyến món ăn về các màn hình chế biến dựa theo giá trị cấu hình khu vực chế biến (`MenuItem.station`) trong gói tin gửi đến (màn KITCHEN hoặc BAR).
  - Quản lý hàng đợi chế biến: lưu trữ danh sách thẻ món ăn chờ làm trong Redis Sorted Set (sử dụng mốc thời gian làm điểm số score để sắp xếp FIFO chuẩn xác).
  - Thẻ chế biến KDS được phân nhóm theo cặp `(tenantId, orderId, station)` hiển thị đầy đủ thông tin bàn ăn, món cần làm, ghi chú đi kèm và thời gian chờ; không tự động gộp số lượng món ăn chéo bàn.
  - Theo dõi SLA chế biến: hệ thống đếm ngược thời gian làm món, tự động nhấp nháy thẻ khi quá hạn quy định (ví dụ: quá 15 phút chưa làm xong).
  - Cập nhật trạng thái thẻ: từ chờ làm sang Đang chế biến (Processing) → Chế biến xong (Ready).
  - Thu hồi lệnh lỗi (Recall): Cho phép đầu bếp khôi phục thẻ món ăn vừa lỡ tay bấm Xong trở lại hàng đợi chế biến.
  - Đánh dấu ưu tiên: Đẩy các đơn đặt món của bàn ưu tiên lên đầu danh sách chế biến.
  - Toàn bộ thao tác đọc ghi dữ liệu trên Redis của KDS được đóng gói qua lớp facade `KdsRedisRepository`; các nghiệp vụ quản lý thẻ, SLA và cơ chế khôi phục lỗi được phân chia tương ứng vào các lớp chuyên biệt: `KdsTicketStoreRepository`, `KdsSlaStoreRepository` và `KdsRecoveryStoreRepository`.
- **Lưu trữ dữ liệu (Redis — không sử dụng database PostgreSQL riêng):**
  - `kds:{tenant_id}:kitchen` → Sorted Set `{ ticket_id: timestamp }` (danh sách thẻ chờ làm của Bếp).
  - `kds:{tenant_id}:bar` → Sorted Set `{ ticket_id: timestamp }` (danh sách thẻ chờ làm của Bar).
  - `kds:{tenant_id}:ticket:{ticket_id}` → Hash `{ order_id, table_name, items, status, created_at }` (thông tin chi tiết thẻ).
- **Sự kiện phát ra (Kafka):**
  - `kitchen.sla_warning` → kích hoạt cảnh báo quá tải chế biến đến màn hình quản lý (tạo ra từ bộ đếm thời gian nội bộ của KDS).
- **Luồng WebSocket trực tiếp (BFF Direct - không qua Kafka):**
  - Sự kiện báo xong món `kitchen.item_ready` được BFF xử lý gửi trực tiếp tín hiệu WebSocket đến các phòng: phòng nhân viên phục vụ `tenant:{tid}:staff` và phòng khách hàng `session:{sid}:customer` ngay khi nhận phản hồi TCP.
- **Đồng bộ trạng thái KDS lên màn hình (qua BFF):**
  - Khi có thay đổi dữ liệu KDS trên Redis → KDS gửi mã tín hiệu nội bộ `kds.queue_changed` đến BFF → BFF tự động phát WebSocket cập nhật trạng thái đến các phòng màn hình chế biến tương ứng (`tenant:{tid}:kds:kitchen` hoặc `tenant:{tid}:kds:bar`).

#### 6.2.7 Payment Service

- **Nhiệm vụ:**
  - Xử lý thanh toán hóa đơn khách hàng (Thanh toán giữa Khách và Nhà hàng): hỗ trợ hai hình thức Chuyển khoản VietQR tự động hoặc thanh toán Tiền mặt.
  - Quản lý cấu hình thanh toán của nhà hàng: bật/tắt nhận chuyển khoản VietQR, quản lý thông tin số tài khoản ngân hàng hoạt động và trạng thái liên kết.
  - Liên kết tài khoản SePay: cung cấp link ủy quyền OAuth SePay, tiếp nhận callback trao đổi token, lấy danh sách ngân hàng liên kết, lưu trữ thông tin webhook và hủy kết nối.
  - Lưu cache trạng thái OAuth: lưu trữ key `oauth_state:{state}` trên Redis với thời gian hết hạn 5 phút phục vụ phòng chống tấn công giả mạo CSRF khi thực hiện callback (có cơ chế lưu trữ tạm trong memory của ứng dụng phục vụ chạy test độc lập).
  - Tạo mã QR VietQR (qua API SePay): tự động tạo link ảnh QR thanh toán với số tiền đã làm tròn và nội dung chuyển khoản được cấu hình sẵn.
  - Xử lý Webhook ngân hàng tự động (SePay Webhook):
    - Luồng thanh toán trực tiếp của Phase 3: nhận dữ liệu tại POST `/api/v1/payment/sepay/webhook`, thực hiện giải mã signature kiểm tra tính toàn vẹn của body tin nhắn qua khóa HMAC.
    - Luồng định tuyến động của Phase 4B: nhận dữ liệu tại `/payment/sepay/webhook/:tenantSlug`, xác thực chữ ký bằng mã bí mật `x-secret-key` được cấu hình riêng.
    - Hệ thống phân tích nội dung chuyển khoản để khớp mã billReference. Nếu số tiền thanh toán thiếu → giữ trạng thái hóa đơn là PENDING, ghi nhận log sự cố `SEPAY_WEBHOOK_UNDERPAID`. Nếu số tiền thanh toán đủ hoặc thừa → đổi trạng thái sang PAID, ghi nhận số tiền thực nhận.
  - Thanh toán tiền mặt: cung cấp API cho nhân viên phục vụ xác nhận thu tiền mặt trên màn hình POS, tính toán tiền thối lại cho khách.
  - Làm tròn tiền VND: tự động tính toán làm tròn lên đến hàng nghìn đồng trước khi lập hóa đơn thanh toán.
  - Lưu trữ lịch sử giao dịch: lưu thông tin chi tiết số tiền nhận, mã giao dịch ngân hàng, thời gian thanh toán phục vụ đối soát.
  - Đóng băng hóa đơn: khóa không cho phép sửa đổi thông tin hóa đơn sau khi trạng thái đã chuyển sang PAID.
  - Cung cấp API báo cáo đối soát: thống kê doanh thu theo ngày/tháng, phân loại theo phương thức thanh toán phục vụ dashboard báo cáo của Owner.
- **Các thực thể dữ liệu (PostgreSQL):**
  - `payments`: id, tenant_id, bill_id, bill_reference, method (enum: CASH | VIETQR), raw_total, rounded_total, rounding_delta, amount_received, change_amount, sepay_transaction_id, sepay_reference_code, status (PENDING | PAID | FAILED), paid_at.
  - `audit_payments`: id, payment_id, action, actor_id, meta JSONB, timestamp.
  - `tenant_payment_settings`: id, tenant_id, cash_enabled, vietqr_enabled, vietqr_bank_name, vietqr_account_number, vietqr_account_holder, sepay_api_key, sepay_webhook_secret, connection_status.
  - `outbox_events`: lưu trữ sự kiện thanh toán thành công để phát lên Kafka (`payment.completed`).
- **Logic làm tròn tiền mặt VND:**
  - `raw_total` = Σ(Giá món × Số lượng)
  - `rounded_total` = `Math.ceil(raw_total / 1000) * 1000`
  - `rounding_delta` = `rounded_total` - `raw_total`
  - Hệ thống lưu trữ đồng thời cả 3 giá trị này để đảm bảo tính minh bạch khi đối soát kế toán.
- **Luồng thanh toán Chuyển khoản VietQR:**
  1.  Nhân viên bấm chọn thanh toán "Chuyển khoản" trên màn POS → BFF gọi TCP xuống Payment service: `createVietQR({ billId })`.
  2.  Payment service: lấy số tiền đã làm tròn `rounded_total`, sinh mã nội dung chuyển khoản `billReference` = "QRTBL" + 8 ký tự đầu của billId (bỏ dấu gạch ngang UUID).
  3.  Đọc cấu hình ngân hàng của quán từ bảng `tenant_payment_settings` để lấy tài khoản nhận tiền; nếu chưa cấu hình, hệ thống sẽ sử dụng thông tin tài khoản demo của platform trong file env làm phương án dự phòng.
  4.  Sinh link QR thanh toán: `https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}&amount={rounded_total}&des={billReference}`.
  5.  Màn hình POS hiển thị ảnh mã QR này cho khách quét và chuyển khoản.
  6.  Ngân hàng báo có → SePay gửi webhook về cổng BFF:
      - Luồng trực tiếp Phase 3: POST `/api/v1/payment/sepay/webhook` kiểm toán qua signature headers `X-SePay-Signature` + `X-SePay-Timestamp`.
      - Luồng định tuyến Phase 4B: POST `/payment/sepay/webhook/:tenantSlug` kiểm toán qua khóa `x-secret-key`.
  7.  BFF kiểm tra tính hợp lệ của chữ ký và kiểm tra định dạng body qua class-validator DTO của NestJS.
  8.  Payment service: tìm kiếm đơn hàng có mã billReference trùng khớp. Nếu tiền vào đủ hoặc dư → chuyển trạng thái sang PAID, ghi nhận số tiền thực nhận. Nếu thiếu tiền → giữ trạng thái PENDING và tạo cảnh báo lỗi.
  9.  Lưu mã giao dịch SePay. Thực hiện gọi TCP đồng bộ trực tiếp báo cho Order service (`BILL_MARK_PAID`) để cập nhật nhanh trạng thái bàn ăn; sự kiện phát đi lên Kafka sau đó đóng vai trò dự phòng và đồng bộ chéo cho các dịch vụ khác.
  10. Lưu bản ghi outbox trong cùng transaction DB → phát sự kiện Kafka: `payment.completed`.
- **Luồng liên kết cổng SePay OAuth / cấu hình thanh toán:**
  1.  Owner bấm nút "Kết nối ngân hàng" trên màn hình thiết lập → BFF gọi Payment TCP `payment_settings.generate_authorize_url`.
  2.  Payment lưu trữ mã `state` ngẫu nhiên lên Redis với TTL 5 phút để bảo mật chống giả mạo, trả về link ủy quyền của SePay.
  3.  Owner đăng nhập và cấp quyền thành công → SePay callback trả mã code → Payment thực hiện đổi code lấy access token, lưu mã hóa token vào bảng `tenant_payment_settings` và lấy danh sách tài khoản ngân hàng của Owner.
  4.  Owner chọn tài khoản ngân hàng muốn nhận tiền → Payment gọi API SePay để đăng ký cấu hình webhook tự động và cập nhật trạng thái liên kết là `CONNECTED`.
  5.  Cổng BFF định tuyến các webhook thanh toán hóa đơn khách hàng (`QRTBL*`) về Payment service, và các webhook thanh toán hóa đơn của hệ thống (`QRSUB*`) về SaaS service để gia hạn gói cước.
- **Luồng thanh toán Tiền mặt:**
  1.  Nhân viên xác nhận khách trả tiền mặt trên màn hình POS.
  2.  BFF gọi TCP xuống Payment service: `confirmCashPayment({ billId, amountReceived })`.
  3.  Payment service: tính toán tiền thối lại cho khách, cập nhật trạng thái hóa đơn sang PAID, lưu phương thức thanh toán là CASH.
  4.  Lưu bản ghi outbox → phát sự kiện Kafka: `payment.completed`.
- **Sự kiện phát ra (Kafka):**
  - `payment.completed` → Order service nhận tin để cập nhật hóa đơn PAID, giải phóng bàn ăn về trạng thái dọn dẹp, và BFF phát WebSocket cập nhật trạng thái trực tiếp cho khách hàng.

#### 6.2.8 User-Access Service

- **Nhiệm vụ:**
  - Nguồn dữ liệu gốc lưu trữ thông tin tài khoản nhân viên của nhà hàng sau khi tài khoản đó đã được Keycloak xác thực danh tính.
  - Quản lý thông tin phân vai trò nhân sự, quyền truy cập của nhân viên và gán nhân viên vào cửa hàng tương ứng (`tenantId` trong hồ sơ người dùng).
  - Cung cấp API quản lý danh sách nhân viên phục vụ cho ứng dụng quản trị của Owner.
  - Cung cấp cổng gọi TCP `user.count_by_tenant` để SaaS service kiểm tra giới hạn số lượng nhân sự tối đa (`max_staff`) của gói dịch vụ đang áp dụng cho quán.
  - Hỗ trợ API khởi tạo thông tin Owner khi thực hiện quy trình onboarding quán mới do SaaS service điều phối.
- **Lưu trữ dữ liệu:**
  - Cơ sở dữ liệu MongoDB `qrtable_auth`: bảng `users` (chứa tenant_id) và bảng `roles` (bảng phân vai trò toàn hệ thống).
- **Liên kết dịch vụ:**
  - Tiếp nhận ← BFF / SaaS Service (TCP): gọi truy vấn thông tin tài khoản, tạo mới Owner, đếm số lượng nhân viên hoặc cập nhật hồ sơ nhân sự.
  - Các thông tin từ token xác thực của Keycloak đóng vai trò là dữ liệu định danh đầu vào để kiểm tra chéo, không thay thế cho thông tin hồ sơ lưu trữ chính thức trong database của User-Access.

#### 6.2.9 Phạm vi của Dịch vụ thông báo / Email (Scope Decision)

- Hiện tại hệ thống không chứa mã nguồn của dịch vụ gửi thông báo độc lập (`apps/notification`).
- Mọi nghiệp vụ liên quan đến gửi email xác nhận, tin nhắn sms hay thông báo đẩy ngoài hệ thống đều nằm ngoài phạm vi thực hiện của dự án hiện tại.
- Nếu dịch vụ này được phát triển bổ sung ở giai đoạn sau, nó bắt buộc phải khai báo cấu hình database riêng, đăng ký các consumer Kafka nhận tin, cấu hình nhà cung cấp dịch vụ gửi tin, chính sách gửi lại khi lỗi, cơ chế lưu log đối soát và tài liệu kiểm thử trước khi được tính là một thành phần vận hành chính thức của hệ thống.

---

## 7. GIAO TIẾP INTER-SERVICE

### 7.1 Ma trận giao tiếp chéo dịch vụ

| Phương thức       | Tác nhân gửi → nhận         | Mô hình giao tiếp     | Trường hợp áp dụng                                                               |
| :---------------- | :-------------------------- | :-------------------- | :------------------------------------------------------------------------------- |
| **HTTP REST**     | Ứng dụng Client → BFF       | Request/Response      | Kết nối từ ứng dụng Frontend lên Gateway, cung cấp tài liệu Swagger.             |
| **TCP**           | BFF → Các Service nghiệp vụ | RPC (Đồng bộ - sync)  | Gọi tin nội bộ yêu cầu có phản hồi kết quả lập tức để trả về client.             |
| **gRPC**          | BFF → Authorizer Service    | RPC (Đồng bộ - sync)  | Xác thực thông tin tài khoản — yêu cầu hiệu suất kết nối cực nhanh.              |
| **Kafka**         | Service → Service           | Pub/Sub (Bất đồng bộ) | Phản hồi nghiệp vụ chéo dịch vụ, thông báo sự kiện, giảm mức độ phụ thuộc chéo.  |
| **WebSocket**     | BFF → Các ứng dụng Client   | Push (Thời gian thực) | Đẩy trực tiếp thông báo bếp chế biến xong, cập nhật trạng thái đơn, gọi phục vụ. |
| **HTTP Webhook**  | SePay → BFF                 | Event Callback        | Nhận thông báo tiền vào từ tài khoản ngân hàng; sử dụng HMAC hoặc x-secret-key.  |
| **Redis Pub/Sub** | Service → BFF WS Gateway    | Pub/Sub               | Đồng bộ thông báo nội bộ để WebSocket Gateway phát tin chéo các máy chủ BFF.     |

### 7.2 Danh mục các sự kiện Kafka (Kafka Topic Registry)

**Nguyên tắc áp dụng:** Hệ thống áp dụng quy tắc phân loại giao tiếp 4P+2AP (xem mục §7.4) để quyết định sự kiện nào sử dụng Kafka và sự kiện nào sử dụng luồng phát trực tiếp từ BFF (BFF Direct). Hiện tại có 5 topic Kafka chính được đăng ký hoạt động:

| Tên Topic Kafka        | Dịch vụ phát tin (Producer) | Dịch vụ nhận tin (Consumer)                                                 | Nguyên tắc áp dụng | Nội dung gói tin chính             |
| :--------------------- | :-------------------------- | :-------------------------------------------------------------------------- | :----------------- | :--------------------------------- |
| `order.confirmed`      | Order Service               | Kitchen Service                                                             | P1, P2             | `{ tenantId, orderId, items[] }`   |
| `order.status_changed` | Order Service               | Không có consumer chạy thực tế; dùng cho lưu trữ vết trạng thái / kiểm toán | P4                 | `{ tenantId, orderId, toStatus }`  |
| `payment.completed`    | Payment Service             | Order Service, BFF WS Bridge                                                | P1, P2, P3         | `{ tenantId, billId, method }`     |
| `kitchen.sla_warning`  | Kitchen Service             | BFF WS Bridge                                                               | P2                 | `{ tenantId, ticketId, waitTime }` |
| `tenant.created`       | SaaS Mgmt Service           | Catalog Service                                                             | P1, P3             | `{ tenantId, ownerEmail, slug }`   |

> _Lưu ý quan trọng:_ Các sự kiện mang tính chất tương tác giao diện tạm thời như: tạo giỏ hàng mới `order.created`, thêm bớt món `cart.updated`, nhấn nút gọi thanh toán `bill.requested`, thao tác chuyển bàn `table.transferred`, gọi phục vụ `service.requested`, thay đổi hàng đợi chế biến `kds.queue_changed`, hoặc tạm ngưng hoạt động cửa hàng `tenant.suspended/activated/closed` tuyệt đối KHÔNG được gửi qua hàng đợi Kafka để tránh gây quá tải hạ tầng — các sự kiện này được xử lý bằng cơ chế BFF Direct hoặc cơ chế phát tin trực tiếp của Socket.io sau khi dữ liệu nguồn đã được commit thành công (xem §7.3). Sự kiện `order.status_changed` là một ngoại lệ: nó được lưu vào bảng outbox của Order phục vụ lưu vết dữ liệu lâu dài, trong khi phản hồi cập nhật tức thời lên màn hình khách vẫn được gửi qua BFF Direct sau khi có kết quả TCP.

### 7.3 Cơ chế xử lý sự kiện trực tiếp tại BFF (BFF Direct Side-Effects Pattern)

Đối với các sự kiện chỉ cần tác động lên tầng hiển thị của người dùng (như phát WebSocket, xóa cache màn hình) mà không cần xử lý thêm các logic nghiệp vụ phức tạp ở các service khác, BFF sẽ thực hiện phát tin trực tiếp ngay sau khi nhận được phản hồi thành công từ lệnh gọi TCP — lược bỏ hoàn toàn bước gửi tin trung gian qua broker Kafka:

```
Luồng xử lý tại BFF Controller (Pseudo-code):
  const response = await this.client.send(TCP_PATTERN, payload);
  if (response.success) {
    // Tác vụ phụ 1: Phát WebSocket đến phòng tương ứng
    this.wsGateway.emitToRoom(room, event, data);

    // Tác vụ phụ 2: Xóa bộ nhớ đệm cache nếu cần
    await this.cacheManager.del(cacheKey);
  }
  return response;
```

| Sự kiện kích hoạt (TCP response tại BFF) | Phòng nhận WebSocket (Room)                     | Hành động trên bộ nhớ đệm Cache       |
| :--------------------------------------- | :---------------------------------------------- | :------------------------------------ |
| Tạo đơn đặt món mới                      | `tenant:{tid}:staff`                            | —                                     |
| Thay đổi trạng thái đơn hàng             | `tenant:{tid}:staff`, `session:{sid}:customer`  | —                                     |
| Giỏ hàng cập nhật / Có xung đột          | `session:{sid}:customer`                        | —                                     |
| Yêu cầu thanh toán hóa đơn               | `tenant:{tid}:staff`, `session:{sid}:customer`  | —                                     |
| Thực hiện chuyển bàn ăn                  | `tenant:{tid}:staff`, `session:{sid}:customer`  | —                                     |
| Sửa đổi danh mục thực đơn                | `tenant:{tid}:*` (phát cho tất cả khách)        | `DEL menu:{tid}` (Xóa cache thực đơn) |
| Cập nhật trạng thái bàn ăn               | `tenant:{tid}:staff`                            | `SET table:{tid}:{id}:status`         |
| Đầu bếp báo chế biến xong món            | `tenant:{tid}:staff` + `session:{sid}:customer` | —                                     |
| Khách bấm nút gọi phục vụ                | `tenant:{tid}:staff`                            | —                                     |
| Tạm ngưng hoạt động cửa hàng             | —                                               | `SET tenant:{tenantId}:suspended`     |

**Lý do thiết kế (Nguyên tắc AP1):** BFF đóng vai trò là cổng API Gateway duy nhất quản lý các kết nối client. Khi BFF gọi dịch vụ nghiệp vụ qua TCP và nhận phản hồi thành công, nó đã sở hữu đầy đủ dữ liệu để cập nhật giao diện. Việc bắt buộc gửi tin qua hàng đợi Kafka chỉ để phục vụ cho các thông báo giao diện tức thời là một phản mẫu kiến trúc (anti-pattern AP1) — làm tăng độ trễ truyền tin, tăng độ phức tạp mã nguồn và tiêu tốn tài nguyên hạ tầng vô ích mà không giải quyết bất kỳ bài toán nghiệp vụ cốt lõi nào.

### 7.4 Khung quyết định giao tiếp bất đồng bộ (Nguyên tắc 4P + 2AP)

Bộ quy chuẩn giúp kỹ sư quyết định khi nào cần sử dụng Broker sự kiện Kafka, khi nào gọi đồng bộ qua TCP/gRPC và khi nào áp dụng cơ chế phát trực tiếp BFF Direct.

#### Các trường hợp NÊN sử dụng Kafka (Inclusion Principles)

- **P1 — Phản hồi nghiệp vụ chéo Domain (Cross-Context Domain Reaction):**
  Sử dụng Kafka khi một trạng thái thay đổi ở Domain A cần kích hoạt một **luồng xử lý nghiệp vụ độc lập** ở Domain B. Lưu ý "luồng xử lý nghiệp vụ" hoàn toàn khác với các tác vụ hiển thị giao diện. Quy tắc này áp dụng không phụ thuộc vào số lượng dịch vụ nhận tin.
- **P2 — Tách biệt thời gian xử lý (Temporal Decoupling):**
  Sử dụng Kafka khi dịch vụ gửi tin **không cần chờ kết quả xử lý** từ dịch vụ nhận — do tác vụ ở dịch vụ nhận tốn nhiều thời gian, dịch vụ nhận có thể tạm thời ngoại tuyến, hoặc đây là sự kiện được kích hoạt tự động theo chu kỳ thời gian (timer/cron) không gắn với bất kỳ luồng HTTP request nào của người dùng.
- **P3 — Phân phối tin đa hướng (Domain Event Fan-out):**
  Sử dụng Kafka khi một sự kiện phát ra cần được tiếp nhận và xử lý bởi **nhiều microservices khác nhau cùng lúc**. Giúp dịch vụ phát tin tuân thủ nguyên tắc đóng/mở (Open/Closed Principle) — khi thêm dịch vụ nhận tin mới, tuyệt đối không cần sửa đổi mã nguồn của dịch vụ phát.
- **P4 — Đảm bảo tính toàn vẹn giao dịch DB (Transactional Outbox):**
  Khi một sự kiện nghiệp vụ phát ra là kết quả của việc ghi dữ liệu vào database, sự kiện đó **BẮT BUỘC** phải được ghi vào bảng outbox nằm chung trong transaction ghi database của dịch vụ (Outbox Pattern) để tránh lỗi ghi một nơi nhưng phát thất bại (Dual-Write Problem). Một tiến trình chạy ngầm sẽ quét bảng outbox này để phát lên hệ thống Kafka.
  > _Hiện trạng triển khai:_ Sự kiện `order.confirmed` và `order.status_changed` đã được áp dụng bảng dữ liệu `outbox_events` của Order DB trước khi phát lên Kafka. Việc nâng cấp lên hệ thống quét tự động CDC / Debezium chuyên nghiệp được để lại ở các giai đoạn nâng cấp vận hành sau này, không nằm trong phạm vi đồ án.

#### Các trường hợp KHÔNG ĐƯỢC phép sử dụng Kafka (Exclusion Anti-patterns)

- **AP1 — Sử dụng Kafka làm Proxy đẩy tin giao diện (Kafka as UI Proxy - CẤM):**
  TUYỆT ĐỐI KHÔNG sử dụng Kafka làm trung gian chuyển tin chỉ để phục vụ cho các thông báo giao diện hoặc xóa cache màn hình khi BFF đã nhận được phản hồi trực tiếp từ lệnh gọi TCP của dịch vụ nguồn. Câu hỏi kiểm tra: _"Hành động này có kích hoạt logic nghiệp vụ lưu DB ở dịch vụ khác không?"_ → Không → Chọn luồng phát trực tiếp BFF Direct.
- **AP2 — Sử dụng kết nối đồng bộ cho tác vụ chạy ngầm (CẤM):**
  TUYỆT ĐỐI KHÔNG sử dụng giao thức gọi TCP/gRPC đồng bộ cho các hành động mà dịch vụ gửi không cần quan tâm kết quả phản hồi, đặc biệt là các hành động tốn thời gian xử lý hoặc dịch vụ nhận đang ngoại tuyến.

#### Sơ đồ quyết định phương thức giao tiếp

```
Sự kiện cần xử lý?
  │
  ├─ Dịch vụ nhận có cần thực thi NGHIỆP VỤ LƯU TRỮ/LÝ THUYẾT ở domain khác không?
  │   ├─ CÓ → Chọn Kafka (Nguyên tắc P1)
  │   │   ├─ Có nhiều dịch vụ cùng nhận tin không? → Chọn Kafka (Nguyên tắc P3)
  │   │   └─ Yêu cầu đồng bộ ghi DB và phát tin an toàn? → Chọn Outbox Pattern (Nguyên tắc P4)
  │   └─ KHÔNG → Chỉ phục vụ hiển thị màn hình hoặc xóa cache
  │       ├─ BFF đã nhận được thông tin từ kết quả gọi TCP? → BFF Direct (AP1 cấm Kafka)
  │       └─ Sự kiện sinh ra tự động từ hệ thống (hết giờ, timer)? → Chọn Kafka (Nguyên tắc P2)
  │
  └─ Dịch vụ gửi có bắt buộc phải chờ kết quả từ dịch vụ nhận để trả về Client không?
        ├─ CÓ → Gọi đồng bộ TCP/gRPC
        └─ KHÔNG, và tác vụ của dịch vụ nhận xử lý tốn thời gian → Chọn Kafka (P2, AP2 cấm TCP đồng bộ)
```

---

## 8. XÁC THỰC & PHÂN QUYỀN (AUTHENTICATION & AUTHORIZATION)

### 8.1 Chiến lược xác thực song song

Hệ thống duy trì song song 2 luồng xác thực độc lập:

#### 8.1.1 Phân biệt rõ Định danh tài khoản (Identity) và Hồ sơ nhân viên (User Profile)

Hệ thống chia làm 2 tầng xử lý để tránh lỗi cấu hình nhầm lẫn khi phân quyền:

1. **Tầng Định danh tài khoản (Identity Layer - Quản lý bởi Keycloak):**
   - Chịu trách nhiệm xác thực mật khẩu/tài khoản, cấp mã token JWT, quản lý phân nhóm vai trò hệ thống (realm/client roles).
   - Đóng gói các thông tin cơ bản trong token: mã định danh người dùng `sub`, `email`, `tenant_id`.

2. **Tầng Hồ sơ nhân viên (Application Profile Layer - Quản lý bởi User-Access DB):**
   - Lưu giữ hồ sơ làm việc nội bộ của nhà hàng, phân công chi nhánh hoạt động, phân chi tiết quyền hạn nghiệp vụ cụ thể.
   - Dùng để kiểm tra quyền truy cập vào các API nghiệp vụ sau khi token JWT được xác nhận là hợp lệ.

**Quy tắc kiểm tra cốt lõi:**

- Token JWT hợp lệ chỉ là **điều kiện cần**.
- Hồ sơ nhân sự được cấu hình đầy đủ trong cơ sở dữ liệu của User-Access là **điều kiện đủ**.
- Nếu token gửi lên hợp lệ nhưng hệ thống không tìm thấy hồ sơ nhân sự nội bộ tương ứng → lập tức từ chối và trả về mã lỗi: `401 user_not_provisioned`.

```
┌────────────────────────────────────────────────────────┐
│  LUỒNG 1: Xác thực JWT (Nhân viên / Chủ quán / Admin)  │
│                                                        │
│  Client gửi kèm Header: Authorization: Bearer <JWT>    │
│  BFF thực thi UserGuard:                               │
│    1. Trích xuất mã token từ header                    │
│    2. Kiểm tra cache Redis: user-token:{sha256(token)} │
│       → Nếu HIT: Trả về thông tin tài khoản từ cache   │
│       → Nếu MISS:                                      │
│         3. Gọi gRPC → Authorizer Service → Keycloak    │
│         4. Lưu kết quả xác thực vào Redis (TTL: 30 phút)│
│    5. Thực thi TenantGuard: trích xuất tenant_id từ JWT│
│    6. Thực thi PermissionGuard: đối chiếu quyền với API│
│    7. Gắn { userId, tenantId, role } vào Request Ctx   │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  LUỒNG 2: Xác thực Session (Khách hàng vãng lai)       │
│                                                        │
│  Client gửi kèm Cookie: session_id + URL chứa QR token │
│  BFF thực thi SessionGuard:                            │
│    1. Xác thực chữ ký QR: verify(table_id, token, sk)  │
│    2. Xác định tenant_id tương ứng từ thông tin bàn ăn │
│    3. Tìm kiếm/Tạo mới Session tại bộ nhớ Redis:      │
│       session:{tenant_id}:{session_id}                 │
│    4. Kiểm tra session.table_id khớp với bàn đang quét │
│    5. Gắn { sessionId, tenantId, tableId } vào Ctx     │
│                                                        │
│ ⚠ Hoàn toàn không gọi Keycloak — Tối ưu tốc độ tối đa │
└────────────────────────────────────────────────────────┘
```

#### 8.1.2 Ứng dụng Quản trị (Next.js): Điều hướng màn hình vs Bảo mật API thực tế

Ứng dụng `management-app` áp dụng **Next.js Middleware kết hợp cấu trúc thanh menu** theo **vai trò tài khoản** (Owner, MANAGER, WAITER...) để ẩn/hiển thị các màn hình và chức năng tương ứng nhằm tối ưu hóa trải nghiệm người dùng (UX). Cơ chế này **không thay thế** cho các bộ lọc bảo mật `PermissionGuard` đặt tại BFF: mọi lệnh ghi/đọc dữ liệu nhạy cảm gửi lên Backend bắt buộc phải chạy qua lớp xác thực quyền hạn trên BFF để đảm bảo an toàn, phòng ngừa trường hợp người dùng cố tình gọi trực tiếp API thô. Chi tiết ma trận bảo mật tại [permission-matrix.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/architecture/permission-matrix.md) §9.

### 8.2 Kiến trúc các tầng lọc bảo mật (Guard Chain)

#### 8.2.1 Phân loại mã lỗi xác thực bảo mật (Auth Error Taxonomy)

Để hỗ trợ theo dõi chỉ số lỗi và debug hệ thống hiệu quả, toàn bộ mã lỗi trả về liên quan đến bảo mật được phân làm 4 nhóm chính:

1. `401 invalid_token`
   - Token gửi lên bị sai cấu trúc, sai chữ ký xác thực, hết hạn sử dụng hoặc Keycloak từ chối xác nhận.
2. `401 user_not_provisioned`
   - Mã token JWT gửi lên hoàn toàn hợp lệ nhưng mã người dùng (`sub`) chưa được đăng ký/khởi tạo hồ sơ nhân viên trong cơ sở dữ liệu của User-Access DB.
3. `403 permission_denied`
   - Tài khoản đã đăng nhập hợp lệ và có hồ sơ hoạt động, nhưng không có đủ mã quyền hạn (permission) để thực thi API yêu cầu.
4. `403 plan_feature_required`
   - Tài khoản đã vượt qua bước xác thực quyền hạn thông thường, nhưng gói dịch vụ của nhà hàng hiện tại (SaaS Plan) không bao gồm tính năng yêu cầu của API này.

```
Mã yêu cầu gửi lên (Request)
  │
  ▼
[UserGuard / SessionGuard] ← Xác thực danh tính: "Bạn là ai?"
  │
  ▼
[TenantGuard] ← Xác định ranh giới: "Bạn thuộc nhà hàng nào?"
  │
  ▼
[PermissionGuard] ← Xác thực quyền hạn: "Bạn có quyền thực hiện hành động này không?"
  │
  ▼
[TenantSubscriptionContextGuard] ← Trích xuất gói cước: "Gói cước của quán đang là gói nào?"
  │
  ▼
[PlanFeatureGuard] ← Kiểm tra tính năng gói: "Gói cước này có mở khóa tính năng này không?"
  │
  ▼
Chuyển tiếp Controller → Service → Repository (Tự động áp dụng lọc WHERE tenant_id)
```

### 8.3 Cấu trúc dữ liệu mã hóa JWT Custom Claims của Keycloak

```json
{
  "sub": "user-uuid-123",
  "email": "owner@restaurant.com",
  "realm_access": {
    "roles": ["OWNER"]
  },
  "tenant_id": "t-001",
  "sub_role": null,
  "iat": 1707500000,
  "exp": 1707503600
}
```

Việc tích hợp trường dữ liệu `tenant_id` và `sub_role` vào token được cấu hình thông qua tính năng **Protocol Mapper** của Keycloak (chọn kiểu ánh xạ: User Attribute → Token Claim).

### 8.4 Bảng tổng hợp phân quyền các API chính

| Nhóm API định dạng               | Super Admin | Owner/Manager |   Phục Vụ    | Bếp/Bar | Khách Hàng |
| :------------------------------- | :---------: | :-----------: | :----------: | :-----: | :--------: |
| `POST /admin/tenants`            |     ✅      |      ❌       |      ❌      |   ❌    |     ❌     |
| `GET /admin/analytics`           |     ✅      |      ❌       |      ❌      |   ❌    |     ❌     |
| `GET /dashboard/reports/*`       |     ❌      | ✅ (Theo gói) |      ❌      |   ❌    |     ❌     |
| `CRUD /restaurant/menu`          |  🔍 Debug   |      ✅       |      ❌      |   ❌    |     ❌     |
| `CRUD /restaurant/tables`        |     ❌      |      ✅       | 👁️ (Chỉ xem) |   ❌    |     ❌     |
| `POST /orders/confirm`           |     ❌      |      ✅       |      ✅      |   ❌    |     ❌     |
| `PATCH /kds/tickets/:id`         |     ❌      |      ✅       |      ❌      |   ✅    |     ❌     |
| `POST /orders` (gửi đơn)         |     ❌      |      ❌       |      ❌      |   ❌    |     ✅     |
| `POST /payment/request-bill`     |     ❌      |      ❌       |      ❌      |   ❌    |     ✅     |
| `POST /payment/confirm-cash`     |     ❌      |      ✅       |      ✅      |   ❌    |     ❌     |
| `GET /menu` (Thực đơn công khai) |     ❌      |      ✅       |      ✅      |   ❌    |     ✅     |

---

## 9. THỜI GIAN THỰC & WEBSOCKET

### 9.1 Kiến trúc kết nối WebSocket Gateway

```
┌────────────────────────────────────────────────────────┐
│                     BFF Service                        │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │         @WebSocketGateway (Socket.io)            │  │
│  │                                                  │  │
│  │  Xác thực kết nối đầu vào:                        │  │
│  │    → Đọc Token JWT đối với nhân viên (Staff/Owner)│  │
│  │    → Đọc Session Cookie đối với Khách hàng        │  │
│  │                                                  │  │
│  │  Phân bổ phòng nhận tin khi kết nối thành công:  │  │
│  │    Nhân viên POS   → tenant:{tid}:staff          │  │
│  │    Bếp chế biến    → tenant:{tid}:kds:kitchen    │  │
│  │    Quầy pha chế    → tenant:{tid}:kds:bar        │  │
│  │    Nhân viên chạy  → tenant:{tid}:staff          │  │
│  │    Chủ cửa hàng    → tenant:{tid}:management     │  │
│  │    Khách tại bàn   → session:{sid}:customer      │  │
│  └──────────────────────────────────────────────────┘  │
│            │                                           │
│            ├─ Cầu chuyển tiếp sự kiện từ Kafka:        │
│            │                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  kitchen.sla_warning → gửi tenant:{tid}:mgmt     │  │
│  │  payment.completed   → gửi session:{sid}:cust    │  │
│  │  (luồng bridge đang nâng cấp; hiện tại dùng polling)│  │
│  └──────────────────────────────────────────────────┘  │
│            │                                           │
│            ├─ Tín hiệu cập nhật từ Bếp (Redis hint):   │
│            │  kds.queue_changed → tenant:{tid}:kds:*   │
│            │                                           │
│            └─ Luồng BFF Direct (phát sau khi gọi TCP): │
│  ┌──────────────────────────────────────────────────┐  │
│  │  order.created       → gửi tenant:{tid}:staff    │  │
│  │  kitchen.item_ready  → gửi tenant:{tid}:staff    │  │
│  │  table.status_chg    → gửi tenant:{tid}:staff    │  │
│  │  service.requested   → gửi tenant:{tid}:staff    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 9.2 Các trường hợp tương tác thời gian thực chính

| Tên sự nghiệp vụ           | Nguồn phát                                                               | Tên Event phát         | Phòng nhận (Room)         | Nội dung gói tin chính                            |
| :------------------------- | :----------------------------------------------------------------------- | :--------------------- | :------------------------ | :------------------------------------------------ |
| Có đơn hàng mới            | BFF Direct                                                               | `order.created`        | `tenant:{tid}:staff`      | `{ tableId, items, total }`                       |
| Theo dõi đơn hàng (Khách)  | BFF Direct sau khi Order TCP trả kết quả                                 | `order.status_changed` | `session:{sid}:customer`  | `{ orderId, status: "Processing" }`               |
| Thay đổi hàng đợi KDS      | Tín hiệu từ bếp gửi qua BFF                                              | `kds.queue_changed`    | `tenant:{tid}:kds:*`      | `{ station, revision, reason }`                   |
| Món nấu xong báo phục vụ   | BFF Direct                                                               | `kitchen.item_ready`   | `tenant:{tid}:staff`      | `{ tableId, itemName: "Phở bò" }`                 |
| Xóa cache thực đơn         | Luồng ghi BFF/Catalog                                                    | Không phát WS          | —                         | Phía client tự động refetch theo vòng đời dữ liệu |
| Cập nhật trạng thái bàn ăn | BFF Direct                                                               | `table.status_chg`     | `tenant:{tid}:staff`      | `{ tableId, status: "Billing" }`                  |
| Khách thanh toán xong      | Sự kiện Kafka `payment.completed` → BFF WS Bridge; dùng polling dự phòng | `payment.completed`    | `session:{sid}:customer`  | `{ status: "Paid", receipt_url }`                 |
| Cảnh báo chế biến trễ SLA  | Sự kiện Kafka → BFF                                                      | `kitchen.sla_warning`  | `tenant:{tid}:management` | `{ ticketId, waitingMin: 18 }`                    |
| Khách nhấn nút gọi phục vụ | BFF Direct                                                               | `service.requested`    | `tenant:{tid}:staff`      | `{ tableId, type: "CALL_STAFF" }`                 |

### 9.3 Phương án mở rộng (Scaling)

Khi cần nâng cấp mở rộng nhiều server BFF chạy song song, sử dụng **Redis Adapter** của Socket.io để đồng bộ các gói tin phát chéo máy chủ:

```
Thiết bị khách A ──→ Máy chủ BFF 1 ──→ Redis Pub/Sub ──→ Máy chủ BFF 2 ──→ Thiết bị khách B
                                           ▲
                             Đồng bộ các phòng giữa các server
```

---

## 10. TÍCH HỢP THANH TOÁN

> **Quyết định thiết kế (ADR 05-2026):** Hệ thống tích hợp cổng **SePay + VietQR** thay vì Stripe để phù hợp tối đa với đặc thù thanh toán tại thị trường Việt Nam. Lược bỏ luồng chuyển hướng trang thanh toán (redirect) — hiển thị trực tiếp mã QR động cho khách quét ngay trên màn hình PWA đặt món hoặc màn hình POS bán hàng.

### 10.1 Luồng thanh toán chuyển khoản VietQR tự động

```
┌──────┐      ┌───┐      ┌─────────┐      ┌───────┐      ┌──────┐
│ POS  │      │BFF│      │ Payment │      │ SePay │      │Order │
│Client│      │   │      │ Service │      │Webhook│      │ Svc  │
└──┬───┘      └─┬─┘      └────┬────┘      └───┬───┘      └──┬───┘
   │ Yêu cầu    │             │               │             │
   │ tạo VietQR │             │               │             │
   ├───────────►│    TCP      │               │             │
   │            ├────────────►│ Tạo link QR   │             │
   │            │             │ (qr.sepay.vn) │             │
   │            │◄────────────┤ Trả qrUrl+meta│             │
   │◄───────────┤             │               │             │
   │ Hiển thị   │             │               │             │
   │ QR inline  │             │               │             │
   │            │             │   POST /webhook             │
   │            │◄────────────┼───────────────┤             │
   │            │ chứa signature & x-secret   │             │
   │            │    TCP      │               │             │
   │            ├────────────►│ Xác thực ký   │             │
   │            │             │ Khớp mã ref   │             │
   │            │             │ Ghi nhận PAID │    TCP      │
   │            │             ├───────────────┼────────────►│
   │            │             │ (cập nhật nhanh bàn ăn)     │
   │            │             │ Outbox → Kafka: completed   │
   │            │             │ (đồng bộ dự phòng các bên)  │
   │ POS kéo tin│             │               │             │
   │ (Polling)  │             │               │             │
   │◄──refetch──┤             │               │             │
```

> _Lưu ý giai đoạn Phase 3:_ Trạng thái thanh toán của hóa đơn trên ứng dụng POS/PWA chủ yếu được cập nhật qua cơ chế **kéo dữ liệu định kỳ (polling)** từ client; luồng đẩy thời gian thực qua WebSocket kết nối Kafka→BFF đóng vai trò bổ trợ cập nhật giao diện nhanh hơn sau khi dữ liệu cốt lõi đã chạy đúng. Chi tiết xem tại [phase-3-payment.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/phases/phase-3-payment.md).

### 10.2 Luồng thanh toán bằng Tiền mặt

1. Khách hàng nhấn nút "Thanh toán" trên giao diện → Trạng thái bàn ăn đổi sang `Billing`.
2. Nhân viên phục vụ xem hóa đơn trên màn hình POS → Kiểm tra tổng tiền cần thu.
3. Nhân viên nhập số tiền khách đưa → Hệ thống tự động tính tiền thừa thối lại.
4. Nhân viên bấm xác nhận "Xác nhận đã thu tiền".
5. Payment service: Ghi nhận giao dịch `{ method: "CASH", amount, received, change }`.
6. Thực hiện tương tự luồng VietQR: trong một transaction DB, lưu thanh toán PAID + ghi outbox; sau khi commit thành công phát sự kiện Kafka `payment.completed`. Order service (qua consumer nhận tin hoặc qua luồng TCP gọi trực tiếp) thực hiện đánh dấu hóa đơn PAID và chuyển trạng thái bàn ăn từ `Billing` → `Cleaning` để nhân viên dọn bàn — tuyệt đối không coi Payment service là nơi tự ý giải phóng session bàn ăn trực tiếp (xem D1, D4).

### 10.3 Các tham số cấu hình thanh toán SePay

```yaml
Biến môi trường hệ thống:
  SEPAY_WEBHOOK_SECRET: "your_secret_key"             # Khóa bí mật dùng cho luồng webhook trực tiếp Phase 3
  SEPAY_PLATFORM_WEBHOOK_SECRET: "your_platform_secret" # Khóa bí mật nhận webhook subscription platform (QRSUB)
  BFF_PAYMENT_TCP_TIMEOUT_MS: 5000                     # Thời gian chờ của BFF khi gọi Payment service qua TCP
  PAYMENT_SEPAY_QR_ACCOUNT: "0010000000355"           # Số tài khoản ngân hàng nhận tiền demo
  PAYMENT_SEPAY_QR_BANK: "Vietcombank"                 # Tên ngân hàng nhận tiền demo
  PAYMENT_ORDER_TCP_TIMEOUT_MS: 5000                   # Thời gian chờ của Payment khi gọi Order service qua TCP
  BILL_REF_PREFIX: "QRTBL"                            # Tiền tố nhận diện hóa đơn trong nội dung chuyển khoản
  PAYMENT_TYPEORM_DATABASE: "qrtable_payment"          # Tên database chạy chính thức; mặc định khi chạy dev

Đường dẫn nhận Webhook (Cấu hình trên trang quản trị SePay):
  POST https://{tên-miền-bff}/api/v1/payment/sepay/webhook
  Loại xác thực: Tùy thuộc vào route gọi nhận tin
  Loại sự kiện: In_only (Chỉ nhận tin tiền vào)
  Tự động xác thực giao dịch: Có (is_verify_payment: 1)

Quy trình xác thực Webhook:
  - Đối với route gọi trực tiếp Phase 3:
    BFF thực hiện giải mã signature kiểm toán qua `X-SePay-Signature` + `X-SePay-Timestamp` dựa trên chuỗi mã hóa `{timestamp}.{rawBody}` sử dụng khóa bí mật SEPAY_WEBHOOK_SECRET.
  - Đối với route phân định theo tenant của Phase 4B:
    BFF định tuyến webhook kèm mã `x-secret-key` xuống Payment service, Payment kiểm toán dựa trên khóa bí mật đã mã hóa lưu tại bảng `tenant_payment_settings.webhook_secret_encrypted` của đúng tenant đó.
  - Đối với route platform hóa đơn cước phí:
    BFF chuyển tiếp webhook kèm mã `x-secret-key` xuống SaaS service để đối chiếu với cấu hình SEPAY_PLATFORM_WEBHOOK_SECRET của hệ thống.
  - Khi xử lý thành công, trả về cấu hình JSON thô cho SePay nhận biết, tuyệt đối không bọc qua lớp định dạng ResponseDto của API:
    return {"success": true}

Định dạng URL tạo ảnh QR VietQR:
  https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}&amount={rounded_total}&des={QRTBL + 8 ký tự đầu của billId bỏ gạch ngang (UUID)}
```

---

## 11. CHIẾN LƯỢC CACHING

### 11.1 Các lớp dữ liệu lưu Cache

| Tên lớp dữ liệu     | Định dạng Key trên Redis              | Dữ liệu lưu trữ                                   | Thời gian TTL   | Cơ chế xóa cache (Invalidation)                          |
| :------------------ | :------------------------------------ | :------------------------------------------------ | :-------------- | :------------------------------------------------------- |
| **Token Cache**     | `user-token:{sha256(jwt)}`            | Thông tin giải mã token + danh sách quyền         | 30 phút         | Token hết hạn sử dụng / Nhân viên bấm đăng xuất          |
| **Menu Cache**      | `menu:{tenant_id}`                    | Chuỗi JSON chứa toàn bộ thực đơn của quán         | 10 phút         | Tự động xóa khi Owner có thao tác thay đổi thực đơn      |
| **Trạng thái bàn**  | `table:{tenant_id}:{table_id}:status` | Trạng thái hiện tại của bàn ăn (Enum)             | Vô hạn          | Xóa và cập nhật lại khi có sự kiện đổi trạng thái bàn    |
| **Session Bàn**     | `session:{tenant_id}:{session_id}`    | Các thông tin cơ bản về lượt khách đang ngồi bàn  | 2 giờ           | Khách tính tiền xong / Hết thời gian chờ (idle timeout)  |
| **Giỏ hàng tạm**    | `cart:{tenant_id}:{session_id}`       | Dữ liệu món ăn khách đã thêm vào giỏ hàng         | 2 giờ           | Tự động hết hạn theo session bàn / Xóa khi đặt món       |
| **Rate Limit**      | `rl:{endpoint}:{ip/token}`            | Số lượt truy cập của IP trong khung thời gian     | Theo khung giây | Tự động hết hạn khi qua khung thời gian                  |
| **KDS Queue**       | `kds:{tenant_id}:{station}`           | Danh sách các thẻ món chờ làm (Sorted Set)        | Vô hạn          | Xóa bản ghi thẻ khi bếp báo làm xong món ăn              |
| **Khóa tạm Tenant** | `tenant:{tenantId}:suspended`         | Cờ đánh dấu nhà hàng bị tạm ngưng hoạt động       | Vô hạn          | Xóa cờ khi Super Admin kích hoạt lại cửa hàng            |
| **Gói dịch vụ**     | `subscription:{tenantId}`             | Snapshot thông tin gói cước và hạn ngạch của quán | 5 phút          | Xóa cache khi có thao tác gia hạn hoặc thay đổi gói cước |
| **OAuth State**     | `oauth_state:{state}`                 | Lưu trữ mã state ngẫu nhiên chống giả mạo CSRF    | 5 phút          | Xóa ngay sau khi SePay callback thực hiện xác thực xong  |

### 11.2 Chính sách cấp quyền kết nối Redis

Hệ thống quản lý chặt chẽ việc kết nối và sử dụng tài nguyên Redis thông qua **mô hình phân tầng truy cập (Tiered Access)**. Không phải microservice nào cũng được quyền kết nối vào Redis — chỉ những dịch vụ có nghiệp vụ đặc thù về giỏ hàng tạm, hàng đợi bếp hay dữ liệu nóng mới được cấp phép:

| Microservice        | Giai đoạn | Nhiệm vụ chính tương tác với Redis                                                                            | Các định dạng Key tương tác                                         |
| :------------------ | :-------- | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------ |
| **BFF**             | Phase 0   | Lưu cache xác thực token, cache thực đơn, lưu bộ đếm rate limit, kiểm tra session khách và đọc cờ khóa tenant | `user-token:*`, `menu:*`, `rl:*`, `session:*`, `tenant:*:suspended` |
| **Order Service**   | Phase 2A  | Quản lý thông tin session khách ngồi bàn, giỏ hàng dùng chung, lưu khóa idempotency key                       | `session:*`, `cart:*`, `idem:*`                                     |
| **Kitchen Service** | Phase 2B  | Quản lý hàng đợi chế biến KDS (Redis Sorted Set, không lưu PostgreSQL)                                        | `kds:*`, `lock:kds:*`, `realtime:kds:*`                             |
| **WebSocket GW**    | Phase 2B  | Kết nối qua Redis Adapter để đồng bộ WebSocket đa server                                                      | `socket.io-adapter:*`                                               |
| **SaaS Service**    | Phase 4B  | Ghi nhận cờ tạm ngưng hoạt động của tenant, lưu cache thông tin gói cước                                      | `tenant:*:suspended`, `subscription:*`                              |
| **Payment Service** | Phase 4B  | Lưu trữ bộ đếm state của SePay OAuth phục vụ liên kết ngân hàng                                               | `oauth_state:*`                                                     |

_Các dịch vụ không được phép kết nối Redis trong mã nguồn hiện tại:_ Catalog Service, Authorizer Service, User-Access Service. Nếu dịch vụ `Notification` được bổ sung ở giai đoạn sau, nó bắt buộc phải đăng ký quyền kết nối Redis riêng kèm lý do nghiệp vụ rõ ràng.

### 11.3 Luồng đọc ghi Cache (Mẫu luồng lấy thực đơn - Cache-Aside Pattern)

```
Khách gọi API: GET /menu?tenant_id=t-001

1. Kiểm tra trên Redis: GET menu:t-001
   → Nếu HIT: Trả dữ liệu JSON từ cache cho khách ngay lập tức (< 1ms)
   → Nếu MISS: Chuyển tiếp thực hiện bước 2

2. Truy vấn PostgreSQL: SELECT danh mục, món ăn WHERE tenant_id = 't-001'
3. Chuyển đổi dữ liệu sang chuỗi JSON
4. Ghi dữ liệu vào Redis: SET menu:t-001 với thời gian hết hạn TTL = 600 giây
5. Trả kết quả JSON cho khách

Khi Owner thay đổi thực đơn (sửa giá/báo hết món):
1. Ghi dữ liệu mới vào PostgreSQL
2. Gửi lệnh xóa cache trên Redis: DELETE menu:t-001 (invalidate cache)
3. Hệ thống hiện tại không phát sự kiện Kafka/WS báo thực đơn đổi; client tự động refetch theo chu kỳ thông thường.
```

---

## 12. XỬ LÝ GIAO DỊCH PHÂN TÁN (DISTRIBUTED TRANSACTION PROCESSING)

### 12.1 Quy trình điều phối Saga (Saga Pattern — Orchestration)

Áp dụng cho các luồng nghiệp vụ phức tạp đòi hỏi sự phối hợp ghi dữ liệu ở nhiều microservice khác nhau, đi kèm với cơ chế hoàn tác dữ liệu (compensation) khi xảy ra lỗi.

**Quy trình duyệt đơn đặt món (Order Confirmation Saga - Phase 4A):**

```
┌──────────────────────────────────────────────────────────┐
│                  ORDER CONFIRMATION SAGA                  │
│ ├────────────────────────────────────────────────────────┤
│                                                          │
│  Bộ điều phối: OrderConfirmSagaService (nằm ở Order Svc) │
│                                                          │
│  Bước 1: Khóa và cập nhật trạng thái đơn hàng (PENDING)   │
│          trong Order DB; yêu cầu hóa đơn bàn phải OPEN.  │
│                                                          │
│  Bước 2: Gọi TCP Catalog để giữ tồn kho phiên bản N      │
│          Key=confirm-order:{orderId}; payload mã hóa hash│
│    ✗ Lệnh bù đắp khi lỗi: giải phóng tồn kho phiên bản N │
│      Key=confirm-order-compensation:{orderId}:{N}        │
│                                                          │
│  Bước 3: Order DB thực hiện commit trạng thái PROCESSING, │
│          lưu mã phiên bản N và ghi outbox order.confirmed│
│                                                          │
│  Bước 4: Tiến trình outbox quét và phát tin Kafka        │
│          `order.confirmed` để Kitchen nhận đơn chế biến    │
│                                                          │
│  * Nếu Bước 3 thất bại sau khi Bước 2 đã chạy thành công  │
│    → Tự động kích hoạt lệnh bù đắp giải phóng kho ở bếp. │
└──────────────────────────────────────────────────────────┘
```

Quy trình đăng ký và kích hoạt cửa hàng (SaaS Onboarding Saga) là luồng Saga thứ hai của hệ thống. Lớp `OnboardingSagaService` chịu trách nhiệm điều phối việc tạo bản ghi tenant/subscription trên SaaS DB, tạo tài khoản Keycloak định danh cho Owner, khởi tạo thông tin hồ sơ nhân sự trên User-Access DB, lưu cấu hình Payment và phát sự kiện outbox `tenant.created`. Nếu một bước bất kỳ trong chuỗi bị lỗi, SaaS service tự động kích hoạt luồng hoàn tác: vô hiệu hóa tài khoản Owner vừa tạo trên Keycloak, xóa thông tin subscription đang tạo và thực hiện soft-delete thông tin tenant đã lưu.

Luồng xác nhận thanh toán hóa đơn hoàn tất hiện tại sử dụng cơ chế ghi nhận thanh toán + outbox sự kiện + cơ chế gọi lại idempotent để đóng hóa đơn. Luồng này chưa được thiết lập dạng Saga đầy đủ với các trạng thái trung gian phức tạp và lệnh hoàn tác cho từng kịch bản lỗi bàn ăn.

**Phương án kiểm thử và chứng minh (Saga Validation):** Việc xác thực tính chính xác của các luồng Saga được thực hiện đa tầng thay vì chỉ kiểm tra giao diện đơn thuần. Luồng xác nhận đơn hàng sử dụng các tập lệnh unit/contract test để kiểm tra logic điều phối và mọi trạng thái chuyển đổi giữ kho. Các bộ tích hợp kiểm thử trên PostgreSQL thực tế phối hợp Catalog TCP giúp chứng minh hệ thống xử lý đúng các trường hợp: trừ kho trùng lặp, xử lý khi mất kết nối phản hồi, cơ chế hoàn tác theo phiên bản, hết hạn mã giải phóng kho và xử lý tranh chấp khi hai đơn hàng cùng gọi một món tại một thời điểm. Quy trình onboarding cũng chạy các bộ kiểm thử unit/contract test để chứng minh luồng rollback tài khoản Keycloak mồ côi và tạo cấu hình thanh toán. Tài liệu hướng dẫn kiểm thử chi tiết tại [saga-validation-strategy.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/testing/saga-validation-strategy.md).

### 12.2 Tính chất Idempotency (Chống xử lý trùng lặp)

```yaml
Chiến lược thực hiện:
  - Khi khách gửi đơn đặt món: Đơn hàng bắt buộc đính kèm khóa idempotency_key dạng: {session_id}:{timestamp}:{hash_giỏ_hàng} để POS từ chối nếu bấm gửi nhiều lần.
  - Khi nhận webhook thanh toán: Sử dụng mã giao dịch của SePay (sepay_transaction_id) làm idempotency key tự nhiên để chặn xử lý trùng lặp giao dịch ngân hàng.
  - Khi nhận sự kiện Kafka: Các consumer lưu trữ offset và đối chiếu message key để chặn xử lý lại các sự kiện đã xử lý thành công.

Cách thức thực thi:
  - Phía Order Service: cấu hình cột idempotency_key là UNIQUE trong PostgreSQL để tự động báo lỗi khi chèn bản ghi trùng lặp.
  - Phía Catalog Service: lưu giữ thông tin giữ kho dự phòng gắn liền với cặp (tenant_id, order_id) đi kèm hash payload và mã phiên bản; việc gọi lại lệnh trừ kho hoặc lệnh giải phóng kho trùng mã sẽ trả về ngay kết quả cũ mà không thực hiện thay đổi lượng tồn kho thực tế.
  - Order Service lưu giữ mã phiên bản giữ tồn kho nhận được để gửi kèm trong các lệnh yêu cầu hoàn kho hoặc lệnh hủy đơn.
  - Khi gặp sự cố mất kết nối phản hồi từ TCP Catalog, hệ thống yêu cầu phía client thực hiện gửi lại đúng lệnh xác nhận ban đầu để phục hồi thông tin thông qua cơ chế lưu vết của Catalog; hệ thống không tự động dọn dẹp qua tiến trình chạy ngầm.
```

---

## 13. KHẢ NĂNG QUAN SÁT & GIÁM SÁT (OBSERVABILITY & MONITORING)

### 13.1 Ba trụ cột của khả năng quan sát hệ thống

```
┌──────────────────────────────────────────────────────────┐
│                   OBSERVABILITY STACK                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📋 QUẢN LÝ LOG (Loki + Promtail + Grafana)              │
│    • Đọc log trực tiếp từ Docker container qua Promtail  │
│    • Xuất log định dạng cấu trúc JSON (Pino Logger)     │
│    • Câu lệnh truy vấn LogQL: {service="order"} |= "ERROR"│
│    • Theo dõi luồng request qua Process ID chéo dịch vụ │
│                                                          │
│  📈 CHỈ SỐ METRICS (Prometheus + Grafana)                │
│    • Thống kê thời gian xử lý HTTP request, mã trạng thái│
│    • Theo dõi lượng tin tồn đọng (consumer lag) trên Kafka│
│    • Đo lường tỷ lệ hit/miss bộ nhớ đệm Redis            │
│    • Đếm số lượng kết nối WebSocket hoạt động theo tenant │
│    • Biểu đồ số lượng đơn đặt món trong ngày            │
│                                                          │
│  🔍 THEO DÕI VẾT TRACING (Tempo + OpenTelemetry)         │
│    • Lưu luồng đi của request từ lúc bắt đầu đến kết thúc│
│    • Truyền dẫn Context: BFF → TCP → Kafka → Consumer    │
│    • Đo lường thời gian xử lý tại từng microservice      │
│    • Phát hiện nhanh các điểm nghẽn cổ chai hệ thống     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Hệ thống giám sát vận hành thực tế được đóng gói thành một phân vùng Docker Compose riêng biệt. Prometheus thực hiện quét chỉ số các service dựa theo tên dịch vụ Docker trên mạng nội bộ `qrtable-data`, Promtail tự động gắn các nhãn chỉ định `service`, `container`, `project` và `environment` vào log thu thập được, và luồng tracing từ ứng dụng được truyền về Tempo qua cổng OTLP HTTP nội bộ. Toàn bộ các cổng dịch vụ Prometheus, Loki, Tempo đều được khóa không công khai ra ngoài internet; màn hình quản trị Grafana được bảo vệ an toàn phía sau proxy Caddy đi kèm chứng chỉ bảo mật HTTPS và yêu cầu đăng nhập tài khoản.

### 13.2 Các điểm kiểm tra tình trạng hoạt động (Health Checks)

Mỗi service đều công khai một đường dẫn endpoint kiểm tra sức khỏe hệ thống:

| Microservice    | Các tính năng kiểm tra sức khỏe thực tế                     |
| :-------------- | :---------------------------------------------------------- |
| **BFF**         | Kết nối Redis, kết nối đến các Client TCP khác              |
| **Authorizer**  | Kết nối đến Keycloak, cổng gRPC hoạt động                   |
| **Catalog**     | Kết nối PostgreSQL của Catalog                              |
| **Order**       | Kết nối PostgreSQL, kết nối Redis, trạng thái kết nối Kafka |
| **Kitchen**     | Kết nối Redis, trạng thái hàng đợi nhận tin Kafka           |
| **Payment**     | Kết nối PostgreSQL, Redis OAuth cache, cấu hình khóa SePay  |
| **SaaS Mgmt**   | Kết nối PostgreSQL, Redis cache kiểm soát gói dịch vụ       |
| **User-Access** | Kết nối MongoDB                                             |

### 13.3 Các quy tắc cảnh báo sự cố (Alerting Rules)

| Tên cảnh báo           | Điều kiện kích hoạt                             | Cấp độ cảnh báo     |
| :--------------------- | :---------------------------------------------- | :------------------ |
| Dịch vụ dừng hoạt động | Gọi kiểm tra sức khỏe thất bại > 3 lần liên tục | Nguy cấp (Critical) |
| Ứn ứ hàng đợi Kafka    | Chỉ số consumer lag vượt quá 1000 tin nhắn chờ  | Cảnh báo (Warning)  |
| Quá hạn chế biến KDS   | Món ăn trong hàng đợi chưa làm xong quá 20 phút | Cao (High)          |
| Tỷ lệ lỗi dịch vụ tăng | Tỷ lệ HTTP 5xx / tổng request vượt quá 5%       | Cao (High)          |
| Bộ nhớ Redis sắp đầy   | Tỷ lệ sử dụng bộ nhớ vượt quá 80% dung lượng    | Cảnh báo (Warning)  |

---

## 14. CHIẾN LƯỢC TRIEN KHAI

### 14.1 Sơ đồ phân chia Docker Compose

```yaml
# docker-compose.infra.yaml — Cơ sở dữ liệu và định danh tài khoản
services:
  postgres:     # PostgreSQL 16, kết nối mạng nội bộ qrtable-data
  mongodb:      # MongoDB 7, kết nối mạng nội bộ qrtable-data
  redis:        # Redis 7, kết nối mạng nội bộ qrtable-data
  kafka:        # Kafka KRaft, kết nối mạng nội bộ qrtable-data
  keycloak:     # Cổng HTTP 8080, mạng qrtable-identity + qrtable-data

# docker-compose.app.yaml — Các ứng dụng chính chạy hệ thống
services:
  production-bootstrap: # Khởi chạy một lần để migration DB, tạo topic Kafka, cấu hình Keycloak
  bff:            # Cổng HTTP 3300 — API Gateway + Socket.IO
  authorizer:     # Kết nối gRPC/TCP — Authorizer
  catalog:        # Kết nối TCP — Menu & Bàn ăn
  order:          # Kết nối TCP — Xử lý đơn hàng
  kitchen:        # Kết nối TCP — Quản lý bếp KDS
  payment:        # Kết nối TCP — Thanh toán & Webhook SePay
  saas:           # Kết nối TCP — Quản lý gói cước SaaS
  user-access:    # Kết nối TCP — Hồ sơ nhân viên
  management-app: # Cổng HTTP 3000 — Giao diện quản trị nhà hàng
  customer-pwa:   # Cổng HTTP 80 — Giao diện đặt món của khách

# docker-compose.monitoring.yaml — Hệ thống giám sát vận hành nội bộ
services:
  grafana:      # Cổng HTTP 3000, kết nối mạng qrtable-observability
  loki:         # Cổng HTTP 3100, bảo mật nội bộ
  promtail:     # Quét thu thập log của các Container Docker
  prometheus:   # Cổng HTTP 9090, bảo mật nội bộ
  tempo:        # Cổng HTTP 3200 / OTLP 4318, bảo mật nội bộ

# docker-compose.proxy.yaml — Container duy nhất công khai ra Internet
services:
  caddy:        # Mở cổng công khai 80/tcp, 443/tcp, 443/udp
```

Caddy kết nối vào các mạng ảo `qrtable-edge`, `qrtable-identity` và `qrtable-observability`, tuyệt đối không kết nối trực tiếp vào mạng cơ sở dữ liệu `qrtable-data`. Proxy thực hiện định tuyến các API và Socket.IO về cổng `bff:3300`, định tuyến hai ứng dụng Frontend theo tên dịch vụ tương ứng, chuyển hướng Keycloak về `keycloak:8080` và trỏ trang Grafana về `grafana:3000`. Caddy tự động quản lý và lưu trữ chứng chỉ HTTPS trong named volumes. Cổng quản trị Keycloak `9000`, Prometheus, Loki, Tempo và mọi database đều được bảo vệ trong mạng nội bộ.

Cấu hình máy chủ VPS tối thiểu đề xuất cho hệ thống hoạt động: 2 vCPU / 4 GiB RAM / 25 GB SSD đi kèm phân bổ 2-4 GiB bộ nhớ hoán đổi (swap). Container Kafka giới hạn dung lượng heap 512 MiB trong mức giới hạn ram 1 GiB của container, và Keycloak giới hạn heap 384 MiB trong mức giới hạn ram 768 MiB. Toàn bộ hình ảnh docker được build sẵn từ môi trường ngoài và đẩy lên registry; máy chủ VPS chỉ thực hiện pull các hình ảnh đã build sẵn, không thực hiện build trực tiếp để tránh quá tải CPU. Việc nâng cấp lên máy chủ 8 GiB RAM chỉ thực hiện khi có nhu cầu tải thực tế cao.

### 14.2 Quy trình Build & Chạy hệ thống

```bash
# Giai đoạn lập trình và chạy thử (Local Development)
pnpm nx serve bff              # Chạy thử 1 service chỉ định
pnpm nx run-many -t serve      # Kích hoạt toàn bộ hệ thống chạy thử
pnpm nx run-many -t test       # Chạy thử tất cả các bộ test tự động
pnpm nx run-many -t lint       # Quét chất lượng code toàn dự án
pnpm nx affected -t test       # Chỉ chạy test các phần có thay đổi code

# Quy trình Build Docker (Nên chạy ở máy local hoặc CI độc lập)
pnpm nx run-many -t build      # Build mã nguồn ứng dụng sang dạng đóng gói
docker compose -f docker-compose.infra.yaml up -d   # Kích hoạt hạ tầng cơ bản
docker compose -f docker-compose.monitoring.yaml up -d # Kích hoạt giám sát

# Triển khai hệ thống lên máy chủ Production
tools/deploy/phase7-preflight.sh                    # Kiểm tra cấu hình máy chủ, biến môi trường
pnpm deploy:bootstrap:compose                      # Chạy khởi tạo database, cấu hình Keycloak
docker compose -f docker-compose.app.yaml up -d    # Chạy các service ứng dụng
docker compose -f docker-compose.proxy.yaml up -d  # Mở cổng proxy Caddy kết nối ra ngoài
```

### 14.3 Phân chia cấu hình môi trường

| Khía cạnh hạ tầng      | Môi trường máy local     | Môi trường Staging       | Môi trường Production |
| :--------------------- | :----------------------- | :----------------------- | :-------------------- |
| **Cơ sở dữ liệu**      | Chạy Docker local        | Chạy Docker local        | Chạy Docker local     |
| **Hàng đợi Kafka**     | Chạy Docker local        | Chạy Docker local        | Chạy Docker local     |
| **Định danh**          | Chạy Keycloak local      | Chạy Keycloak local      | Chạy Keycloak local   |
| **Liên kết ngân hàng** | SePay Sandbox thử nghiệm | SePay Sandbox thử nghiệm | Tài khoản SePay thật  |
| **Hệ thống giám sát**  | Không bắt buộc           | Kích hoạt đầy đủ         | Kích hoạt đầy đủ      |

---

## 15. CÁC THÁCH THỨC KỸ THUẬT

### 15.1 Danh sách các bài toán khó & Phương án giải quyết

| #   | Thách thức kỹ thuật                                                                        | Phương án giải quyết                                                                                                             | Độ khó     |
| :-- | :----------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :--------- |
| 1   | **Đồng bộ thời gian thực đa client** (POS nhân viên, theo dõi đơn của khách, cập nhật KDS) | Sử dụng NestJS WebSocket Gateway kết hợp Socket.io, cập nhật qua cơ chế BFF Direct hoặc cơ chế Redis Pub/Sub chéo máy chủ.       | Cao        |
| 2   | **Cô lập dữ liệu nhà hàng SaaS**                                                           | Sử dụngDiscriminator Column `tenant_id` kết hợp TypeORM Subscriber tự động chèn trường và Middleware tự động chèn điều kiện lọc. | Cao        |
| 3   | **Tranh chấp dữ liệu giỏ hàng dùng chung**                                                 | Quản lý dữ liệu giỏ hàng tạm trên Redis Hash, áp dụng khóa phiên bản (Optimistic Concurrency) và cập nhật qua WebSocket.         | Trung bình |
| 4   | **Tranh chấp tồn kho món ăn khi đông khách**                                               | Catalog Service quản lý tập trung việc lock và trừ kho trong database; Order gọi TCP xác nhận và Catalog xử lý idempotent.       | Khá        |
| 5   | **Hàng đợi chế biến KDS ưu tiên & SLA**                                                    | Sử dụng Redis Sorted Set sắp xếp theo độ ưu tiên/thời gian, quản lý danh sách thẻ, quét quá hạn SLA qua tiến trình định kỳ.      | Trung bình |
| 6   | **Xác thực khách ẩn danh không gây phiền hà**                                              | Sử dụng Session lưu trữ trên Redis, mã hóa chữ ký HMAC trên link QR bàn ăn và tách chuỗi Guard xác thực riêng biệt.              | Trung bình |
| 7   | **Quản lý vòng đời Session bàn ăn**                                                        | Quản lý thời gian tồn tại session qua Redis TTL (2 giờ), tự động thu hồi session trống qua cron check `last_activity` (30 phút). | Trung bình |
| 8   | **Hỗ trợ đặt món ngoại tuyến (Offline)**                                                   | Sử dụng công nghệ Service Worker và hàng đợi IndexedDB, lưu khóa trùng lặp và giãn cách thời gian gửi lại khi có mạng.           | Cao        |
| 9   | **Giao dịch phân tán (Order Confirm Saga)**                                                | Áp dụng mô hình Saga Orchestration phối hợp các bước nghiệp vụ, có quy trình bù đắp hoàn kho và xử lý trùng lặp idempotent.      | Trung bình |
| 10  | **Phân quyền tính năng theo gói cước**                                                     | Kiểm tra thông tin gói cước từ SaaS service, lưu cache thông tin gói cước và áp dụng `PlanFeatureGuard` trên BFF.                | Thấp       |

### 15.2 Lộ trình triển khai hệ thống (Phased Roadmap)

Trình tự dưới đây thể hiện lộ trình phát triển chính thức của đồ án sau khi hoàn tất Phase 4D.1; khi cần cập nhật thông tin tiến độ chi tiết, sử dụng tài liệu [implementation_plan.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/implementation_plan.md) làm nguồn chuẩn.

```
Phase 0 — Xây dựng nền tảng / Thiết lập ban đầu:
└── Đã hoàn thành.

Phase 1 — Xây dựng thực đơn, danh mục và bàn ăn:
└── Đã hoàn thành.

Phase 2A — Phân quyền cơ bản, gửi đơn đặt món và sự kiện Kafka:
└── Đã hoàn thành.

Phase 2B — Quản lý màn hình bếp KDS và kết nối WebSocket thời gian thực:
└── Đã hoàn thành.

Phase 3 — Tích hợp cổng thanh toán ngân hàng (SePay/VietQR và Tiền mặt):
└── Đã hoàn thành.

Phase 4A — Hoàn thiện Saga giao dịch và tối ưu hệ thống:
└── Đã triển khai quy trình Saga xác nhận đơn hàng mẫu; việc tối ưu sâu hơn được chuyển sang giai đoạn nâng cấp sau.

Phase 4B — Quản lý đăng ký gói cước SaaS và onboard cửa hàng mới:
└── Đã hoàn thành.

Phase 4C — Quản lý nhân sự nhà hàng:
└── Chưa triển khai. Ý tưởng về dịch vụ thông báo Notification Service ở bước 4.5 cũ được loại bỏ khỏi phạm vi đồ án.

Phase 4D — Dashboard báo cáo phân tích doanh thu:
└── Đã hoàn thành. Bao gồm phân quyền xem báo cáo, thiết lập mô hình đọc báo cáo trực tiếp từ dịch vụ sở hữu dữ liệu gốc, phân lọc báo cáo theo gói cước và tối ưu giao diện dashboard.

Phase 5-7 — Kiểm thử toàn diện, cài đặt giám sát và triển khai Production:
└── Đang thực hiện. Đã hoàn thành cài đặt giám sát cơ bản ở Phase 6 và hoàn thành các Task 5, 6, 7, 9, 10 ở Phase 7 kèm chuẩn bị Task 11; các công việc cấu hình VPS trên DigitalOcean, HTTPS tên miền công khai, kiểm thử tải và chuẩn bị tài liệu demo đang được triển khai.
```

---

## 16. CHIẾN LƯỢC OFFLINE & ĐỒNG BỘ DỮ LIỆU

### 16.1 Phía thiết bị của Khách hàng (Customer PWA)

```yaml
Kịch bản 1: Khách hàng quét mã QR khi thiết bị không kết nối mạng
  Phát hiện: navigator.onLine == false
  Xử lý:
    - Hiển thị thông báo "Không có kết nối mạng"
    - Tải thực đơn từ bộ nhớ đệm Service Worker (nếu đã từng mở trang trước đó)
    - Vô hiệu hóa tính năng thêm món vào giỏ hàng
    - Hiển thị thông báo "Chế độ xem thực đơn offline, không thể đặt món lúc này"

Kịch bản 2: Mất mạng chập chờn khi đang xem thực đơn chọn món
  Phát hiện: Sự kiện ngắt kết nối WebSocket
  Xử lý:
    - Hiển thị banner "Mất kết nối mạng, đang thử kết nối lại..."
    - Tự động kết nối lại với thời gian giãn cách tăng dần (2s, 4s, 8s, tối đa 30s)
    - Giữ nguyên trạng thái giỏ hàng trong LocalStorage
    - Khóa nút gửi đơn đặt món

Kịch bản 3: Mất mạng đúng thời điểm bấm nút gửi đơn đặt món
  Phát hiện: HTTP request bị quá thời gian (timeout) hoặc báo lỗi mạng
  Xử lý:
    - Hiển thị lỗi "Không thể gửi đơn đặt món"
    - Lưu giữ đơn hàng kèm mã xác thực idempotency key vào hàng đợi IndexedDB
    - Khi thiết bị kết nối mạng trở lại → Tự động gửi lại đơn hàng từ hàng đợi IndexedDB
    - Hiển thị thông báo "Đang đồng bộ đơn đặt món của bạn..."
```

### 16.2 Phía thiết bị của Nhân viên (POS/KDS)

```yaml
Kịch bản 1: Màn hình POS mất mạng khi nhân viên bấm xác nhận đơn hàng
  Xử lý:
    - Lưu hành động xác nhận vào hàng đợi lưu trữ cục bộ của POS
    - Hiển thị thông báo "POS ngoại tuyến — Hành động của bạn sẽ được đồng bộ khi có mạng"
    - Ghi nhận mốc thời gian thực hiện của hành động
    - Tự động gửi đồng bộ khi kết nối mạng trở lại
    - Sử dụng idempotency key để tránh việc xác nhận bị trùng lặp trên server

Kịch bản 2: Màn hình bếp KDS mất kết nối mạng
  Xử lý:
    - Tiếp tục hiển thị các thẻ món ăn đang làm từ bộ nhớ cache cục bộ
    - Lưu tạm các hành động đổi trạng thái (Đang làm/Xong món) vào hàng đợi offline
    - Hiển thị biểu tượng cảnh báo offline trên màn hình bếp KDS
    - Tự động đồng bộ các hành động từ hàng đợi khi thiết bị có mạng trở lại
    - Giải quyết tranh chấp dữ liệu: Dữ liệu trên Server là chuẩn (Server state wins)

Kịch bản 3: Thiết bị POS mất mạng khi bấm thanh toán hóa đơn
  Xử lý:
    - Chỉ cho phép chọn hình thức thanh toán bằng Tiền mặt
    - Khóa tính năng tạo mã QR VietQR tự động
    - Lưu tạm thông tin giao dịch tiền mặt vào hàng đợi offline
    - Nhân viên đối soát thủ công khi có mạng trở lại
```

### 16.3 Chiến lược Đồng bộ dữ liệu & Giải quyết tranh chấp

```yaml
Quy tắc giải quyết tranh chấp dữ liệu:
  IF local_timestamp < server_timestamp THEN
    server_state_wins()       # Dữ liệu trên server là chuẩn
    discard_local_changes()   # Bỏ qua các thay đổi tạm ở máy POS
    notify_user("Dữ liệu đã được cập nhật từ máy chủ")

  IF action == "order_submission" THEN
    use_idempotency_key(session_id + timestamp + hash) # Sử dụng khóa trùng lặp
    prevent_duplicate_order()                           # Chặn tạo đơn trùng lặp

Chính sách tự động gửi lại (Retry Policy):
  Số lần thử tối đa: 3 lần
  Thời gian giãn cách: giãn cách số mũ (2^n giây, tối đa 30s)
  IF vượt quá số lần thử tối đa THEN
    show_error("Không thể đồng bộ dữ liệu ngoại tuyến")
    log_to_error_tracking()

Công nghệ sử dụng chính:
  - Service Worker: Cache tài nguyên tĩnh, cache dữ liệu API thực đơn (Cache-First).
  - IndexedDB: Lưu hàng đợi đơn hàng offline, lưu các thao tác vận hành chờ đồng bộ.
  - Background Sync API: Tự động chạy ngầm gửi dữ liệu khi thiết bị có mạng trở lại.
  - Idempotency Keys: Cấu hình UNIQUE trong PostgreSQL; bổ sung cờ chặn trùng trên Redis.
```

---

_Tài liệu này mô tả thiết kế kiến trúc hệ thống cấp cao. Bước thực hiện tiếp theo: Thiết kế chi tiết sơ đồ cơ sở dữ liệu và đặc tả hợp đồng API cho từng dịch vụ._
