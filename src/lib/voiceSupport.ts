import { supabase } from './supabase';

interface VoiceSupportRequest {
  language: string;
  userMessage: string;
  conversationState: string;
  userInfo: Record<string, string>;
  conversationHistory: Array<{
    sender: 'user' | 'bot';
    text: string;
  }>;
}

interface VoiceSupportResponse {
  success: boolean;
  response: string;
  nextState: string;
}

/**
 * Processes a voice support request through the AI assistant
 * @param request Voice support request data
 * @returns Promise with the AI response and next conversation state
 */
export async function processVoiceSupport(request: VoiceSupportRequest): Promise<VoiceSupportResponse> {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('voice-support-assistant', {
      body: request
    });

    if (error) {
      console.error('Error calling voice support assistant:', error);
      throw new Error('Failed to process voice support request');
    }

    return data as VoiceSupportResponse;
  } catch (error) {
    console.error('Error in processVoiceSupport:', error);
    throw error;
  }
}

/**
 * Transcribes audio to text using OpenAI Whisper API
 * @param audioBlob Audio blob to transcribe
 * @returns Promise with the transcribed text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Create form data for the audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', 'whisper-1');
    
    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

/**
 * Generates speech from text using ElevenLabs API
 * @param text Text to convert to speech
 * @param language Language code (en, tr, ar, fr)
 * @returns Promise with the audio URL
 */
export async function generateSpeech(text: string, language: string = 'en'): Promise<string> {
  try {
    // Skip if text is empty
    if (!text.trim()) {
      throw new Error('Empty text provided');
    }
    
    // Get the appropriate voice ID based on language
    let voiceId = '';
    
    switch (language) {
      case 'tr':
        voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID_TR;
        break;
      case 'ar':
        voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID_AR;
        break;
      case 'fr':
        voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID_FR;
        break;
      default: // English
        voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID_EN;
    }
    
    // Skip if no voice ID is available
    if (!voiceId) {
      throw new Error('No voice ID available for language: ' + language);
    }
    
    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }
    
    // Create audio URL
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
}