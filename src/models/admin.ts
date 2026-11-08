export type AdminSurfaceKey = "access" | "auth" | "models" | "tools" | "analytics" | "enterprise";

export interface AdminSurfaceMetric {
  label: string;
  value: string;
  detail: string;
}

export interface AdminSurfaceSection {
  key: AdminSurfaceKey;
  title: string;
  status: string;
  tone: "good" | "watch" | "neutral";
  description: string;
  items: string[];
}

export interface AdminSurfaceSummary {
  health_label: string;
  health_score: number;
  metrics: AdminSurfaceMetric[];
  sections: AdminSurfaceSection[];
}

export interface BreakdownItem {
  label: string;
  session_count: number;
}

export interface BreakdownAnalytics {
  dimension: string;
  items: BreakdownItem[];
  total_sessions: number;
}
