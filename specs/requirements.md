# Tài liệu Đặc tả Telesales CRM (Refactor Baseline)

## 1. Tổng quan
Ứng dụng được chuyển đổi từ mô hình "Quản lý chi tiêu" sang "Telesales CRM", tập trung quản lý nhật ký cuộc gọi bán hàng, trạng thái xử lý khách hàng và doanh thu phát sinh theo từng cuộc gọi. Tài liệu này là baseline đặc tả cho giai đoạn refactor code.

## 2. Mục tiêu refactor nghiệp vụ
### 2.1 Mapping khái niệm cũ -> mới
- **Transaction (Giao dịch)** -> **CallLog (Nhật ký cuộc gọi)**
- **Category (Danh mục)** -> **CallStatus (Trạng thái cuộc gọi)**
- **Amount (Số tiền)** -> **Revenue (Doanh thu cuộc gọi)**

### 2.2 Phạm vi thay đổi
- Đổi tên thực thể, field, component, storage key và mô tả UI sang ngữ cảnh telesales.
- Giữ nguyên kiến trúc kỹ thuật hiện tại (Next.js App Router + Local Storage) để giảm rủi ro trong refactor.
- Giữ nguyên flow CRUD + lọc + tổng hợp số liệu, nhưng đổi ngữ nghĩa dữ liệu.

## 3. Kiến trúc hệ thống
### 3.1 Công nghệ sử dụng
- **Frontend Framework**: Next.js 14 với App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **State Management**: React Hooks (useState, useEffect)
- **Data Storage**: Local Storage (trình duyệt)

### 3.2 Cấu trúc thư mục hiện tại (phục vụ refactor)
```
telesales-system-project/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AddTransactionForm.tsx      # sẽ refactor thành AddCallLogForm
│   ├── EditTransactionModal.tsx    # sẽ refactor thành EditCallLogModal
│   ├── ExpenseChart.tsx            # sẽ refactor thành RevenueChart
│   ├── SummaryCards.tsx
│   └── TransactionList.tsx         # sẽ refactor thành CallLogList
├── context7-server/
├── specs/
└── public/
```

## 4. Mô hình dữ liệu nghiệp vụ mới
### 4.1 Thực thể CallLog
- **id**: string (unique identifier)
- **customerName**: string (tên khách hàng)
- **phoneNumber**: string (số điện thoại liên hệ)
- **callStatus**: "chot_don" | "tu_choi" | "moi" | "upsale"
- **revenue**: number (doanh thu phát sinh từ cuộc gọi, >= 0)
- **note**: string (ghi chú kết quả trao đổi)
- **callDate**: string (ngày gọi, định dạng ISO hoặc yyyy-mm-dd)
- **createdAt**: string (thời gian tạo bản ghi)
- **updatedAt**: string (thời gian cập nhật bản ghi)

### 4.2 Giá trị mặc định của CallStatus
- `chot_don`: Chốt đơn
- `tu_choi`: Từ chối
- `moi`: Mới
- `upsale`: Upsale

## 5. Logic nghiệp vụ telesales
### 5.1 CRUD CallLog
- **Thêm nhật ký cuộc gọi**: nhập thông tin khách hàng, trạng thái, doanh thu và ghi chú.
- **Sửa nhật ký cuộc gọi**: cập nhật trạng thái xử lý hoặc doanh thu sau follow-up.
- **Xóa nhật ký cuộc gọi**: xác nhận trước khi xóa.
- **Xem danh sách nhật ký cuộc gọi**: hiển thị theo thứ tự mới nhất.

### 5.2 Quy tắc dữ liệu
- `revenue` bắt buộc là số không âm.
- Nếu `callStatus = "tu_choi"` thì `revenue` mặc định là 0 (cho phép chỉnh nếu nghiệp vụ đặc biệt).
- Nếu `callStatus = "chot_don"` hoặc `"upsale"` thì ưu tiên yêu cầu nhập `revenue > 0`.
- `phoneNumber` chỉ chứa số hoặc ký tự `+`, có kiểm tra độ dài tối thiểu.

### 5.3 Tính toán dashboard
- **Tổng cuộc gọi**: tổng số CallLog.
- **Tổng doanh thu**: tổng `revenue` của toàn bộ CallLog.
- **Doanh thu theo trạng thái**: gom nhóm doanh thu theo `callStatus`.
- **Tỷ lệ chuyển đổi**: số cuộc gọi `chot_don` / tổng cuộc gọi.
- **Tỷ lệ upsale**: số cuộc gọi `upsale` / số cuộc gọi đã chốt.

### 5.4 Lọc và tìm kiếm
- Lọc theo tháng gọi (all/current/previous).
- Lọc theo `callStatus`.
- Tìm kiếm theo `customerName`, `phoneNumber`, `note`.
- Kết hợp nhiều điều kiện lọc để phục vụ theo dõi hiệu suất telesales.

## 6. Chức năng chính sau refactor
### 6.1 Dashboard Telesales CRM
- Hiển thị thẻ tóm tắt: Tổng cuộc gọi, Tổng doanh thu, Tỷ lệ chốt.
- Biểu đồ tròn/cột cho phân bổ cuộc gọi và doanh thu theo trạng thái.
- Danh sách cuộc gọi gần đây.

### 6.2 Quản lý CallLog
- **Thêm CallLog**: form nhập liệu có validation.
- **Sửa CallLog**: modal edit với dữ liệu pre-filled.
- **Xóa CallLog**: confirm dialog trước khi xóa.
- **Lọc CallLog**: theo tháng, trạng thái, từ khóa.

### 6.3 Xuất dữ liệu
- Export danh sách CallLog ra file CSV.
- Định dạng CSV đề xuất: `CallDate,CustomerName,PhoneNumber,CallStatus,Revenue,Note`.

## 7. Lưu trữ dữ liệu
- Sử dụng localStorage của trình duyệt.
- **Storage key mới**: `"telesales-crm-calllogs"`.
- Format: JSON array of `CallLog`.
- Tự động load/save khi có thay đổi.
- Có bước migrate dữ liệu key cũ `"expense-tracker-transactions"` sang key mới (nếu tồn tại).

## 8. MCP Integration (Model Context Protocol)
### 8.1 Tools
- `get_call_logs`: Lấy danh sách tất cả nhật ký cuộc gọi.
- `add_call_log`: Thêm CallLog mới.
- `update_call_log`: Cập nhật CallLog theo ID.
- `delete_call_log`: Xóa CallLog theo ID.
- `get_call_summary`: Lấy số liệu tổng hợp telesales.

### 8.2 Resources
- `telesales-crm://call-logs`: Danh sách CallLog JSON
- `telesales-crm://summary`: Tóm tắt số liệu telesales JSON
- `telesales-crm://status-breakdown`: Phân bổ theo trạng thái JSON
- `telesales-crm://export/csv`: Dữ liệu CSV

### 8.3 Context Information
- Folder Map: mô tả cấu trúc thư mục và mục đích thành phần.
- Business Logic: giải thích logic cốt lõi của Telesales CRM.
- Refactor Mapping: ánh xạ tên cũ -> tên mới phục vụ migration code.

## 9. Kế hoạch refactor đề xuất
1. **Đổi tên domain model**: Transaction -> CallLog, category -> callStatus, amount -> revenue.
2. **Refactor UI component**: đổi tên component và label hiển thị theo ngữ cảnh telesales.
3. **Refactor logic tổng hợp**: thay công thức thu/chi bằng KPI telesales.
4. **Refactor localStorage + migration**: áp dụng key mới và cơ chế migrate key cũ.
5. **Refactor MCP server contracts**: đổi tên tools/resources và schema dữ liệu.
6. **Regression test**: kiểm tra toàn bộ luồng CRUD, lọc, export, dashboard.

## 10. Yêu cầu phi chức năng
- Responsive design (mobile-friendly) cho nhân viên telesales thao tác nhanh.
- Performance: dashboard phản hồi nhanh với dữ liệu lớn.
- Accessibility: hỗ trợ keyboard navigation và screen reader.
- Data safety: không lưu thông tin nhạy cảm ngoài phạm vi cần thiết ở client.
