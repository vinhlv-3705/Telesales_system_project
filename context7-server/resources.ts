// MCP Resources for Telesales CRM

import { TelesalesManager } from "./telesalesLogic";

const manager = new TelesalesManager();

export const resources = {
  dashboard_stats: {
    uri: "telesales://dashboard-stats",
    name: "Telesales Dashboard Stats",
    description: "Realtime dashboard statistics for telesales calls",
    mimeType: "application/json",
    content: () => JSON.stringify(manager.getDashboardStats(), null, 2)
  }
};
