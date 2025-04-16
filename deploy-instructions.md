# GitHub Merge and Vercel Deployment Instructions

This document provides instructions for merging your StackBlitz project to GitHub and deploying it to Vercel.

## Prerequisites

1. A GitHub account
2. A Vercel account (can be created with your GitHub account)
3. Git installed on your machine (if running locally)

## Option 1: Using the Automated Script

The `merge-to-github.js` script automates the process of pushing your code to GitHub. Before running it:

1. Update the `GITHUB_REPO` variable in the script with your actual GitHub repository URL
2. Make sure you have the necessary permissions to push to the repository

To run the script:

```bash
node merge-to-github.js
```

## Option 2: Manual GitHub Push

If you prefer to manually push your code to GitHub:

1. Initialize git (if not already initialized):
   ```bash
   git init
   ```

2. Configure git user (if not already configured):
   ```bash
   git config user.name "Your Name"
   git config user.email "your.email@example.com"
   ```

3. Add your GitHub repository as remote:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   ```

4. Stage all files:
   ```bash
   git add .
   ```

5. Commit your changes:
   ```bash
   git commit -m "Prepare B2B Call Assistant for Vercel deployment"
   ```

6. Push to GitHub:
   ```bash
   git push -u origin main
   ```

## Deploying to Vercel

### Automatic Deployment

If you've connected your GitHub repository to Vercel, pushing to the main branch will automatically trigger a deployment.

### Manual Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Add environment variables from your `.env` file
6. Click "Deploy"

## Verifying the Deployment

After deployment:

1. Vercel will provide a URL for your deployed application
2. Visit the URL to ensure everything is working correctly
3. Test the main functionality:
   - Country and operator selection
   - Phone number input
   - Code generation
   - AI assistant
   - Language switching

## Troubleshooting

If you encounter issues:

1. Check the build logs in Vercel for any errors
2. Ensure all environment variables are correctly set in Vercel
3. Verify that all dependencies are properly installed
4. Check that the Supabase project is accessible from the deployed application

## Next Steps

After successful deployment:

1. Set up a custom domain (optional)
2. Configure additional environment variables for production
3. Set up monitoring and analytics
4. Consider implementing CI/CD for automated testing before deployment