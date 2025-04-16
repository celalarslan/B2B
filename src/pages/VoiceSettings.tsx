import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Mic, 
  Phone, 
  Save, 
  Play, 
  Square, 
  Upload, 
  Trash2, 
  Volume2, 
  VolumeX,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useSupabase';
import { VoiceSettings as VoiceSettingsType } from '../types/profile';
import { toast } from '../components/Toast';

const voiceSettingsSchema = z.object({
  useCustomVoice: z.boolean().default(false),
  voiceId: z.string().min(1, 'Please select a voice'),
  stability: z.number().min(0).max(1).default(0.5),
  similarity: z.number().min(0).max(1).default(0.75),
  style: z.number().min(0).max(1).default(0.5),
  forwardingNumber: z.string().optional(),
});

type FormData = z.infer<typeof voiceSettingsSchema>;

const VoiceSettings = () => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [customVoiceId, setCustomVoiceId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [presetVoices, setPresetVoices] = useState<VoiceSettingsType[]>([
    { voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID_EN, name: 'Emma (English)', language: 'EN' },
    { voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID_TR, name: 'Aylin (Turkish)', language: 'TR' },
    { voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID_FR, name: 'Sophie (French)', language: 'FR' },
    { voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID_AR, name: 'Fatima (Arabic)', language: 'AR' },
  ]);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { 
    control, 
    handleSubmit, 
    watch, 
    setValue,
    formState: { errors } 
  } = useForm<FormData>({
    resolver: zodResolver(voiceSettingsSchema),
    defaultValues: {
      useCustomVoice: false,
      voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID_EN,
      stability: 0.5,
      similarity: 0.75,
      style: 0.5,
      forwardingNumber: '',
    }
  });

  const useCustomVoice = watch('useCustomVoice');
  const selectedVoiceId = watch('voiceId');
  const stability = watch('stability');
  const similarity = watch('similarity');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }
        
        if (profile) {
          setUserProfile(profile);
          
          // Set form values from profile
          if (profile.custom_voice_id) {
            setCustomVoiceId(profile.custom_voice_id);
            setValue('useCustomVoice', true);
          }
          
          if (profile.voice_id) {
            setValue('voiceId', profile.voice_id);
          }
          
          if (profile.voice_settings) {
            setValue('stability', profile.voice_settings.stability || 0.5);
            setValue('similarity', profile.voice_settings.similarity || 0.75);
            setValue('style', profile.voice_settings.style || 0.5);
          }
          
          // Get business info for forwarding number
          const { data: business } = await supabase
            .from('businesses')
            .select('forwarding_number')
            .eq('user_id', user.id)
            .single();
          
          if (business?.forwarding_number) {
            setValue('forwardingNumber', business.forwarding_number);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load your profile');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user, setValue]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        
        // Create audio element for playback
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
        }
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access your microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      // Stop all tracks in the stream
      if (mediaRecorder.current.stream) {
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const uploadVoiceSample = async () => {
    if (!audioBlob || !user) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Upload to Supabase Storage
      const fileName = `voice-sample-${Date.now()}.wav`;
      const filePath = `${user.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-samples')
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      setUploadProgress(50);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;
      
      // Process voice sample with ElevenLabs
      setIsProcessing(true);
      setUploadProgress(75);
      
      // Call ElevenLabs API to create a voice
      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY
        },
        body: (() => {
          const formData = new FormData();
          formData.append('name', `${userProfile?.full_name || 'Custom'}'s Voice`);
          formData.append('files', audioBlob);
          formData.append('description', 'Custom voice created from user recording');
          return formData;
        })()
      });
      
      if (!response.ok) {
        throw new Error('Failed to process voice sample');
      }
      
      const voiceData = await response.json();
      setCustomVoiceId(voiceData.voice_id);
      
      // Update user profile with custom voice ID
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          custom_voice_id: voiceData.voice_id,
          custom_voice_url: publicUrl,
          voice_settings: {
            stability,
            similarity,
            style: watch('style')
          }
        })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      setUploadProgress(100);
      toast.success('Voice sample uploaded and processed successfully!');
      
      // Update form
      setValue('useCustomVoice', true);
    } catch (error) {
      console.error('Error uploading voice sample:', error);
      toast.error('Failed to upload voice sample');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const deleteVoiceSample = async () => {
    if (!user || !customVoiceId) return;
    
    try {
      // Delete from ElevenLabs
      const response = await fetch(`https://api.elevenlabs.io/v1/voices/${customVoiceId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete voice from ElevenLabs');
      }
      
      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          custom_voice_id: null,
          custom_voice_url: null
        })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      setCustomVoiceId(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setValue('useCustomVoice', false);
      
      toast.success('Custom voice deleted successfully');
    } catch (error) {
      console.error('Error deleting voice sample:', error);
      toast.error('Failed to delete voice sample');
    }
  };

  const playVoicePreview = async (voiceId: string) => {
    try {
      setIsPlaying(true);
      
      // Generate preview using ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: 'Hello, this is a preview of how I will sound as your AI assistant.',
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: stability,
            similarity_boost: similarity
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate voice preview');
      }
      
      // Create audio element and play
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error playing voice preview:', error);
      toast.error('Failed to play voice preview');
      setIsPlaying(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          voice_id: data.useCustomVoice ? customVoiceId : data.voiceId,
          voice_settings: {
            stability: data.stability,
            similarity: data.similarity,
            style: data.style,
            useCustomVoice: data.useCustomVoice
          }
        })
        .eq('user_id', user.id);
      
      if (profileError) throw profileError;
      
      // Update business forwarding number
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          forwarding_number: data.forwardingNumber
        })
        .eq('user_id', user.id);
      
      if (businessError) throw businessError;
      
      toast.success('Voice settings saved successfully');
    } catch (error) {
      console.error('Error saving voice settings:', error);
      toast.error('Failed to save voice settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Voice Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Call Forwarding Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Call Forwarding</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Forward calls to:
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Controller
                    name="forwardingNumber"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="tel"
                        {...field}
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
                      />
                    )}
                  />
                </div>
                <Phone className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Voice Selection Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Voice Selection</h2>
          
          <div className="mb-6">
            <Controller
              name="useCustomVoice"
              control={control}
              render={({ field: { onChange, value } }) => (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useCustomVoice"
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    disabled={!customVoiceId}
                  />
                  <label htmlFor="useCustomVoice" className="text-sm font-medium text-gray-700">
                    Use my custom voice
                  </label>
                </div>
              )}
            />
          </div>
          
          {!useCustomVoice && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Select a voice:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {presetVoices.map((voice) => (
                  <div 
                    key={voice.voiceId}
                    className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedVoiceId === voice.voiceId ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setValue('voiceId', voice.voiceId)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{voice.name}</h3>
                        <p className="text-sm text-gray-500">{voice.language}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="voiceId"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="radio"
                              checked={field.value === voice.voiceId}
                              onChange={() => field.onChange(voice.voiceId)}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                            />
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => playVoicePreview(voice.voiceId)}
                          disabled={isPlaying}
                          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          {isPlaying && selectedVoiceId === voice.voiceId ? (
                            <Square className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Play className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {errors.voiceId && (
                <p className="mt-1 text-sm text-red-600">{errors.voiceId.message}</p>
              )}
            </div>
          )}
          
          {/* Voice Parameters */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium">Voice Parameters</h3>
            
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Stability: {stability.toFixed(2)}
                </label>
                <span className="text-xs text-gray-500">
                  {stability < 0.3 ? 'More variable' : stability > 0.7 ? 'More stable' : 'Balanced'}
                </span>
              </div>
              <Controller
                name="stability"
                control={control}
                render={({ field }) => (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                )}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Similarity: {similarity.toFixed(2)}
                </label>
                <span className="text-xs text-gray-500">
                  {similarity < 0.3 ? 'Less similar' : similarity > 0.7 ? 'More similar' : 'Balanced'}
                </span>
              </div>
              <Controller
                name="similarity"
                control={control}
                render={({ field }) => (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                )}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Style: {watch('style').toFixed(2)}
                </label>
                <span className="text-xs text-gray-500">
                  {watch('style') < 0.3 ? 'Less expressive' : watch('style') > 0.7 ? 'More expressive' : 'Balanced'}
                </span>
              </div>
              <Controller
                name="style"
                control={control}
                render={({ field }) => (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Custom Voice Recording Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Custom Voice</h2>
          
          {customVoiceId ? (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium text-green-800">Custom voice is ready</h3>
                  <p className="text-sm text-green-600">Your custom voice has been created and is ready to use.</p>
                  <div className="mt-3 flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => playVoicePreview(customVoiceId)}
                      disabled={isPlaying}
                      className="inline-flex items-center px-3 py-1.5 border border-green-600 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
                    >
                      {isPlaying ? <Square className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                      {isPlaying ? 'Stop' : 'Preview'}
                    </button>
                    <button
                      type="button"
                      onClick={deleteVoiceSample}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-gray-600">
                Record your voice to personalize your AI assistant's responses. For best results, speak clearly and naturally for at least 30 seconds.
              </p>

              <div className="flex flex-col space-y-4">
                {!audioBlob ? (
                  <div className="flex items-center space-x-4">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <Mic className="w-5 h-5" />
                        <span>Start Recording</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        <Square className="w-5 h-5" />
                        <span>Stop Recording</span>
                      </button>
                    )}
                    
                    {isRecording && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-150"></div>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-300"></div>
                        <span className="ml-2 text-sm text-gray-500">Recording...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <audio ref={audioRef} className="hidden" />
                      
                      {!isPlaying ? (
                        <button
                          type="button"
                          onClick={playAudio}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          <Play className="w-5 h-5" />
                          <span>Play Recording</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopAudio}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          <Square className="w-5 h-5" />
                          <span>Stop</span>
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setAudioBlob(null);
                          setAudioUrl(null);
                          if (audioRef.current) {
                            audioRef.current.src = '';
                          }
                        }}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-gray-600" />
                        <span>Discard</span>
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={uploadVoiceSample}
                      disabled={isUploading || isProcessing}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isUploading || isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{isProcessing ? 'Processing...' : 'Uploading...'}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Create Custom Voice</span>
                        </>
                      )}
                    </button>
                    
                    {(isUploading || isProcessing) && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-medium text-blue-800">Voice Recording Tips</h3>
                    <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
                      <li>Speak clearly and at a natural pace</li>
                      <li>Record in a quiet environment</li>
                      <li>Read a variety of sentences for better voice quality</li>
                      <li>Aim for at least 30 seconds of audio</li>
                      <li>Use a good quality microphone if available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Save className="w-5 h-5" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default VoiceSettings;