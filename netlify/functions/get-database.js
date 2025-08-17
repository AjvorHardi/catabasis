// Netlify Function: /.netlify/functions/get-database
// GET /projects/{siteUuid}/databases/{name}

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
    const { siteUuid, name } = event.queryStringParameters || {};
    
    if (!siteUuid || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Site UUID and database name required' 
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
      .rpc('get_project_database_data', {
        site_uuid_param: siteUuid,
        api_secret_param: apiSecret,
        database_name_param: name
      });

    if (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: error.message })
      };
    }

    // Format the response
    const rows = data?.map((row) => ({
      id: row.row_id,
      data: row.row_data,
      created_at: row.created_at
    })) || [];

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
          endpoint: `/projects/${siteUuid}/databases/${name}`,
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
          database: name,
          rows
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