# Tài liệu Hướng dẫn Triển khai Production của QRTable (QRTable Production Deployment Runbook)

Tài liệu này chuẩn bị cho đợt triển khai QRTable đầu tiên trên DigitalOcean Droplet `quan-vps` hiện tại.
Tài liệu được viết cho một kỹ sư vận hành (operator) duy nhất và cấu hình tài nguyên giới hạn ở mức 2 vCPU / 4 GB RAM / 25 GB ổ đĩa.

## Ranh giới An toàn (Safety Boundary)

Tài liệu này không tự động cấp quyền triển khai. Kỹ sư vận hành phải phê duyệt thời gian triển khai (deployment window), chế độ thanh toán (payment mode), tag của image bất biến (immutable image tag), trạng thái sao lưu (backup state), tường lửa (firewall), DNS và các thông tin xác thực cho production (production credentials).

Tuyệt đối KHÔNG:

- Dán các secrets của production vào chat, ticket, ảnh chụp màn hình, lịch sử shell hoặc git;
- Build các image QRTable trên Droplet;
- Expose các cổng ứng dụng, database, Kafka hoặc Keycloak management;
- Sử dụng thông tin xác thực SePay giả để vượt qua kiểm tra (production validation);
- Khôi phục dữ liệu production như một phần của quá trình rollback ứng dụng thông thường.

## Tài liệu Tham chiếu Chính thức (Official References)

- [DigitalOcean recommended Droplet setup](https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/)
- [DigitalOcean Cloud Firewalls](https://docs.digitalocean.com/products/networking/firewalls/)
- [DigitalOcean Reserved IPs](https://docs.digitalocean.com/products/networking/reserved-ips/)
- [DigitalOcean backups](https://docs.digitalocean.com/products/backups/)
- [DigitalOcean snapshots](https://docs.digitalocean.com/products/snapshots/)
- [Porkbun DNS management](https://kb.porkbun.com/article/68-how-to-edit-dns-records)
- [Porkbun DNS API record semantics](https://porkbun.com/api/json/v3/documentation)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Caddy HTTPS quick start](https://caddyserver.com/docs/quick-starts/https)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

Các tra cứu Context7 vào ngày 13-06-2026 đã sử dụng `/websites/digitalocean`, `/websites/porkbun_api_json_v3` và `/websites/caddyserver`.

## 1. Quyết định về Dung lượng (Capacity Decision)

Bắt đầu với Droplet 4 GB hiện tại. Không thay đổi kích thước (resize) trước khi thực sự cần thiết.

Các đo lường thực tế tại Local Phase 7 cho thấy Kafka sử dụng khoảng 721 MiB và Keycloak khoảng 538 MiB trước khi tinh chỉnh ngân sách (budget tuning). Cấu hình production Compose hiện tại giới hạn Kafka ở mức tối đa 1 GiB với heap 512 MiB và Keycloak ở mức 768 MiB với heap 384 MiB.

Các biện pháp bảo vệ bắt buộc:

- Cấu hình swap từ 2–4 GB trước khi khởi chạy toàn bộ stack;
- Giữ trống ít nhất 8 GiB trước khi pull một bản release;
- Cấu hình Docker JSON log rotation;
- Chỉ lưu giữ các image tag tốt hiện tại và trước đó trên host 25 GB;
- Tuyệt đối không build image trên Droplet.

Chỉ tạm thời tăng kích thước (resize) lên 8 GB khi các bằng chứng thực tế lúc runtime cho thấy một hoặc nhiều dấu hiệu sau:

- Kernel liên tục kích hoạt OOM kill hoặc container bị khởi động lại do OOM;
- `MemAvailable` duy trì dưới mức 300 MiB trong ít nhất 15 minutes;
- Dung lượng swap sử dụng vượt quá 1 GiB đi kèm với tình trạng paging liên tục và độ trễ có thể thấy rõ từ phía người dùng (user-visible latency);
- Kafka hoặc Keycloak liên tục đạt giới hạn heap dưới lưu lượng demo dự kiến.

Ghi lại bằng chứng trước khi resize. Quay lại mức 4 GB sau khi kết thúc giai đoạn đặc biệt nếu các bằng chứng trên không còn xuất hiện.

## 2. Phê duyệt Con người (Human Go/No-Go)

Hoàn thành [danh sách kiểm tra con người (human checklist)](production-deployment-checklist.md). Dừng lại nếu bất kỳ mục bắt buộc nào chưa rõ ràng.

Chế độ thanh toán (payment mode) là một chốt chặn cứng (hard gate):

- `sepay-live` yêu cầu các thông số OAuth, webhook, tài khoản QR và ngân hàng thực tế đã được phê duyệt.
- `cash-demo` yêu cầu một quy trình khởi chạy production rõ ràng đã được kiểm thử mà không cần thông số SePay. Hợp đồng Payment Compose hiện tại vẫn yêu cầu các giá trị SePay OAuth, do đó việc triển khai chỉ dùng tiền mặt (cash-only deployment) bị chặn cho đến khi hợp đồng đó được thay đổi và xác minh.

Không điền các giá trị giả của provider.

## 3. Sao lưu và Địa chỉ Ổn định (Backups and Stable Address)

Trong bảng điều khiển (control panel) của DigitalOcean:

1. Bật tính năng Droplet backups.
2. Ghi lại lịch trình backup và thời gian lưu trữ (retention) được hiển thị bởi DigitalOcean.
3. Tạo một snapshot thủ công trước khi thực hiện các thay đổi rủi ro ở cấp độ host để có một điểm khôi phục sạch khi cần.
4. Gán một Reserved IP ở vùng `sgp1` cho `quan-vps`, hoặc phê duyệt rõ ràng IPv4 công khai cuối cùng của Droplet nếu không sử dụng Reserved IP.
5. Sử dụng IPv4 ổn định đã chọn cho tất cả các bản ghi DNS.

Tính năng backup hoặc khôi phục snapshot của provider chỉ ở mức thô (coarse-grained). Nó không thay thế cho các bản backup logic PostgreSQL và MongoDB trước các bản release có thay đổi schema.

Đối với các bản release sau này có dữ liệu hiện tại, hãy tạo các bản backup logic trước khi bootstrap:

```bash
cd /opt/qrtable/current
umask 077
backup_at="$(date -u +%Y%m%dT%H%M%SZ)"

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml exec -T postgres \
  sh -lc 'pg_dumpall -U "$POSTGRES_USER"' \
  > "/opt/qrtable/backups/postgres-${backup_at}.sql"

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml exec -T mongodb \
  sh -lc 'mongodump --archive --gzip --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' \
  > "/opt/qrtable/backups/mongodb-${backup_at}.archive.gz"

sha256sum "/opt/qrtable/backups/postgres-${backup_at}.sql" \
  "/opt/qrtable/backups/mongodb-${backup_at}.archive.gz" \
  > "/opt/qrtable/backups/checksums-${backup_at}.sha256"
```

Xác minh cả hai file đều không trống và duy trì chính sách lưu trữ có giới hạn. Việc khôi phục thử nghiệm vào các container tạm thời vẫn là một yêu cầu nghiệm thu của Task 12.

## 4. Tường lửa Đám mây (Cloud Firewall)

Gán một DigitalOcean Cloud Firewall cho `quan-vps`.

Các inbound rules (luật đi vào):

| Protocol | Port | Source                                          |
| -------- | ---: | ----------------------------------------------- |
| TCP      |   22 | Chỉ CIDR IPv4/IPv6 của quản trị viên được duyệt |
| TCP      |   80 | Tất cả IPv4 và IPv6                             |
| TCP      |  443 | Tất cả IPv4 và IPv6                             |
| UDP      |  443 | Tất cả IPv4 và IPv6 chỉ khi bật HTTP/3          |

Không thêm các inbound rules cho các cổng `3000`, `3201-3208`, `3300-3308`, `5432`, `6379`, `8080`, `9000`, `9092` hoặc `27017`.

Giữ quyền truy cập outbound (đi ra ngoài) đủ cho DNS, NTP, các package Ubuntu, container registry, ACME và các provider bên ngoài. DigitalOcean Cloud Firewalls là stateful, vì vậy lưu lượng phản hồi cho các kết nối được phép sẽ tự động được chấp nhận.

## 5. Porkbun DNS

Quản lý DNS dưới tên miền `vodinhquan.dev`. Trường `Host` hoặc `Name` của Porkbun sẽ tương đối với domain đó.
Tạo các bản ghi này với TTL `600` trong suốt quá trình triển khai ban đầu:

| Type | Host / Name    | Answer                                     |
| ---- | -------------- | ------------------------------------------ |
| A    | `api.qrtable`  | Reserved IP hoặc IPv4 cuối cùng được duyệt |
| A    | `app.qrtable`  | Cùng IPv4                                  |
| A    | `qr.qrtable`   | Cùng IPv4                                  |
| A    | `auth.qrtable` | Cùng IPv4                                  |

Trước khi lưu, hãy xóa hoặc giải quyết các bản ghi `A`, `AAAA`, `CNAME` hoặc các bản ghi chuyển tiếp (forwarding records) bị xung đột tại 4 tên này. Không tạo bản ghi wildcard trừ khi được xem xét riêng.

Xác minh từ ít nhất hai public resolver trước khi khởi chạy Caddy:

```bash
for host in api app qr auth; do
  dig +short A "${host}.qrtable.vodinhquan.dev" @1.1.1.1
  dig +short A "${host}.qrtable.vodinhquan.dev" @8.8.8.8
done
```

Mỗi câu trả lời nhận được phải bằng IPv4 ổn định đã chọn.

## 6. SSH và Deploy User

Chỉ sử dụng DigitalOcean console hoặc session root SSH ban đầu cho mục đích provisioning.

```bash
adduser deploy
usermod -aG sudo deploy

install -d -m 0700 -o deploy -g deploy /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 0600 /home/deploy/.ssh/authorized_keys
```

Mở một terminal thứ hai và xác minh `ssh deploy@<stable-ip>` trước khi thay đổi policy SSH.

Tạo file `/etc/ssh/sshd_config.d/99-qrtable.conf`:

```text
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
```

Sau đó kiểm tra cú pháp cấu hình và tải lại dịch vụ:

```bash
sshd -t
systemctl reload ssh
```

Giữ session `deploy` đã xác minh mở cho đến khi một lượt đăng nhập mới thứ hai thành công. Quyền thành viên trong group `docker` tương đương với quyền root; chỉ cấp quyền này cho deploy user:

```bash
usermod -aG docker deploy
```

Đăng xuất và đăng nhập lại sau khi thay đổi thông tin group.

## 7. Chuẩn bị Docker và Host

Cài đặt Docker Engine, Buildx và plugin Compose bằng hướng dẫn chính thức hiện tại của Ubuntu được liên kết ở trên. Không sử dụng lại đoạn lệnh thiết lập repository cũ được sao chép từ trước.

Xác minh với user `deploy`:

```bash
docker version
docker compose version
docker buildx version
docker info
```

Cấu hình swap một lần. Ban đầu sử dụng 2 GB; tăng lên 4 GB khi dung lượng ổ đĩa cho phép:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 0600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-qrtable.conf
sudo sysctl --system
free -h
swapon --show
```

Không lặp lại dòng `fstab` khi `/swapfile` đã tồn tại.

Cấu hình giới hạn dung lượng log của Docker trong `/etc/docker/daemon.json` trước khi khởi chạy QRTable:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Kiểm tra cú pháp JSON, khởi động lại Docker trong thời gian triển khai đã được phê duyệt và chạy lại `docker info`.

## 8. Sắp xếp Thư mục trên Server (Server Layout)

Sử dụng cấu trúc thư mục sau:

```text
/opt/qrtable/
  .env.production
  current/
    docker-compose.infra.yaml
    docker-compose.app.yaml
    docker-compose.proxy.yaml
    docker/
    tools/
  backups/
  releases/
    current
    previous
    history.log
```

Thư mục chứa mã nguồn clone từ repository nằm tại `/opt/qrtable/current`. Trạng thái có thể thay đổi (mutable state) nằm ngoài thư mục code này:

```bash
sudo install -d -m 0750 -o deploy -g deploy /opt/qrtable
git clone <repository-url> /opt/qrtable/current
cd /opt/qrtable/current
git checkout <reviewed-git-sha>
install -d -m 0750 /opt/qrtable/backups /opt/qrtable/releases
```

Đối với các bản release sau này, fetch và checkout chính xác commit đã được review. Không chạy build trên Droplet.

## 9. Môi trường Bảo mật (Protected Environment)

Tạo file dưới quyền user `deploy`:

```bash
cd /opt/qrtable/current
umask 077
install -m 0600 docker/env/.env.production.example /opt/qrtable/.env.production
```

Tạo các giá trị bảo mật cục bộ trong SSH session và chỉ dán vào `.env.production`:

```bash
openssl rand -hex 32
openssl rand -base64 32
docker run --rm apache/kafka:4.3.0 /opt/kafka/bin/kafka-storage.sh random-uuid
```

Sử dụng chuỗi 64 ký tự hex cho `PAYMENT_SECRETS_ENCRYPTION_KEY`.

Đặt `IMAGE_TAG` thành Git SHA bất biến có các image `linux/amd64` đã được build và push từ bên ngoài Droplet. Xác nhận các ràng buộc tương đương sau:

- `POSTGRES_PASSWORD` bằng với `TYPEORM_PASSWORD`;
- `MANAGEMENT_APP_CLIENT_SECRET` bằng với `AUTH_KEYCLOAK_SECRET`;
- Cả 4 URL công khai đều sử dụng các tên miền production;
- `CORS_ORIGINS` chỉ chứa origin của Management App và Customer PWA;
- Mọi placeholder đều được thay thế;
- Các giá trị provider phải là thật, nếu không đợt triển khai phải dừng lại.

Xác minh quyền truy cập mà không in nội dung file:

```bash
stat -c '%a %U:%G %n' /opt/qrtable/.env.production
```

Quyền (mode) và chủ sở hữu (owner) mong đợi: `600 deploy:deploy`.

## 10. Image cho Bản Release (Release Images)

Build và push các image `linux/amd64` trên máy trạm đáng tin cậy hoặc CI runner:

```bash
export IMAGE_TAG="$(git rev-parse HEAD)"
export PLATFORM=linux/amd64
export PUSH_IMAGES=true
bash tools/deploy/phase7-build-images.sh
```

Trên Droplet, đăng nhập vào registry mà không lưu token trong lịch sử shell. Sau đó chạy:

```bash
cd /opt/qrtable/current
ENV_FILE=/opt/qrtable/.env.production tools/deploy/phase7-preflight.sh

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml \
  -f docker-compose.app.yaml \
  -f docker-compose.proxy.yaml \
  pull
```

Ghi lại tag đã chọn vào `releases/current` và tag tốt trước đó vào `releases/previous`.

## 11. Thứ tự Khởi động (Startup Order)

Khởi động phần hạ tầng (infrastructure) và đợi trạng thái healthy:

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml up -d --wait --wait-timeout 300
```

Chạy lệnh bootstrap cho môi trường production:

```bash
ENV_FILE=/opt/qrtable/.env.production tools/deploy/phase7-run-production-bootstrap.sh
```

Lệnh này phải hoàn thành các migration, hiển thị trạng thái migration, xác minh quyền sở hữu database, khởi tạo Kafka topic và bootstrap Keycloak. Lệnh này không được tạo người dùng demo (demo users).

Khởi động ứng dụng:

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml up -d --wait --wait-timeout 300
```

Chỉ khởi động Caddy sau khi cả 4 tên miền DNS đã phân giải về IPv4 ổn định:

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.proxy.yaml up -d --wait --wait-timeout 180
```

## 12. Xác minh HTTPS và Health Check (Health Verification)

Kiểm tra trạng thái hệ thống runtime mà không hiển thị các secrets:

```bash
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.infra.yaml ps
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.app.yaml ps
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.proxy.yaml ps
docker stats --no-stream
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.proxy.yaml logs --tail=100 caddy
```

Từ một máy khách bên ngoài Droplet:

```bash
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/live
curl -fsSI https://app.qrtable.vodinhquan.dev/
curl -fsSI https://qr.qrtable.vodinhquan.dev/
curl -fsSI https://auth.qrtable.vodinhquan.dev/
```

Xác nhận tên miền chứng chỉ (certificate hostname) và ngày hết hạn:

```bash
for host in api app qr auth; do
  echo | openssl s_client \
    -connect "${host}.qrtable.vodinhquan.dev:443" \
    -servername "${host}.qrtable.vodinhquan.dev" 2>/dev/null |
    openssl x509 -noout -subject -issuer -dates
done
```

Các volume `/data` và `/config` của Caddy phải được giữ persistent. Cần mở cổng TCP 80 và 443 để cấp chứng chỉ HTTPS tự động bình thường. Cổng UDP 443 là tùy chọn để kích hoạt HTTP/3; HTTPS vẫn hoạt động qua TCP khi cổng này bị đóng. Caddy `reverse_proxy` sẽ tự động xử lý các nâng cấp kết nối WebSocket.

## 13. Khôi phục Trạng thái trước (Rollback)

Quá trình rollback ứng dụng và khôi phục dữ liệu là hai việc tách biệt.

Trước khi tiến hành rollback ứng dụng:

1. Ghi lại image tag bị lỗi và nguyên nhân.
2. Xác nhận image tag trước đó vẫn còn tồn tại.
3. Xác nhận phiên bản ứng dụng trước đó tương thích với schema hiện tại.
4. Thiết lập `IMAGE_TAG` về tag trước đó trong file `.env.production`.
5. Pull các image cũ về.
6. Chạy kiểm tra tính tương thích lúc bootstrap.
7. Khởi tạo lại ứng dụng và xác minh trạng thái health.

```bash
cd /opt/qrtable/current

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml pull

ENV_FILE=/opt/qrtable/.env.production tools/deploy/phase7-run-production-bootstrap.sh

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml up -d --force-recreate --wait --wait-timeout 300
```

Không tự động revert các migration hoặc restore database. Việc khôi phục dữ liệu (data restore) yêu cầu một quy trình xử lý sự cố riêng biệt đã được phê duyệt và một mốc thời gian backup được xác định rõ ràng.

Nếu Caddy gặp lỗi sau khi thay đổi cấu hình, hãy khôi phục lại file Caddyfile trước đó và chạy:

```bash
cd /opt/qrtable/current

docker run --rm \
  -v "$PWD/docker/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.10.2-alpine caddy validate --config /etc/caddy/Caddyfile
```

Sau đó chỉ khởi tạo lại layer proxy.

## 14. Xử lý Sự cố (Troubleshooting)

Quá tải bộ nhớ (Memory pressure):

```bash
free -h
swapon --show
vmstat 1
docker stats --no-stream
sudo journalctl -k --since "30 minutes ago" | grep -Ei 'oom|out of memory|killed process'
```

Thiếu dung lượng đĩa (Disk pressure):

```bash
df -h / /var/lib/docker /opt/qrtable
docker system df
du -sh /opt/qrtable/backups /opt/qrtable/current/docker/docker_data/* 2>/dev/null
```

Tuyệt đối không chạy lệnh `docker system prune --volumes` trên môi trường production. Chỉ xóa các build/cache artifact dư thừa và các image tag không phải là bản hiện tại hoặc bản mục tiêu rollback trước đó.

Lỗi TLS:

- Xác minh tất cả các phân giải public DNS;
- Xác minh khả năng kết nối tới các cổng TCP 80/443, và cổng UDP 443 chỉ khi cần HTTP/3;
- Kiểm tra logs của Caddy;
- Xác minh thời gian hệ thống;
- Giữ volume dữ liệu của Caddy để tránh việc yêu cầu cấp lại chứng chỉ không cần thiết.

Lỗi Bootstrap:

- Dừng lại trước khi khởi chạy hoặc tạo lại các service ứng dụng;
- Kiểm tra logs của container `production-bootstrap`;
- Khắc phục lỗi cụ thể liên quan đến migration, quyền sở hữu database, Kafka hoặc Keycloak;
- Chạy lại script hỗ trợ bootstrap có tính idempotency.

## 15. Điểm Dừng (Stop Point)

Sau khi hoàn tất khâu chuẩn bị, hãy đợi phiên làm việc triển khai production chính thức. Không thực hiện kết nối SSH, thay đổi DNS hoặc tường lửa, nhập secrets của production, pull các production images hoặc khởi chạy các container chỉ từ một phiên chuẩn bị tài liệu.
