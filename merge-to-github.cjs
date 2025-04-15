// Script to merge project files to GitHub
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
    runCommand('git config user.name "GitHub Actions"');
  }
  
  try {
    execSync('git config user.email', { stdio: 'ignore' });
  } catch (e) {
    runCommand('git config user.email "actions@github.com"');
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
  
  // Stage all files
  console.log('Staging files...');
  runCommand('git add .');
  
  // Commit changes
  console.log('Committing changes...');
  runCommand('git commit -m "Deploy B2B Call Assistant to GitHub Pages"');
  
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
  console.log('GitHub Actions will now deploy the application to GitHub Pages.');
  console.log('Process completed!');
}

// Run the main function
mergeAndDeploy().catch(error => {
  console.error('Error in merge and deploy process:', error);
  process.exit(1);
});