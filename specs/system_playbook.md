---
description: Tài liệu tổng hợp công nghệ, kiến trúc và logic nghiệp vụ để tham khảo khi phát triển/sửa hệ thống.
---

# System Playbook — Telesales CRM

## 1. Mục đích
Tài liệu này là “nguồn sự thật” để:

- Khi sửa/tạo tính năng, AI và dev hiểu đúng nghiệp vụ và các ràng buộc kỹ thuật hiện có.
- Khi có thay đổi, cần update đồng thời code và tài liệu này (và `specs/requirements.md`).

## 2. Tech Stack & Runtime

- **Framework**: Next.js App Router (đang dùng Next `16.2.4`).
- **UI**:
  - Tailwind CSS
  - Lucide React (icons)
  - Framer Motion (animation)
  - Recharts (dashboard charts)
- **Database**: Supabase PostgreSQL.
- **ORM**: Prisma `7.8.0`.
- **Deployment**: Vercel.

### 2.1 Prisma v7 note (quan trọng)
Project đang ở Prisma v7 nên cách cấu hình datasource khác các phiên bản cũ.

- `prisma/schema.prisma` datasource chỉ khai `provider` (không hardcode `url`).
- Prisma CLI đọc `DATABASE_URL` từ `prisma.config.ts`.
- Runtime Prisma dùng **driver adapter**:
  - `@prisma/adapter-pg`
  - `pg`

File liên quan:

- `prisma.config.ts`
- `lib/prisma.ts`

## 3. Environment Variables

### 3.1 Local
- `.env` dùng cho local dev, migrate, seed.

Khuyến nghị:

- Local migrate/seed: dùng **Direct connection (5432)**.

### 3.2 Vercel (Production)
- Vercel không dùng `.env` trong repo, phải set trong `Project → Settings → Environment Variables`.

Khuyến nghị cho serverless:

- Runtime: Supabase **Transaction pooler (6543)**
  - `DATABASE_URL=...pooler...:6543/postgres?pgbouncer=true&sslmode=require`

### 3.3 TLS workaround
Trong một số môi trường, kết nối PG có thể lỗi TLS:

- `P1011 self-signed certificate in certificate chain`

Workaround hiện tại (đã support trong `lib/prisma.ts`):

- `PG_SSL_REJECT_UNAUTHORIZED=false`

Ghi chú:

- Đây là workaround làm giảm bảo mật TLS. Khi ổn định, nên tìm cách bỏ workaround này.

## 4. Authentication & Authorization

### 4.1 Cơ chế đăng nhập
API login:

- `POST /api/auth/login`

Sau login, server set cookie:

- `telesales_session`
- `telesales_role`
- `telesales_user`

Logout:

- `POST /api/auth/logout`

Auth check:

- `GET /api/auth/me`

### 4.2 Middleware bảo vệ route
File: `middleware.ts`

- Public paths: `/login`, `/api/auth/login`, `/api/auth/logout`
- Admin-only prefix: `/admin`

Quy ước quan trọng:

- Request `/api/*` khi thiếu session/role phải trả **JSON 401/403**, không redirect HTML.
  - Tránh lỗi frontend parse JSON (`Unexpected token '<'`).

## 5. Domain Model (Prisma)

Enums:

- `Role`: `ADMIN`, `AGENT`
- `CallStatus`: `CHOT_DON`, `TU_CHOI`, `MOI`, `UPSALE`, `HEN_GOI_LAI`

Models:

- `User`
  - `username`, `password`, `role`
  - lock fields: `isLocked`, `lockedAt`
- `Customer`
  - Thông tin khách hàng: `customerCode`, `fullName`, `phone`, `address`, `area`, `groupCode`, ...
  - Phân công: `assignedToId` -> `User`
  - Trạng thái: `status`, `callbackTime`
  - Chăm sóc/đơn hàng:
    - `birthday` (DateTime?): sinh nhật khách
    - `lastOrderAt` (DateTime?): ngày chốt đơn gần nhất
    - `productsPurchased` (string?): danh sách mặt hàng đã lấy (nhập dạng chuỗi, ngăn cách bằng dấu phẩy)
  - Kết nối:
    - `zaloConnected` (boolean): trạng thái kết nối Zalo (default `false`)
  - `customerId`, `agentId` -> `User`
  - `callStatus` (enum), `timestamp`

## 6. Business Logic Notes

### 6.1 Status mapping
Trong một số API admin, có mapping giữa:

- Nhãn tiếng Việt: `Mới`, `Hẹn gọi lại`, `Chốt đơn`, `Từ chối`, `Upsell`
- Enum code: `MOI`, `HEN_GOI_LAI`, `CHOT_DON`, `TU_CHOI`, `UPSALE`

Khi filter hoặc hiển thị cần handle cả 2 format.

Ghi chú:

- Backend khi ghi nhận call log sẽ persist `Customer.status` theo **enum code** (`MOI`, `HEN_GOI_LAI`, `CHOT_DON`, `TU_CHOI`, `UPSALE`) để tránh dữ liệu bị trộn format.

### 6.2 Seed dữ liệu
- Seed script: `prisma/seed.ts`
- Dữ liệu seed tạo:
  - admin
  - agents user1..user4
  - ingest khách hàng từ CSV
  - phân bổ khách cho agents

### 6.3 Telesales UI rules (Currently Calling)
- Luôn hiển thị: `Status`, `Kết nối Zalo`, `Sinh nhật`.
- Quick actions: copy `SĐT`.
- Chỉ hiển thị khi status là `Chốt đơn` hoặc `Upsell`:
  - `Chốt đơn gần nhất`
  - `Mặt hàng đã lấy`
  - `Lịch gọi tiếp theo`
    - Default +1 tháng tính từ `lastOrderAt` (ngày chốt đơn gần nhất)

Layout notes:

- `Sinh nhật` hiển thị dạng chip (cạnh khu vực Zalo).
- `Chốt đơn gần nhất` và `Lịch gọi tiếp theo` là **2 card tách biệt**.
- `Ghi chú` hiển thị ở cuối panel.

### 6.4 Call Interface validation rules
- `Chốt đơn` / `Upsell`:
  - Bắt buộc `Doanh thu > 0`
  - Bắt buộc `Ghi chú`
- `Từ chối`:
  - Bắt buộc `Ghi chú`
- `Hẹn gọi lại`:
  - Bắt buộc `Ngày hẹn lại`
  - Không nhập `Giờ hẹn lại`
- Message validate được hiển thị inline ngay dưới phần chọn `Kết quả cuộc gọi`.

### 6.5 Telesales processed filter
- Ở tab `Đã xử lý`, UI có filter `Tất cả` / `Hôm nay` / `Tuần này`.
- Rule tính thời gian:
  - `Chốt đơn`: dùng `Customer.lastOrderAt`
  - Status còn lại: dùng `lastInteractionAt` (timestamp của call log gần nhất)

### 6.6 Theme toggle
- Telesales chỉ hỗ trợ toggle `Dark/Light`.
- Theme key: `expense-tracker-theme`.

## 7. Key API Endpoints

Public/auth:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Agent:

- `GET /api/customers`
  - Response: mỗi customer có thêm:
    - `birthday`, `lastOrderAt`, `productsPurchased` để hiển thị ở panel chi tiết
    - `zaloConnected`
    - `lastInteractionAt` (ISO timestamp của call log gần nhất, nếu có)
- `POST /api/call-logs` (nếu có trong dự án) / các route ghi nhận call log
  - Body có thể gửi thêm `productsPurchased` khi `status` là `Chốt đơn`/`Upsell`
  - Khi `status` là `Chốt đơn`/`Upsell`, backend sẽ update `Customer.lastOrderAt` và `Customer.productsPurchased`

Admin:

- `GET /api/admin/customers`
  - Query: `page`, `pageSize`, `q`, `assignedToId`, `status`, `area`
  - Response: `{ items, total, page, pageSize }`

- `POST /api/admin/customers`
  - Auth: cookie `telesales_session`, role `admin`
  - Body:
    - `customerCode` (string, required)
    - `customerName` (string, required)
    - `phoneNumber` (string, required)
    - `address` (string, optional)
    - `area` (string, optional)
    - `groupCode` (string, optional)
    - `partner` (string, optional)
  - Response: `{ item }` (shape giống row ở màn Quản lý Khách hàng)
  - UI: tạo xong sẽ prepend record mới lên đầu danh sách (trang 1)
- `POST /api/admin/customers/assign`
- `POST /api/admin/customers/delete`
- `GET /api/agents`
- `POST /api/admin/users/update`
- `GET /api/admin/call-logs`

## 8. Quy ước khi sửa code

- Nếu đổi model/schema:
  - chạy migrate local
  - commit `prisma/migrations/*`
  - deploy xong apply `migrate deploy` cho DB production (tuỳ quy trình)
  - chạy lại `prisma generate` để cập nhật Prisma Client types
- Nếu thêm env var mới:
  - update tài liệu này
  - update `specs/requirements.md` nếu ảnh hưởng nghiệp vụ

### 8.1 Next.js App Router: Suspense khi dùng search params

Khi dùng các hook như `useSearchParams()` / `usePathname()` trong page App Router, cần đảm bảo code được bọc trong `Suspense`.

Nếu không, build trên Vercel có thể fail ở bước prerender với lỗi:

- `useSearchParams() should be wrapped in a suspense boundary`

Pattern khuyến nghị:

- Default export page: bọc `Suspense`.
- Đưa phần dùng `useSearchParams()` vào component con (ví dụ `AdminCustomersInner`).

## 10. Quy trình Deploy (Git + Vercel + Supabase)

### 10.1 Nguyên tắc

- Vercel sẽ **tự động deploy** khi bạn push code lên GitHub.
- Thông thường:
  - Push lên **branch Production** (thường là `main`) => **Production Deployment**.
  - Push lên branch khác => **Preview Deployment** (mỗi branch có 1 preview URL).

Để kiểm tra cấu hình branch production:

- Vercel Project → `Settings → Git` → `Production Branch`.

### 10.2 Workflow khuyến nghị (feature branch → PR → main)

1) Tạo branch từ `main`:

- `feature/<ten-tinh-nang>`

2) Code + commit + push branch:

- Vercel sẽ tạo **Preview Deployment**.

3) Test trên preview URL:

- Login admin/agent
- Check API chính (`/api/agents`, `/api/admin/customers`, dashboard)

4) Tạo Pull Request về `main`.

5) Merge PR vào `main`:

- Vercel sẽ tạo **Production Deployment**.

### 10.3 Environment Variables trên Vercel

- Vercel Project → `Settings → Environment Variables`

Biến bắt buộc:

- `DATABASE_URL`

Khuyến nghị cho Vercel runtime (serverless):

- Supabase **Transaction pooler**:
  - Host `...pooler.supabase.com`
  - Port `6543`
  - Có query params: `pgbouncer=true&sslmode=require`

Workaround TLS (nếu gặp P1011):

- `PG_SSL_REJECT_UNAUTHORIZED=false`

Lưu ý:

- Nếu muốn preview cũng chạy đầy đủ, set env cho cả `Preview` và `Production`.

### 10.4 Prisma migration khi deploy

- Khi thay đổi `prisma/schema.prisma`:
  - Local: chạy `prisma migrate dev` để tạo migration.
  - Commit `prisma/migrations/*` lên Git.

DB production (Supabase):

- Apply migrations bằng `prisma migrate deploy` trỏ vào DB production.

Ghi chú:

- Không chạy seed tự động trong Vercel.
- Seed (`prisma db seed`) dùng cho local hoặc thao tác chủ động khi cần (cẩn thận xoá dữ liệu).

### 10.5 Checklist sau deploy

- Mở production URL.
- Login admin.
- Test nhanh:
  - `/api/auth/me`
  - `/api/agents`
  - `/api/admin/customers?page=1&pageSize=5`
- Nếu UI báo lỗi, kiểm tra:
  - Vercel Project → `Logs`
  - Lọc theo endpoint `/api/...` để lấy stacktrace.

## 11. TODO / Known Risks

- TLS workaround trên Vercel (`PG_SSL_REJECT_UNAUTHORIZED=false`) cần đánh giá lại.
- Next.js warning về deprecate `middleware` convention: cần theo dõi hướng dẫn Next.js để đổi sang cơ chế mới khi bắt buộc.
