import { z } from 'zod';

const performanceMetricSchema = z.object({
  conversationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  aiResponseTimeMs: z.number().int().nonnegative(),
  userResponseDelayMs: z.number().int().nonnegative().optional(),
  totalDurationMs: z.number().int().nonnegative().optional(),
  success: z.boolean().optional(),
  sttLatencyMs: z.number().int().nonnegative().optional(),
  ttsLatencyMs: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional()
});

type PerformanceMetric = z.infer<typeof performanceMetricSchema>;

interface PerformanceInsight {
  metricType: 'daily' | 'sector' | 'language';
  organizationId: string;
  dimension: string | null;
  totalInteractions: number;
  avgAiResponseTime: number;
  medianAiResponseTime: number | null;
  p95AiResponseTime: number | null;
  maxAiResponseTime: number | null;
  avgUserDelay: number | null;
  avgDuration: number | null;
  successRate: number;
  avgSttLatency: number | null;
  avgTtsLatency: number | null;
  sectorCode: string | null;
  language: string | null;
}

export interface PerformanceStat {
  metricName: string;
  currentValue: number;
  previousValue: number;
  changePercentage: number | null;
}

export interface PerformanceTimeSeriesData {
  date: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  successRate: number;
}

export interface PerformanceBySector {
  sector: string;
  avgResponseTime: number;
  successRate: number;
  totalInteractions: number;
}

export interface PerformanceByLanguage {
  language: string;
  avgResponseTime: number;
  successRate: number;
  totalInteractions: number;
}

export interface LongestConversation {
  id: string;
  customerId: string;
  customerName: string | null;
  durationMs: number;
  timestamp: string;
  success: boolean;
}

export interface PerformanceDashboardData {
  stats: PerformanceStat[];
  timeSeries: PerformanceTimeSeriesData[];
  sectors: PerformanceBySector[];
  languages: PerformanceByLanguage[];
  longestConversations: LongestConversation[];
}

export interface PerformanceFilters {
  timeRange: '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  sectorCode?: string;
  language?: string;
}