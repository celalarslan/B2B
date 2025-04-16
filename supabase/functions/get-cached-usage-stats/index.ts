import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

// Cache configuration
const CACHE_TTL = 60 * 30; // 30 minutes in seconds
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: { 'x-connection-tag': 'get-cached-usage-stats' },
  },
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request parameters
    const url = new URL(req.url);
    const organizationId = url.searchParams.get("organizationId");
    const timeRange = url.searchParams.get("timeRange") || "30d";
    const dataType = url.searchParams.get("dataType");

    // Validate parameters
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create cache key
    const cacheKey = `usage_stats_${organizationId}_${timeRange}_${dataType || "all"}`;

    // Check if data is in cache
    const now = Date.now();
    const cachedData = memoryCache.get(cacheKey);
    if (cachedData && cachedData.expiresAt > now) {
      return new Response(JSON.stringify(cachedData.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate date range based on timeRange
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "12m":
        startDate.setMonth(endDate.getMonth() - 12);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30); // Default to 30 days
    }

    // Get data from materialized view
    const { data: statsData, error: statsError } = await supabase
      .from("usage_statistics_materialized")
      .select("*")
      .eq("organization_id", organizationId);

    if (statsError) throw statsError;

    // Get summary metrics
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      "get_usage_summary",
      {
        p_organization_id: organizationId,
        p_days: timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365,
      }
    );

    if (summaryError) throw summaryError;

    // Process data for frontend
    const processedData = {
      summary: summaryData,
      dailyActiveUsers: extractMetricData(statsData, "daily_active_users", startDate, endDate),
      monthlyActiveUsers: extractMetricData(statsData, "monthly_active_users", startDate, endDate),
      newUsersByDay: extractMetricData(statsData, "new_users", startDate, endDate),
      featureUsage: extractFeatureUsage(statsData),
      languageUsage: extractDimensionUsage(statsData, "language_usage"),
      sectorUsage: extractDimensionUsage(statsData, "sector_usage"),
      deviceUsage: extractDimensionUsage(statsData, "device_usage"),
      hourlyUsage: extractHourlyUsage(statsData),
      sessionMetrics: extractSessionMetrics(statsData),
    };

    // Store in cache
    memoryCache.set(cacheKey, {
      data: processedData,
      expiresAt: now + CACHE_TTL * 1000,
    });

    // Return response
    return new Response(JSON.stringify(processedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to extract metric data by type and date range
function extractMetricData(data: any[], metricType: string, startDate: Date, endDate: Date) {
  return data
    .filter(
      (item) =>
        item.metric_type === metricType &&
        (item.date_dimension ? new Date(item.date_dimension) >= startDate && new Date(item.date_dimension) <= endDate : true)
    )
    .map((item) => ({
      date: item.date_dimension,
      value: item.metric_value,
      secondaryValue: item.secondary_value,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Helper function to extract feature usage data
function extractFeatureUsage(data: any[]) {
  return data
    .filter((item) => item.metric_type === "feature_usage")
    .map((item) => ({
      name: item.string_dimension,
      count: item.metric_value,
      users: item.secondary_value,
    }))
    .sort((a, b) => b.count - a.count);
}

// Helper function to extract dimension usage data (language, sector, device)
function extractDimensionUsage(data: any[], metricType: string) {
  return data
    .filter((item) => item.metric_type === metricType)
    .map((item) => ({
      name: item.string_dimension,
      count: item.metric_value,
      users: item.secondary_value,
    }))
    .sort((a, b) => b.count - a.count);
}

// Helper function to extract hourly usage data
function extractHourlyUsage(data: any[]) {
  return data
    .filter((item) => item.metric_type === "hourly_usage")
    .map((item) => ({
      hour: item.hour_dimension,
      count: item.metric_value,
    }))
    .sort((a, b) => a.hour - b.hour);
}

// Helper function to extract session metrics
function extractSessionMetrics(data: any[]) {
  const sessionData = data.find(
    (item) =>
      item.metric_type === "session_metrics" &&
      item.string_dimension === "avg_session_duration"
  );

  return {
    avgSessionDuration: sessionData ? sessionData.metric_value : 0,
    sessionsPerUser: sessionData ? sessionData.secondary_value : 0,
  };
}