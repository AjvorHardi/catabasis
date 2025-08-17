import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Validates project credentials (UUID + secret)
   */
  private async validateProjectCredentials(siteUuid: string, apiSecret: string) {
    const { data: project, error } = await this.supabase.client
      .from('projects')
      .select('id, user_id')
      .eq('site_uuid', siteUuid)
      .eq('api_secret', apiSecret)
      .single();

    if (error || !project) {
      throw new Error('Invalid project credentials');
    }

    return project;
  }

  /**
   * Logs API access for monitoring
   */
  private async logApiAccess(projectId: string, endpoint: string, ipAddress?: string, userAgent?: string) {
    await this.supabase.client
      .from('api_access_logs')
      .insert({
        project_id: projectId,
        endpoint,
        ip_address: ipAddress,
        user_agent: userAgent
      });
  }

  /**
   * Fetches a specific variable for a project
   */
  async getVariable(siteUuid: string, apiSecret: string, variableKey: string, requestInfo?: { ip?: string, userAgent?: string }) {
    try {
      // Validate credentials
      const project = await this.validateProjectCredentials(siteUuid, apiSecret);

      // Fetch the variable
      const { data: variable, error } = await this.supabase.client
        .from('variables')
        .select('name, value')
        .eq('project_id', project.id)
        .eq('name', variableKey)
        .single();

      if (error || !variable) {
        throw new Error('Variable not found');
      }

      // Log access
      await this.logApiAccess(project.id, `/api/variable/${variableKey}`, requestInfo?.ip, requestInfo?.userAgent);

      return {
        success: true,
        data: {
          key: variable.name,
          value: variable.value
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetches all variables for a project
   */
  async getAllVariables(siteUuid: string, apiSecret: string, requestInfo?: { ip?: string, userAgent?: string }) {
    try {
      // Validate credentials
      const project = await this.validateProjectCredentials(siteUuid, apiSecret);

      // Fetch all variables
      const { data: variables, error } = await this.supabase.client
        .from('variables')
        .select('name, value')
        .eq('project_id', project.id)
        .order('name');

      if (error) {
        throw new Error('Failed to fetch variables');
      }

      // Log access
      await this.logApiAccess(project.id, '/api/variables', requestInfo?.ip, requestInfo?.userAgent);

      // Convert to key-value object
      const variablesObject: Record<string, string> = {};
      variables?.forEach(variable => {
        variablesObject[variable.name] = variable.value;
      });

      return {
        success: true,
        data: variablesObject
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetches database data for a project
   */
  async getDatabaseData(siteUuid: string, apiSecret: string, databaseId: string, requestInfo?: { ip?: string, userAgent?: string }) {
    try {
      // Validate credentials
      const project = await this.validateProjectCredentials(siteUuid, apiSecret);

      // Verify database belongs to this project
      const { data: database, error: dbError } = await this.supabase.client
        .from('databases')
        .select('id, name')
        .eq('id', databaseId)
        .eq('project_id', project.id)
        .single();

      if (dbError || !database) {
        throw new Error('Database not found or access denied');
      }

      // Fetch database rows
      const { data: rows, error: rowsError } = await this.supabase.client
        .from('database_rows')
        .select('id, data, created_at')
        .eq('database_id', databaseId)
        .order('created_at', { ascending: false });

      if (rowsError) {
        throw new Error('Failed to fetch database data');
      }

      // Log access
      await this.logApiAccess(project.id, `/api/database/${databaseId}`, requestInfo?.ip, requestInfo?.userAgent);

      return {
        success: true,
        data: {
          database: {
            id: database.id,
            name: database.name
          },
          rows: rows?.map(row => ({
            id: row.id,
            data: row.data,
            created_at: row.created_at
          })) || []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetches database data by name (more convenient for static sites)
   */
  async getDatabaseDataByName(siteUuid: string, apiSecret: string, databaseName: string, requestInfo?: { ip?: string, userAgent?: string }) {
    try {
      // Validate credentials
      const project = await this.validateProjectCredentials(siteUuid, apiSecret);

      // Find database by name
      const { data: database, error: dbError } = await this.supabase.client
        .from('databases')
        .select('id, name')
        .eq('name', databaseName)
        .eq('project_id', project.id)
        .single();

      if (dbError || !database) {
        throw new Error('Database not found');
      }

      // Use the existing method
      return await this.getDatabaseData(siteUuid, apiSecret, database.id, requestInfo);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}