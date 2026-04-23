// MCP Tools for Telesales CRM

import { TelesalesManager } from "./telesalesLogic";

const manager = new TelesalesManager();

export const tools = {
  log_call: {
    name: "log_call",
    description: "Log a telesales call",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        phoneNumber: { type: "string" },
        callStatus: { type: "string", enum: ["chot_don", "tu_choi", "moi", "upsale"] },
        revenue: { type: "number" },
        callbackDate: { type: "string" },
        note: { type: "string" }
      },
      required: ["customerName", "phoneNumber", "callStatus", "revenue", "callbackDate"]
    },
    handler: (params: any) => manager.logCall(params)
  },

  get_customer_info: {
    name: "get_customer_info",
    description: "Get customer call information by customer name",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" }
      },
      required: ["customerName"]
    },
    handler: (params: any) => manager.getCustomerInfo(params.customerName)
  },

  update_status: {
    name: "update_status",
    description: "Update call status, revenue, or callback date",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        callStatus: { type: "string", enum: ["chot_don", "tu_choi", "moi", "upsale"] },
        revenue: { type: "number" },
        callbackDate: { type: "string" }
      },
      required: ["id", "callStatus"]
    },
    handler: (params: any) => manager.updateStatus(params.id, params.callStatus, params.revenue, params.callbackDate)
  }
};
