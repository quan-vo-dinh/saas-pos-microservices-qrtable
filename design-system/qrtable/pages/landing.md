# Landing — QRTable (management-app)

> Overrides `design-system/qrtable/MASTER.md` for the **public marketing / landing** route only (`/`).

## Intent

- **Product:** SaaS POS đa tenant, QR đặt món theo bàn, catalog realtime, thanh toán VietQR + SePay (hai tầng).
- **Audience:** Chủ quán / điều hành F&B Việt Nam đang đánh giá nền tảng vận hành.
- **Tone:** SaaS vận hành — rõ ràng, có số liệu, có luồng; **không** marketing rỗng, **không** gradient orb / card lồng chỉ để trang trí (theo Phase 4B plan).

## Layout (implemented)

1. Skip link + sticky header (desktop nav + mobile pill strip).
2. Hero: value prop POS + minh họa luồng Khách / POS / Thanh toán.
3. Tổng quan: 3 trụ (đa tenant, QR & POS, realtime).
4. Bàn & QR: vòng đời Available → Occupied → Billing → Cleaning (theo `docs/business-logic.md`).
5. Triển khai: 4 bước onboarding có kiểm soát.
6. So sánh: bảng QRTable vs nhiều công cụ rời (pattern Comparison + CTA từ ui-ux-pro-max).
7. Pricing: thẻ gói + checklist tính năng (Lucide `Check`).
8. Thanh toán: hai cột Tier 1 / Tier 2.
9. Liên hệ: CTA + aside gợi ý nội dung email.
10. Footer.

## Motion

- `landing.css`: `prefers-reduced-motion` giảm transition/animation; smooth scroll tắt khi reduce motion.

## Typography / color

- Dùng **Geist + theme tokens** (`globals.css`) — không ép palette “Vibrant red” từ script nếu phá contrast với theme hiện tại; nội dung và hierarchy là ưu tiên.
