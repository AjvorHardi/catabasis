import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Project, CreateProjectRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private projectsSubject = new BehaviorSubject<Project[]>([]);
  public projects$ = this.projectsSubject.asObservable();

  constructor(private supabase: SupabaseService) {}

  async loadProjects(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      throw error;
    }

    this.projectsSubject.next(data || []);
  }

  async createProject(request: CreateProjectRequest): Promise<Project> {
    // Get current user
    const { data: { user }, error: userError } = await this.supabase.client.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Ensure user profile exists (upsert it)
    await this.supabase.client
      .from('profiles')
      .upsert({ 
        id: user.id, 
        email: user.email || '' 
      }, { 
        onConflict: 'id' 
      });

    // Add user_id to the request
    const projectData = {
      ...request,
      user_id: user.id
    };

    const { data, error } = await this.supabase.client
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw error;
    }

    await this.loadProjects();
    return data;
  }

  async updateProject(id: string, updates: Partial<CreateProjectRequest>): Promise<Project> {
    const { data, error } = await this.supabase.client
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }

    await this.loadProjects();
    return data;
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }

    await this.loadProjects();
  }

  async getProject(id: string): Promise<Project | null> {
    const { data, error } = await this.supabase.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return null;
    }

    return data;
  }

  /**
   * Regenerates the API secret for a project
   */
  async regenerateApiSecret(id: string): Promise<Project> {
    const { data, error } = await this.supabase.client
      .rpc('regenerate_project_secret', { project_id: id });

    if (error) {
      console.error('Error regenerating API secret:', error);
      throw error;
    }

    await this.loadProjects();
    return data;
  }

  /**
   * Gets API usage statistics for a project
   */
  async getProjectApiUsage(projectId: string, days: number = 30): Promise<any[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { data, error } = await this.supabase.client
      .from('api_access_logs')
      .select('endpoint, accessed_at')
      .eq('project_id', projectId)
      .gte('accessed_at', fromDate.toISOString())
      .order('accessed_at', { ascending: false });

    if (error) {
      console.error('Error fetching API usage:', error);
      throw error;
    }

    return data || [];
  }
}