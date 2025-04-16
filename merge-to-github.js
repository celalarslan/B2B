// Script to merge project files to GitHub and deploy to Vercel
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const GITHUB_REPO = 'https://github.com/celalarslan/B2B.git';
const BRANCH_NAME = 'main';

function runCommand(command) {
  console.log(`> ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

function isGitInitialized() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasRemote(remoteName) {
  try {
    execSync(`git remote get-url ${remoteName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function createIgnoreFile() {
  const content = `
# Node
node_modules
dist
build
.env
*.log

# System
.DS_Store
.vscode
.idea

# Test
coverage
playwright-report
playwright/.cache

# Misc
*.local
*.suo
*.sw?

# Lock files
yarn.lock
pnpm-lock.yaml
  `;
  fs.writeFileSync('.gitignore', content.trim() + '\n');
}

function createEnvExample() {
  const content = `
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# OpenAI
VITE_OPENAI_API_KEY=

# ElevenLabs
VITE_ELEVENLABS_API_KEY=
VITE_ELEVENLABS_VOICE_ID_EN=
VITE_ELEVENLABS_VOICE_ID_TR=
VITE_ELEVENLABS_VOICE_ID_FR=
VITE_ELEVENLABS_VOICE_ID_AR=
  `;
  fs.writeFileSync('.env.example', content.trim() + '\n');
}

function createReadme() {
  const content = `
# B2B AI Call Assistant

This project enables AI-powered call forwarding based on country and operator.

## Stack

- React (TypeScript)
- Supabase
- Vercel
- OpenAI
- ElevenLabs
- Tailwind CSS
- Vite

## Setup

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

## Deployment

Pushed to GitHub main branch triggers deployment on Vercel.
  `;
  fs.writeFileSync('README.md', content.trim() + '\n');
}

async function mergeAndDeploy() {
  console.log('🚀 Starting merge & deploy...');

  if (!isGitInitialized()) {
    runCommand('git init');
  }

  try {
    execSync('git config user.name', { stdio: 'ignore' });
  } catch {
    runCommand('git config user.name "StackBlitz User"');
  }

  try {
    execSync('git config user.email', { stdio: 'ignore' });
  } catch {
    runCommand('git config user.email "user@stackblitz.com"');
  }

  if (!hasRemote('origin')) {
    runCommand(`git remote add origin ${GITHUB_REPO}`);
  } else {
    const current = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    if (current !== GITHUB_REPO) {
      runCommand(`git remote set-url origin ${GITHUB_REPO}`);
    }
  }

  if (!fs.existsSync('.gitignore')) createIgnoreFile();
  if (!fs.existsSync('.env.example')) createEnvExample();
  if (!fs.existsSync('README.md')) createReadme();

  runCommand('git add .');
  runCommand('git commit -m "chore: auto-merge and deploy from merge script"');

  try {
    runCommand(`git push -u origin ${BRANCH_NAME}`);
  } catch {
    runCommand(`git push -u origin ${BRANCH_NAME} --force`);
  }

  console.log('✅ Merge & deploy complete. You can now check Vercel.');
}

mergeAndDeploy().catch((err) => {
  console.error('❌ Merge process failed:', err.message);
  process.exit(1);
});
