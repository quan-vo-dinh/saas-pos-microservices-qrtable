# Phase 5 P0 — Spec enforcement quota SaaS

> **Trạng thái:** Mini-spec chuẩn cho Phase 5 trước Bước 5.2.
> **Rule ID:** `P0-SAAS-FEATURE-GATING-QUOTAS`.
> **Phạm vi:** Enforcement Phase 4B cho `max_tables`, `max_staff`, và `max_orders_per_day`.

---

## 1. Vấn đề

Phase 4B định nghĩa pricing plan với quota tài nguyên, nhưng inventory Phase 5 chỉ thấy data shape, endpoint đếm, cache summary, và check subscription active. Không thấy hành vi chặn quota khi tạo bàn thứ 11, tài khoản staff thứ 6, hoặc order ngày thứ 101 trên plan FREE.

Test Phase 5 không được đánh dấu quota là `covered` cho đến khi enforcement tồn tại ở ranh giới owner tài nguyên. Check edge vẫn có thể cho UX phản hồi nhanh hơn, nhưng không được thay thế enforcement ở owner service.

---

## 2. Giới hạn chuẩn

Trường quota pricing plan:

- `max_tables`
- `max_staff`
- `max_orders_per_day`

Plan seed phải dùng giá trị rõ ràng. Cho contract luận văn/demo:

| Plan      | `max_tables` | `max_staff` | `max_orders_per_day` |
| --------- | ------------ | ----------- | -------------------- |
| `FREE`    | 10           | 5           | 100                  |
| `BASIC`   | 50           | 15          | 1000                 |
| `PREMIUM` | -1           | -1          | -1                   |

Ngữ nghĩa giá trị quota:

- `-1` nghĩa là unlimited.
- `0` nghĩa không cho phép và chỉ nên xuất hiện có chủ đích.
- Thiếu subscription, subscription inactive, hoặc nguồn quota không khả dụng chặn các ghi tiêu thụ quota.

---

## 3. Quyết định

1. SaaS Service sở hữu pricing plan, subscription hiện tại, và cache subscription summary.
2. BFF `TenantPlanGuard` hoặc logic edge cấp route có thể chặn sớm cho UX và phản hồi nhanh.
3. Check edge không đủ. Service sở hữu tài nguyên phải enforce quota trước khi commit write:
   - Catalog sở hữu tạo bàn và `max_tables`.
   - User-Access sở hữu tạo/invite/upsert staff và `max_staff`.
   - Order sở hữu tạo order hoặc luồng submit và `max_orders_per_day`.
4. Owner check phải dùng count từ owner service làm source of truth:
   - Catalog đếm bàn tenant active.
   - User-Access đếm user/staff tenant active thuộc quota.
   - Order đếm order thành công cho ngày `Asia/Ho_Chi_Minh` của tenant.
5. Ghi tiêu thụ quota vượt limit fail với lỗi ứng dụng ổn định:

   ```json
   {
     "code": "TENANT_PLAN_LIMIT_EXCEEDED",
     "details": {
       "limitType": "max_tables | max_staff | max_orders_per_day",
       "limit": 10,
       "current": 10,
       "upgradeUrl": "/dashboard/subscription"
     }
   }
   ```

6. Tenant `SUSPENDED` hoặc `CLOSED` vẫn bị chặn ghi vận hành mới dù count quota dưới limit.
7. Đọc, view lịch sử, và thanh toán bill `PENDING_PAYMENT` đã tạo vẫn được phép theo contract vòng đời tenant.

---

## 4. Hành vi theo owner

### 4.1 Catalog `max_tables`

- Tạo bàn kiểm tra số bàn active hiện tại trước insert.
- Nếu count hiện tại bằng hoặc lớn hơn `max_tables`, tạo bị từ chối.
- Nâng cấp tenant plan cho phép tạo ngay sau refresh cache subscription summary hoặc invalidation.
- Xóa hoặc deactivate bàn giảm count active dùng cho check sau.

### 4.2 User-Access `max_staff`

- Tạo hoặc mời staff tenant kiểm tra count staff tenant active trước khi tạo.
- User disabled không tính là staff active.
- Owner onboarding vẫn phải tạo owner ban đầu theo contract onboarding; tạo staff tiếp theo bị gate bởi quota.
- Người dùng platform SUPER_ADMIN không tiêu thụ quota staff tenant trừ khi được gán rõ ràng làm staff tenant đó.

### 4.3 Order `max_orders_per_day`

- Ranh giới ngày quota order dùng `Asia/Ho_Chi_Minh`.
- Chỉ tiêu thụ quota bởi tạo order thành công hoặc submit, không phải chỉnh sửa cart hay lần thử fail.
- Enforcement phải đủ an toàn race để submit đồng thời không persist nhiều order thành công hơn plan cho phép.
- Retry idempotent với cùng idempotency key không được tiêu thụ quota hai lần.

---

## 5. Contract kiểm thử

Test nhanh hoặc integration bắt buộc ở owner service:

- Test Catalog service: tenant FREE với 10 bàn active không tạo được bàn thứ 11.
- Test Catalog service: quota bàn `-1` cho phép tạo vượt giới hạn thông thường.
- Test User-Access service: tenant FREE với 5 staff active không tạo/mời được staff active thứ 6.
- Test Order service: tenant FREE với 100 order thành công trong ngày HCM không tạo được order thứ 101.
- Test Order service: ranh giới ngày HCM dùng `Asia/Ho_Chi_Minh`.
- Test backup owner tài nguyên: gọi TCP/service trực tiếp vẫn bị chặn dù bypass BFF guard.
- Test refresh cache: nâng cấp plan FREE → PREMIUM cho phép ghi trước đó bị chặn sau refresh summary hoặc invalidation.

Test âm bắt buộc:

- Thiếu subscription hoặc thiếu quota summary chặn ghi tiêu thụ quota.
- Tenant suspended vẫn bị chặn dù dưới quota.
- Tạo order fail không tiêu thụ quota order ngày.
- Retry idempotent order không double-count.

Test edge-feedback tùy chọn:

- Test BFF hoặc guard: subscription inactive chặn ghi tiêu thụ quota trước khi forward.
- Test BFF hoặc route-level: response quota-exceeded giữ `details` của `TENANT_PLAN_LIMIT_EXCEEDED` cho UI prompt nâng cấp gói.

---

## 6. Ngoài phạm vi

- Billing vượt quota (overage billing).
- UI proration và downgrade remediation.
- Wizard đăng ký self-service.
- Dashboard analytics quota sau luận văn.

---

## 7. Tiêu chí chấp nhận

- `P0-SAAS-FEATURE-GATING-QUOTAS` chỉ chuyển từ `implementation-gap` sang `covered` khi quota bàn, staff, và order ngày có enforcement ở owner service cộng test.
- Triển khai chỉ BFF guard là bảo phủ `partial`, không đủ chấp nhận.
- Plan pricing seed không được dựa default entity cho giá trị quota.
