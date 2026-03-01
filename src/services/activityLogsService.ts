import api from "./api";

export interface ActivityLog {
  id: number;
  user_id: string;
  employee_id: string | null;
  user_name: string | null;
  action: string;
  page: string;
  entity_type: string;
  entity_id: string | null;
  build: string | null;
  company_name: string | null;
  description: string | null;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface ActivityLogStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  activeUsers: number;
  topPage: string | null;
  corrections: number;
}

export interface StatusSummaryPoint {
  status: string;
  count: number;
}

export interface CorrectionSummary {
  build: string;
  company_name: string | null;
  first_name: string | null;
  nick_name: string | null;
  correction_count: number;
  last_correction: string;
}

export interface LogListResponse {
  logs: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const activityLogsService = {
  getStats: async (params?: {
    taxMonth?: number;
    taxYear?: number;
  }): Promise<ActivityLogStats> => {
    const response = await api.get<{
      success: boolean;
      data: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        activeUsersToday: number;
        topPage: { page: string; count: number } | null;
        correctionsToday: number;
      };
    }>("/activity-logs/stats", { params });

    const d = response.data.data;
    return {
      todayCount: d.today || 0,
      weekCount: d.thisWeek || 0,
      monthCount: d.thisMonth || 0,
      activeUsers: d.activeUsersToday || 0,
      topPage: d.topPage?.page || null,
      corrections: d.correctionsToday || 0,
    };
  },

  getList: async (params: {
    page?: number;
    limit?: number;
    userId?: string;
    pageName?: string;
    action?: string;
    taxMonth?: number;
    taxYear?: number;
    build?: string;
    search?: string;
    detailsStatus?: string;
  }): Promise<LogListResponse> => {
    const response = await api.get<{ success: boolean; data: LogListResponse }>(
      "/activity-logs/list",
      { params },
    );
    return response.data.data;
  },

  getChartStatusSummary: async (params: {
    date?: string;
    days?: string;
    pageName?: string;
    reviewer?: string;
    accountant?: string;
    taxMonth?: number;
    taxYear?: number;
  }): Promise<StatusSummaryPoint[]> => {
    const response = await api.get<{
      success: boolean;
      data: StatusSummaryPoint[];
    }>("/activity-logs/chart-status-summary", { params });
    return response.data.data;
  },

  exportLogsToExcel: async (params: {
    startDate?: string;
    endDate?: string;
    reviewer?: string;
    accountant?: string;
    taxMonth?: number;
    taxYear?: number;
  }): Promise<Blob> => {
    const response = await api.get("/activity-logs/export-logs", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  getCorrectionSummary: async (params?: {
    taxMonth?: number;
    taxYear?: number;
  }): Promise<CorrectionSummary[]> => {
    const response = await api.get<{
      success: boolean;
      data: {
        corrections: CorrectionSummary[];
        summary: Record<string, number>;
      };
    }>("/activity-logs/correction-summary", { params });
    return response.data.data.corrections;
  },

  getAuditCorrections: async (
    year: number,
    month: number,
  ): Promise<AuditCorrectionsResponse> => {
    const response = await api.get<{
      success: boolean;
      data: AuditCorrectionsResponse;
    }>("/activity-logs/audit-corrections", { params: { year, month } });
    return response.data.data;
  },
};

export interface AuditCorrectionCompany {
  build: string;
  company_name: string;
  status: string;
  old_status: string;
  accounting_responsible: string;
  created_at: string;
}

export interface AuditCorrectionAuditor {
  employee_id: string;
  user_name: string;
  wht_corrections: number;
  vat_corrections: number;
  wht_companies: AuditCorrectionCompany[];
  vat_companies: AuditCorrectionCompany[];
}

export interface AuditCorrectionsResponse {
  auditors: AuditCorrectionAuditor[];
  total_wht: number;
  total_vat: number;
}
