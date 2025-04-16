import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Brain, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Save,
  RefreshCw,
  Trash2,
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useSupabase';
import { toast } from './Toast';

const trainingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sector: z.string().min(1, 'Sector is required'),
  language: z.string().min(1, 'Language is required'),
  trainingData: z.any().refine(val => val instanceof File || val?.length > 0, {
    message: 'Training data is required',
  }),
});

type FormData = z.infer<typeof trainingSchema>;

interface AITrainingModuleProps {
  onTrainingComplete?: () => void;
}

const AITrainingModule: React.FC<AITrainingModuleProps> = ({
  onTrainingComplete
}) => {
  const { user, organization } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [sectors, setSectors] = useState<{code: string, name: string}[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { 
    control, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<FormData>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      name: '',
      description: '',
      sector: '',
      language: 'EN',
    }
  });

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const { data, error } = await supabase
          .from('sectors')
          .select('code, name')
          .eq('is_active', true);
        
        if (error) throw error;
        setSectors(data || []);
      } catch (error) {
        console.error('Error fetching sectors:', error);
        toast.error('Failed to load sectors');
      }
    };

    const fetchTrainingHistory = async () => {
      if (!organization?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('training_history')
          .select(`
            id,
            model_id,
            status,
            started_at,
            completed_at,
            ai_models(
              model_id,
              version,
              sector_code,
              language
            )
          `)
          .eq('organization_id', organization.id)
          .order('started_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        setTrainingHistory(data || []);
      } catch (error) {
        console.error('Error fetching training history:', error);
      }
    };

    fetchSectors();
    fetchTrainingHistory();
  }, [organization?.id]);

  const onSubmit = async (data: FormData) => {
    if (!user || !organization?.id) {
      toast.error('You must be logged in to train AI models');
      return;
    }
    
    try {
      setIsLoading(true);
      setTrainingStatus('uploading');
      setTrainingProgress(10);
      
      // 1. Upload training data file
      const file = data.trainingData[0];
      const filePath = `training/${organization.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ai-training')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      setTrainingProgress(30);
      
      // 2. Get file URL
      const { data: urlData } = supabase.storage
        .from('ai-training')
        .getPublicUrl(filePath);
      
      const fileUrl = urlData.publicUrl;
      
      // 3. Create AI model record
      setTrainingStatus('processing');
      setTrainingProgress(50);
      
      const modelVersion = new Date().toISOString().split('T')[0];
      
      const { data: modelData, error: modelError } = await supabase
        .from('ai_models')
        .insert({
          model_id: `${data.sector.toLowerCase()}_${data.language.toLowerCase()}`,
          sector_code: data.sector,
          version: modelVersion,
          provider: 'custom',
          base_model: 'gpt-4',
          language: data.language,
          organization_id: organization.id,
          training_metadata: {
            name: data.name,
            description: data.description,
            training_file: fileUrl,
            training_date: new Date().toISOString()
          }
        })
        .select()
        .single();
      
      if (modelError) throw modelError;
      
      setTrainingProgress(70);
      
      // 4. Create training history record
      const { data: trainingData, error: trainingError } = await supabase
        .from('training_history')
        .insert({
          model_id: modelData.id,
          training_run_id: `run_${Date.now()}`,
          parameters: {
            model_name: data.name,
            sector: data.sector,
            language: data.language,
            training_file: fileUrl
          },
          status: 'in_progress',
          organization_id: organization.id,
          created_by: user.id
        })
        .select()
        .single();
      
      if (trainingError) throw trainingError;
      
      setTrainingProgress(90);
      
      // 5. Simulate training completion (in a real app, this would be handled by a background job)
      setTimeout(async () => {
        try {
          // Update training history
          await supabase
            .from('training_history')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              results: {
                accuracy: 0.92,
                loss: 0.08,
                training_time_seconds: 1200
              }
            })
            .eq('id', trainingData.id);
          
          // Update AI model
          await supabase
            .from('ai_models')
            .update({
              is_active: true,
              performance_metrics: {
                accuracy: 0.92,
                precision: 0.89,
                recall: 0.91,
                f1_score: 0.90
              }
            })
            .eq('id', modelData.id);
          
          setTrainingStatus('completed');
          setTrainingProgress(100);
          
          // Refresh training history
          const { data: updatedHistory } = await supabase
            .from('training_history')
            .select(`
              id,
              model_id,
              status,
              started_at,
              completed_at,
              ai_models(
                model_id,
                version,
                sector_code,
                language
              )
            `)
            .eq('organization_id', organization.id)
            .order('started_at', { ascending: false })
            .limit(5);
          
          if (updatedHistory) {
            setTrainingHistory(updatedHistory);
          }
          
          toast.success('AI model training completed successfully');
          
          if (onTrainingComplete) {
            onTrainingComplete();
          }
          
          // Reset form
          reset();
          setSelectedFile(null);
        } catch (error) {
          console.error('Error completing training:', error);
          setTrainingStatus('failed');
          toast.error('Failed to complete training');
        } finally {
          setIsLoading(false);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error training AI model:', error);
      setTrainingStatus('failed');
      toast.error('Failed to train AI model');
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Training Module</h2>
        <div className="flex items-center text-sm text-gray-500">
          <Brain className="w-4 h-4 mr-1 text-primary" />
          <span>Train your AI assistant with custom data</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Form */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">New Training Job</h3>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Model Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Name <span className="text-red-500">*</span>
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                      errors.name ? 'border-red-300' : ''
                    }`}
                    placeholder="E.g., Restaurant Assistant v1"
                  />
                )}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={2}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Brief description of this model's purpose"
                  />
                )}
              />
            </div>
            
            {/* Sector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sector <span className="text-red-500">*</span>
              </label>
              <Controller
                name="sector"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                      errors.sector ? 'border-red-300' : ''
                    }`}
                  >
                    <option value="">Select a sector</option>
                    {sectors.map(sector => (
                      <option key={sector.code} value={sector.code}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.sector && (
                <p className="mt-1 text-sm text-red-600">{errors.sector.message}</p>
              )}
            </div>
            
            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language <span className="text-red-500">*</span>
              </label>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                      errors.language ? 'border-red-300' : ''
                    }`}
                  >
                    <option value="EN">English</option>
                    <option value="TR">Turkish</option>
                    <option value="FR">French</option>
                    <option value="AR">Arabic</option>
                  </select>
                )}
              />
              {errors.language && (
                <p className="mt-1 text-sm text-red-600">{errors.language.message}</p>
              )}
            </div>
            
            {/* Training Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Training Data <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                    >
                      <span>Upload a file</span>
                      <Controller
                        name="trainingData"
                        control={control}
                        render={({ field: { onChange, value, ...field } }) => (
                          <input
                            id="file-upload"
                            type="file"
                            className="sr-only"
                            accept=".csv,.json,.txt,.jsonl"
                            onChange={(e) => {
                              onChange(e.target.files);
                              handleFileChange(e);
                            }}
                            {...field}
                          />
                        )}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    CSV, JSON, TXT, or JSONL up to 10MB
                  </p>
                  {selectedFile && (
                    <div className="mt-2 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-1 text-gray-500" />
                        <span>{selectedFile.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {errors.trainingData && (
                <p className="mt-1 text-sm text-red-600">{errors.trainingData.message}</p>
              )}
            </div>
            
            {/* Training Status */}
            {trainingStatus !== 'idle' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {trainingStatus === 'uploading' && 'Uploading training data...'}
                    {trainingStatus === 'processing' && 'Processing training data...'}
                    {trainingStatus === 'completed' && 'Training completed!'}
                    {trainingStatus === 'failed' && 'Training failed'}
                  </span>
                  <span className="text-sm text-gray-500">{trainingProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      trainingStatus === 'failed' ? 'bg-red-600' : 'bg-primary'
                    }`}
                    style={{ width: `${trainingProgress}%` }}
                  ></div>
                </div>
                
                {trainingStatus === 'completed' && (
                  <div className="mt-2 p-2 bg-green-50 text-green-800 rounded-md flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Training completed successfully</p>
                      <p className="text-xs mt-1">Your AI model is now ready to use</p>
                    </div>
                  </div>
                )}
                
                {trainingStatus === 'failed' && (
                  <div className="mt-2 p-2 bg-red-50 text-red-800 rounded-md flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Training failed</p>
                      <p className="text-xs mt-1">Please check your training data and try again</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || trainingStatus === 'completed'}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {trainingStatus === 'uploading' ? 'Uploading...' : 'Training...'}
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-2" />
                    Start Training
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Training History */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Recent Training Jobs</h3>
            <button
              onClick={async () => {
                try {
                  const { data, error } = await supabase
                    .from('training_history')
                    .select(`
                      id,
                      model_id,
                      status,
                      started_at,
                      completed_at,
                      ai_models(
                        model_id,
                        version,
                        sector_code,
                        language
                      )
                    `)
                    .eq('organization_id', organization?.id)
                    .order('started_at', { ascending: false })
                    .limit(5);
                  
                  if (error) throw error;
                  setTrainingHistory(data || []);
                } catch (error) {
                  console.error('Error refreshing training history:', error);
                  toast.error('Failed to refresh training history');
                }
              }}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>
          
          {trainingHistory.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trainingHistory.map((job) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {job.ai_models?.model_id || 'Unknown Model'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {job.ai_models?.sector_code} / {job.ai_models?.language}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'failed' ? 'bg-red-100 text-red-800' :
                          job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(job.started_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Download model"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            title="Delete model"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No training jobs yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by creating a new training job with your custom data.
              </p>
            </div>
          )}
          
          {/* Training Tips */}
          <div className="mt-6 bg-blue-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Training Tips</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use high-quality, diverse training data</li>
                    <li>Include examples of different conversation flows</li>
                    <li>Provide at least 50 examples for best results</li>
                    <li>Format data as CSV or JSON with clear labels</li>
                    <li>Include sector-specific terminology</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITrainingModule;