# Nội dung điền form nộp Khóa luận tốt nghiệp

> Sinh viên: Võ Đình Minh Quân — MSSV: 22521193  
> Đề tài: QRTable  
> Mục đích: cung cấp nội dung đã rút gọn để sao chép trực tiếp vào chức năng **Sinh viên → Nộp KLTN** trên Cổng thông tin Đào tạo UIT.

## 1. Tên khóa luận tiếng Việt

Tên này đã có trên form. Giữ nguyên, không tự ý sửa nếu chưa được Khoa hoặc GVHD chấp thuận:

```text
Nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS tích hợp đặt món qua mã QR dựa trên kiến trúc vi dịch vụ
```

## 2. Tên khóa luận tiếng Anh

Tên này đã có trên form. Giữ nguyên, không tự ý sửa nếu chưa được Khoa hoặc GVHD chấp thuận:

```text
Research on the Development of a SaaS-Based POS Platform Integrating QR Code Ordering under a Microservices Architecture
```

## 3. File báo cáo dạng PDF

File cần upload:

```text
undergraduate-theses-report.pdf
```

Chỉ dùng bản PDF cuối cùng đã kiểm tra mục lục, số trang, hình, bảng, tài liệu tham khảo và các nội dung chỉnh sửa theo góp ý.

## 4. File Word, LaTeX hoặc ZIP

QRTable sử dụng LaTeX nhiều file, vì vậy nên nén project thành một file ZIP. Tên file đề xuất:

```text
22521193_VoDinhMinhQuan_QRTable_LaTeX.zip
```

File ZIP nên chứa các file `.tex`, `references.bib`, cấu hình LaTeX và toàn bộ hình/asset cần thiết để biên dịch báo cáo. Không đưa vào ZIP thư mục `.git`, thông tin bí mật hoặc các file build tạm như `.aux`, `.log`, `.xdv`, `.fls`, `.fdb_latexmk` và `.synctex.gz`.

## 5. Tóm tắt báo cáo KLTN

Sao chép nguyên đoạn dưới đây vào ô **Tóm tắt báo cáo KLTN**:

```text
Khóa luận nghiên cứu và xây dựng QRTable, nền tảng SaaS POS cho lĩnh vực nhà hàng và dịch vụ ăn uống (F&B), tích hợp đặt món qua mã QR. Đề tài giải quyết nhu cầu liên kết xem thực đơn, gọi món, xác nhận đơn, điều phối bếp, quản lý tồn kho, thanh toán và theo dõi vận hành, đồng thời phân tách dữ liệu giữa các đơn vị thuê bao. QRTable được thiết kế theo kiến trúc vi dịch vụ, dùng BFF làm điểm vào và phân chia trách nhiệm cho Catalog, Order, Kitchen, Payment, SaaS, User-Access và Authorizer. Hệ thống dùng PostgreSQL và MongoDB theo ranh giới dịch vụ, Redis cho bộ nhớ đệm và trạng thái vận hành, Kafka cho sự kiện nghiệp vụ bất đồng bộ, Keycloak/JWT cho nhân viên và cơ chế phiên riêng cho khách quét mã QR. Các luồng chính gồm quản lý đơn vị thuê bao, thực đơn, bàn và mã QR; phiên gọi món và giỏ dùng chung; gửi và xác nhận đơn; trừ tồn kho; hàng đợi KDS; thanh toán tiền mặt hoặc VietQR/SePay; phân quyền và báo cáo. Hệ thống được đánh giá bằng đối chiếu yêu cầu, kiểm thử đơn vị, hợp đồng, tích hợp và đầu cuối; phiên đo tải k6 đại diện; cùng dữ liệu quan sát từ Prometheus, Grafana và Tempo. Kết quả là một hệ thống phần mềm có cấu trúc đầy đủ cho bài toán SaaS POS tích hợp đặt món qua mã QR, trong đó ranh giới dịch vụ, quyền sở hữu dữ liệu và cơ chế giao tiếp được xác định rõ và có minh chứng đối chiếu.
```

## 6. Danh sách từ khóa tiếng Việt

Sao chép dòng dưới đây vào ô **Danh sách các từ khóa tiếng Việt**:

```text
SaaS POS, đặt món qua mã QR, kiến trúc vi dịch vụ, đa đơn vị thuê bao, kiến trúc hướng sự kiện, Kafka, Redis, Keycloak, VietQR, SePay
```

## 7. Danh sách từ khóa tiếng Anh

Sao chép dòng dưới đây vào ô **Danh sách các từ khóa tiếng Anh**:

```text
SaaS POS, QR code ordering, microservices architecture, multi-tenancy, event-driven architecture, Apache Kafka, Redis, Keycloak, VietQR, SePay
```

## 8. Kiểm tra trước khi nộp chính thức

- [ ] File PDF là bản chỉnh sửa cuối cùng và không đặt mật khẩu.
- [ ] File ZIP LaTeX có đủ source và asset cần để biên dịch.
- [ ] Tóm tắt đã được dán đầy đủ, không chứa lệnh LaTeX.
- [ ] Từ khóa tiếng Việt và tiếng Anh đã được điền.
- [ ] Tên đề tài, họ tên, MSSV và thông tin GVHD trên form khớp hồ sơ.
- [ ] Biên bản Hội đồng và Biên bản chỉnh sửa được nộp trên Drive của Khoa, không đưa vào form này.
- [ ] Chỉ bấm **Nộp chính thức** sau khi xác nhận đây là phiên bản chỉnh sửa cuối cùng gửi GVHD kiểm tra.
