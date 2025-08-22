# Deployment Guide

## Environment Setup

### 1. Create Environment Files

Copy the template files and add your actual values:

```bash
# Development
cp src/environments/environment.template.ts src/environments/environment.ts

# Production  
cp src/environments/environment.prod.template.ts src/environments/environment.prod.ts
```

### 2. Update Environment Files

Edit both files with your Supabase credentials:

```typescript
export const environment = {
  production: false, // true for production
  supabase: {
    url: 'https://your-project-id.supabase.co',
    anonKey: 'your-anonymous-key',
    serviceKey: 'your-service-role-key' // Only needed for API endpoints
  }
};
```

## Netlify Deployment

### 1. Environment Variables

In your Netlify site settings, add these environment variables:

- `SUPABASE_URL`: `https://your-project-id.supabase.co`
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key

### 2. Build Settings

Netlify should automatically detect the configuration from `netlify.toml`:

- **Build command**: `npm run build`
- **Publish directory**: `dist/catabasis/browser`
- **Node version**: 20

### 3. Deploy

Push to the main branch and Netlify will automatically deploy.

## Security Notes

- ✅ Environment files are gitignored for security
- ✅ Use Netlify environment variables for production
- ✅ Service keys are only used server-side in API functions
- ❌ Never commit actual keys to the repository

## Local Development

1. Copy template files as described above
2. Add your Supabase credentials
3. Run `npm start`