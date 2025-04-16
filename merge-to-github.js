// Script to merge project files to GitHub and deploy to Vercel
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const GITHUB_REPO = 'https://github.com/yourusername/b2b-call-assistant.git'; // Replace with your actual repo URL
const BRANCH_NAME = 'main';

// Function to execute shell commands and log output
function runCommand(command) {
  console.log(`Executing: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    throw error;
  }
}

// Function to check if git is initialized
function isGitInitialized() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// Function to check if remote exists
function hasRemote(remoteName) {
  try {
    execSync(`git remote get-url ${remoteName}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// Main function to merge files and deploy
async function mergeAndDeploy() {
  console.log('Starting merge and deploy process...');
  
  // Initialize git if needed
  if (!isGitInitialized()) {
    console.log('Initializing git repository...');
    runCommand('git init');
  }
  
  // Configure git user if not already set
  try {
    execSync('git config user.name', { stdio: 'ignore' });
  } catch (e) {
    runCommand('git config user.name "StackBlitz User"');
  }
  
  try {
    execSync('git config user.email', { stdio: 'ignore' });
  } catch (e) {
    runCommand('git config user.email "user@stackblitz.com"');
  }
  
  // Add remote if needed
  if (!hasRemote('origin')) {
    console.log('Adding GitHub remote...');
    runCommand(`git remote add origin ${GITHUB_REPO}`);
  } else {
    // Update remote URL if it's different
    const currentRemote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    if (currentRemote !== GITHUB_REPO) {
      console.log('Updating remote URL...');
      runCommand(`git remote set-url origin ${GITHUB_REPO}`);
    }
  }
  
  // Create .gitignore if it doesn't exist
  if (!fs.existsSync('.gitignore')) {
    console.log('Creating .gitignore file...');
    fs.writeFileSync('.gitignore', `
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage
/test-results/
/playwright-report/
/playwright/.cache/

# Production
/dist
/build

# Misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`);
  }
  
  // Create .env.example if it doesn't exist
  if (!fs.existsSync('.env.example')) {
    console.log('Creating .env.example file...');
    fs.writeFileSync('.env.example', `
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
VITE_OPENAI_API_KEY=your_openai_api_key

# ElevenLabs
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_ELEVENLABS_VOICE_ID_EN=your_english_voice_id
VITE_ELEVENLABS_VOICE_ID_TR=your_turkish_voice_id
VITE_ELEVENLABS_VOICE_ID_FR=your_french_voice_id
VITE_ELEVENLABS_VOICE_ID_AR=your_arabic_voice_id
`);
  }
  
  // Create or update README.md
  console.log('Creating/updating README.md...');
  fs.writeFileSync('README.md', `
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
2. Install dependencies: \`npm install\`
3. Copy \`.env.example\` to \`.env\` and fill in your API keys
4. Start the development server: \`npm run dev\`

## Testing

- Run unit and integration tests: \`npm test\`
- Run end-to-end tests: \`npm run test:e2e\`
- Generate coverage report: \`npm run test:coverage\`

## Deployment

The application is automatically deployed to Vercel when changes are pushed to the main branch.

## Environment Variables

The following environment variables are required:

\`\`\`
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_ELEVENLABS_VOICE_ID_EN=your_english_voice_id
VITE_ELEVENLABS_VOICE_ID_TR=your_turkish_voice_id
VITE_ELEVENLABS_VOICE_ID_FR=your_french_voice_id
VITE_ELEVENLABS_VOICE_ID_AR=your_arabic_voice_id
\`\`\`

## License

MIT
`);
  
  // Stage all files
  console.log('Staging files...');
  runCommand('git add .');
  
  // Commit changes
  console.log('Committing changes...');
  runCommand('git commit -m "Prepare B2B Call Assistant for Vercel deployment"');
  
  // Push to GitHub
  console.log('Pushing to GitHub...');
  try {
    runCommand(`git push -u origin ${BRANCH_NAME}`);
  } catch (error) {
    // If push fails, try force push
    console.log('Regular push failed, attempting force push...');
    runCommand(`git push -u origin ${BRANCH_NAME} --force`);
  }
  
  console.log('Files successfully pushed to GitHub!');
  console.log('Now you can deploy to Vercel from the GitHub repository.');
}

// Run the main function
mergeAndDeploy().catch(error => {
  console.error('Error in merge and deploy process:', error);
  process.exit(1);
});
