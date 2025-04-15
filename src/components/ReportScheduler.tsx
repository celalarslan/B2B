import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Calendar, 
  Clock, 
  Mail, 
  Save, 
  X, 
  AlertCircle,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  ScheduleFrequency, 
  ExportFormat 
} from '../types/reports';

const emailSchema = z.string().email('Invalid email address');

const scheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6).optional()
    .refine(
      (val) => val === undefined || val !== undefined,
      { message: 'Day of week is required for weekly schedules' }
    ),
  dayOfMonth: z.number().min(1).max(31).optional()
    .refine(
      (val) => val === undefined || val !== undefined,
      { message: 'Day of month is required for monthly schedules' }
    ),
  timeOfDay: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  exportFormat: z.enum(['csv', 'pdf', 'json']),
  recipients: z.array(emailSchema).min(1, 'At least one recipient is required')
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ReportSchedulerProps {
  reportId: string;
  reportName: string;
  onClose: () => void;
  onScheduled: () => void;
}

export function ReportScheduler({ reportId, reportName, onClose, onScheduled }: ReportSchedulerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');

  const { 
    control, 
    handleSubmit, 
    watch,
    setValue,
    formState: { errors } 
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      timeOfDay: '09:00',
      exportFormat: 'pdf',
      recipients: []
    }
  });

  const frequency = watch('frequency');
  const recipients = watch('recipients');

  const addRecipient = () => {
    try {
      // Validate email
      emailSchema.parse(recipient);
      
      // Add to recipients if not already present
      if (!recipients.includes(recipient)) {
        setValue('recipients', [...recipients, recipient]);
      }
      
      // Clear input
      setRecipient('');
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
    }
  };

  const removeRecipient = (email: string) => {
    setValue('recipients', recipients.filter(r => r !== email));
  };

  const onSubmit = async (data: ScheduleFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get organization ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (orgError) throw orgError;

      // Create schedule
      const { error: scheduleError } = await supabase
        .from('report_schedules')
        .insert({
          report_id: reportId,
          organization_id: org.id,
          frequency: data.frequency,
          day_of_week: data.frequency === 'weekly' ? data.dayOfWeek : null,
          day_of_month: data.frequency === 'monthly' ? data.dayOfMonth : null,
          time_of_day: data.timeOfDay,
          export_format: data.exportFormat,
          recipients: data.recipients,
          is_active: true
        });

      if (scheduleError) throw scheduleError;

      onScheduled();
      onClose();
    } catch (err) {
      console.error('Error scheduling report:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule report');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Schedule Report: {reportName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="ml-2 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Frequency
            </label>
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <div className="mt-1 flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      value="daily"
                      checked={field.value === 'daily'}
                      onChange={() => field.onChange('daily')}
                    />
                    <span className="ml-2">Daily</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      value="weekly"
                      checked={field.value === 'weekly'}
                      onChange={() => field.onChange('weekly')}
                    />
                    <span className="ml-2">Weekly</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      value="monthly"
                      checked={field.value === 'monthly'}
                      onChange={() => field.onChange('monthly')}
                    />
                    <span className="ml-2">Monthly</span>
                  </label>
                </div>
              )}
            />
            {errors.frequency && (
              <p className="mt-1 text-sm text-red-600">{errors.frequency.message}</p>
            )}
          </div>

          {/* Day Selection (for weekly/monthly) */}
          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Day of Week
              </label>
              <Controller
                name="dayOfWeek"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                )}
              />
              {errors.dayOfWeek && (
                <p className="mt-1 text-sm text-red-600">{errors.dayOfWeek.message}</p>
              )}
            </div>
          )}

          {frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Day of Month
              </label>
              <Controller
                name="dayOfMonth"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.dayOfMonth && (
                <p className="mt-1 text-sm text-red-600">{errors.dayOfMonth.message}</p>
              )}
            </div>
          )}

          {/* Time of Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Time of Day
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              <Controller
                name="timeOfDay"
                control={control}
                render={({ field }) => (
                  <input
                    type="time"
                    {...field}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  />
                )}
              />
            </div>
            {errors.timeOfDay && (
              <p className="mt-1 text-sm text-red-600">{errors.timeOfDay.message}</p>
            )}
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Export Format
            </label>
            <Controller
              name="exportFormat"
              control={control}
              render={({ field }) => (
                <div className="mt-1 flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      value="csv"
                      checked={field.value === 'csv'}
                      onChange={() => field.onChange('csv')}
                    />
                    <span className="ml-2">CSV</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      value="pdf"
                      checked={field.value === 'pdf'}
                      onChange={() => field.onChange('pdf')}
                    />
                    <span className="ml-2">PDF</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      value="json"
                      checked={field.value === 'json'}
                      onChange={() => field.onChange('json')}
                    />
                    <span className="ml-2">JSON</span>
                  </label>
                </div>
              )}
            />
            {errors.exportFormat && (
              <p className="mt-1 text-sm text-red-600">{errors.exportFormat.message}</p>
            )}
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Recipients
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <div className="relative flex items-stretch flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-l-md"
                  placeholder="Email address"
                />
              </div>
              <button
                type="button"
                onClick={addRecipient}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                Add
              </button>
            </div>
            
            {recipients.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {recipients.map((email) => (
                  <div
                    key={email}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="ml-1 flex-shrink-0 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {errors.recipients && (
              <p className="mt-1 text-sm text-red-600">{errors.recipients.message}</p>
            )}
          </div>

          <div className="bg-yellow-50 p-3 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Reports will be automatically generated and sent to the specified recipients according to the schedule.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Calendar className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}