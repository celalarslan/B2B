import { z } from 'zod';

const reportTypeSchema = z.enum([
  'conversations',
  'customers',
  'errors',
  'sentiment',
  'usage',
  'billing'
]);

const reportFormatSchema = z.enum([
  'table',
  'line_chart',
  'bar_chart',
  'pie_chart'
]);

const exportFormatSchema = z.enum([
  'csv',
  'pdf',
  'json'
]);

const scheduleFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly'
]);

export type ReportType = z.infer<typeof reportTypeSchema>;
export type ReportFormat = z.infer<typeof reportFormatSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type ScheduleFrequency = z.infer<typeof scheduleFrequencySchema>;

export interface ReportMetric {
  name: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: unknown;
}

export interface ReportConfig {
  metrics: ReportMetric[];
  filters: Record<string, ReportFilter>;
  groupBy: string;
  timeRange?: {
    start: string;
    end: string;
  };
}

export interface SavedReport {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  type: ReportType;
  config: ReportConfig;
  visualizationType: ReportFormat;
  isFavorite: boolean;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportSchedule {
  id: string;
  reportId: string;
  organizationId: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  exportFormat: ExportFormat;
  recipients: string[];
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportLog {
  id: string;
  reportId: string;
  userId: string;
  organizationId: string;
  status: 'success' | 'failed' | 'in_progress';
  format?: ExportFormat;
  durationMs?: number;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ReportData {
  columns: Array<{
    field: string;
    header: string;
    type: 'string' | 'number' | 'date' | 'boolean';
  }>;
  rows: Record<string, unknown>[];
  summary?: {
    total: number;
    filtered: number;
    aggregates: Record<string, number>;
  };
}