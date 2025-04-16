import { z } from 'zod';

const trendTypeSchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'sector',
  'language'
]);

export type TrendType = z.infer<typeof trendTypeSchema>;

const trendDirectionSchema = z.enum([
  'up',
  'down',
  'no_change'
]);

export type TrendDirection = z.infer<typeof trendDirectionSchema>;

export interface TrendDataPoint {
  dimension: string;
  conversationCount: number;
  customerCount: number;
  avgDurationSeconds?: number;
  completionRate?: number;
  avgSentiment?: number;
  trendDirection?: TrendDirection;
  changePercentage?: number;
  isAnomaly?: boolean;
  forecast7d?: number;
  category?: string;
  trendSummary: {
    period: string;
    conversationCount: number;
    customerCount: number;
    avgDurationSeconds?: number;
    completionRate?: number;
    avgSentiment?: number;
    dailyTrend?: TrendDirection;
    dailyChangePct?: number;
    weeklyTrend?: TrendDirection;
    weeklyChangePct?: number;
    monthlyTrend?: TrendDirection;
    monthlyChangePct?: number;
    yearlyTrend?: TrendDirection;
    yearlyChangePct?: number;
    isAnomaly?: boolean;
    zScore?: number;
    dayOfWeek?: number;
  };
}

export interface TrendAnomaly {
  dimension: string;
  metricName: string;
  actualValue: number;
  expectedValue: number;
  zScore: number;
  deviationPercentage: number;
}

export interface TrendForecast {
  forecastDate: string;
  predictedConversations: number;
  predictionIntervalLow: number;
  predictionIntervalHigh: number;
}

export interface SectorTrend {
  sector: string;
  periods: Array<{
    period: string;
    conversationCount: number;
    trendDirection?: TrendDirection;
    changePercentage?: number;
  }>;
  overallTrend: TrendDirection;
  overallGrowth: number;
}

export interface LanguageTrend {
  language: string;
  periods: Array<{
    period: string;
    conversationCount: number;
    trendDirection?: TrendDirection;
    changePercentage?: number;
  }>;
  overallTrend: TrendDirection;
  overallGrowth: number;
}

export interface TrendSummary {
  currentPeriod: {
    conversationCount: number;
    customerCount: number;
    avgDurationSeconds?: number;
    completionRate?: number;
    avgSentiment?: number;
  };
  previousPeriod: {
    conversationCount: number;
    customerCount: number;
    avgDurationSeconds?: number;
    completionRate?: number;
    avgSentiment?: number;
  };
  changes: {
    conversationCount: {
      value: number;
      percentage: number;
      direction: TrendDirection;
    };
    customerCount: {
      value: number;
      percentage: number;
      direction: TrendDirection;
    };
    avgDurationSeconds?: {
      value: number;
      percentage: number;
      direction: TrendDirection;
    };
    completionRate?: {
      value: number;
      percentage: number;
      direction: TrendDirection;
    };
    avgSentiment?: {
      value: number;
      percentage: number;
      direction: TrendDirection;
    };
  };
  anomalies: TrendAnomaly[];
  forecast: TrendForecast[];
}

export interface TrendFilters {
  trendType: TrendType;
  startDate?: string;
  endDate?: string;
  organizationId: string;
  category?: string;
  limit?: number;
}

export interface TrendDashboardData {
  summary: TrendSummary;
  trends: TrendDataPoint[];
  sectorTrends: SectorTrend[];
  languageTrends: LanguageTrend[];
  anomalies: TrendAnomaly[];
  forecast: TrendForecast[];
}