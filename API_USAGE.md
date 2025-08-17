# Catabasis API Usage Guide

This guide explains how to use the Catabasis API to fetch data from your sites at build time.

## Overview

The Catabasis API allows you to fetch variables and database data from your static sites using unique project credentials. Each project has:

- **Site UUID**: A public identifier for your project (named site_uuid for API compatibility)
- **API Secret**: A private secret key for authentication

## Authentication

All API requests require authentication via the `X-API-Secret` header:

```bash
curl -H "X-API-Secret: your-api-secret-here" \
     https://your-catabasis-domain.com/api/projects/your-site-uuid/variables
```

## Endpoints

### 1. Fetch All Variables

**GET** `/api/projects/{siteUuid}/variables`

Returns all variables for a project as a key-value object.

```bash
curl -H "X-API-Secret: abc123..." \
     https://your-app.netlify.app/api/projects/550e8400-e29b-41d4-a716-446655440000/variables
```

**Response:**
```json
{
  "success": true,
  "data": {
    "site_title": "My Awesome Site",
    "api_endpoint": "https://api.mysite.com",
    "feature_flag": "true"
  }
}
```

### 2. Fetch Specific Variable

**GET** `/api/projects/{siteUuid}/variables/{key}`

Returns a single variable by key.

```bash
curl -H "X-API-Secret: abc123..." \
     https://your-app.netlify.app/api/projects/550e8400-e29b-41d4-a716-446655440000/variables/site_title
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "site_title",
    "value": "My Awesome Site"
  }
}
```

### 3. Fetch Database Data

**GET** `/api/projects/{siteUuid}/databases/{databaseName}`

Returns all rows from a database table.

```bash
curl -H "X-API-Secret: abc123..." \
     https://your-app.netlify.app/api/projects/550e8400-e29b-41d4-a716-446655440000/databases/blog_posts
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "blog_posts",
    "rows": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "data": {
          "title": "My First Post",
          "content": "Hello world!",
          "published": true
        },
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common error codes:
- `401 Unauthorized`: Missing or invalid API secret
- `404 Not Found`: Site, variable, or database not found
- `400 Bad Request`: Invalid request format

## Usage Examples

### Next.js Static Generation

```javascript
// pages/index.js or app/page.js
export async function getStaticProps() {
  const response = await fetch(
    'https://your-app.netlify.app/api/projects/your-site-uuid/variables',
    {
      headers: {
        'X-API-Secret': process.env.CATABASIS_API_SECRET
      }
    }
  );
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return {
    props: {
      siteConfig: result.data
    }
  };
}
```

### Gatsby Build-time Data

```javascript
// gatsby-config.js
exports.sourceNodes = async ({ actions, createNodeId, createContentDigest }) => {
  const { createNode } = actions;
  
  const response = await fetch(
    'https://your-app.netlify.app/api/projects/your-site-uuid/databases/blog_posts',
    {
      headers: {
        'X-API-Secret': process.env.CATABASIS_API_SECRET
      }
    }
  );
  
  const result = await response.json();
  
  if (result.success) {
    result.data.rows.forEach(row => {
      createNode({
        ...row.data,
        id: createNodeId(`BlogPost-${row.id}`),
        internal: {
          type: 'BlogPost',
          contentDigest: createContentDigest(row.data)
        }
      });
    });
  }
};
```

### Astro Static Generation

```javascript
// src/pages/blog/index.astro
---
const response = await fetch(
  'https://your-app.netlify.app/api/projects/your-site-uuid/databases/blog_posts',
  {
    headers: {
      'X-API-Secret': import.meta.env.CATABASIS_API_SECRET
    }
  }
);

const result = await response.json();
const posts = result.success ? result.data.rows : [];
---

<html>
<body>
  <h1>Blog Posts</h1>
  {posts.map(post => (
    <article>
      <h2>{post.data.title}</h2>
      <p>{post.data.excerpt}</p>
    </article>
  ))}
</body>
</html>
```

### Hugo with JavaScript

```javascript
// scripts/fetch-data.js
const fs = require('fs');
const fetch = require('node-fetch');

async function fetchSiteData() {
  const response = await fetch(
    'https://your-app.netlify.app/api/projects/your-site-uuid/variables',
    {
      headers: {
        'X-API-Secret': process.env.CATABASIS_API_SECRET
      }
    }
  );
  
  const result = await response.json();
  
  if (result.success) {
    fs.writeFileSync(
      'data/site_config.json',
      JSON.stringify(result.data, null, 2)
    );
  }
}

fetchSiteData();
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 1000 requests per hour per site
- 10 requests per minute per IP address

## Security Best Practices

1. **Never expose your API secret** in client-side code
2. **Use environment variables** to store your API secret
3. **Rotate your API secret** regularly using the dashboard
4. **Monitor API usage** in your Catabasis dashboard

## Getting Your Credentials

1. Log into your Catabasis dashboard
2. Navigate to your project settings
3. Copy the **Site UUID** and **API Secret**
4. Add them to your build environment variables

## Support

For support or questions about the API, please contact us through the Catabasis dashboard.