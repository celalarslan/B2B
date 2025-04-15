import { z } from 'zod';

const eventTypeSchema = z.enum([
  'login',
  'ai_chat',
  'report_view',
  'export_csv',
  'call_playback',
  'nlp_training',
  'settings_update',
  'voice_recording',
  'customer_add',
  'dashboard_view',
  'search',
  'feedback_submit',
  'error'
]);

export type EventType = z.infer<typeof eventTypeSchema>;

const deviceTypeSchema = z.enum([
  'desktop',
  'mobile',
  'tablet',
  'unknown'
]);

type DeviceType = z.infer<typeof deviceTypeSchema>;

interface UsageEvent {
  id?: string;
  userId?: string;
  organizationId: string;
  eventType: EventType;
  eventData?: Record<string, unknown>;
  deviceType?: DeviceType;
  language?: string;
  sector?: string;
  sessionId?: string;
  createdAt?: string;
}

interface UsageSummary {
  metric_name: string;
  metric_value: number;
  change_percentage: number | null;
}

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface FeatureUsage {
  name: string;
  count: number;
  users: number;
}

interface HourlyUsage {
  hour: number;
  count: number;
}

interface CategoryUsage {
  name: string;
  count: number;
  users: number;
}

interface SessionMetrics {
  avgSessionDuration: number;
  sessionsPerUser: number;
}

export interface UsageStatistics {
  summary: UsageSummary[];
  dailyActiveUsers: TimeSeriesPoint[];
  monthlyActiveUsers: TimeSeriesPoint[];
  newUsersByDay: Array<{ date: string; count: number }>;
  featureUsage: FeatureUsage[];
  hourlyUsage: HourlyUsage[];
  languageUsage: CategoryUsage[];
  sectorUsage: CategoryUsage[];
  deviceUsage: CategoryUsage[];
  sessionMetrics: SessionMetrics;
}

export interface UsageFilters {
  timeRange: '7d' | '30d' | '90d' | '12m' | 'custom';
  startDate?: string;
  endDate?: string;
  organizationId?: string;
}