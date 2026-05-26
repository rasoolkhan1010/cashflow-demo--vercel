# Vercel Deployment Guide

## Prerequisites
- A [Vercel account](https://vercel.com/signup) (sign up for free)
- Git installed and repository set up
- Node.js 18+ installed locally

## Step 1: Install Vercel CLI (Optional but Recommended)
```bash
npm install -g vercel
```

## Step 2: Prepare Environment Variables
Before deploying, ensure you have a `vercel.json` and `.env.example` file in your backend directory (already provided).

Required environment variables for Vercel:
- `NODE_ENV` - Set to "production"
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Your JWT secret key
- `ALLOWED_ORIGINS` - Comma-separated list of allowed frontend URLs
- `AWS_ACCESS_KEY_ID` - AWS credentials for S3
- `AWS_SECRET_ACCESS_KEY` - AWS credentials for S3
- `AWS_REGION` - AWS region (e.g., eu-north-1)
- `S3_BUCKET_NAME` - S3 bucket name

## Step 3: Deploy Using Web Dashboard (Easiest)

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Select your GitHub repository
   - Select the `cashflow-backend` folder as the root directory

3. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add all required variables from `.env.example`:
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = Your PostgreSQL URL
     - `JWT_SECRET` = Your secure JWT secret
     - `ALLOWED_ORIGINS` = Your frontend URL(s)
     - `AWS_ACCESS_KEY_ID` = Your AWS key
     - `AWS_SECRET_ACCESS_KEY` = Your AWS secret
     - `AWS_REGION` = `eu-north-1`
     - `S3_BUCKET_NAME` = Your bucket name

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your backend URL will be provided

## Step 4: Deploy Using CLI (Alternative)

```bash
# Login to Vercel
vercel login

# Deploy from backend directory
cd cashflow-backend
vercel --prod

# Follow the prompts and add environment variables when asked
```

## Step 5: Update Frontend Configuration

Once deployed, update your frontend's API endpoint:

In `client/src/services/api.js`, change:
```javascript
// Old (local)
const API_BASE_URL = 'http://localhost:3000/api';

// New (Vercel)
const API_BASE_URL = 'https://your-vercel-url.vercel.app/api';
```

Also update `ALLOWED_ORIGINS` in Vercel environment variables with your deployed frontend URL.

## Step 6: Update Frontend CORS in Backend

Make sure your frontend URL is in the `ALLOWED_ORIGINS` environment variable on Vercel.

## Troubleshooting

### Issue: Deployment fails
- Check build logs in Vercel dashboard
- Ensure `package.json` has a valid `start` script
- Verify all dependencies are listed in `package.json`

### Issue: Database connection errors
- Verify `DATABASE_URL` format is correct
- Ensure database allows connections from Vercel IP ranges
- Check if database is publicly accessible (for AWS RDS, verify security group settings)

### Issue: CORS errors
- Add your frontend URL to `ALLOWED_ORIGINS` in Vercel environment variables
- Format: `https://domain.com,https://app.domain.com` (comma-separated)

### Issue: S3 upload fails
- Verify AWS credentials are correct
- Ensure S3 bucket exists
- Check bucket permissions allow uploads from Vercel

## Monitoring

After deployment:
1. Check [Vercel dashboard](https://vercel.com/dashboard) for deployment status
2. Monitor application logs in Vercel dashboard
3. Set up alerts for deployment failures

## Redeployment

To redeploy after code changes:
```bash
git push origin main
# Vercel will automatically redeploy on git push
```

Or manually trigger redeployment from Vercel dashboard.

---

**Backend URL**: `https://your-vercel-url.vercel.app`
**Health Check**: `https://your-vercel-url.vercel.app/health`
