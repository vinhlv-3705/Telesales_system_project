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
  - thông tin khách
  - `status` là text (có thể chứa nhãn tiếng Việt hoặc enum code)
  - `assignedToId` → `User`
- `CallLog`
  - `customerId`, `agentId` → `User`
  - `callStatus` (enum), `timestamp`

## 6. Business Logic Notes

### 6.1 Status mapping
Trong một số API admin, có mapping giữa:

- Nhãn tiếng Việt: `Mới`, `Hẹn gọi lại`, `Chốt đơn`, `Từ chối`, `Upsell`
- Enum code: `MOI`, `HEN_GOI_LAI`, `CHOT_DON`, `TU_CHOI`, `UPSALE`

Khi filter hoặc hiển thị cần handle cả 2 format.

### 6.2 Seed dữ liệu
- Seed script: `prisma/seed.ts`
- Dữ liệu seed tạo:
  - admin
  - agents user1..user4
  - ingest khách hàng từ CSV
  - phân bổ khách cho agents

## 7. Key API Endpoints

Public/auth:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Agent:

- `GET /api/customers`
- `POST /api/call-logs` (nếu có trong dự án) / các route ghi nhận call log

Admin:

- `GET /api/admin/customers`
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
- Nếu thêm env var mới:
  - update tài liệu này
  - update `specs/requirements.md` nếu ảnh hưởng nghiệp vụ

## 9. TODO / Known Risks

- TLS workaround trên Vercel (`PG_SSL_REJECT_UNAUTHORIZED=false`) cần đánh giá lại.
- Next.js warning về deprecate `middleware` convention: cần theo dõi hướng dẫn Next.js để đổi sang cơ chế mới khi bắt buộc.
