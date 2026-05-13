# Phase 4B landing — ui-ux-pro-max notes

## Workflow applied (2026-05-13 refresh)

1. **Step 1 — Phân tích:** SaaS POS đa tenant QRTable; đối tượng chủ quán / vận hành; từ khóa: công nghệ, quy trình, flow, tự động, realtime, VietQR, SePay, OAuth2.
2. **Step 2 — Design system (script):**
   `python3 .agents/skills/ui-ux-pro-max/scripts/search.py "SaaS POS restaurant QR ordering multi-tenant automation workflow real-time VietQR subscription operational dashboard" --design-system --persist -p "QRTable" --page "landing" -f markdown`
   → Pattern **Real-Time / Operations Landing**; page override: metrics → how it works → CTA; data-dense; status colors.
3. **Step 3 — Cá nhân hóa QRTable (override hợp lý):**
   Script gợi ý typography “luxury / Cinzel” không khớp POS operator — **giữ Geist + mono** (đã có trong app) cho nhãn kỹ thuật và số liệu.
   **Không** dùng gradient orb trang trí; chỉ grid mesh nhẹ + viền phát sáng tối thiểu cho hero/CTA.
   **Dark ops** (`zinc-950` nền, `cyan` / `emerald` accent) để nhấn “control plane / pipeline”.
4. **Next.js (Context7 `/vercel/next.js` v16.1.6):** metadata tại `page.tsx`; không import global CSS ngoài `globals.css` — motion scoped qua **CSS Module** `landing.module.css` + `prefers-reduced-motion`.
5. **A11y nhanh (ui-ux-pro-max §1):** skip link → `#main` + `tabIndex={-1}`; focus ring trên CTA; `aria-labelledby` trên section; không dùng emoji làm icon (Lucide).

## Product & tone

- **Product:** SaaS POS đa tenant cho F&B Việt Nam (QRTable — QR đặt món, POS, subscription, SePay/VietQR).
- **Audience:** Chủ quán / operator đánh giá luồng số và tin cậy thanh toán.
- **Tone:** Vận hành công nghệ — pipeline, log-style preview, chỉ số “signal”, tier QRTBL/QRSUB.
- **CTA:** Primary “Xem gói” / “Liên hệ triển khai”; secondary “Đăng nhập quản trị”.
- **First viewport:** Badge realtime/tenant/payment + headline flow + mock control-plane (không placeholder marketing chung).

## Files UI landing

- `apps/management-app/src/app/page.tsx`
- `apps/management-app/src/features/landing/landing.module.css` (keyframes + reduced-motion)
- `apps/management-app/src/features/landing/landing-header.tsx`
- `apps/management-app/src/features/landing/hero-section.tsx`
- `apps/management-app/src/features/landing/metrics-section.tsx`
- `apps/management-app/src/features/landing/data-flow-section.tsx`
- `apps/management-app/src/features/landing/workflow-section.tsx`
- `apps/management-app/src/features/landing/pricing-section.tsx`
- `apps/management-app/src/features/landing/payment-section.tsx`
- `apps/management-app/src/features/landing/contact-section.tsx`
- Persisted script output: `design-system/qrtable/MASTER.md`, `design-system/qrtable/pages/landing.md`
