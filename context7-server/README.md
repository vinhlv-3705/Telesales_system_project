# Telesales CRM MCP Server

MCP (Model Context Protocol) Server cho ứng dụng Telesales CRM, cho phép AI agents truy cập và thao tác với dữ liệu nhật ký cuộc gọi.

## Cài đặt

```bash
npm install
```

## Chạy Server

```bash
npm start
```

## Tools có sẵn

### log_call
Tạo nhật ký cuộc gọi mới.

**Parameters**:
- `customerName` (string): Tên khách hàng
- `phoneNumber` (string): Số điện thoại
- `callStatus` (string): `chot_don` | `tu_choi` | `moi` | `upsale`
- `revenue` (number): Doanh thu
- `callbackDate` (string): Ngày hẹn lại
- `note` (string, optional): Ghi chú cuộc gọi

**Response**: Object nhật ký cuộc gọi vừa tạo

### get_customer_info
Lấy thông tin cuộc gọi của khách hàng theo tên.

**Parameters**:
- `customerName` (string): Từ khóa tên khách hàng

**Response**: Danh sách cuộc gọi của khách hàng

### update_status
Cập nhật trạng thái cuộc gọi.

**Parameters**:
- `id` (string): ID nhật ký cuộc gọi
- `callStatus` (string): `chot_don` | `tu_choi` | `moi` | `upsale`
- `revenue` (number, optional): Doanh thu cập nhật
- `callbackDate` (string, optional): Ngày hẹn lại mới

**Response**: Object nhật ký cuộc gọi sau khi cập nhật (hoặc `null`)

## Resources có sẵn

- `telesales://dashboard-stats`: JSON thống kê dashboard telesales

## Kết nối với VS Code

Để kết nối MCP Server này với VS Code:

1. **Cài đặt VS Code Extension hỗ trợ MCP** (ví dụ: GitHub Copilot Chat với MCP support)

2. **Cấu hình MCP Server** trong settings.json của VS Code:
```json
{
  "mcp": {
    "servers": {
      "telesales-crm": {
        "command": "node",
        "args": ["path/to/context7-server/server.js"],
        "cwd": "path/to/telesales-crm/context7-server"
      }
    }
  }
}
```

3. **Khởi động lại VS Code** để áp dụng cấu hình

4. **Sử dụng trong Chat**: AI agents giờ có thể truy cập tools và resources của Telesales CRM

## Kiến trúc

- `telesalesLogic.ts`: Logic xử lý nhật ký cuộc gọi
- `tools.ts`: Định nghĩa các tools cho MCP
- `resources.ts`: Định nghĩa các resources cho MCP
- `server.js`: MCP server implementation
- `mcp-config.json`: Cấu hình context và folder map
