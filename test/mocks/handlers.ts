import { http, HttpResponse } from 'msw';

// Mock OpenAI API responses
export const openaiHandlers = [
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'mock-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mock response from the OpenAI API. I am here to help you with call forwarding.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    });
  }),
  
  http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json({
      text: 'This is a mock transcription of audio input.',
    });
  }),
];

// Mock ElevenLabs API responses
export const elevenLabsHandlers = [
  http.post('https://api.elevenlabs.io/v1/text-to-speech/*', () => {
    // Return a mock audio blob
    return new HttpResponse(
      new Blob(['mock audio data'], { type: 'audio/mpeg' }),
      {
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      }
    );
  }),
];

// Mock Supabase API responses
export const supabaseHandlers = [
  http.get('*/countries', () => {
    return HttpResponse.json([
      { code: 'US', name: 'United States', flag: '🇺🇸' },
      { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
      { code: 'FR', name: 'France', flag: '🇫🇷' },
      { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    ]);
  }),
  
  http.get('*/operators', () => {
    return HttpResponse.json([
      { id: '1', name: 'AT&T', country_code: 'US', forward_code: '*21*{phone}#', cancel_code: '#21#' },
      { id: '2', name: 'Verizon', country_code: 'US', forward_code: '*71{phone}#', cancel_code: '*73#' },
      { id: '3', name: 'Turkcell', country_code: 'TR', forward_code: '*21*{phone}#', cancel_code: '#21#' },
      { id: '4', name: 'Orange', country_code: 'FR', forward_code: '*21*{phone}#', cancel_code: '#21#' },
    ]);
  }),
];

// Combine all handlers
export const handlers = [
  ...openaiHandlers,
  ...elevenLabsHandlers,
  ...supabaseHandlers,
];