# Tài liệu Yêu cầu Nghiệp vụ Telesales CRM

## 1. Tổng quan
Hệ thống là một Telesales CRM tối giản nhằm:

- Quản lý danh sách khách hàng và phân công cho nhân viên telesales.
- Ghi nhận nhật ký cuộc gọi (kết quả, ghi chú, doanh thu, lịch hẹn gọi lại).
- Cung cấp bảng điều khiển (dashboard) cho admin theo dõi hiệu suất và doanh thu.

Ứng dụng chạy bằng Next.js App Router, backend là các API route trong `app/api/*`, dữ liệu lưu trên PostgreSQL (Supabase) thông qua Prisma.

## 2. Phạm vi nghiệp vụ hiện tại

### 2.1 Nhóm người dùng

- **Admin**
  - Quản trị tổng quan.
  - Quản lý khách hàng (lọc, phân công, xoá hàng loạt).
  - Quản lý nhân viên (khoá/mở khoá, reset/set mật khẩu).
  - Xem dashboard & báo cáo.
- **Agent (Telesales)**
  - Nhận danh sách khách được phân công.
  - Ghi nhận call log và cập nhật trạng thái xử lý.

### 2.2 Luồng nghiệp vụ chính

#### 2.2.1 Đăng nhập

- Đăng nhập bằng username/password.
- Hệ thống set cookie phiên:
  - `telesales_session`
  - `telesales_role`
  - `telesales_user`

#### 2.2.2 Quản lý khách hàng (Admin)

- Xem danh sách khách hàng theo trang (pagination).
- Lọc theo:
  - nhân viên phụ trách
  - trạng thái
  - địa bàn
  - từ khoá (mã KH, tên KH, SĐT)
- Bulk actions:
  - phân công cho nhân viên
  - xoá hàng loạt

#### 2.2.3 Ghi nhận cuộc gọi (Agent)

- Chọn kết quả cuộc gọi (call status).
- Nhập ghi chú.
- Nếu “Chốt đơn” / “Upsell” thì nhập doanh thu.
- Nếu “Hẹn gọi lại” thì chọn ngày/giờ hẹn.

#### 2.2.4 Dashboard/Báo cáo (Admin)

- Tổng hợp số liệu theo ngày/khoảng ngày.
- Xu hướng cuộc gọi và doanh thu.
- Xuất CSV (trong phần reports) theo bộ lọc.

## 3. Mô hình dữ liệu (Prisma)

### 3.1 Enum

- `Role`: `ADMIN`, `AGENT`
- `CallStatus`: `CHOT_DON`, `TU_CHOI`, `MOI`, `UPSALE`, `HEN_GOI_LAI`

### 3.2 Entities

- **User**
  - `username`, `password`, `role`
  - `isLocked`, `lockedAt` (phục vụ admin lock/unlock)
- **Customer**
  - mã khách, tên, SĐT, địa bàn, địa chỉ
  - `status` đang lưu dạng text (có thể là nhãn tiếng Việt hoặc enum code tuỳ dữ liệu)
  - `assignedToId` liên kết sang `User`
- **CallLog**
  - liên kết `customerId` + `agentId`
  - `callStatus` (enum)
  - `timestamp`

## 4. API chính

- `POST /api/auth/login` / `POST /api/auth/logout` / `GET /api/auth/me`
- `GET /api/agents`
- `GET /api/customers` (màn hình telesales)

Admin:

- `GET /api/admin/customers`
- `POST /api/admin/customers/assign`
- `POST /api/admin/customers/delete`
- `POST /api/admin/users/update`
- `GET /api/admin/call-logs` (dashboard)

## 5. Nền tảng triển khai

- **Database**: Supabase PostgreSQL.
- **Deploy**: Vercel.

Ghi chú:

- Khi chạy trên Vercel (serverless), khuyến nghị dùng Supabase **Transaction pooler** cho `DATABASE_URL`.

## 6. Yêu cầu phi chức năng

- Performance:
  - Danh sách khách hàng có thể lớn, UI cần tránh render quá nhiều item (đã áp dụng virtualization cho một số list).
- Stability:
  - API không được trả HTML cho request `/api/*` (để frontend luôn parse JSON đúng).
- Security:
  - Không commit `.env` lên repo.
  - Mật khẩu DB phải URL-encode khi cần.
