# B2B AI Call Assistant

A web-based progressive assistant that helps users generate call forwarding codes based on their country, mobile operator, and phone number. The generated code redirects incoming calls to an AI-powered assistant.

## Features

- Country and operator selection from Supabase database
- Phone number input with validation
- Automatic forwarding code generation
- Copy-to-clipboard functionality
- Multi-language support (EN, TR, FR, AR)
- Voice-enabled AI assistant for help
- Mobile-optimized responsive design
- Comprehensive test suite

## Tech Stack

- React with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Supabase for backend and database
- OpenAI for natural language processing
- ElevenLabs for text-to-speech
- Jest and React Testing Library for unit/integration tests
- Playwright for end-to-end testing

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your API keys
4. Start the development server: `npm run dev`

## Testing

- Run unit and integration tests: `npm test`
- Run end-to-end tests: `npm run test:e2e`
- Generate coverage report: `npm run test:coverage`

## Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the main branch.

## Environment Variables

The following environment variables are required:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_ELEVENLABS_VOICE_ID_EN=your_english_voice_id
VITE_ELEVENLABS_VOICE_ID_TR=your_turkish_voice_id
VITE_ELEVENLABS_VOICE_ID_FR=your_french_voice_id
VITE_ELEVENLABS_VOICE_ID_AR=your_arabic_voice_id
```

## License

MIT