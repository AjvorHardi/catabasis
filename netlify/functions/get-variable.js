// Netlify Function: /.netlify/functions/get-variable
// GET /projects/{siteUuid}/variables/{key}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function handler(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Secret',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    // Extract parameters from query string
    const { siteUuid, key } = event.queryStringParameters || {};
    
    if (!siteUuid || !key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Site UUID and variable key required' 
        })
      };
    }

    // Get API secret from headers
    const apiSecret = event.headers['x-api-secret'] || event.headers['X-API-Secret'];
    
    if (!apiSecret) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'API secret required' })
      };
    }

    // Use database function to validate and fetch
    const { data, error } = await supabase
      .rpc('get_project_variable', {
        site_uuid_param: siteUuid,
        api_secret_param: apiSecret,
        variable_name: key
      });

    if (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: error.message })
      };
    }

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Variable not found' })
      };
    }

    // Log access
    const { data: projectData } = await supabase
      .from('projects')
      .select('id')
      .eq('site_uuid', siteUuid)
      .single();

    if (projectData) {
      await supabase
        .from('api_access_logs')
        .insert({
          project_id: projectData.id,
          endpoint: `/projects/${siteUuid}/variables/${key}`,
          ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
          user_agent: event.headers['user-agent']
        });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          key: data[0].name,
          value: data[0].value
        }
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      })
    };
  }
}