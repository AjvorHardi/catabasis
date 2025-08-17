// API endpoints for external site access
// These can be deployed as serverless functions (Vercel, Netlify, etc.)

import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// Initialize Supabase client
const supabase = createClient(
  environment.supabase.url,
  environment.supabase.serviceKey // Note: Use service key for server-side operations
);

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RequestContext {
  headers: Record<string, string>;
  ip?: string;
}

/**
 * Helper to extract request info for logging
 */
function getRequestInfo(context: RequestContext) {
  return {
    ip: context.ip || context.headers['x-forwarded-for'] || context.headers['x-real-ip'],
    userAgent: context.headers['user-agent']
  };
}

/**
 * Helper to log API access
 */
async function logApiAccess(projectId: string, endpoint: string, requestInfo: ReturnType<typeof getRequestInfo>) {
  try {
    await supabase
      .from('api_access_logs')
      .insert({
        project_id: projectId,
        endpoint,
        ip_address: requestInfo.ip,
        user_agent: requestInfo.userAgent
      });
  } catch (error) {
    console.error('Failed to log API access:', error);
  }
}

/**
 * GET /api/v1/projects/{siteUuid}/variables
 * Fetches all variables for a project
 */
export async function getAllVariables(
  siteUuid: string,
  apiSecret: string,
  context: RequestContext
): Promise<ApiResponse> {
  try {
    const requestInfo = getRequestInfo(context);

    // Use database function to validate and fetch
    const { data, error } = await supabase
      .rpc('get_project_variables', {
        site_uuid_param: siteUuid,
        api_secret_param: apiSecret
      });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    // Convert array to object
    const variables: Record<string, string> = {};
    data?.forEach((item: any) => {
      variables[item.name] = item.value;
    });

    // Log access (get project ID for logging)
    const { data: projectData } = await supabase
      .from('projects')
      .select('id')
      .eq('site_uuid', siteUuid)
      .single();

    if (projectData) {
      await logApiAccess(projectData.id, '/api/v1/variables', requestInfo);
    }

    return {
      success: true,
      data: variables
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };
  }
}

/**
 * GET /api/v1/projects/{siteUuid}/variables/{key}
 * Fetches a specific variable for a project
 */
export async function getVariable(
  siteUuid: string,
  apiSecret: string,
  variableKey: string,
  context: RequestContext
): Promise<ApiResponse> {
  try {
    const requestInfo = getRequestInfo(context);

    // Use database function to validate and fetch
    const { data, error } = await supabase
      .rpc('get_project_variable', {
        site_uuid_param: siteUuid,
        api_secret_param: apiSecret,
        variable_name: variableKey
      });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Variable not found'
      };
    }

    // Log access
    const { data: projectData } = await supabase
      .from('projects')
      .select('id')
      .eq('site_uuid', siteUuid)
      .single();

    if (projectData) {
      await logApiAccess(projectData.id, `/api/v1/variables/${variableKey}`, requestInfo);
    }

    return {
      success: true,
      data: {
        key: data[0].name,
        value: data[0].value
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };
  }
}

/**
 * GET /api/v1/projects/{siteUuid}/databases/{databaseName}
 * Fetches database data for a project
 */
export async function getDatabaseData(
  siteUuid: string,
  apiSecret: string,
  databaseName: string,
  context: RequestContext
): Promise<ApiResponse> {
  try {
    const requestInfo = getRequestInfo(context);

    // Use database function to validate and fetch
    const { data, error } = await supabase
      .rpc('get_project_database_data', {
        site_uuid_param: siteUuid,
        api_secret_param: apiSecret,
        database_name_param: databaseName
      });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    // Format the response
    const rows = data?.map((row: any) => ({
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
      await logApiAccess(projectData.id, `/api/v1/databases/${databaseName}`, requestInfo);
    }

    return {
      success: true,
      data: {
        database: databaseName,
        rows
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };
  }
}

// Example usage for Netlify Functions
// See netlify/functions/ directory for actual implementation

/**
 * Usage in static sites:
 * 
 * GET https://your-app.netlify.app/api/projects/{siteUuid}/variables
 * GET https://your-app.netlify.app/api/projects/{siteUuid}/variables/{key}  
 * GET https://your-app.netlify.app/api/projects/{siteUuid}/databases/{name}
 * 
 * Headers:
 * X-API-Secret: your-project-api-secret
 */