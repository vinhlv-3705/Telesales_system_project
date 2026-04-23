// Telesales Logic Module for MCP Server

type CallStatus = "chot_don" | "tu_choi" | "moi" | "upsale";

interface CustomerCallLog {
  id: string;
  customerName: string;
  phoneNumber: string;
  callStatus: CallStatus;
  revenue: number;
  callbackDate: string;
  note: string;
  createdAt: string;
}

const callStatuses: CallStatus[] = ["chot_don", "tu_choi", "moi", "upsale"];

class TelesalesManager {
  private callLogs: CustomerCallLog[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("telesales-crm-call-logs");
      if (saved) {
        try {
          this.callLogs = JSON.parse(saved);
        } catch (error) {
          this.setDefaultData();
        }
      } else {
        this.setDefaultData();
      }
      return;
    }

    this.setDefaultData();
  }

  private setDefaultData() {
    this.callLogs = [
      {
        id: "1",
        customerName: "Nguyen Van An",
        phoneNumber: "0901000001",
        callStatus: "moi",
        revenue: 0,
        callbackDate: "2026-04-24",
        note: "Khach hang can them thong tin san pham",
        createdAt: "2026-04-23",
      },
      {
        id: "2",
        customerName: "Tran Thi Binh",
        phoneNumber: "0901000002",
        callStatus: "chot_don",
        revenue: 3500000,
        callbackDate: "2026-04-23",
        note: "Da xac nhan don hang",
        createdAt: "2026-04-23",
      },
    ];
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      localStorage.setItem("telesales-crm-call-logs", JSON.stringify(this.callLogs));
    }
  }

  logCall(params: {
    customerName: string;
    phoneNumber: string;
    callStatus: CallStatus;
    revenue: number;
    callbackDate: string;
    note?: string;
  }): CustomerCallLog {
    const { customerName, phoneNumber, callStatus, revenue, callbackDate, note = "" } = params;
    if (!customerName.trim() || !phoneNumber.trim() || !callbackDate.trim() || !callStatuses.includes(callStatus) || revenue < 0) {
      throw new Error("Invalid telesales call data");
    }

    const callLog: CustomerCallLog = {
      id: Date.now().toString(),
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim(),
      callStatus,
      revenue,
      callbackDate,
      note: note.trim(),
      createdAt: new Date().toISOString().split("T")[0],
    };

    this.callLogs.unshift(callLog);
    this.saveToStorage();
    return callLog;
  }

  getCustomerInfo(customerName: string) {
    const keyword = customerName.trim().toLowerCase();
    return this.callLogs.filter((item) => item.customerName.toLowerCase().includes(keyword));
  }

  updateStatus(id: string, callStatus: CallStatus, revenue?: number, callbackDate?: string): CustomerCallLog | null {
    const callLog = this.callLogs.find((item) => item.id === id);
    if (!callLog) return null;
    if (!callStatuses.includes(callStatus)) {
      throw new Error("Invalid call status");
    }

    callLog.callStatus = callStatus;
    if (typeof revenue === "number") {
      if (revenue < 0) {
        throw new Error("Revenue must be non-negative");
      }
      callLog.revenue = revenue;
    }
    if (typeof callbackDate === "string" && callbackDate.trim()) {
      callLog.callbackDate = callbackDate.trim();
    }

    this.saveToStorage();
    return callLog;
  }

  getDashboardStats() {
    const totalCalls = this.callLogs.length;
    const totalRevenue = this.callLogs.reduce((sum, item) => sum + item.revenue, 0);
    const statusBreakdown = this.callLogs.reduce((acc, item) => {
      acc[item.callStatus] = (acc[item.callStatus] || 0) + 1;
      return acc;
    }, {} as Record<CallStatus, number>);

    return {
      totalCalls,
      totalRevenue,
      statusBreakdown,
      nextCallbacks: this.callLogs
        .filter((item) => item.callbackDate)
        .sort((a, b) => a.callbackDate.localeCompare(b.callbackDate))
        .slice(0, 5),
    };
  }
}

export { TelesalesManager, callStatuses };
export type { CustomerCallLog, CallStatus };
