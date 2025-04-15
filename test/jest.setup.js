// Import jest-dom matchers
import '@testing-library/jest-dom';

// Mock the i18next library
jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      t: (str) => str,
      i18n: {
        changeLanguage: () => new Promise(() => {}),
        language: 'en',
      },
    };
  },
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
  Trans: ({ children }) => children,
}));

// Mock the environment variables
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.VITE_OPENAI_API_KEY = 'test-openai-key';
process.env.VITE_ELEVENLABS_API_KEY = 'test-elevenlabs-key';
process.env.VITE_ELEVENLABS_VOICE_ID_EN = 'test-voice-id-en';
process.env.VITE_ELEVENLABS_VOICE_ID_TR = 'test-voice-id-tr';
process.env.VITE_ELEVENLABS_VOICE_ID_FR = 'test-voice-id-fr';
process.env.VITE_ELEVENLABS_VOICE_ID_AR = 'test-voice-id-ar';

// Mock the window.matchMedia function
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock the window.URL.createObjectURL function
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock the MediaRecorder API
global.MediaRecorder = class {
  constructor() {
    this.state = 'inactive';
    this.ondataavailable = jest.fn();
    this.onstop = jest.fn();
    this.stream = {
      getTracks: () => [{
        stop: jest.fn()
      }]
    };
  }
  
  start() {
    this.state = 'recording';
  }
  
  stop() {
    this.state = 'inactive';
    this.onstop();
  }
};

// Mock the Audio API
global.Audio = class {
  constructor() {
    this.paused = true;
    this.currentTime = 0;
    this.src = '';
    this.onended = null;
  }
  
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  
  pause() {
    this.paused = true;
  }
};

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
  })
);