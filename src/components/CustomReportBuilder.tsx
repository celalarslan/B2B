import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  Table, 
  Calendar, 
  Filter, 
  Save, 
  Star, 
  Download, 
  Plus, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { 
  ReportType, 
  ReportFormat, 
  ExportFormat, 
  ReportConfig, 
  ReportMetric, 
  ReportFilter,
  ReportData,
  SavedReport
} from '../types/reports';
import { fetchReportData, exportReportData } from '../lib/reporting/reportEngine';

// Form schema
const reportFormSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  description: z.string().optional(),
  type: z.enum(['conversations', 'customers', 'errors', 'sentiment', 'usage', 'billing']),
  visualizationType: z.enum(['table', 'line_chart', 'bar_chart', 'pie_chart']),
  metrics: z.array(
    z.object({
      name: z.string().min(1, 'Metric name is required'),
      aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']),
      field: z.string().optional()
    })
  ).min(1, 'At least one metric is required'),
  filters: z.record(
    z.object({
      field: z.string().min(1, 'Field is required'),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'between']),
      value: z.any()
    })
  ).optional(),
  groupBy: z.string().min(1, 'Group by field is required'),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional()
});

type ReportFormData = z.infer<typeof reportFormSchema>;

// Available fields by report type
const availableFields: Record<ReportType, string[]> = {
  conversations: [
    'id', 'customer_id', 'organization_id', 'status', 'duration', 'language', 'created_at'
  ],
  customers: [
    'id', 'name', 'email', 'phone_number', 'organization_id', 'created_at'
  ],
  errors: [
    'id', 'error_message', 'component_name', 'user_id', 'business_id', 'created_at'
  ],
  sentiment: [
    'conversation_id', 'sentiment_score', 'language', 'created_at'
  ],
  usage: [
    'organization_id', 'type', 'tokens_used', 'minutes_used', 'timestamp'
  ],
  billing: [
    'organization_id', 'type', 'timestamp', 'metadata'
  ]
};

// Available aggregations by field type
const availableAggregations: Record<string, string[]> = {
  default: ['count'],
  number: ['count', 'sum', 'avg', 'min', 'max'],
  date: ['count', 'min', 'max']
};

// Field type mapping
const fieldTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'> = {
  id: 'string',
  customer_id: 'string',
  organization_id: 'string',
  status: 'string',
  duration: 'number',
  language: 'string',
  created_at: 'date',
  name: 'string',
  email: 'string',
  phone_number: 'string',
  error_message: 'string',
  component_name: 'string',
  user_id: 'string',
  business_id: 'string',
  conversation_id: 'string',
  sentiment_score: 'number',
  type: 'string',
  tokens_used: 'number',
  minutes_used: 'number',
  timestamp: 'date',
  metadata: 'string'
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function CustomReportBuilder() {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedReports, setShowSavedReports] = useState(false);

  const { 
    control, 
    handleSubmit, 
    watch, 
    setValue, 
    reset,
    formState: { errors } 
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      name: 'New Report',
      type: 'conversations',
      visualizationType: 'table',
      metrics: [{ name: 'Total', aggregation: 'count' }],
      groupBy: 'created_at',
      timeRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    }
  });

  const { fields: metricFields, append: appendMetric, remove: removeMetric } = useFieldArray({
    control,
    name: 'metrics'
  });

  const reportType = watch('type');
  const visualizationType = watch('visualizationType');
  const metrics = watch('metrics');
  const groupBy = watch('groupBy');

  // Load saved reports
  useEffect(() => {
    const fetchSavedReports = async () => {
      try {
        const { data, error } = await supabase
          .from('saved_reports')
          .select('*')
          .order('last_viewed_at', { ascending: false });

        if (error) throw error;
        
        // Transform from snake_case to camelCase
        const reports = data.map(report => ({
          id: report.id,
          organizationId: report.organization_id,
          userId: report.user_id,
          name: report.name,
          description: report.description,
          type: report.type,
          config: report.config,
          visualizationType: report.visualization_type,
          isFavorite: report.is_favorite,
          lastViewedAt: report.last_viewed_at,
          createdAt: report.created_at,
          updatedAt: report.updated_at
        }));
        
        setSavedReports(reports);
      } catch (err) {
        console.error('Error fetching saved reports:', err);
        setError('Failed to load saved reports');
      }
    };

    fetchSavedReports();
  }, []);

  // Load last viewed report
  useEffect(() => {
    if (savedReports.length > 0) {
      const lastViewed = savedReports.find(r => r.lastViewedAt) || savedReports[0];
      loadReport(lastViewed);
    }
  }, [savedReports]);

  const loadReport = (report: SavedReport) => {
    reset({
      name: report.name,
      description: report.description,
      type: report.type,
      visualizationType: report.visualizationType,
      metrics: report.config.metrics,
      filters: report.config.filters,
      groupBy: report.config.groupBy,
      timeRange: report.config.timeRange
    });

    // Update last viewed timestamp
    supabase
      .from('saved_reports')
      .update({ last_viewed_at: new Date().toISOString() })
      .eq('id', report.id)
      .then(() => {
        // Update local state
        setSavedReports(prev => 
          prev.map(r => 
            r.id === report.id 
              ? { ...r, lastViewedAt: new Date().toISOString() } 
              : r
          )
        );
      });

    // Run the report
    runReport(report.type, report.config);
  };

  const runReport = async (type: ReportType, config: ReportConfig) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchReportData(type, config);
      setReportData(data);
    } catch (err) {
      console.error('Error running report:', err);
      setError(err instanceof Error ? err.message : 'Failed to run report');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ReportFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Prepare config
      const config: ReportConfig = {
        metrics: data.metrics,
        filters: data.filters || {},
        groupBy: data.groupBy,
        timeRange: data.timeRange
      };

      // Run report
      await runReport(data.type, config);

      // Save report
      const { data: savedReport, error } = await supabase
        .from('saved_reports')
        .insert({
          name: data.name,
          description: data.description,
          type: data.type,
          config,
          visualization_type: data.visualizationType,
          is_favorite: false,
          last_viewed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update saved reports list
      setSavedReports(prev => [
        {
          id: savedReport.id,
          organizationId: savedReport.organization_id,
          userId: savedReport.user_id,
          name: savedReport.name,
          description: savedReport.description,
          type: savedReport.type,
          config: savedReport.config,
          visualizationType: savedReport.visualization_type,
          isFavorite: savedReport.is_favorite,
          lastViewedAt: savedReport.last_viewed_at,
          createdAt: savedReport.created_at,
          updatedAt: savedReport.updated_at
        },
        ...prev
      ]);

    } catch (err) {
      console.error('Error saving report:', err);
      setError(err instanceof Error ? err.message : 'Failed to save report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!reportData) return;
    
    try {
      setIsLoading(true);
      const formData = watch();
      await exportReportData(reportData, format, formData.name);
    } catch (err) {
      console.error('Error exporting report:', err);
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (reportId: string) => {
    try {
      const report = savedReports.find(r => r.id === reportId);
      if (!report) return;

      const { error } = await supabase
        .from('saved_reports')
        .update({ is_favorite: !report.isFavorite })
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setSavedReports(prev => 
        prev.map(r => 
          r.id === reportId 
            ? { ...r, isFavorite: !r.isFavorite } 
            : r
        )
      );
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to update favorite status');
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error('Error deleting report:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Custom Report Builder</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowSavedReports(!showSavedReports)}
            className="flex items-center px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            {showSavedReports ? 'Hide Saved Reports' : 'Show Saved Reports'}
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={!reportData || isLoading}
              className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={!reportData || isLoading}
              className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-2 text-red-700">{error}</p>
          </div>
        </div>
      )}

      {showSavedReports && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Saved Reports</h2>
          {savedReports.length === 0 ? (
            <p className="text-gray-500">No saved reports found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Viewed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {savedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleFavorite(report.id)}
                            className="mr-2 text-gray-400 hover:text-yellow-500"
                          >
                            <Star className={`w-4 h-4 ${report.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                          </button>
                          <span className="text-sm font-medium text-gray-900">{report.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{report.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {report.lastViewedAt ? format(new Date(report.lastViewedAt), 'PPp') : 'Never'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => loadReport(report)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => deleteReport(report.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Builder Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Report Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Report Name
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                )}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Report Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    rows={2}
                  />
                )}
              />
            </div>

            {/* Report Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Data Source
              </label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="conversations">Conversations</option>
                    <option value="customers">Customers</option>
                    <option value="errors">Errors</option>
                    <option value="sentiment">Sentiment</option>
                    <option value="usage">Usage</option>
                    <option value="billing">Billing</option>
                  </select>
                )}
              />
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* Visualization Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Visualization Type
              </label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                <Controller
                  name="visualizationType"
                  control={control}
                  render={({ field }) => (
                    <>
                      <button
                        type="button"
                        onClick={() => field.onChange('table')}
                        className={`flex flex-col items-center justify-center p-3 border rounded-md ${
                          field.value === 'table' ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'
                        }`}
                      >
                        <Table className="w-6 h-6" />
                        <span className="mt-1 text-xs">Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange('line_chart')}
                        className={`flex flex-col items-center justify-center p-3 border rounded-md ${
                          field.value === 'line_chart' ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'
                        }`}
                      >
                        <LineChart className="w-6 h-6" />
                        <span className="mt-1 text-xs">Line</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange('bar_chart')}
                        className={`flex flex-col items-center justify-center p-3 border rounded-md ${
                          field.value === 'bar_chart' ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'
                        }`}
                      >
                        <BarChart className="w-6 h-6" />
                        <span className="mt-1 text-xs">Bar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange('pie_chart')}
                        className={`flex flex-col items-center justify-center p-3 border rounded-md ${
                          field.value === 'pie_chart' ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'
                        }`}
                      >
                        <PieChart className="w-6 h-6" />
                        <span className="mt-1 text-xs">Pie</span>
                      </button>
                    </>
                  )}
                />
              </div>
              {errors.visualizationType && (
                <p className="mt-1 text-sm text-red-600">{errors.visualizationType.message}</p>
              )}
            </div>

            {/* Metrics */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Metrics
                </label>
                <button
                  type="button"
                  onClick={() => appendMetric({ name: '', aggregation: 'count' })}
                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Metric
                </button>
              </div>
              
              <div className="space-y-3">
                {metricFields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Controller
                      name={`metrics.${index}.name`}
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          placeholder="Metric name"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      )}
                    />
                    
                    <Controller
                      name={`metrics.${index}.aggregation`}
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="count">Count</option>
                          <option value="sum">Sum</option>
                          <option value="avg">Average</option>
                          <option value="min">Minimum</option>
                          <option value="max">Maximum</option>
                        </select>
                      )}
                    />
                    
                    {watch(`metrics.${index}.aggregation`) !== 'count' && (
                      <Controller
                        name={`metrics.${index}.field`}
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Select field</option>
                            {availableFields[reportType]
                              .filter(f => ['number', 'date'].includes(fieldTypes[f]))
                              .map(field => (
                                <option key={field} value={field}>
                                  {field.replace(/_/g, ' ')}
                                </option>
                              ))}
                          </select>
                        )}
                      />
                    )}
                    
                    <button
                      type="button"
                      onClick={() => removeMetric(index)}
                      className="inline-flex items-center p-1 border border-transparent rounded-full text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              {errors.metrics && (
                <p className="mt-1 text-sm text-red-600">{errors.metrics.message}</p>
              )}
            </div>

            {/* Group By */}
            <div>
              <label htmlFor="groupBy" className="block text-sm font-medium text-gray-700">
                Group By
              </label>
              <Controller
                name="groupBy"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {availableFields[reportType].map(field => (
                      <option key={field} value={field}>
                        {field.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.groupBy && (
                <p className="mt-1 text-sm text-red-600">{errors.groupBy.message}</p>
              )}
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Time Range
              </label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="timeRange.start" className="block text-xs text-gray-500">
                    Start Date
                  </label>
                  <Controller
                    name="timeRange.start"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="date"
                        {...field}
                        value={field.value ? field.value.split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    )}
                  />
                </div>
                <div>
                  <label htmlFor="timeRange.end" className="block text-xs text-gray-500">
                    End Date
                  </label>
                  <Controller
                    name="timeRange.end"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="date"
                        {...field}
                        value={field.value ? field.value.split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => {
                  const formData = watch();
                  const config: ReportConfig = {
                    metrics: formData.metrics,
                    filters: formData.filters || {},
                    groupBy: formData.groupBy,
                    timeRange: formData.timeRange
                  };
                  runReport(formData.type, config);
                }}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Report
                  </>
                )}
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Report
              </button>
            </div>
          </form>
        </div>

        {/* Report Results */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Report Results</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : reportData ? (
            <div>
              {/* Summary */}
              {reportData.summary && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Records</p>
                      <p className="text-lg font-semibold">{reportData.summary.total}</p>
                    </div>
                    {Object.entries(reportData.summary.aggregates).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-gray-500">{key}</p>
                        <p className="text-lg font-semibold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visualization */}
              <div className="mb-6">
                {visualizationType === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {reportData.columns.map((column) => (
                            <th
                              key={column.field}
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {column.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {reportData.columns.map((column) => (
                              <td
                                key={`${rowIndex}-${column.field}`}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                              >
                                {column.type === 'date' && row[column.field]
                                  ? format(new Date(row[column.field] as string), 'PPp')
                                  : String(row[column.field] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {visualizationType === 'bar_chart' && (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={reportData.rows}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey={groupBy} 
                          angle={-45} 
                          textAnchor="end"
                          tick={{ fontSize: 12 }}
                          height={70}
                          tickFormatter={(value) => {
                            if (typeof value === 'string' && value.includes('T')) {
                              return format(new Date(value), 'MM/dd/yyyy');
                            }
                            return String(value).substring(0, 15);
                          }}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {metrics.map((metric, index) => (
                          <Bar
                            key={metric.name}
                            dataKey={metric.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {visualizationType === 'line_chart' && (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart
                        data={reportData.rows}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey={groupBy} 
                          angle={-45} 
                          textAnchor="end"
                          tick={{ fontSize: 12 }}
                          height={70}
                          tickFormatter={(value) => {
                            if (typeof value === 'string' && value.includes('T')) {
                              return format(new Date(value), 'MM/dd/yyyy');
                            }
                            return String(value).substring(0, 15);
                          }}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {metrics.map((metric, index) => (
                          <Line
                            key={metric.name}
                            type="monotone"
                            dataKey={metric.name}
                            stroke={COLORS[index % COLORS.length]}
                            activeDot={{ r: 8 }}
                          />
                        ))}
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {visualizationType === 'pie_chart' && (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Tooltip />
                        <Legend />
                        <Pie
                          data={reportData.rows}
                          dataKey={metrics[0]?.name}
                          nameKey={groupBy}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          label={(entry) => entry.name}
                        >
                          {reportData.rows.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <LineChart className="w-12 h-12 mb-4 text-gray-300" />
              <p>Configure and run your report to see results here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}