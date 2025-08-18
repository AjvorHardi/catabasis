import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface BuildDeployment {
  id: string;
  project_id: string;
  trigger_reason: 'variable_update' | 'database_update' | 'manual';
  trigger_details: Record<string, any>;
  hook_url: string;
  status: 'pending' | 'success' | 'failed';
  response_status?: number;
  response_body?: string;
  triggered_at: string;
  completed_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BuildHooksService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Triggers a build hook for a project
   */
  triggerBuildHook(
    projectId: string, 
    reason: 'variable_update' | 'database_update' | 'manual' = 'manual',
    details: Record<string, any> = {}
  ): Observable<string | null> {
    return from(this.triggerBuildHookAsync(projectId, reason, details));
  }

  private async triggerBuildHookAsync(
    projectId: string,
    reason: string,
    details: Record<string, any>
  ): Promise<string | null> {
    try {
      // Create deployment record in database
      const { data: deploymentId, error } = await this.supabase.client
        .rpc('trigger_build_hook', {
          project_id_param: projectId,
          reason,
          details
        });

      if (error) {
        console.error('Error creating deployment record:', error);
        throw new Error(error.message);
      }

      if (!deploymentId) {
        // Auto deploy is disabled
        return null;
      }

      // Get the build hook URL
      const { data: project, error: projectError } = await this.supabase.client
        .from('projects')
        .select('build_hook_url')
        .eq('id', projectId)
        .single();

      if (projectError || !project?.build_hook_url) {
        throw new Error('Build hook URL not found');
      }

      // Trigger the actual build hook
      this.executeBuildHook(deploymentId, project.build_hook_url, {
        reason,
        details,
        timestamp: new Date().toISOString()
      });

      return deploymentId;
    } catch (error) {
      console.error('Error triggering build hook:', error);
      throw error;
    }
  }

  /**
   * Executes the actual HTTP request to the build hook
   */
  private async executeBuildHook(
    deploymentId: string,
    hookUrl: string,
    payload: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch(hookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Catabasis-BuildHook/1.0'
        },
        body: JSON.stringify(payload)
      });

      // Update deployment status
      await this.supabase.client
        .rpc('update_deployment_status', {
          deployment_id_param: deploymentId,
          status_param: response.ok ? 'success' : 'failed',
          response_status_param: response.status,
          response_body_param: await response.text().catch(() => '')
        });

      if (!response.ok) {
        console.error(`Build hook failed with status ${response.status}`);
      } else {
        console.log('Build hook triggered successfully');
      }
    } catch (error) {
      console.error('Error executing build hook:', error);
      
      // Update deployment status as failed
      await this.supabase.client
        .rpc('update_deployment_status', {
          deployment_id_param: deploymentId,
          status_param: 'failed',
          response_body_param: error instanceof Error ? error.message : 'Unknown error'
        });
    }
  }

  /**
   * Gets deployment history for a project
   */
  getDeploymentHistory(projectId: string, limit: number = 10): Observable<BuildDeployment[]> {
    return from(
      this.supabase.client
        .from('build_deployments')
        .select('*')
        .eq('project_id', projectId)
        .order('triggered_at', { ascending: false })
        .limit(limit)
        .then(response => {
          if (response.error) {
            throw new Error(response.error.message);
          }
          return response.data || [];
        })
    );
  }

  /**
   * Updates project build hook settings
   */
  updateBuildHookSettings(
    projectId: string,
    settings: {
      build_hook_url?: string;
      auto_deploy?: boolean;
    }
  ): Observable<void> {
    return from(
      this.supabase.client
        .from('projects')
        .update(settings)
        .eq('id', projectId)
        .then(response => {
          if (response.error) {
            throw new Error(response.error.message);
          }
        })
    );
  }

  /**
   * Gets project build hook settings
   */
  getBuildHookSettings(projectId: string): Observable<{
    build_hook_url?: string;
    auto_deploy: boolean;
    last_deploy_triggered?: string;
  }> {
    return from(
      this.supabase.client
        .from('projects')
        .select('build_hook_url, auto_deploy, last_deploy_triggered')
        .eq('id', projectId)
        .single()
        .then(response => {
          if (response.error) {
            throw new Error(response.error.message);
          }
          return response.data;
        })
    );
  }

  /**
   * Validates a build hook URL by sending a test request
   */
  async testBuildHook(hookUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(hookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Catabasis-BuildHook-Test/1.0'
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: 'catabasis_test'
        })
      });

      if (response.ok) {
        return { success: true, message: 'Build hook test successful' };
      } else {
        return { 
          success: false, 
          message: `Build hook returned status ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }
}