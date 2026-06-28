# Ánh xạ diagram Chương 2

> Source chính của Chương 2 là PlantUML (`.puml`) để giữ notation học thuật rõ ràng. Các file `.mmd` cũ chỉ còn là con trỏ deprecated để tránh dùng lại bản flowchart/Excalidraw cũ.
>
> Quy ước ngôn ngữ: tiếng Việt là chính; chỉ giữ thuật ngữ kỹ thuật cần thiết như POS, QR, SaaS, API, JWT, WebSocket, Kafka, tenant, idempotency.

| Hình | Source chính | Loại diagram | Vai trò trong chương |
| ---- | ------------ | ------------ | -------------------- |
| 2.1  | `chapter2-fnb-pos-lifecycle.puml` | UML activity diagram | Vòng đời vận hành POS F\&B. |
| 2.2  | `chapter2-qr-ordering-flow.puml` | UML sequence diagram | Luồng QR/session/giỏ/gửi đơn. |
| 2.3  | `chapter2-saas-multitenancy.puml` | Component/deployment-style diagram | Mô hình SaaS nhiều tenant và ranh giới cô lập. |
| 2.4  | `chapter2-monolith-vs-microservices.puml` | UML component diagram | So sánh ownership dữ liệu giữa monolith và microservices. |
| 2.5  | `chapter2-kafka-event-flow.puml` | Component/topology diagram | Producer, topic, partition và consumer group. |
| 2.6  | `chapter2-outbox-saga-overview.puml` | UML sequence diagram | Outbox và Saga ở mức cơ chế nhất quán dữ liệu. |
| 2.7  | `chapter2-websocket-hint-refetch.puml` | UML sequence diagram | WebSocket hint và API snapshot. |
| 2.8  | `chapter2-oidc-rbac-saas-pos.puml` | Component diagram | Tách luồng OIDC/RBAC của nhân sự và phiên QR của khách. |

## Render nhanh một file

Từ thư mục repo root:

```bash
bash docs/graduation-thesis-resources/thesis-report/tools/render-chapter2-diagrams.sh chapter2-kafka-event-flow
```

## Sau khi sửa PlantUML

```bash
bash docs/graduation-thesis-resources/thesis-report/tools/render-chapter2-diagrams.sh
cd docs/graduation-thesis-resources/thesis-report && tectonic undergraduate-theses-report.tex
```
