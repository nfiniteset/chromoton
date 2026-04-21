# Deployment Guide

This project includes an automated deployment script that builds and deploys your Vite React app to AWS S3.

## Prerequisites

1. **AWS Account**: You need an AWS account with S3 access
2. **S3 Bucket**: Create an S3 bucket configured for static website hosting
3. **IAM Credentials**: Create IAM credentials with S3 write permissions

## Setup

### 1. Configure AWS Credentials

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your AWS credentials:

```env
S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### 2. Configure S3 Bucket for Static Hosting

In the AWS Console:

1. Go to your S3 bucket
2. Navigate to **Properties** → **Static website hosting**
3. Enable static website hosting
4. Set `index.html` as the index document
5. Set `index.html` as the error document (for SPA routing)

### 3. Set Bucket Permissions

In **Permissions** → **Bucket Policy**, add:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

Replace `your-bucket-name` with your actual bucket name.

## Deployment

### Deploy (Build + Upload)

Builds the app and deploys to S3:

```bash
npm run deploy
```

### Deploy Only (Skip Build)

If you've already built the app and just want to upload:

```bash
npm run deploy:only
```

## What the Script Does

1. ✅ Validates environment variables
2. 🗑️ Clears old files from the `chromoton/` directory in the S3 bucket
3. 📦 Uploads all files from the `dist` directory to `chromoton/`
4. 🔧 Sets appropriate Content-Type headers
5. ⚡ Configures cache headers (immutable for assets, no-cache for HTML)
6. ✨ Provides deployment summary

**Note:** Files are deployed to the `chromoton/` directory in your bucket, not the root. Your site will be accessible at `http://your-bucket.s3-website-region.amazonaws.com/chromoton/`

## CloudFront (Optional)

For better performance and HTTPS, consider adding CloudFront:

1. Create a CloudFront distribution
2. Point it to your S3 bucket
3. Configure custom domain and SSL certificate
4. Update DNS to point to CloudFront

## Troubleshooting

### "S3_BUCKET environment variable is required"
- Make sure you've created a `.env` file from `.env.example`
- Check that all required variables are set

### "dist directory not found"
- Run `npm run build` first, or use `npm run deploy` which builds automatically

### Permission Denied
- Verify your AWS credentials have S3 write permissions
- Check IAM policy allows `s3:PutObject` and `s3:DeleteObject` actions

### Files Upload But Site Doesn't Work
- Ensure static website hosting is enabled on your bucket
- Check bucket policy allows public read access
- Verify the bucket URL in your browser
