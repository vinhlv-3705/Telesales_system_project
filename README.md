# Telesales CRM

Ứng dụng Telesales CRM (Next.js + Prisma + SQLite) hỗ trợ:

- Quản lý danh sách khách hàng theo **Trình dược viên (User/Agent)**
- Ghi nhật ký cuộc gọi (CallLogs)
- Admin dashboard: thống kê, lọc, export CSV

## Yêu cầu môi trường

- Node.js: khuyến nghị **Node 22 LTS**
- NPM

## Cài đặt lần đầu

```bash
npm install
```

## Thiết lập Database (Prisma + SQLite)

### 1) Generate Prisma Client

```bash
npx prisma generate
```

### 2) Migrate DB

```bash
npx prisma migrate dev
```

### 3) Seed dữ liệu (Data Ingestion)

Seed sẽ:

- Xoá sạch dữ liệu cũ (CallLog -> Customer -> User)
- Tạo User Admin + 4 User Agent
- Đọc file `danh_sach_khach_hang_full.csv` và nạp khách hàng
- Chia đều khách hàng cho 4 Agent và set `assignedToId`

```bash
npx prisma db seed
```

## Chạy dev

```bash
npm run dev
```

Mặc định:

- App: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin/dashboard

Nếu port 3000 đang bận, Next.js sẽ tự chọn port khác và in ra trên terminal.

## Build & chạy production

```bash
npm run build
npm run start
```

## Tài khoản demo

### Admin

- Username: `admin`
- Password: `admin123`

### Agents

- Username: `user1` / Password: `password123`
- Username: `user2` / Password: `password123`
- Username: `user3` / Password: `password123`
- Username: `user4` / Password: `password123`
