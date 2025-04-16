import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Save, Info, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useSupabase';
import { toast } from './Toast';
import { EmailNotificationSettings as EmailSettings } from '../types/chat';

const emailSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  recipientEmail: z.string().email('Please enter a valid email address'),
  sendTranscript: z.boolean().default(true),
  sendAudioLink: z.boolean().default(true),
  includeCustomerInfo: z.boolean().default(true),
  notifyOnMissedCalls: z.boolean().default(true),
  notifyOnCompletedCalls: z.boolean().default(true),
});

type FormData = z.infer<typeof emailSettingsSchema>;

interface EmailNotificationSettingsProps {
  onSave?: (settings: EmailSettings) => void;
}

const EmailNotificationSettings: React.FC<EmailNotificationSettingsProps> = ({
  onSave
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { 
    control, 
    handleSubmit, 
    watch,
    setValue,
    formState: { errors } 
  } = useForm<FormData>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      enabled: false,
      recipientEmail: '',
      sendTranscript: true,
      sendAudioLink: true,
      includeCustomerInfo: true,
      notifyOnMissedCalls: true,
      notifyOnCompletedCalls: true,
    }
  });

  const enabled = watch('enabled');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Get user's business
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id, user_id')
          .eq('user_id', user.id)
          .single();
        
        if (businessError && businessError.code !== 'PGRST116') {
          throw businessError;
        }
        
        if (business) {
          // Get email notification settings
          const { data: settings, error: settingsError } = await supabase
            .from('email_notification_settings')
            .select('*')
            .eq('business_id', business.id)
            .single();
          
          if (settingsError && settingsError.code !== 'PGRST116') {
            throw settingsError;
          }
          
          if (settings) {
            // Set form values from profile
            setValue('enabled', settings.enabled);
            setValue('recipientEmail', settings.recipient_email);
            setValue('sendTranscript', settings.send_transcript);
            setValue('sendAudioLink', settings.send_audio_link);
            setValue('includeCustomerInfo', settings.include_customer_info);
            setValue('notifyOnMissedCalls', settings.notify_on_missed_calls);
            setValue('notifyOnCompletedCalls', settings.notify_on_completed_calls);
          } else {
            // Set default recipient email to user's email
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user?.email) {
              setValue('recipientEmail', userData.user.email);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching email notification settings:', error);
        toast.error('Failed to load email notification settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [user, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      // Get user's business
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (businessError) throw businessError;
      
      // Prepare settings data
      const settingsData = {
        business_id: business.id,
        enabled: data.enabled,
        recipient_email: data.recipientEmail,
        send_transcript: data.sendTranscript,
        send_audio_link: data.sendAudioLink,
        include_customer_info: data.includeCustomerInfo,
        notify_on_missed_calls: data.notifyOnMissedCalls,
        notify_on_completed_calls: data.notifyOnCompletedCalls,
      };
      
      // Check if settings already exist
      const { data: existingSettings } = await supabase
        .from('email_notification_settings')
        .select('id')
        .eq('business_id', business.id)
        .single();
      
      if (existingSettings) {
        // Update existing settings
        const { error: updateError } = await supabase
          .from('email_notification_settings')
          .update(settingsData)
          .eq('id', existingSettings.id);
        
        if (updateError) throw updateError;
      } else {
        // Insert new settings
        const { error: insertError } = await supabase
          .from('email_notification_settings')
          .insert(settingsData);
        
        if (insertError) throw insertError;
      }
      
      toast.success('Email notification settings saved successfully');
      
      if (onSave) {
        onSave(data);
      }
    } catch (error) {
      console.error('Error saving email notification settings:', error);
      toast.error('Failed to save email notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Email Notifications</h2>
        <Mail className="w-6 h-6 text-primary" />
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-base font-medium text-gray-900">Enable Email Notifications</label>
            <p className="text-sm text-gray-500">Receive email notifications for new conversations</p>
          </div>
          <Controller
            name="enabled"
            control={control}
            render={({ field }) => (
              <div className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={field.value}
                  onChange={field.onChange}
                  id="enable-notifications"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            )}
          />
        </div>
        
        {enabled && (
          <>
            {/* Recipient Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Email
              </label>
              <Controller
                name="recipientEmail"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...field}
                      type="email"
                      className={`pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                        errors.recipientEmail ? 'border-red-300' : ''
                      }`}
                      placeholder="email@example.com"
                    />
                  </div>
                )}
              />
              {errors.recipientEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.recipientEmail.message}</p>
              )}
            </div>
            
            {/* Notification Options */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Notification Options</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Controller
                    name="sendTranscript"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        id="sendTranscript"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    )}
                  />
                  <label htmlFor="sendTranscript" className="ml-2 block text-sm text-gray-700">
                    Include conversation transcript
                  </label>
                </div>
                
                <div className="flex items-center">
                  <Controller
                    name="sendAudioLink"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        id="sendAudioLink"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    )}
                  />
                  <label htmlFor="sendAudioLink" className="ml-2 block text-sm text-gray-700">
                    Include audio recording link
                  </label>
                </div>
                
                <div className="flex items-center">
                  <Controller
                    name="includeCustomerInfo"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        id="includeCustomerInfo"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    )}
                  />
                  <label htmlFor="includeCustomerInfo" className="ml-2 block text-sm text-gray-700">
                    Include customer information
                  </label>
                </div>
              </div>
            </div>
            
            {/* Notification Triggers */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Notification Triggers</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Controller
                    name="notifyOnMissedCalls"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        id="notifyOnMissedCalls"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    )}
                  />
                  <label htmlFor="notifyOnMissedCalls" className="ml-2 block text-sm text-gray-700">
                    Notify on missed calls
                  </label>
                </div>
                
                <div className="flex items-center">
                  <Controller
                    name="notifyOnCompletedCalls"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        id="notifyOnCompletedCalls"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    )}
                  />
                  <label htmlFor="notifyOnCompletedCalls" className="ml-2 block text-sm text-gray-700">
                    Notify on completed calls
                  </label>
                </div>
              </div>
            </div>
            
            {/* Info Box */}
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">About Email Notifications</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Emails will be sent from <strong>info@b2b.wf</strong>. Make sure to add this address to your contacts to prevent notifications from going to spam.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailNotificationSettings;