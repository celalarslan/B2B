import { supabase } from '../../lib/supabase';
import { 
  ReportType, 
  ReportConfig, 
  ReportFormat, 
  ExportFormat, 
  ReportData 
} from '../../types/reports';
import { format } from 'date-fns';

/**
 * Fetches report data based on configuration
 */
export async function fetchReportData(
  reportType: ReportType,
  config: ReportConfig,
  reportId?: string
): Promise<ReportData> {
  try {
    const { data, error } = await supabase.functions.invoke('get-report-data', {
      body: {
        reportId,
        type: reportType,
        config: JSON.stringify(config)
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching report data:', error);
    throw new Error(`Failed to fetch report data: ${error.message}`);
  }
}

/**
 * Exports report data to the specified format
 */
export async function exportReportData(
  reportData: ReportData,
  format: ExportFormat,
  fileName: string
): Promise<void> {
  try {
    switch (format) {
      case 'csv':
        await exportToCsv(reportData, fileName);
        break;
      case 'pdf':
        await exportToPdf(reportData, fileName);
        break;
      case 'json':
        await exportToJson(reportData, fileName);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Error exporting report data:', error);
    throw new Error(`Failed to export report: ${error.message}`);
  }
}

/**
 * Exports data to CSV format
 */
async function exportToCsv(data: ReportData, fileName: string): Promise<void> {
  const { columns, rows } = data;
  
  // Create CSV header
  const header = columns.map(col => `"${col.header}"`).join(',');
  
  // Create CSV rows
  const csvRows = rows.map(row => {
    return columns.map(col => {
      const value = row[col.field];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      if (value instanceof Date) return `"${format(value, 'yyyy-MM-dd HH:mm:ss')}"`;
      return value;
    }).join(',');
  });
  
  // Combine header and rows
  const csvContent = [header, ...csvRows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports data to PDF format
 * Note: This is a simplified implementation. In a production environment,
 * you might want to use a library like jsPDF or pdfmake for more advanced features.
 */
async function exportToPdf(data: ReportData, fileName: string): Promise<void> {
  // This is a placeholder. In a real implementation, you would:
  // 1. Format the data for PDF
  // 2. Use a PDF generation library
  // 3. Create the PDF and trigger download
  
  console.log('PDF export not fully implemented');
  alert('PDF export would be implemented with a library like jsPDF');
}

/**
 * Exports data to JSON format
 */
async function exportToJson(data: ReportData, fileName: string): Promise<void> {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Schedules a report for automated export
 */
async function scheduleReport(
  reportId: string,
  frequency: 'daily' | 'weekly' | 'monthly',
  options: {
    dayOfWeek?: number;
    dayOfMonth?: number;
    timeOfDay: string;
    exportFormat: ExportFormat;
    recipients: string[];
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('report_schedules')
      .insert({
        report_id: reportId,
        frequency,
        day_of_week: options.dayOfWeek,
        day_of_month: options.dayOfMonth,
        time_of_day: options.timeOfDay,
        export_format: options.exportFormat,
        recipients: options.recipients,
        is_active: true,
        next_run_at: new Date().toISOString() // This will be calculated by the trigger
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error scheduling report:', error);
    throw new Error(`Failed to schedule report: ${error.message}`);
  }
}

/**
 * Validates a report configuration
 */
function validateReportConfig(config: ReportConfig): boolean {
  // Check if metrics are defined
  if (!config.metrics || config.metrics.length === 0) {
    return false;
  }
  
  // Check if each metric has a name and aggregation
  for (const metric of config.metrics) {
    if (!metric.name || !metric.aggregation) {
      return false;
    }
    
    // For aggregations other than count, a field is required
    if (metric.aggregation !== 'count' && !metric.field) {
      return false;
    }
  }
  
  // Check if filters are valid
  if (config.filters) {
    for (const key in config.filters) {
      const filter = config.filters[key];
      if (!filter.field || !filter.operator) {
        return false;
      }
      
      // Check if value is appropriate for the operator
      if (filter.operator === 'between' && !Array.isArray(filter.value)) {
        return false;
      }
      
      if (filter.operator === 'in' && !Array.isArray(filter.value)) {
        return false;
      }
    }
  }
  
  return true;
}