# Ngrok: Keycloak (8180) + BFF (3300) cùng lúc

Tài liệu ngrok (Context7 / chính thức): [Agent config](https://ngrok.com/docs/agent/config), [CLI `ngrok start`](https://ngrok.com/docs/agent/cli), [nhiều endpoint (config v3)](https://ngrok.com/docs/agent/config/v3).

## Vì sao lỗi `ERR_NGROK_334`

Chạy **hai** lệnh độc lập `ngrok http 3300` và `ngrok http 8180` có thể xung đột với **một** agent / một endpoint đã online. Cách đúng: **một** process ngrok, **hai tunnel đặt tên** trong file YAML (hoặc dùng config v3 `endpoints` nếu bạn đã migrate agent).

File mẫu repo dùng **config version 2** (`tunnels:`) — tương thích rộng với `ngrok start <tên>`.

## Các bước

### 1. Xem file config mặc định của máy bạn

```bash
ngrok config check
```

Ghi nhận đường dẫn file (macOS/Linux khác nhau).

### 2. File `qrtable-dev-ngrok.yml`

Repo đã có sẵn `tools/ngrok/qrtable-dev-ngrok.yml` (chỉ định nghĩa tunnel, **không** lưu authtoken — file này nằm trong `.gitignore`). Nếu máy bạn chưa có file, tạo bằng:

```bash
cp tools/ngrok/qrtable-dev-ngrok.example.yml tools/ngrok/qrtable-dev-ngrok.yml
```

**Cách khác (không cần `qrtable-dev-ngrok.yml`):** gộp config mặc định (đã có authtoken sau `ngrok config add-authtoken`) + file example chỉ có tunnel. macOS:

```bash
ngrok start \
  --config "$HOME/Library/Application Support/ngrok/ngrok.yml" \
  --config tools/ngrok/qrtable-dev-ngrok.example.yml \
  qrtable-keycloak qrtable-bff
```

Đường dẫn chính xác: chạy `ngrok config check`.

### 3. Gắn authtoken (một trong hai cách)

- **Cách A — biến môi trường** (khuyến nghị):

  ```bash
  export NGROK_AUTHTOKEN='<token từ dashboard ngrok>'
  ```

- **Cách B — trong file** `qrtable-dev-ngrok.yml`: bỏ comment dòng `authtoken:` và dán token.

### 4. Chạy cả hai tunnel

Từ **thư mục gốc repo**:

```bash
ngrok start --config tools/ngrok/qrtable-dev-ngrok.yml qrtable-keycloak qrtable-bff
```

Trong UI ngrok (terminal hoặc http://127.0.0.1:4040) bạn cần thấy **hai hostname HTTPS khác nhau** (một cho Keycloak, một cho BFF).

| Tunnel             | Local | Dùng cho                                                                    |
| ------------------ | ----- | --------------------------------------------------------------------------- |
| `qrtable-keycloak` | 8180  | `AUTH_KEYCLOAK_ISSUER=https://<host-A>/realms/qrtable` trên Vercel          |
| `qrtable-bff`      | 3300  | `MANAGEMENT_BFF_BASE_URL` / `NEXT_PUBLIC_BFF_*` = `https://<host-B>/api/v1` |

_(Đường dẫn `/api/v1` giữ nguyên nếu BFF của bạn vẫn mount tại đó.)_

### 4b. Cảnh báo: **cùng một** `*.ngrok-free.dev` cho cả 3300 và 8180

Nếu terminal in hai dòng `Forwarding` **trùng URL** (ví dụ cùng `lunacy-venomous-blustery.ngrok-free.dev`) nhưng khác port local, thì **một hostname không thể** vừa là Keycloak vừa là BFF — request có thể bị **pooling** / gộp edge (đặc biệt nếu từng bật gợi ý `--pooling-enabled` của `ERR_NGROK_334`). Luồng OIDC + API sẽ **hỏng**.

**Việc nên làm:**

1. **Không** dùng `--pooling-enabled` trừ khi bạn chủ đích cân bằng tải **một** dịch vụ nhiều instance.
2. Gói **Free** đôi khi chỉ cấp **một** public hostname cho session; khi đó cần **hai URL công khai khác nhau** bằng một trong các cách:
   - **Ngrok paid**: hai subdomain / endpoint tách tên miền (xem [bảng giá / tính năng](https://ngrok.com/docs)).
   - **Tunnel thứ hai bằng công cụ khác** (miễn phí, URL riêng), ví dụ Cloudflare Quick Tunnel cho BFF trong khi Keycloak vẫn dùng ngrok:

     ```bash
     cloudflared tunnel --url http://localhost:3300
     ```

     Keycloak giữ `ngrok http 8180` **hoặc** một tunnel ngrok chỉ cho 8180.

   - **Chỉ ngrok Keycloak**; BFF deploy tạm lên host có HTTPS (Railway, Fly, …).

### 5. Keycloak đứng sau ngrok / Cloudflare Tunnel

**Trong repo:** `docker-compose.provider.yaml` đã bật cho service `keycloak`:

- `KC_PROXY_HEADERS=xforwarded` — Keycloak đọc `X-Forwarded-*` từ edge ([reverse proxy](https://www.keycloak.org/server/reverseproxy)).
- `KC_HOSTNAME_STRICT=false` — hostname public lấy từ request (phù hợp URL ngrok đổi trên free tier).

Sau khi sửa compose, **restart Keycloak**:

```bash
docker compose -f docker-compose.provider.yaml up -d keycloak
```

Nếu Admin UI vẫn báo `somethingWentWrong`, tạo file `.env` cùng thư mục với compose (hoặc export trước khi `docker compose`) và set **hostname không có scheme**:

```bash
# Ví dụ — thay bằng host ngrok thật của bạn
KC_HOSTNAME=lunacy-venomous-blustery.ngrok-free.dev
```

Rồi trong `docker-compose.provider.yaml` thêm dòng (compose tự đọc `.env`):

```yaml
KC_HOSTNAME: ${KC_HOSTNAME}
```

chỉ khi bạn cần hostname cứng; nếu không dùng, **đừng** thêm dòng này để tránh gửi giá trị rỗng.

**Issuer cho Vercel / NextAuth:** `https://<host-tunnel>/realms/qrtable` (trùng host trình duyệt dùng mở Keycloak).

### 5b. BFF qua tunnel — `GET /` là 404 (bình thường)

BFF dùng prefix `api/v1`. Kiểm tra tunnel:

- Swagger: `https://<host>/api/v1/docs`
- Base URL env (Vercel / local): `https://<host>/api/v1` (**có** `/api/v1`).

### 6. Free tier

URL **đổi** mỗi lần khởi động lại tunnel (trừ gói có domain cố định). Mỗi lần đổi: cập nhật **Vercel Environment Variables** + **Keycloak → client `management-app` → Valid redirect URIs / Web origins** nếu cần.

## Agent config v3 (tuỳ chọn)

Nếu máy bạn chỉ còn hỗ trợ [config v3](https://ngrok.com/docs/agent/config/v3), dùng khối `endpoints:` thay cho `tunnels:`; lệnh vẫn là `ngrok start <name1> <name2>` với tên endpoint. Chi tiết: [Migrate v2 → v3](https://ngrok.com/docs/agent/config/v3).
