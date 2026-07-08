# 📡 Hướng Dẫn Kiến Trúc & Cấu Hình Realtime (Socket.io) Trong Dự Án QRTable

> Tài liệu này mô tả chi tiết từ cấu hình hệ thống, cách tích hợp phía Server (NestJS BFF Gateway) đến cách tổ chức mã nguồn và các kiến trúc/template cụ thể được áp dụng phía Client (React App) nhằm giúp lập trình viên chưa từng làm việc với WebSockets/Socket.io nắm bắt nhanh chóng và làm chủ mã nguồn.

---

## 1. Triết Lý Thiết Kế: Mô Hình "WebSocket Invalidation Hints"

Thay vì truyền tải dữ liệu lớn qua mạng (ví dụ: toàn bộ chi tiết đơn hàng mới), hệ thống áp dụng mô hình **WebSocket Invalidation Hints (Gợi ý hủy bỏ cache)**:

```text
[BFF Backend] --- 1. Chỉ bắn một event nhỏ (ID, tenantId, station) ---> [Socket.io Client]
                                                                                |
                                                                       2. Xóa Cache tương ứng
                                                                       (Query Invalidation)
                                                                                |
[Giao diện UI] <--- 4. Tải lại dữ liệu mới nhất <--- 3. Tự động gọi REST GET ---+
```

- **Tiết kiệm băng thông tối đa:** Chỉ gửi ID và sự kiện nhỏ, không truyền payload lớn.
- **Đảm bảo Single Source of Truth:** Dữ liệu hiển thị luôn lấy từ REST API Backend sau khi xoá cache, loại bỏ lệch dữ liệu (Desync) giữa Client và Server.
- **Tận dụng cơ chế Cache của React Query:** Khi gọi `invalidateQueries`, React Query tự động cập nhật ngầm mà không gây giật lag giao diện (Zero-Flicker).

---

## 2. Cách Thiết Lập & Cấu Hình Tích Hợp (Setup & Config)

Hệ thống hoạt động trên giao thức **Socket.io** với các cổng kết nối và bảo mật như sau:

### A. Phía Client (React App)

- **Thư viện sử dụng:** `socket.io-client` phiên bản `^4.8.3`.
- **Endpoint phân giải:** Địa chỉ API cơ sở lấy từ `API_CONFIG.DEFAULT_BFF_URL` (thường trỏ đến cổng `3300` của BFF Gateway), sau đó nối thêm namespace `/orders`.
  - _Ví dụ:_ `http://localhost:3300/orders`
- **Bảo mật bắt tay (Handshake Authentication):** Client đính kèm JWT AccessToken trong tham số `auth: { token: accessToken }` khi tạo kết nối.

### B. Phía Server (BFF Gateway - NestJS)

- **Cấu hình Gateway:** Được khai báo trong class [OrderEventsGateway](../bff/src/app/modules/realtime/gateways/order-events.gateway.ts) bằng decorator `@WebSocketGateway({ namespace: '/orders' })`.

---

## 3. Kiến Trúc & Mô Hình Tổ Chức Realtime Trong Management App

Trong `management-app`, logic realtime không được viết một cách tự do hay tập trung ở một file global khổng lồ. Thay vào đó, nó tuân thủ nghiêm ngặt **3 mô hình kiến trúc cốt lõi** dưới đây:

### Mô hình A: Kiến trúc "Decoupled Event-to-Cache" (Tách biệt Giao diện và Socket)

Các UI Component hiển thị dữ liệu (như danh sách món bếp, danh sách bàn ăn) **hoàn toàn không biết đến sự tồn tại của Socket.io**.

- **Cách thức:** UI Component chỉ sử dụng React Query (ví dụ: `useKdsQueue()`) để đọc dữ liệu từ cache và hiển thị.
- **Vai trò của Realtime Hook:** Custom hook realtime (`useKdsRealtime`) đóng vai trò là một **Observer (Người quan sát)** chạy ẩn. Khi nhận được event từ socket, nó lặng lẽ bảo React Query xoá cache. React Query tự động gọi lại API REST và "bơm" dữ liệu mới vào UI Component.
- **Lợi ích:** Dễ dàng bảo trì. Nếu bạn muốn tắt tính năng realtime hoặc đổi từ Socket.io sang Server-Sent Events (SSE), bạn chỉ cần sửa file Hook, toàn bộ mã nguồn của các UI Component giao diện không phải sửa một dòng nào.

### Mô hình B: Mô hình "Feature-based Hook Encapsulation" (Đóng gói theo Feature)

Realtime logic được đóng gói độc lập theo từng Feature Module của dự án (SaaS, KDS, Order, Table) thay vì gộp chung:

- Mọi thứ liên quan đến Bếp nằm trong `src/features/kds/hooks/use-kds-realtime.ts`.
- Mọi thứ liên quan đến Đơn hàng & POS nằm trong `src/features/order/hooks/use-staff-order-realtime.ts`.
- **Lợi ích:** Code cực kỳ mô-đun hóa, dễ viết Unit Test độc lập (mocking socket dễ dàng) và không sợ file phình to khi dự án phát triển thêm nhiều tính năng realtime mới.

### Mô hình C: Mô hình "Auth-bound Connection Lifecycle" (Liên kết vòng đời với Xác thực)

Kết nối WebSocket được quản lý tự động dựa trên trạng thái đăng nhập của người dùng.

- **Cách thức:** Socket chỉ thực sự khởi tạo kết nối (lazy connection) khi và chỉ khi trong Zustand Store (`useAuthStore`) đã nạp đầy đủ `accessToken` và `tenantId`.
- **Hủy kết nối tự động:** Khi nhân viên logout, trạng thái xác thực bị xoá, hook phát hiện và tự động kích hoạt `socket.disconnect()` để giải phóng tài nguyên cho server.

---

## 4. Tổ Chức Triển Khai Phía Server (BFF Gateway)

Phía Server chịu trách nhiệm quản lý kết nối, **Xác thực quyền** và **Phân phối thiết bị vào đúng Phòng (Rooms)** để cô lập dữ liệu giữa các nhà hàng (Multi-tenant Isolation).

Luồng xử lý kết nối diễn ra tại [realtime-auth.service.ts](../bff/src/app/modules/realtime/services/realtime-auth.service.ts) thông qua các bước:

```text
[Client Kết Nối] -> [BFF Gateway nhận Handshake Token]
                        |
                        v (gRPC verifyUserToken)
            [Authorizer Microservice xác thực]
                        |
                        +---> Hợp lệ: Phân tích roles/tenantId từ JWT
                        |         |
                        |         +--> Tự động xếp vào các phòng tương ứng (socket.join)
                        |
                        +---> Thất bại: Bắn 'events.authError' & Ngắt kết nối socket
```

### Các phòng mặc định được server xếp tự động:

- `tenant:{tenantId}:staff` -> Phòng nhận tất cả thông báo chung của nhân viên cửa hàng.
- `tenant:{tenantId}:kds:KITCHEN` -> Chỉ dành cho nhân viên có vai trò bếp (`CHEF`).
- `tenant:{tenantId}:kds:BAR` -> Chỉ dành cho nhân viên pha chế (`BARISTA`).
- `tenant:{tenantId}:management` -> Chỉ dành cho quản lý cấp cao (`OWNER`, `MANAGER`, `SUPER_ADMIN`).

---

## 5. Cú Pháp & Quy Tắc Socket.io Client Cốt Lõi

Để đọc hiểu mã nguồn, bạn cần nắm vững 4 nhóm cú pháp cốt lõi của thư viện `socket.io-client` trong React:

### A. Khởi tạo kết nối (`io`)

```typescript
import { io, type Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3300/orders', {
  auth: { token: accessToken }, // Gửi JWT token để server xác thực
  transports: ['websocket', 'polling'], // Ưu tiên websocket, polling làm fallback
  autoConnect: true,
  reconnection: true,
});
```

### B. Lắng nghe sự kiện (`socket.on`)

Lắng nghe các sự kiện do server phát (emit) xuống:

```typescript
socket.on('events.orderCreated', (event: OrderCreatedEvent) => {
  // Logic xử lý khi có đơn hàng mới (vd: invalidateQueries)
});
```

### C. Hủy lắng nghe sự kiện (`socket.off`) và Ngắt kết nối (`socket.disconnect`)

Đây là quy tắc **BẮT BUỘC** trong React để tránh rò rỉ bộ nhớ (Memory Leak) và trùng lặp kết nối (Duplicate connections) khi Component bị hủy (Unmount):

```typescript
// Trong React useEffect cleanup:
return () => {
  socket.off('events.orderCreated', onOrderCreated);
  socket.disconnect(); // Ngắt kết nối hẳn
};
```

---

## 6. Lộ Trình Đọc Hiểu Mã Nguồn Realtime (Step-by-Step)

Hãy đọc mã nguồn theo trình tự 5 bước dưới đây để không bị ngộp:

### Bước 1: Đọc Hook quản lý đơn hàng của Nhân viên (POS)

- **File cần đọc**: [use-staff-order-realtime.ts](./src/features/order/hooks/use-staff-order-realtime.ts)
- **Mục tiêu**: Hiểu cách khởi tạo socket, cách lắng nghe hàng loạt sự kiện đơn hàng (`orderCreated`, `paymentCompleted`, `serviceRequested`), cách lọc dữ liệu theo `tenantId` để tránh nhận nhầm sự kiện của cửa hàng khác, và cách gọi hàm `invalidateQueries` tương ứng.

### Bước 2: Đọc Hook quản lý Bếp/Bar (KDS)

- **File cần đọc**: [use-kds-realtime.ts](./src/features/kds/hooks/use-kds-realtime.ts)
- **Mục tiêu**: Xem cách hook kết nối bằng JWT, lọc event theo `tenantId + station`, và chỉ gửi `socket.emit('subscribe.kds', { station })` khi màn hình bật `subscribeStation` để đăng ký station rõ ràng.

### Bước 3: Đọc nơi tích hợp Hook vào Giao diện (UI Components)

- **File cần đọc**:
  1.  [pos-app-shell.tsx](./src/features/pos/components/pos-app-shell.tsx): Xem cách gọi `useStaffOrderRealtime()` để kích hoạt lắng nghe toàn cục tại khu vực bán hàng POS.
  2.  [kds-board.tsx](./src/features/kds/components/kds-board.tsx): Xem cách trạm bếp gọi `useKdsRealtime(stationEnum, { subscribeStation })` để đồng bộ trạng thái đơn nấu ăn.

### Bước 4: Xem cầu nối REST Queries liên quan

- **File cần đọc**: [use-kds-queue.ts](./src/features/kds/hooks/use-kds-queue.ts)
- **Mục tiêu**: Xem cách React Query (`useQuery`) đăng ký cache key `kdsKeys.queue(...)` để khi hook realtime gọi `invalidateQueries`, React Query biết chính xác API nào cần được fetch lại dữ liệu mới nhất.

### Bước 5: Xem logic xác thực & phát tin ở phía Backend

- **Files cần đọc**:
  1.  [order-events.gateway.ts](../bff/src/app/modules/realtime/gateways/order-events.gateway.ts): Lắng nghe kết nối và xử lý yêu cầu đăng ký phòng.
  2.  [realtime-auth.service.ts](../bff/src/app/modules/realtime/services/realtime-auth.service.ts): Đọc logic xác thực mã JWT Token và phân tách User vào các room qua lệnh `buildStaffRooms`.

---

## 7. Quy Tắc Vàng Khi Viết Code Realtime Trong Dự Án

Khi bạn bảo trì hoặc viết mới tính năng realtime, hãy luôn ghi nhớ:

1.  **Luôn lọc trùng `tenantId`**: Backend gửi event chung cho namespace, do đó client **phải** kiểm tra `event.tenantId === currentTenantId` trước khi thực hiện xóa cache, tránh làm ảnh hưởng hiệu năng của cửa hàng khác.
2.  **Luôn dọn dẹp (Cleanup) sự kiện**: Mọi sự kiện đăng ký bằng `socket.on` phải có lệnh hủy tương ứng `socket.off` trong hàm trả về của `useEffect`.
3.  **Không lưu trữ state cục bộ lớn trong Socket**: Tuyệt đối không nhét logic xử lý mảng, push/pop dữ liệu UI trực tiếp bên trong callback socket. Hãy dùng `queryClient.invalidateQueries` để React Query tự động đồng bộ hóa.
4.  **Theo dõi trạng thái kết nối**: Sử dụng state `status` (connected, reconnecting, degraded) để hiển thị chấm tròn trạng thái kết nối (Realtime Status Pill) trên UI, giúp nhân viên cửa hàng biết mạng có đang ổn định hay không.
