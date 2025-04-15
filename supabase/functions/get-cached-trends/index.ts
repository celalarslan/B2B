import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

// Cache configuration
const CACHE_TTL = 60 * 60; // 1 hour in seconds
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: { 'x-connection-tag': 'get-cached-trends' },
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
    const trendType = url.searchParams.get("trendType") || "daily";
    const limit = parseInt(url.searchParams.get("limit") || "30", 10);
    const category = url.searchParams.get("category");

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
    const cacheKey = `trends_${organizationId}_${trendType}_${limit}_${category || "none"}`;

    // Check if data is in cache
    const now = Date.now();
    const cachedData = memoryCache.get(cacheKey);
    if (cachedData && cachedData.expiresAt > now) {
      return new Response(JSON.stringify(cachedData.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get data from database
    const { data, error } = await supabase.rpc("get_trend_data_cached", {
      p_organization_id: organizationId,
      p_trend_type: trendType,
      p_limit: limit,
      p_category: category,
    });

    if (error) throw error;

    // Process data for frontend
    const processedData = {
      trends: data,
      summary: calculateSummary(data),
      forecast: await generateForecast(organizationId),
      anomalies: await detectAnomalies(organizationId),
      sectorTrends: await getSectorTrends(organizationId),
      languageTrends: await getLanguageTrends(organizationId),
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

// Helper function to calculate summary statistics
function calculateSummary(data: any[]) {
  if (!data || data.length === 0) {
    return {
      currentPeriod: {
        conversationCount: 0,
        customerCount: 0,
        avgDurationSeconds: 0,
        completionRate: 0,
        avgSentiment: 0,
      },
      previousPeriod: {
        conversationCount: 0,
        customerCount: 0,
        avgDurationSeconds: 0,
        completionRate: 0,
        avgSentiment: 0,
      },
      changes: {
        conversationCount: { direction: "no_change", percentage: 0 },
        customerCount: { direction: "no_change", percentage: 0 },
        avgDurationSeconds: { direction: "no_change", percentage: 0 },
        completionRate: { direction: "no_change", percentage: 0 },
        avgSentiment: { direction: "no_change", percentage: 0 },
      },
    };
  }

  // Sort data by dimension (date) in descending order
  const sortedData = [...data].sort(
    (a, b) => new Date(b.dimension).getTime() - new Date(a.dimension).getTime()
  );

  // Get current and previous periods
  const currentPeriodData = sortedData.slice(0, Math.ceil(sortedData.length / 2));
  const previousPeriodData = sortedData.slice(
    Math.ceil(sortedData.length / 2),
    sortedData.length
  );

  // Calculate averages for current period
  const currentPeriod = {
    conversationCount: average(currentPeriodData.map((d) => d.conversation_count)),
    customerCount: average(currentPeriodData.map((d) => d.customer_count)),
    avgDurationSeconds: average(currentPeriodData.map((d) => d.avg_duration_seconds)),
    completionRate: average(currentPeriodData.map((d) => d.completion_rate)),
    avgSentiment: average(currentPeriodData.map((d) => d.avg_sentiment)),
  };

  // Calculate averages for previous period
  const previousPeriod = {
    conversationCount: average(previousPeriodData.map((d) => d.conversation_count)),
    customerCount: average(previousPeriodData.map((d) => d.customer_count)),
    avgDurationSeconds: average(previousPeriodData.map((d) => d.avg_duration_seconds)),
    completionRate: average(previousPeriodData.map((d) => d.completion_rate)),
    avgSentiment: average(previousPeriodData.map((d) => d.avg_sentiment)),
  };

  // Calculate changes
  const changes = {
    conversationCount: calculateChange(
      currentPeriod.conversationCount,
      previousPeriod.conversationCount
    ),
    customerCount: calculateChange(
      currentPeriod.customerCount,
      previousPeriod.customerCount
    ),
    avgDurationSeconds: calculateChange(
      currentPeriod.avgDurationSeconds,
      previousPeriod.avgDurationSeconds
    ),
    completionRate: calculateChange(
      currentPeriod.completionRate,
      previousPeriod.completionRate
    ),
    avgSentiment: calculateChange(
      currentPeriod.avgSentiment,
      previousPeriod.avgSentiment
    ),
  };

  return {
    currentPeriod,
    previousPeriod,
    changes,
  };
}

// Helper function to calculate average
function average(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + (val || 0), 0);
  return sum / values.length;
}

// Helper function to calculate change
function calculateChange(current: number, previous: number) {
  if (!previous) return { direction: "no_change", percentage: 0 };
  
  const percentage = ((current - previous) / previous) * 100;
  let direction = "no_change";
  
  if (percentage > 0) direction = "up";
  else if (percentage < 0) direction = "down";
  
  return { direction, percentage: Math.abs(percentage) };
}

// Helper function to generate forecast
async function generateForecast(organizationId: string) {
  try {
    const { data, error } = await supabase.rpc("forecast_trend", {
      p_organization_id: organizationId,
      p_days_ahead: 7,
      p_history_days: 30,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error generating forecast:", error);
    return [];
  }
}

// Helper function to detect anomalies
async function detectAnomalies(organizationId: string) {
  try {
    const { data, error } = await supabase.rpc("detect_trend_anomalies", {
      p_organization_id: organizationId,
      p_days: 30,
      p_z_threshold: 2.0,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error detecting anomalies:", error);
    return [];
  }
}

// Helper function to get sector trends
async function getSectorTrends(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from("trend_insights_materialized")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("trend_type", "sector")
      .order("dimension", { ascending: false });

    if (error) throw error;

    // Group by sector
    const sectorMap = new Map();
    for (const item of data) {
      if (!sectorMap.has(item.category)) {
        sectorMap.set(item.category, {
          sector: item.category,
          periods: [],
          overallTrend: "no_change",
          overallGrowth: 0,
        });
      }
      
      sectorMap.get(item.category).periods.push({
        period: item.dimension,
        conversationCount: item.conversation_count,
        customerCount: item.customer_count,
        completionRate: item.completion_rate,
        trend: item.trend_direction,
        changePercentage: item.change_percentage,
      });
    }

    // Calculate overall trends
    const sectors = Array.from(sectorMap.values());
    for (const sector of sectors) {
      if (sector.periods.length >= 2) {
        const first = sector.periods[sector.periods.length - 1];
        const last = sector.periods[0];
        
        if (last.conversationCount > first.conversationCount) {
          sector.overallTrend = "up";
          sector.overallGrowth = ((last.conversationCount - first.conversationCount) / first.conversationCount) * 100;
        } else if (last.conversationCount < first.conversationCount) {
          sector.overallTrend = "down";
          sector.overallGrowth = ((first.conversationCount - last.conversationCount) / first.conversationCount) * 100;
        }
      }
    }

    return sectors;
  } catch (error) {
    console.error("Error getting sector trends:", error);
    return [];
  }
}

// Helper function to get language trends
async function getLanguageTrends(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from("trend_insights_materialized")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("trend_type", "language")
      .order("dimension", { ascending: false });

    if (error) throw error;

    // Group by language
    const languageMap = new Map();
    for (const item of data) {
      if (!languageMap.has(item.category)) {
        languageMap.set(item.category, {
          language: item.category,
          periods: [],
          overallTrend: "no_change",
          overallGrowth: 0,
        });
      }
      
      languageMap.get(item.category).periods.push({
        period: item.dimension,
        conversationCount: item.conversation_count,
        customerCount: item.customer_count,
        completionRate: item.completion_rate,
        trend: item.trend_direction,
        changePercentage: item.change_percentage,
      });
    }

    // Calculate overall trends
    const languages = Array.from(languageMap.values());
    for (const language of languages) {
      if (language.periods.length >= 2) {
        const first = language.periods[language.periods.length - 1];
        const last = language.periods[0];
        
        if (last.conversationCount > first.conversationCount) {
          language.overallTrend = "up";
          language.overallGrowth = ((last.conversationCount - first.conversationCount) / first.conversationCount) * 100;
        } else if (last.conversationCount < first.conversationCount) {
          language.overallTrend = "down";
          language.overallGrowth = ((first.conversationCount - last.conversationCount) / first.conversationCount) * 100;
        }
      }
    }

    return languages;
  } catch (error) {
    console.error("Error getting language trends:", error);
    return [];
  }
}