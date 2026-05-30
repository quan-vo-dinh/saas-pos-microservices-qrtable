# Ánh xạ Mermaid ↔ Excalidraw (Chương 2)

> **Chỉ dùng để tham chiếu khi chỉnh `.excalidraw` thủ công.** PDF trong khóa luận xuất từ Excalidraw, không từ Mermaid.
>
> Mỗi `.mmd` là **sơ đồ khái niệm** (tiếng Việt, ví von dễ hình dung); chỉ giữ thuật ngữ kỹ thuật chuẩn (POS, QR, SaaS, API, JWT, WebSocket, Kafka, …). Không mô tả logic triển khai chi tiết. Khi vẽ Excalidraw: ưu tiên layout trực quan, ít chữ trên mỗi khối.

| Hình | Mermaid (preview)                        | Excalidraw (source chính thức)                  | Icons (`chapter2-icons/`)    |
| ---- | ---------------------------------------- | ----------------------------------------------- | ---------------------------- |
| 2.1  | `chapter2-fnb-pos-lifecycle.mmd`         | `chapter2-fnb-pos-lifecycle.excalidraw`         | fnb-delivery, scan-qr        |
| 2.2  | `chapter2-qr-ordering-flow.mmd`          | `chapter2-qr-ordering-flow.excalidraw`          | scan-qr, redis               |
| 2.3  | `chapter2-saas-multitenancy.mmd`         | `chapter2-saas-multitenancy.excalidraw`         | cloud, postgresql, redis     |
| 2.4  | `chapter2-monolith-vs-microservices.mmd` | `chapter2-monolith-vs-microservices.excalidraw` | postgresql, docker           |
| 2.5  | `chapter2-kafka-event-flow.mmd`          | `chapter2-kafka-event-flow.excalidraw`          | kafka                        |
| 2.6  | `chapter2-outbox-saga-overview.mmd`      | `chapter2-outbox-saga-overview.excalidraw`      | postgresql, kafka            |
| 2.7  | `chapter2-websocket-hint-refetch.mmd`    | `chapter2-websocket-hint-refetch.excalidraw`    | websocket, nginx, postgresql |
| 2.8  | `chapter2-oidc-rbac-saas-pos.mmd`        | `chapter2-oidc-rbac-saas-pos.excalidraw`        | keycloak, openid, scan-qr    |

## Preview nhanh một file

Từ thư mục repo root (cần Chrome cho `mmdc`):

```bash
export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd docs/graduation-thesis-resources/thesis-report/assets/diagrams
pnpm exec mmdc -i chapter2-kafka-event-flow.mmd -o preview-kafka.png -b transparent
```

## Sau khi sửa Excalidraw

```bash
bash docs/graduation-thesis-resources/thesis-report/tools/render-chapter2-diagrams.sh
cd docs/graduation-thesis-resources/thesis-report && tectonic undergraduate-theses-report.tex
```
