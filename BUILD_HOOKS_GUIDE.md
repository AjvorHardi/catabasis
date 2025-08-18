# Build Hooks Guide

Build hooks allow Catabasis to automatically trigger rebuilds of your static site when data changes, ensuring your site always displays the latest content.

## How It Works

1. **Data Changes** → When you update variables or database content
2. **Hook Triggered** → Catabasis sends a POST request to your build hook URL
3. **Site Rebuilds** → Your hosting platform rebuilds and redeploys your site
4. **Fresh Content** → Your site now shows the updated data

## Setup Instructions

### For Netlify

1. **Get Build Hook URL**:
   - Go to your Netlify site dashboard
   - Navigate to **Site Settings** → **Build & Deploy** → **Build Hooks**
   - Click **Add Build Hook**
   - Give it a name like "Catabasis Updates"
   - Copy the generated URL (e.g., `https://api.netlify.com/build_hooks/your-hook-id`)

2. **Configure in Catabasis**:
   - Go to your project settings
   - Paste the build hook URL
   - Enable "Auto-deploy when data changes"
   - Click "Save Settings"

3. **Test the Setup**:
   - Click "Test Hook" to verify the connection
   - Click "Deploy Now" to trigger a manual build
   - Update a variable or database entry to test auto-deployment

### For Vercel

1. **Get Deploy Hook URL**:
   - Go to your Vercel project dashboard
   - Navigate to **Settings** → **Git** → **Deploy Hooks**
   - Click **Create Hook**
   - Give it a name and select the branch
   - Copy the generated URL

2. **Configure in Catabasis**: Same as Netlify steps above

### For Other Platforms

Most modern hosting platforms support build hooks:
- **GitHub Pages**: Use GitHub Actions with repository dispatch events
- **Cloudflare Pages**: Use Deploy Hooks in the dashboard
- **Firebase Hosting**: Use Cloud Build triggers
- **Surge.sh**: Manual deploys only (no webhooks)

## Build Hook Payload

When Catabasis triggers a build hook, it sends this payload:

```json
{
  "reason": "variable_update",
  "details": {
    "action": "update",
    "variable": {
      "name": "site_title",
      "value": "My New Title"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Trigger Reasons**:
- `variable_update` - Variable created, updated, or deleted
- `database_update` - Database row created, updated, or deleted  
- `manual` - Manually triggered from dashboard

## Auto-Deploy Settings

- **Enabled**: Automatically triggers builds when data changes
- **Disabled**: Only manual "Deploy Now" button triggers builds

## Deployment History

The build hooks settings show recent deployments with:
- ✅ **Success** - Build hook executed successfully
- ⏳ **Pending** - Build hook request in progress
- ❌ **Failed** - Build hook request failed

## Troubleshooting

### Build Hook Not Triggering

1. **Check URL**: Ensure the build hook URL is correct and active
2. **Test Connection**: Use the "Test Hook" button
3. **Check Auto-Deploy**: Ensure auto-deploy is enabled
4. **Platform Status**: Check your hosting platform's status page

### Build Hook Fails

1. **Check Response**: Look at the HTTP status code in deployment history
2. **Verify Permissions**: Ensure the build hook has proper permissions
3. **Rate Limits**: Some platforms have rate limits on build triggers
4. **Manual Deploy**: Try a manual deployment on your platform

### Common HTTP Status Codes

- **200/201** - Success
- **401** - Unauthorized (invalid hook URL)
- **404** - Hook not found (check URL)
- **429** - Rate limited (wait before retrying)
- **500** - Platform error (check platform status)

## Best Practices

1. **Use Auto-Deploy Sparingly**: For high-traffic sites, consider disabling auto-deploy and using manual deploys
2. **Monitor Usage**: Keep an eye on deployment frequency to avoid rate limits
3. **Test Thoroughly**: Always test build hooks in a staging environment first
4. **Backup Strategy**: Have a manual deployment process as backup

## API Integration

For advanced users, you can trigger builds programmatically:

```javascript
// Trigger manual deployment via Catabasis API
const response = await fetch(`${CATABASIS_API}/projects/${projectId}/deploy`, {
  method: 'POST',
  headers: {
    'X-API-Secret': 'your-api-secret'
  }
});
```

## Security Considerations

- **Keep URLs Secret**: Build hook URLs can trigger deployments, treat them as secrets
- **Monitor Activity**: Regularly check deployment logs for unexpected activity
- **Rotate URLs**: Periodically regenerate build hook URLs for security

## Support

For build hook issues:
1. Check this guide first
2. Test with manual "Deploy Now" button
3. Check your hosting platform's documentation
4. Contact Catabasis support with deployment logs