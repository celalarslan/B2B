import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

// Cache configuration
const CACHE_TTL = 60 * 15; // 15 minutes in seconds
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: { 'x-connection-tag': 'get-report-data' },
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
    // Parse request body
    const { reportId, type, config } = await req.json();
    
    // Parse config if it's a string
    const reportConfig = typeof config === 'string' ? JSON.parse(config) : config;

    // Validate parameters
    if (!type || !reportConfig) {
      return new Response(
        JSON.stringify({ error: "type and config are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create cache key
    const cacheKey = `report_${reportId || 'adhoc'}_${type}_${JSON.stringify(reportConfig)}`;

    // Check if data is in cache
    const now = Date.now();
    const cachedData = memoryCache.get(cacheKey);
    if (cachedData && cachedData.expiresAt > now) {
      return new Response(JSON.stringify(cachedData.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate report data
    const reportData = await generateReportData(type, reportConfig);

    // Store in cache
    memoryCache.set(cacheKey, {
      data: reportData,
      expiresAt: now + CACHE_TTL * 1000,
    });

    // Return response
    return new Response(JSON.stringify(reportData), {
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

// Generate report data based on type and config
async function generateReportData(type: string, config: any) {
  // Build query based on report type and config
  let query = supabase.from(getTableForReportType(type)).select();

  // Apply filters
  if (config.filters) {
    for (const [key, filter] of Object.entries(config.filters)) {
      const { field, operator, value } = filter as any;
      
      switch (operator) {
        case 'eq':
          query = query.eq(field, value);
          break;
        case 'neq':
          query = query.neq(field, value);
          break;
        case 'gt':
          query = query.gt(field, value);
          break;
        case 'gte':
          query = query.gte(field, value);
          break;
        case 'lt':
          query = query.lt(field, value);
          break;
        case 'lte':
          query = query.lte(field, value);
          break;
        case 'in':
          query = query.in(field, value);
          break;
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            query = query.gte(field, value[0]).lte(field, value[1]);
          }
          break;
      }
    }
  }

  // Apply time range filter if specified
  if (config.timeRange) {
    const { start, end } = config.timeRange;
    if (start) {
      query = query.gte('created_at', start);
    }
    if (end) {
      query = query.lte('created_at', end);
    }
  }

  // Execute query
  const { data, error } = await query;
  if (error) throw error;

  // Process data for report
  return processReportData(data, type, config);
}

// Get table name for report type
function getTableForReportType(type: string): string {
  switch (type) {
    case 'conversations':
      return 'conversations';
    case 'customers':
      return 'customers';
    case 'errors':
      return 'error_logs';
    case 'sentiment':
      return 'conversation_labels';
    case 'usage':
      return 'usage_logs';
    case 'billing':
      return 'invoices';
    default:
      throw new Error(`Unsupported report type: ${type}`);
  }
}

// Process raw data into report format
function processReportData(data: any[], type: string, config: any) {
  // Define columns based on report type
  const columns = getColumnsForReportType(type);
  
  // Group data if needed
  let rows = data;
  if (config.groupBy) {
    rows = groupDataByField(data, config.groupBy, config.metrics);
  }

  // Calculate summary metrics
  const summary = calculateSummary(rows, config.metrics);

  return {
    columns,
    rows,
    summary,
  };
}

// Get columns for report type
function getColumnsForReportType(type: string) {
  switch (type) {
    case 'conversations':
      return [
        { field: 'id', header: 'ID', type: 'text' },
        { field: 'customer_id', header: 'Customer', type: 'text' },
        { field: 'created_at', header: 'Date', type: 'date' },
        { field: 'status', header: 'Status', type: 'text' },
        { field: 'language', header: 'Language', type: 'text' },
        { field: 'sentiment_score', header: 'Sentiment', type: 'number' },
      ];
    case 'customers':
      return [
        { field: 'id', header: 'ID', type: 'text' },
        { field: 'name', header: 'Name', type: 'text' },
        { field: 'email', header: 'Email', type: 'text' },
        { field: 'phone_number', header: 'Phone', type: 'text' },
        { field: 'created_at', header: 'Created', type: 'date' },
      ];
    case 'errors':
      return [
        { field: 'id', header: 'ID', type: 'text' },
        { field: 'error_message', header: 'Error', type: 'text' },
        { field: 'component_name', header: 'Component', type: 'text' },
        { field: 'created_at', header: 'Date', type: 'date' },
      ];
    case 'sentiment':
      return [
        { field: 'conversation_id', header: 'Conversation', type: 'text' },
        { field: 'sentiment_score', header: 'Score', type: 'number' },
        { field: 'created_at', header: 'Date', type: 'date' },
      ];
    case 'usage':
      return [
        { field: 'type', header: 'Type', type: 'text' },
        { field: 'tokens_used', header: 'Tokens', type: 'number' },
        { field: 'minutes_used', header: 'Minutes', type: 'number' },
        { field: 'timestamp', header: 'Date', type: 'date' },
      ];
    case 'billing':
      return [
        { field: 'invoice_number', header: 'Invoice #', type: 'text' },
        { field: 'status', header: 'Status', type: 'text' },
        { field: 'total_amount', header: 'Amount', type: 'number' },
        { field: 'invoice_date', header: 'Date', type: 'date' },
      ];
    default:
      return [];
  }
}

// Group data by field
function groupDataByField(data: any[], field: string, metrics: any[]) {
  const groups = new Map();
  
  // Group data
  for (const item of data) {
    const key = item[field];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }
  
  // Calculate metrics for each group
  const result = [];
  for (const [key, items] of groups.entries()) {
    const row: any = { [field]: key };
    
    // Calculate each metric
    for (const metric of metrics) {
      const { name, aggregation, field: metricField } = metric;
      
      switch (aggregation) {
        case 'count':
          row[name] = items.length;
          break;
        case 'sum':
          row[name] = items.reduce((sum: number, item: any) => sum + (Number(item[metricField]) || 0), 0);
          break;
        case 'avg':
          row[name] = items.reduce((sum: number, item: any) => sum + (Number(item[metricField]) || 0), 0) / items.length;
          break;
        case 'min':
          row[name] = Math.min(...items.map((item: any) => Number(item[metricField]) || 0));
          break;
        case 'max':
          row[name] = Math.max(...items.map((item: any) => Number(item[metricField]) || 0));
          break;
      }
    }
    
    result.push(row);
  }
  
  return result;
}

// Calculate summary metrics
function calculateSummary(data: any[], metrics: any[]) {
  if (!data || data.length === 0) {
    return { total: 0, aggregates: {} };
  }
  
  const aggregates: Record<string, number> = {};
  
  // Calculate each metric
  for (const metric of metrics) {
    const { name, aggregation, field: metricField } = metric;
    
    switch (aggregation) {
      case 'count':
        aggregates[name] = data.length;
        break;
      case 'sum':
        aggregates[name] = data.reduce((sum, item) => sum + (Number(item[metricField]) || 0), 0);
        break;
      case 'avg':
        aggregates[name] = data.reduce((sum, item) => sum + (Number(item[metricField]) || 0), 0) / data.length;
        break;
      case 'min':
        aggregates[name] = Math.min(...data.map(item => Number(item[metricField]) || 0));
        break;
      case 'max':
        aggregates[name] = Math.max(...data.map(item => Number(item[metricField]) || 0));
        break;
    }
  }
  
  return {
    total: data.length,
    aggregates,
  };
}